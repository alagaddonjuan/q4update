import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { AdminApi } from '../../../../core/services/admin-api';
import { AlertService } from '../../../../core/services/alert.service';
import { FileExportService } from '../../../../core/services/file-export.service';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';

@Component({
  selector: 'app-ussd-logs',
  imports: [CommonModule, FormsModule, DatePipe],
  templateUrl: './ussd-logs.html',
  styleUrl: './ussd-logs.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UssdLogs {
  currentPage = 1;

  ussdLogs = inject(AdminApi);
  alertService = inject(AlertService);
  fileExportService = inject(FileExportService);

  logs = signal<any[]>([]);
  isLoading = signal(false);
  isDownloading = signal(false);
  searchTerm = signal('');

  // Date filter signals
  readonly today = this.fileExportService.getTodayAsString();
  startDate = signal<string>('');
  endDate = signal<string>('');

  // CSV headers for USSD logs
  private csvHeaders = ['id', 'phone_number', 'final_user_string', 'cost', 'session_id', 'logged_at', 'client_name'];

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
        const logDate = new Date(log.logged_at);
        const sDate = this.fileExportService.parseDate(startStr);
        const eDate = this.fileExportService.parseDate(endStr);
        eDate.setHours(23, 59, 59, 999);
        matchesDate = logDate >= sDate && logDate <= eDate;
      }

      const matchesSearch = !search ||
        log.phone_number?.toLowerCase().includes(search) ||
        log.id?.toString().includes(search) ||
        log.final_user_string?.toLowerCase().includes(search);

      return matchesDate && matchesSearch;
    });
  });

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

  resetFilters() {
    this.searchTerm.set('');
    this.startDate.set('');
    this.endDate.set('');
  }

  downloadLogs() {
    let logsToDownload = this.filteredLogs();
    let exportStart: Date;
    let exportEnd: Date;

    // Default to 30 days if no filters are applied
    if (!this.searchTerm() && !this.startDate() && !this.endDate()) {
      exportEnd = new Date();
      exportStart = new Date();
      exportStart.setDate(exportEnd.getDate() - 30);

      logsToDownload = this.logs().filter((log: any) => {
        const d = new Date(log.logged_at);
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
        filename: 'ussd-logs',
        headers: this.csvHeaders,
        data: logsToDownload,
        dateRange: {
          startDate: exportStart,
          endDate: exportEnd
        }
      });
      this.alertService.success(`Downloaded ${logsToDownload.length} USSD logs`);
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
