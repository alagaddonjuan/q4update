import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { AdminApi } from '../../../../core/services/admin-api';
import { AlertService } from '../../../../core/services/alert.service';

@Component({
  selector: 'app-ussd-logs',
  imports: [CommonModule],
  templateUrl: './ussd-logs.html',
  styleUrl: './ussd-logs.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UssdLogs {
  currentPage = 1;

  ussdLogs = inject(AdminApi);
  alertService = inject(AlertService);

  logs = signal<any[]>([]);
  isLoading = signal(false);

  ngOnInit() {
    this.getLogs();
  }

  getLogs() {
    this.isLoading.set(true);
    this.ussdLogs.getLogs().subscribe({
      next: (logs) => {
        this.logs.set(logs?.ussd || []);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.alertService.error('Error fetching USSD logs:', err);
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
