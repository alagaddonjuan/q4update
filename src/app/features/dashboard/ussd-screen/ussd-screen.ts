import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ClientApiService } from '../../../core/services/client-api';

interface UssdLog {
  id: string;
  date: string;
  phoneNumber: string;
  sessionId: string;
  finalInput: string;
  status: string;
  cost: string;
}

@Component({
  selector: 'app-ussd-screen',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ussd-screen.html',
  styleUrl: './ussd-screen.css',
})
export class UssdScreen implements OnInit {
  private readonly clientApi = inject(ClientApiService);
  
  // Signals for reactive state management
  private readonly ussdLogsSignal = signal<UssdLog[]>([]);
  readonly isLoading = signal<boolean>(true);
  readonly isExporting = signal<boolean>(false);
  readonly error = signal<string | null>(null);
  readonly ussdCode = signal<string>('*347*102#');
  readonly totalSessions = signal<number>(0);
  readonly completedSessions = signal<number>(0);
  readonly totalCost = signal<number>(0);

  // Expose logs as readonly getter
  get ussdLogs(): UssdLog[] {
    return this.ussdLogsSignal();
  }

  ngOnInit(): void {
    this.loadUssdLogs();
  }

  loadUssdLogs(): void {
    this.isLoading.set(true);
    this.error.set(null);

    this.clientApi.getDashboard().subscribe({
      next: (data) => {
        console.log('📊 Dashboard data loaded:', data);
        
        if (data.ussd_logs && data.ussd_logs.length > 0) {
          const transformedLogs = data.ussd_logs.map((log, index) => ({
            id: log.id || `ussd-${index}`,
            date: this.formatDate(log.created_at || log.timestamp),
            phoneNumber: log.phone_number || log.phoneNumber || 'Unknown',
            sessionId: log.session_id || log.sessionId || '-',
            finalInput: log.final_input || log.userInput || '-',
            status: this.normalizeStatus(log.status),
            cost: this.formatCost(log.cost || log.charge || 0)
          }));

          this.ussdLogsSignal.set(transformedLogs);
          this.calculateStatistics(transformedLogs);
        } else {
          this.ussdLogsSignal.set([]);
        }

        // Set USSD code from client data if available
        if (data.client?.ussd_code) {
          this.ussdCode.set(data.client.ussd_code);
        }

        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('❌ Error loading USSD logs:', err);
        this.error.set('Failed to load USSD logs. Please try again.');
        this.isLoading.set(false);
      }
    });
  }

  calculateStatistics(logs: UssdLog[]): void {
    this.totalSessions.set(logs.length);
    
    const completed = logs.filter(log => 
      log.status === 'Success' || log.status === 'Completed'
    ).length;
    this.completedSessions.set(completed);

    const total = logs.reduce((sum, log) => {
      const cost = parseFloat(log.cost.replace(/[₦,]/g, '')) || 0;
      return sum + cost;
    }, 0);
    this.totalCost.set(total);
  }

  exportCSV(): void {
    const logs = this.ussdLogsSignal();
    
    if (logs.length === 0) {
      alert('No USSD logs to export');
      return;
    }

    this.isExporting.set(true);

    // Try to export from API first
    this.clientApi.exportUssdLogs().subscribe({
      next: (blob) => {
        console.log('✅ USSD logs exported from API');
        this.downloadBlob(blob, `ussd-logs-${Date.now()}.csv`);
        this.isExporting.set(false);
      },
      error: (err) => {
        console.error('❌ Error exporting from API:', err);
        console.log('📄 Using fallback: Creating CSV from local data');
        
        // Fallback: Create CSV from local data
        this.exportLocalCSV(logs);
        this.isExporting.set(false);
      }
    });
  }

  private exportLocalCSV(logs: UssdLog[]): void {
    // Create CSV header
    const headers = ['Date', 'Phone Number', 'Session ID', 'Final Input', 'Status', 'Cost'];
    const csvHeader = headers.join(',');
    
    // Create CSV rows
    const csvRows = logs.map(log => 
      [
        `"${log.date}"`,
        `"${log.phoneNumber}"`,
        `"${log.sessionId}"`,
        `"${log.finalInput}"`,
        `"${log.status}"`,
        `"${log.cost}"`
      ].join(',')
    );
    
    // Combine header and rows
    const csv = [csvHeader, ...csvRows].join('\n');
    
    // Create and download file
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    this.downloadBlob(blob, `ussd-logs-${Date.now()}.csv`);
    
    console.log('✅ CSV exported successfully from local data');
  }

  private downloadBlob(blob: Blob, filename: string): void {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    window.URL.revokeObjectURL(url);
  }

  refreshLogs(): void {
    this.loadUssdLogs();
  }

  copyUssdCode(): void {
    const code = this.ussdCode();
    navigator.clipboard.writeText(code).then(() => {
      alert(`USSD code ${code} copied to clipboard!`);
    }).catch(err => {
      console.error('Failed to copy:', err);
      alert('Failed to copy USSD code');
    });
  }

  // Helper methods
  private formatDate(timestamp: string): string {
    if (!timestamp) return new Date().toLocaleString();
    
    try {
      return new Date(timestamp).toLocaleString('en-NG', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } catch (e) {
      return timestamp;
    }
  }

  private formatCost(cost: number | string): string {
    const numericCost = typeof cost === 'string' 
      ? parseFloat(cost.replace(/[₦,]/g, '')) 
      : cost;
    
    return `₦${numericCost.toFixed(2)}`;
  }

  private normalizeStatus(status: string): string {
    if (!status) return 'Unknown';
    
    const statusMap: { [key: string]: string } = {
      'success': 'Success',
      'completed': 'Success',
      'complete': 'Success',
      'incomplete': 'Incomplete',
      'failed': 'Failed',
      'error': 'Failed',
      'timeout': 'Timeout',
      'cancelled': 'Cancelled'
    };

    const normalized = statusMap[status.toLowerCase()];
    return normalized || status;
  }

  getStatusClass(status: string): string {
    const statusClasses: { [key: string]: string } = {
      'Success': 'status-success',
      'Incomplete': 'status-incomplete',
      'Failed': 'status-failed',
      'Timeout': 'status-timeout',
      'Cancelled': 'status-cancelled'
    };

    return statusClasses[status] || 'status-unknown';
  }

  get completionRate(): number {
    const total = this.totalSessions();
    if (total === 0) return 0;
    return Math.round((this.completedSessions() / total) * 100);
  }
}
