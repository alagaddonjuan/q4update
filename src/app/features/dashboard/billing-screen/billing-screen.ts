import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';

interface Transaction {
  date: string;
  reference: string;
  amount: string;
  tokens: number;
  status: string;
}

@Component({
  selector: 'app-billing-screen',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './billing-screen.html',
  styleUrl: './billing-screen.css',
})

export class BillingScreen {
    buyTokensForm: FormGroup;
  conversionRate: number = 1;
  
  transactions: Transaction[] = [
    {
      date: '11/5/2025, 4:06:45 PM',
      reference: 'b9808708dd786a4ec204c430e54c409d',
      amount: '₦5000.00',
      tokens: 5000,
      status: 'Pending'
    },
    {
      date: '9/26/2025, 8:27:49 AM',
      reference: '9d5367401097456ba654ef45cdde392a',
      amount: '₦5000.00',
      tokens: 5000,
      status: 'Pending'
    },
    {
      date: '8/12/2025, 6:11:24 PM',
      reference: '20b6ce994b10c5306bfee1da51fa560c',
      amount: '₦1000.00',
      tokens: 1000,
      status: 'Pending'
    },
    {
      date: '8/12/2025, 6:09:27 PM',
      reference: 'ea4e74c678f73457caa88bd42e270a69',
      amount: '₦1000.00',
      tokens: 1000,
      status: 'Pending'
    }
  ];

  constructor(private fb: FormBuilder) {
    this.buyTokensForm = this.fb.group({
      amount: ['', [Validators.required, Validators.min(1)]]
    });
  }

  get calculatedTokens(): number {
    const amount = this.buyTokensForm.get('amount')?.value;
    return amount ? amount * this.conversionRate : 0;
  }

  handlePayment(method: 'paystack' | 'q4'): void {
    if (this.buyTokensForm.valid) {
      const amount = this.buyTokensForm.get('amount')?.value;
      const tokens = this.calculatedTokens;
      
      console.log(`Processing payment with ${method}`);
      console.log(`Amount: ₦${amount}, Tokens: ${tokens}`);
      
      // Generate a mock reference
      const reference = this.generateReference();
      
      // Add new transaction to the list
      const newTransaction: Transaction = {
        date: new Date().toLocaleString('en-US', { 
          month: 'numeric',
          day: 'numeric', 
          year: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
          second: '2-digit',
          hour12: true
        }),
        reference: reference,
        amount: `₦${amount.toFixed(2)}`,
        tokens: tokens,
        status: 'Pending'
      };
      
      this.transactions.unshift(newTransaction);
      
      // Reset form
      this.buyTokensForm.reset();
      
      alert(`Payment initiated with ${method === 'paystack' ? 'Paystack' : 'Q4 Payment'}!\nAmount: ₦${amount}\nTokens: ${tokens}`);
    }
  }

  private generateReference(): string {
    return Array.from({ length: 32 }, () => 
      Math.floor(Math.random() * 16).toString(16)
    ).join('');
  }
}
