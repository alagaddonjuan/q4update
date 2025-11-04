import { Component, OnInit, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Chart, registerables } from 'chart.js';
import { Router } from '@angular/router';


Chart.register(...registerables);

interface StatCard {
  icon: string;
  title: string;
  value: string;
}

interface Activity {
  user: string;
  avatar: string;
  action: string;
  type: string;
  time: string;
}

@Component({
  selector: 'app-user-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './user-dashboard.html',
  styleUrls: ['./user-dashboard.css']
})
export class UserDashboard implements OnInit, AfterViewInit {

isSidebarOpen = false;
constructor(private router: Router) {}

@ViewChild('chartCanvas') chartCanvas!: ElementRef<HTMLCanvasElement>;
  
  chart: Chart | null = null;

  stats: StatCard[] = [
    { icon: '/assets/user/exchange.png', title: 'Utility Bill', value: '0 Token' },
    { icon: '/assets/user/message-icon.png', title: 'Total SMS sent', value: '0 Token' },
    { icon: '/assets/user/tel-icon.png', title: 'Total Airtime send', value: '0 Token' },
    { icon: '/assets/user/ussd-icon.png', title: 'USSD Token used', value: '0 Token' }
  ];

  activities: Activity[] = [
    { user: 'Olayemi Mikey', avatar: 'OM', action: 'Airtime recharge', type: 'USSD recharge', time: '12:34pm' },
    { user: 'Isiaka Sulton', avatar: 'IS', action: 'Data recharge', type: 'USSD recharge', time: '11:22am' },
    { user: 'Starbucks', avatar: 'S', action: 'Bill Payment', type: 'SMS recharge', time: '10:15am' },
    { user: 'Seward Electric', avatar: 'SE', action: 'Bill Payment', type: 'USSD recharge', time: '9:45am' },
    { user: 'silay', avatar: 'S', action: 'Airtime recharge', type: 'SMS recharge', time: '8:30am' },
    { user: 'Isiaka Sulton', avatar: 'IS', action: 'Data recharge', type: 'Token recharge', time: '7:20am' },
    { user: 'Kiiry', avatar: 'K', action: 'Bill Payment', type: 'Airtime recharge', time: '6:15am' }
  ];
   toggleSidebar() {
    this.isSidebarOpen = !this.isSidebarOpen;
  }

  closeSidebar() {
    this.isSidebarOpen = false;
  }

  getInitials(name: string): string {
    return name.split(' ').map(n => n[0]).join('');
  }
  navigateToProfilePage() {
    this.router.navigate(['/profile']);
  }
  signOut() {
    console.log('Logging out...');
  }
  ngOnInit(): void {
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.createChart();
    });
  }

  createChart(): void {
    if (!this.chartCanvas) {
      return;
    }
    
    const ctx = this.chartCanvas.nativeElement.getContext('2d');
    
    if (ctx) {
      this.chart = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: ['TOKEN', 'SMS', 'AIRTIME', 'USSD'],
          datasets: [{
            data: [1.8, 3.0, 1.2, 2.0],
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
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              max: 3.5,
              ticks: {
                stepSize: 0.5
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

  ngOnDestroy(): void {
    if (this.chart) {
      this.chart.destroy();
    }
  }
}
