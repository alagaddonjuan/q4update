import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { AdminApi } from '../../../../core/services/admin-api';
import { AlertService } from '../../../../core/services/alert.service';

@Component({
  selector: 'app-airtime-logs',
  imports: [],
  templateUrl: './airtime-logs.html',
  styleUrl: './airtime-logs.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AirtimeLogs {
  airtimeLogs = inject(AdminApi);
  alertService = inject(AlertService);

  logs = signal<any>([]);
  isLoading = signal(false);
  currentPage = 1;

  ngOnInit() {
    this.getLogs();
  }

  getLogs() {
    this.isLoading.set(true);
    this.airtimeLogs.getLogs().subscribe({
      next: (logs) => {
        this.logs.set(logs?.airtimeLogs || []);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Error fetching airtime logs:', err);
        this.alertService.error(`Failed to fetch airtime logs: ${err.message || err}`);
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
