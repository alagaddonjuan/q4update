import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { AdminApi } from '../../../../core/services/admin-api';
import { AlertService } from '../../../../core/services/alert.service';
import { FileExportService } from '../../../../core/services/file-export.service';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-airtime-logs',
  imports: [DatePipe, CommonModule, FormsModule],
  templateUrl: './airtime-logs.html',
  styleUrl: './airtime-logs.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AirtimeLogs {
  airtimeLogs = inject(AdminApi);
  alertService = inject(AlertService);
  fileExportService = inject(FileExportService);

  logs = signal<any>([]);
  isLoading = signal(false);
  isDownloading = signal(false);
  searchTerm = signal('');
  currentPage = 1;

  // Date filter signals
  readonly today = this.fileExportService.getTodayAsString();
  startDate = signal<string>('');
  endDate = signal<string>('');

  // CSV headers for airtime logs
  private csvHeaders = ['id', 'phone_number', 'amount', 'status', 'created_at'];

  // Derived signal for filtered logs
  filteredLogs = computed(() => {
    const currentLogs = this.logs();
    const search = this.searchTerm().toLowerCase();
    const startStr = this.startDate();
    const endStr = this.endDate();

    if (!search && !startStr && !endStr) {
      return currentLogs;
    }

    return currentLogs.filter((log: any) => {
      let matchesDate = true;
      if (startStr && endStr) {
        const logDate = new Date(log.created_at);
        const sDate = this.fileExportService.parseDate(startStr);
        const eDate = this.fileExportService.parseDate(endStr);
        eDate.setHours(23, 59, 59, 999);
        matchesDate = logDate >= sDate && logDate <= eDate;
      }

      const matchesSearch = !search ||
        log.phone_number?.toLowerCase().includes(search) ||
        log.status?.toLowerCase().includes(search) ||
        log.id?.toString().includes(search);

      return matchesDate && matchesSearch;
    });
  });

  ngOnInit() {
    this.getLogs();
  }

  getLogs() {
    this.isLoading.set(true);
    this.airtimeLogs.getLogs().subscribe({
      next: (logs) => {
        this.logs.set(logs?.airtime || []);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.alertService.error(`Failed to fetch airtime logs: ${err.message || err}`);
        this.isLoading.set(false);
      }
    })
  }

  resetFilters() {
    this.searchTerm.set('');
    this.startDate.set('');
    this.endDate.set('');
  }

  downloadLogs() {
    let logsToDownload = this.filteredLogs();
    let exportStart: Date;
    let exportEnd: Date;

    if (!this.searchTerm() && !this.startDate() && !this.endDate()) {
      exportEnd = new Date();
      exportStart = new Date();
      exportStart.setDate(exportEnd.getDate() - 30);

      logsToDownload = this.logs().filter((log: any) => {
        const d = new Date(log.created_at);
        return d >= exportStart && d <= exportEnd;
      });
    } else {
      exportStart = this.fileExportService.parseDate(this.startDate() || this.fileExportService.get30DaysAgoAsString());
      exportEnd = this.fileExportService.parseDate(this.endDate() || this.fileExportService.getTodayAsString());
    }

    if (logsToDownload.length === 0) {
      this.alertService.error('No logs available to download');
      return;
    }

    this.isDownloading.set(true);
    try {
      this.fileExportService.exportToCSV({
        filename: 'airtime-logs',
        headers: this.csvHeaders,
        data: logsToDownload,
        dateRange: {
          startDate: exportStart,
          endDate: exportEnd
        }
      });
      this.alertService.success(`Downloaded ${logsToDownload.length} airtime logs`);
    } catch (error) {
      console.error('Error downloading logs:', error);
      this.alertService.error('Failed to download logs');
    } finally {
      this.isDownloading.set(false);
    }
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
