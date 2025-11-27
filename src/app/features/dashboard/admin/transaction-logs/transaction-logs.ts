import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, Signal, signal } from '@angular/core';
import { AdminApi } from '../../../../core/services/admin-api';
import { Transaction } from '../../../../core/models/api.model';
import { AlertService } from '../../../../core/services/alert.service';

@Component({
  selector: 'app-transaction-logs',
  imports: [CommonModule],
  templateUrl: './transaction-logs.html',
  styleUrl: './transaction-logs.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TransactionLogs {

  logService = inject(AdminApi);
  alertService = inject(AlertService);

  transactions = signal<Transaction[]>([]);
  isLoading = signal(false);
  currentPage = 1;

  ngOnInit() {
    this.getLogs();
  }

  getLogs() {
    this.isLoading.set(true);
    this.logService.getLogs().subscribe({
      next: (logs) => {
        console.log('Transaction Logs:', logs);
        // The API returns a single LogsResponse object which contains the transactions array.
        // We also check if logs and logs.transactions exist to be safe.
        // this.transactions = logs?.transactions || [];
        this.transactions.set(logs?.transactions || []);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.alertService.error('Error fetching transaction logs:', err);
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
