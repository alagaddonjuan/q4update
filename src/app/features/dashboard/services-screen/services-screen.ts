import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';

interface SMSLog {
  date: string;
  status: string;
  cost: string;
}

interface AirtimeLog {
  date: string;
  phoneNumber: string;
  amount: string;
  status: string;
}

@Component({
  selector: 'app-services-screen',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './services-screen.html',
  styleUrl: './services-screen.css',
})
export class ServicesScreen {
  smsForm: FormGroup;
  airtimeForm: FormGroup;
  smsLogs: SMSLog[] = [];
  airtimeLogs: AirtimeLog[] = [];

    constructor(private fb: FormBuilder) {
    this.smsForm = this.fb.group({
      recipients: ['', Validators.required],
      message: ['', Validators.required]
    });

    this.airtimeForm = this.fb.group({
      phoneNumber: ['', [Validators.required, Validators.pattern(/^\d+$/)]],
      amount: ['', [Validators.required, Validators.min(1)]]
    });
  }
  sendSMS(): void {
    if (this.smsForm.valid) {
      const formValue = this.smsForm.value;
      console.log('Sending SMS:', formValue);
      
      // Add to logs
      this.smsLogs.push({
        date: new Date().toLocaleString(),
        status: 'Sent',
        cost: '₦50.00'
      });
      
      // Reset form
      this.smsForm.reset();
      
      alert('SMS sent successfully!');
    }
  }

  sendAirtime(): void {
    if (this.airtimeForm.valid) {
      const formValue = this.airtimeForm.value;
      console.log('Sending Airtime:', formValue);
      
      // Add to logs
      this.airtimeLogs.push({
        date: new Date().toLocaleString(),
        phoneNumber: formValue.phoneNumber,
        amount: `₦${formValue.amount}`,
        status: 'Completed'
      });
      
      // Reset form
      this.airtimeForm.reset();
      
      alert('Airtime sent successfully!');
    }
  }

  exportSMSLogs(): void {
    if (this.smsLogs.length === 0) {
      alert('No SMS logs to export');
      return;
    }
    
    const csv = this.convertToCSV(this.smsLogs, ['date', 'status', 'cost']);
    this.downloadCSV(csv, 'sms-logs.csv');
  }

  exportAirtimeLogs(): void {
    if (this.airtimeLogs.length === 0) {
      alert('No Airtime logs to export');
      return;
    }
    
    const csv = this.convertToCSV(this.airtimeLogs, ['date', 'phoneNumber', 'amount', 'status']);
    this.downloadCSV(csv, 'airtime-logs.csv');
  }

  private convertToCSV(data: any[], headers: string[]): string {
    const headerRow = headers.join(',');
    const rows = data.map(item => 
      headers.map(header => `"${item[header]}"`).join(',')
    );
    return [headerRow, ...rows].join('\n');
  }

  private downloadCSV(csv: string, filename: string): void {
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    window.URL.revokeObjectURL(url);
  }
}
