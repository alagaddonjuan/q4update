import { DatePipe } from '@angular/common';
import { AlertService } from '../../../../core/services/alert.service';
import { AdminApi } from './../../../../core/services/admin-api';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';

@Component({
  selector: 'app-sms-logs',
  imports: [DatePipe],
  templateUrl: './sms-logs.html',
  styleUrl: './sms-logs.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SmsLogs {

  smsLogs = inject(AdminApi);
  alertservice = inject(AlertService);

  currentPage = 1;

  logs = signal<any>([]);
  isLoading = signal(false);

  ngOnInit() {
    this.getLogs();
  }

  getLogs() {
    this.isLoading.set(true);
    this.smsLogs.getLogs().subscribe({
      next: (logs) => {
        this.logs.set(logs?.sms || []);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.alertservice.error('Error fetching SMS logs:', err);
        this.isLoading.set(false);
      }
    })
  }

  previousPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
      console.log('Previous page:', this.currentPage);
      // Add your pagination logic here
    }
  }

  nextPage() {
    this.currentPage++;
    console.log('Next page:', this.currentPage);
    // Add your pagination logic here
  }
}
