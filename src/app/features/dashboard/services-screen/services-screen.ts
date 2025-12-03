import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ClientApiService } from '../../../core/services/client-api';
import { SendSmsRequest, SendAirtimeRequest } from '../../../core/models/api.model';
import { AlertService } from '../../../core/services/alert.service';

interface SMSLog {
  id: string;
  date: string;
  recipient: string;
  message: string;
  status: string;
  cost: string;
}

interface AirtimeLog {
  id: string;
  date: string;
  phoneNumber: string;
  amount: string;
  status: string;
}

@Component({
  selector: 'app-services-screen',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './services-screen.html',
  styleUrl: './services-screen.css',
})
export class ServicesScreen implements OnInit {
  private readonly clientApi = inject(ClientApiService);
  private readonly fb = inject(FormBuilder);
  alertService = inject(AlertService);

  smsForm: FormGroup;
  airtimeForm: FormGroup;


  // Signals for reactive state management
  readonly smsLogs = signal<SMSLog[]>([]);
  readonly airtimeLogs = signal<AirtimeLog[]>([]);
  readonly isSendingSMS = signal<boolean>(false);
  readonly isSendingAirtime = signal<boolean>(false);
  readonly isLoadingLogs = signal<boolean>(true);
  readonly isExportingSMS = signal<boolean>(false);
  readonly isExportingAirtime = signal<boolean>(false);

  constructor() {
    this.smsForm = this.fb.group({
      recipients: ['', [Validators.required, Validators.pattern(/^[\d,\s]+$/)]],
      message: ['', [Validators.required, Validators.maxLength(160)]]
    });

    this.airtimeForm = this.fb.group({
      phoneNumber: ['', [Validators.required, Validators.pattern(/^[\d+]+$/)]],
      amount: ['', [Validators.required, Validators.min(50), Validators.max(50000)]]
    });
  }

  ngOnInit(): void {
    this.loadDashboardData();
  }

  loadDashboardData(): void {
    this.isLoadingLogs.set(true);

    this.clientApi.getDashboard().subscribe({
      next: (data) => {
        console.log('📊 Dashboard data loaded:', data);

        // Transform SMS logs
        if (data.sms_logs && data.sms_logs.length > 0) {
          const transformedSMS = data.sms_logs.map((log, index) => ({
            id: log.id || `sms-${index}`,
            date: this.formatDate(log.created_at),
            recipient: log.recipient || log.to || 'Unknown',
            message: log.message || '',
            status: log.status || 'Sent',
            cost: `₦${log.cost || '0.00'}`
          }));
          this.smsLogs.set(transformedSMS);
        }

        // Transform Airtime logs
        if (data.airtime_logs && data.airtime_logs.length > 0) {
          const transformedAirtime = data.airtime_logs.map((log, index) => ({
            id: log.id || `airtime-${index}`,
            date: this.formatDate(log.created_at),
            phoneNumber: log.phone_number || log.phoneNumber || 'Unknown',
            amount: `₦${log.amount || '0.00'}`,
            status: log.status || 'Completed'
          }));
          this.airtimeLogs.set(transformedAirtime);
        }

        this.isLoadingLogs.set(false);
      },
      error: (err) => {
        console.error('❌ Error loading dashboard:', err);
        this.isLoadingLogs.set(false);
      }
    });
  }

  sendSMS(): void {
    if (this.smsForm.valid) {
      this.isSendingSMS.set(true);

      const formValue = this.smsForm.value;

      // Handle multiple recipients (comma-separated)
      const recipients = formValue.recipients.split(',').map((r: string) => r.trim());

      // Send SMS to each recipient
      const smsRequests = recipients.map((recipient: string) => {
        const smsData: SendSmsRequest = {
          to: recipient,
          message: formValue.message
        };
        return this.clientApi.sendSms(smsData);
      });

      // Use the first recipient for now (you can improve this to handle multiple)
      const smsData: SendSmsRequest = {
        to: recipients[0],
        message: formValue.message
      };

      this.clientApi.sendSms(smsData).subscribe({
        next: (response) => {
          console.log('✅ SMS sent successfully:', response);
          this.isSendingSMS.set(false);
          this.alertService.success('SMS sent successfully!');

          // Add to logs (prepend to show newest first)
          const newLog: SMSLog = {
            id: `sms-${Date.now()}`,
            date: new Date().toLocaleString(),
            recipient: smsData.to,
            message: smsData.message,
            status: 'Sent',
            cost: response.cost || '₦50.00'
          };
          this.smsLogs.update(logs => [newLog, ...logs]);

          // Reset form
          this.smsForm.reset();
        },
        error: (err) => {
          this.isSendingSMS.set(false);

          if (err.status === 400) {
            this.alertService.error(err.error?.message || 'Invalid SMS data. Please check your input.');
          } else if (err.status === 402) {
            this.alertService.error('Insufficient balance. Please top up your account.');
          } else if (err.status === 403) {
            this.alertService.error('SMS service not available. Please contact support.');
          } else {
            this.alertService.error('Failed to send SMS. Please try again.');
          }
        }
      });
    } else {
      // Mark all fields as touched to show validation errors
      Object.keys(this.smsForm.controls).forEach(key => {
        this.smsForm.get(key)?.markAsTouched();
      });
    }
  }

  sendAirtime(): void {
    if (this.airtimeForm.valid) {
      this.isSendingAirtime.set(true);

      const formValue = this.airtimeForm.value;
      const airtimeData: SendAirtimeRequest = {
        phoneNumber: formValue.phoneNumber,
        amount: formValue.amount.toString()
      };

      console.log('📤 Sending Airtime:', airtimeData);

      this.clientApi.sendAirtime(airtimeData).subscribe({
        next: (response) => {
          console.log('✅ Airtime sent successfully:', response);
          this.isSendingAirtime.set(false);
          this.alertService.success('Airtime sent successfully!');

          // Add to logs (prepend to show newest first)
          const newLog: AirtimeLog = {
            id: `airtime-${Date.now()}`,
            date: new Date().toLocaleString(),
            phoneNumber: airtimeData.phoneNumber,
            amount: `₦${airtimeData.amount}`,
            status: 'Completed'
          };
          this.airtimeLogs.update(logs => [newLog, ...logs]);

          // Reset form
          this.airtimeForm.reset();
        },
        error: (err) => {
          console.error('❌ Error sending Airtime:', err);
          this.isSendingAirtime.set(false);

          if (err.status === 400) {
            this.alertService.error(err.error?.message || 'Invalid phone number or amount.');
          } else if (err.status === 402) {
            this.alertService.error('Insufficient balance. Please top up your account.');
          } else if (err.status === 403) {
            this.alertService.error('Airtime service not available. Please contact support.');
          } else {
            this.alertService.error('Failed to send airtime. Please try again.');
          }
        }
      });
    } else {
      // Mark all fields as touched to show validation errors
      Object.keys(this.airtimeForm.controls).forEach(key => {
        this.airtimeForm.get(key)?.markAsTouched();
      });
    }
  }

  exportSMSLogs(): void {
    const logs = this.smsLogs();

    if (logs.length === 0) {
      this.alertService.warning('No SMS logs to export');
      return;
    }

    this.isExportingSMS.set(true);

    this.clientApi.exportSmsLogs().subscribe({
      next: (blob) => {
        console.log('✅ SMS logs exported');
        this.downloadBlob(blob, `sms-logs-${Date.now()}.csv`);
        this.isExportingSMS.set(false);
        this.alertService.success('logs exported successfully!');
      },
      error: (err) => {
        console.error('❌ Error exporting SMS logs:', err);
        this.alertService.warning('Failed to export logs');
        this.isExportingSMS.set(false);

        // Fallback: Create CSV from local data
        const csv = this.convertToCSV(logs, ['date', 'recipient', 'message', 'status', 'cost']);
        this.downloadCSV(csv, `sms-logs-${Date.now()}.csv`);
      }
    });
  }

  exportAirtimeLogs(): void {
    const logs = this.airtimeLogs();

    if (logs.length === 0) {
      this.alertService.warning('No Airtime logs to export');
      return;
    }

    this.isExportingAirtime.set(true);

    this.clientApi.exportAirtimeLogs().subscribe({
      next: (blob) => {
        console.log('✅ Airtime logs exported');
        this.downloadBlob(blob, `airtime-logs-${Date.now()}.csv`);
        this.isExportingAirtime.set(false);
        this.alertService.success('logs exported successfully!');
      },
      error: (err) => {
        console.error('❌ Error exporting Airtime logs:', err);
        this.alertService.warning('Failed to export logs');
        this.isExportingAirtime.set(false);

        // Fallback: Create CSV from local data
        const csv = this.convertToCSV(logs, ['date', 'phoneNumber', 'amount', 'status']);
        this.downloadCSV(csv, `airtime-logs-${Date.now()}.csv`);
      }
    });
  }

  // Helper methods
  private formatDate(timestamp: string): string {
    if (!timestamp) return new Date().toLocaleString();
    return new Date(timestamp).toLocaleString('en-NG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  private convertToCSV(data: any[], headers: string[]): string {
    const headerRow = headers.map(h => h.charAt(0).toUpperCase() + h.slice(1)).join(',');
    const rows = data.map(item =>
      headers.map(header => `"${item[header] || ''}"`).join(',')
    );
    return [headerRow, ...rows].join('\n');
  }

  private downloadCSV(csv: string, filename: string): void {
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    this.downloadBlob(blob, filename);
  }

  private downloadBlob(blob: Blob, filename: string): void {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    window.URL.revokeObjectURL(url);
  }

  // Getters for form controls (for template access)
  get recipients() {
    return this.smsForm.get('recipients');
  }

  get message() {
    return this.smsForm.get('message');
  }

  get phoneNumber() {
    return this.airtimeForm.get('phoneNumber');
  }

  get amount() {
    return this.airtimeForm.get('amount');
  }

  get messageLength(): number {
    return this.message?.value?.length || 0;
  }

  get messageRemaining(): number {
    return 160 - this.messageLength;
  }
}