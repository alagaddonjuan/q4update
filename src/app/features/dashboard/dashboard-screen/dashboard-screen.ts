import { Component, OnInit, ViewChild, ElementRef, AfterViewInit, inject, signal, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Chart, registerables } from 'chart.js';
import { Router } from '@angular/router';
import { ClientApiService } from '../../../core/services/client-api';
import { DashboardData } from '../../../core/models/api.model';

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
  
  @ViewChild('chartCanvas') chartCanvas!: ElementRef<HTMLCanvasElement>;
  
  chart: Chart | null = null;
  
  // Signals for reactive state management
  readonly loading = signal<boolean>(true);
  readonly error = signal<string | null>(null);
  readonly dashboardData = signal<DashboardData | null>(null);
  
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
    this.error.set(null);

    this.clientApi.getDashboard().subscribe({
      next: (data) => {
        console.log('📊 Dashboard data loaded:', data);
        this.dashboardData.set(data);
        this.updateStats(data);
        this.updateActivities(data);
        this.loading.set(false);
        
        // Create chart after data is loaded
        setTimeout(() => {
          this.loadChartData();
        }, 100);
      },
      error: (err) => {
        console.error('❌ Error loading dashboard:', err);
        this.error.set('Failed to load dashboard data. Please try again.');
        this.loading.set(false);
      }
    });
  }

  updateStats(data: DashboardData): void {
    // Update stats based on API data
    const stats = data.stats || {};
    
    this.stats = [
      { 
        icon: '/assets/user/exchange.png', 
        title: 'Account Balance', 
        value: `₦${this.formatNumber(stats.balance || 0)}`,
        key: 'balance'
      },
      { 
        icon: '/assets/user/message-icon.png', 
        title: 'Total SMS sent', 
        value: `${this.formatNumber(data.sms_logs?.length || 0)} SMS`,
        key: 'sms_count'
      },
      { 
        icon: '/assets/user/tel-icon.png', 
        title: 'Total Airtime send', 
        value: `₦${this.formatNumber(this.calculateAirtimeTotal(data.airtime_logs))}`,
        key: 'airtime_total'
      },
      { 
        icon: '/assets/user/ussd-icon.png', 
        title: 'USSD Sessions', 
        value: `${this.formatNumber(data.ussd_logs?.length || 0)} Sessions`,
        key: 'ussd_count'
      }
    ];
  }

  updateActivities(data: DashboardData): void {
    // Combine all logs into activities with unique IDs
    const allActivities: Activity[] = [];
    let activityId = 0;

    // Add SMS activities
    if (data.sms_logs && data.sms_logs.length > 0) {
      data.sms_logs.slice(0, 3).forEach(log => {
        allActivities.push({
          id: `sms-${activityId++}`,
          user: log.recipient || 'Unknown',
          avatar: this.getInitials(log.recipient || 'U'),
          action: 'SMS sent',
          type: 'SMS',
          time: this.formatTime(log.created_at)
        });
      });
    }

    // Add Airtime activities
    if (data.airtime_logs && data.airtime_logs.length > 0) {
      data.airtime_logs.slice(0, 3).forEach(log => {
        allActivities.push({
          id: `airtime-${activityId++}`,
          user: log.phone_number || 'Unknown',
          avatar: this.getInitials(log.phone_number || 'U'),
          action: 'Airtime recharge',
          type: 'Airtime',
          time: this.formatTime(log.created_at)
        });
      });
    }

    // Add USSD activities
    if (data.ussd_logs && data.ussd_logs.length > 0) {
      data.ussd_logs.slice(0, 3).forEach(log => {
        allActivities.push({
          id: `ussd-${activityId++}`,
          user: log.phone_number || 'Unknown',
          avatar: this.getInitials(log.phone_number || 'U'),
          action: 'USSD session',
          type: 'USSD',
          time: this.formatTime(log.created_at)
        });
      });
    }

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

  loadChartData(): void {
    this.clientApi.getChartData().subscribe({
      next: (chartData) => {
        console.log('📈 Chart data loaded:', chartData);
        this.createChart(chartData);
      },
      error: (err) => {
        console.error('❌ Error loading chart data:', err);
        // Create chart with default data
        this.createChart(null);
      }
    });
  }

  createChart(data: any): void {
    if (!this.chartCanvas) {
      return;
    }
    
    const ctx = this.chartCanvas.nativeElement.getContext('2d');
    
    if (ctx) {
      // Use API data or fallback to default
      const chartLabels = data?.labels || ['TOKEN', 'SMS', 'AIRTIME', 'USSD'];
      const chartValues = data?.values || [0, 0, 0, 0];

      this.chart = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: chartLabels,
          datasets: [{
            label: 'Usage',
            data: chartValues,
            backgroundColor: '#14b8a6',
            borderRadius: 8,
            barThickness: 60
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: true,
          plugins: {
            legend: {
              display: false
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
              ticks: {
                stepSize: 500
              },
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

  refreshDashboard(): void {
    this.loadDashboardData();
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