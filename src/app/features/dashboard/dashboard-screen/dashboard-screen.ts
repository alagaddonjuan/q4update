import { Component, OnInit, ViewChild, ElementRef, AfterViewInit, inject, signal, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Chart, registerables } from 'chart.js';
import { Router } from '@angular/router';
import { ClientApiService } from '../../../core/services/client-api';
import { DashboardData, DashboardDataResponse } from '../../../core/models/api.model';
import { AlertService } from '../../../core/services/alert.service';

Chart.register(...registerables);

interface StatCard {
  icon: string;
  title: string;
  value: string;
  key: string; // For mapping to API data
}

interface Activity {
  id: string;
  user: string;
  avatar: string;
  action: string;
  type: string;
  time: string;
}

@Component({
  selector: 'app-dashboard-screen',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard-screen.html',
  styleUrl: './dashboard-screen.css'
})
export class DashboardScreen implements OnInit, AfterViewInit, OnDestroy {
  private readonly router = inject(Router);
  private readonly clientApi = inject(ClientApiService);
  alertService = inject(AlertService);

  @ViewChild('chartCanvas') chartCanvas!: ElementRef<HTMLCanvasElement>;

  chart: Chart | null = null;

  // Signals for reactive state management
  readonly loading = signal<boolean>(true);
  readonly dashboardData = signal<DashboardDataResponse | null>(null);

  stats: StatCard[] = [
    { icon: '/assets/user/exchange.png', title: 'Utility Bill', value: '0 Token', key: 'utility_bills' },
    { icon: '/assets/user/message-icon.png', title: 'Total SMS sent', value: '0 SMS', key: 'sms_count' },
    { icon: '/assets/user/tel-icon.png', title: 'Total Airtime send', value: '₦0', key: 'airtime_total' },
    { icon: '/assets/user/ussd-icon.png', title: 'USSD Token used', value: '0 Token', key: 'ussd_count' }
  ];

  activities: Activity[] = [];

  ngOnInit(): void {
    this.loadDashboardData();
  }

  ngAfterViewInit(): void {
    // Chart will be created after data is loaded
  }

  loadDashboardData(): void {
    this.loading.set(true);

    this.clientApi.getDashboard().subscribe({
      next: (data) => {
        console.log('📊 Dashboard data loaded:', data);
        this.dashboardData.set(data);
        this.updateStats(data);
        this.updateActivities(data as any);
        this.loading.set(false);

        // Create chart after data is loaded
        setTimeout(() => {
          this.createChart(data);
        }, 100);
      },
      error: (err) => {
        console.error('❌ Error loading dashboard:', err);
        this.alertService.error('Failed to load dashboard data. Please try again.');
        this.loading.set(false);
      }
    });
  }

  updateStats(data: DashboardDataResponse): void {
    const client = data.client || {};
    const stats = data.stats || { totalSmsSent: 0, sms: 0 };
    const ussdTotal = (data.ussdChartValues || []).reduce((sum, val) => sum + val, 0);

    this.stats = [
      {
        icon: '/assets/user/exchange.png',
        title: 'Account Balance',
        value: `₦${this.formatNumber(client.balance || 0)}`,
        key: 'balance'
      },
      {
        icon: '/assets/user/message-icon.png',
        title: 'Total SMS sent',
        value: `${this.formatNumber(stats.totalSmsSent || 0)} SMS`,
        key: 'sms_count'
      },
      {
        icon: '/assets/user/tel-icon.png',
        title: 'Total Airtime send',
        value: `₦0`, // Placeholder until airtime logs are added to the response
        key: 'airtime_total'
      },
      {
        icon: '/assets/user/ussd-icon.png',
        title: 'USSD Sessions',
        value: `${this.formatNumber(ussdTotal)} Sessions`,
        key: 'ussd_count'
      }
    ];
  }

  updateActivities(data: any): void {
    // Combine all logs into activities with unique IDs
    const allActivities: Activity[] = [];
    let activityId = 0;

    // Add SMS activities
    // if (data.sms_logs && data.sms_logs.length > 0) {
    //   data.sms_logs.slice(0, 3).forEach(log => {
    //     allActivities.push({
    //       id: `sms-${activityId++}`,
    //       user: log.recipient || 'Unknown',
    //       avatar: this.getInitials(log.recipient || 'U'),
    //       action: 'SMS sent',
    //       type: 'SMS',
    //       time: this.formatTime(log.created_at)
    //     });
    //   });
    // }

    // Add Airtime activities
    // if (data.airtime_logs && data.airtime_logs.length > 0) {
    //   data.airtime_logs.slice(0, 3).forEach(log => {
    //     allActivities.push({
    //       id: `airtime-${activityId++}`,
    //       user: log.phone_number || 'Unknown',
    //       avatar: this.getInitials(log.phone_number || 'U'),
    //       action: 'Airtime recharge',
    //       type: 'Airtime',
    //       time: this.formatTime(log.created_at)
    //     });
    //   });
    // }

    // Add USSD activities
    // if (data.ussd_logs && data.ussd_logs.length > 0) {
    //   data.ussd_logs.slice(0, 3).forEach(log => {
    //     allActivities.push({
    //       id: `ussd-${activityId++}`,
    //       user: log.phone_number || 'Unknown',
    //       avatar: this.getInitials(log.phone_number || 'U'),
    //       action: 'USSD session',
    //       type: 'USSD',
    //       time: this.formatTime(log.created_at)
    //     });
    //   });
    // }

    // Sort by time (most recent first) and take top 7
    this.activities = allActivities
      .sort((a, b) => {
        // Sort logic - you might need to adjust based on your date format
        return 0; // Keep original order for now
      })
      .slice(0, 20);

    // If no activities, show default
    if (this.activities.length === 0) {
      this.activities = [
        { id: 'default-0', user: 'No Activity', avatar: 'NA', action: 'No recent activity', type: 'Info', time: 'N/A' }
      ];
    }
  }

  createChart(data: DashboardDataResponse | null): void {
    if (!this.chartCanvas) {
      return;
    }

    const ctx = this.chartCanvas.nativeElement.getContext('2d');

    if (ctx) {
      // Destroy existing chart to prevent canvas overlapping
      if (this.chart) {
        this.chart.destroy();
      }

      // Use API data or fallback to default
      const chartLabels = data?.chartLabels || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      const ussdValues = data?.ussdChartValues || [0, 0, 0, 0, 0, 0, 0];
      const smsValues = data?.smsChartValues || [0, 0, 0, 0, 0, 0, 0];

      this.chart = new Chart(ctx, {
        type: 'line',
        data: {
          labels: chartLabels,
          datasets: [
            {
              label: 'USSD Sessions',
              data: ussdValues,
              borderColor: '#14b8a6',
              backgroundColor: 'rgba(20, 184, 166, 0.1)',
              fill: true,
              tension: 0.4,
              pointRadius: 4,
              pointBackgroundColor: '#14b8a6'
            },
            {
              label: 'SMS Sent',
              data: smsValues,
              borderColor: '#3b82f6',
              backgroundColor: 'rgba(59, 130, 246, 0.1)',
              fill: true,
              tension: 0.4,
              pointRadius: 4,
              pointBackgroundColor: '#3b82f6'
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: true,
              position: 'top'
            },
            tooltip: {
              backgroundColor: '#1f2937',
              padding: 12,
              titleColor: '#fff',
              bodyColor: '#fff',
              borderColor: '#14b8a6',
              borderWidth: 1
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              grid: {
                color: '#f3f4f6'
              }
            },
            x: {
              grid: {
                display: false
              }
            }
          }
        }
      });
    }
  }

  // Helper methods
  getInitials(name: string): string {
    if (!name) return 'U';
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }

  formatNumber(num: number): string {
    return num.toLocaleString('en-NG');
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 2
    }).format(amount);
  }

  formatTime(timestamp: string): string {
    if (!timestamp) return 'N/A';

    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString('en-NG', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  calculateAirtimeTotal(logs: any[]): number {
    if (!logs || logs.length === 0) return 0;
    return logs.reduce((total, log) => {
      const amount = parseFloat(log.amount || 0);
      return total + amount;
    }, 0);
  }

  navigateToProfilePage(): void {
    this.router.navigate(['/user/profile']);
  }

  ngOnDestroy(): void {
    if (this.chart) {
      this.chart.destroy();
    }
  }
}