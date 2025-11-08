
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

interface UssdLog {
  date: string;
  phoneNumber: string;
  finalInput: string;
  status: string;
  cost: string;
}

@Component({
  selector: 'app-ussd-screen',
  imports: [CommonModule],
  templateUrl: './ussd-screen.html',
  styleUrl: './ussd-screen.css',
})
export class UssdScreen {
  ussdCode: string = '*347*102#';
  
  ussdLogs: UssdLog[] = [
    {
      date: '11/6/2025, 3:05:54 PM',
      phoneNumber: '+234813792075B',
      finalInput: '-',
      status: 'Incomplete',
      cost: '₦21.00'
    },
    {
      date: '11/6/2025, 3:05:05 PM',
      phoneNumber: '+234706857B70B',
      finalInput: '-',
      status: 'Success',
      cost: '₦21.00'
    },
    {
      date: '11/6/2025, 3:03:30 PM',
      phoneNumber: '+234813792075B',
      finalInput: '-',
      status: 'Success',
      cost: '₦63.00'
    },
    {
      date: '11/6/2025, 3:02:10 PM',
      phoneNumber: '+234813792075B',
      finalInput: '-',
      status: 'Incomplete',
      cost: '₦21.00'
    },
    {
      date: '11/6/2025, 3:01:23 PM',
      phoneNumber: '+234813792075B',
      finalInput: '-',
      status: 'Success',
      cost: '₦42.00'
    }
  ];

  exportCSV(): void {
    if (this.ussdLogs.length === 0) {
      alert('No USSD logs to export');
      return;
    }
    
    // Create CSV header
    const headers = ['Date', 'Phone Number', 'Final Input', 'Status', 'Cost (NGN)'];
    const csvHeader = headers.join(',');
    
    // Create CSV rows
    const csvRows = this.ussdLogs.map(log => 
      [
        `"${log.date}"`,
        `"${log.phoneNumber}"`,
        `"${log.finalInput}"`,
        `"${log.status}"`,
        `"${log.cost}"`
      ].join(',')
    );
    
    // Combine header and rows
    const csv = [csvHeader, ...csvRows].join('\n');
    
    // Create and download file
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ussd-logs-${new Date().getTime()}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
    
    console.log('CSV exported successfully');
  }
}
