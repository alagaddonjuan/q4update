import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ClientApiService } from '../../../core/services/client-api';

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
export class BillingScreen implements OnInit {
  private readonly apiService = inject(ClientApiService);
  private readonly fb = inject(FormBuilder);

  buyTokensForm: FormGroup;
  conversionRate = signal<number>(1);
  transactions = signal<Transaction[]>([]);
  isLoading = signal<boolean>(false);
  error = signal<string | null>(null);

  constructor() {
    this.buyTokensForm = this.fb.group({
      amount: ['', [Validators.required, Validators.min(1)]]
    });
  }

  ngOnInit(): void {
    this.loadTransactions();
  }

  get calculatedTokens(): number {
    const amount = this.buyTokensForm.get('amount')?.value;
    return amount ? amount * this.conversionRate() : 0;
  }

  private loadTransactions(): void {
    this.isLoading.set(true);
    this.error.set(null);

    this.apiService.getDashboard().subscribe({
      next: (data) => {
        // Map API transactions to your Transaction interface
        const transactionsData = data?.transactions || [];
        const mappedTransactions: Transaction[] = transactionsData.map((tx: any) => ({
          date: new Date(tx.created_at).toLocaleString('en-US', { 
            month: 'numeric',
            day: 'numeric', 
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            second: '2-digit',
            hour12: true
          }),
          reference: tx.reference || tx.id,
          amount: `₦${parseFloat(tx.amount).toFixed(2)}`,
          tokens: tx.tokens || tx.amount, // Adjust based on your API response
          status: tx.status || 'Pending'
        }));
        
        this.transactions.set(mappedTransactions);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Error loading transactions:', err);
        this.error.set('Failed to load transactions. Please try again later.');
        this.transactions.set([]);
        this.isLoading.set(false);
      }
    });
  }

  handlePayment(method: 'paystack' | 'squad'): void {
    if (this.buyTokensForm.invalid) {
      return;
    }

    const amount = this.buyTokensForm.get('amount')?.value;
    this.isLoading.set(true);
    this.error.set(null);

    const paymentRequest = { amount: amount.toString() };
    
    const paymentObservable = method === 'paystack' 
      ? this.apiService.initializePaystackPayment(paymentRequest)
      : this.apiService.initializeSquadPayment(paymentRequest);

    paymentObservable.subscribe({
      next: (response) => {
        console.log('Payment initialized:', response);
        
        // If the API returns a payment URL, redirect to it
        if (response.authorization_url || response.checkout_url) {
          window.location.href = response.authorization_url || response.checkout_url;
        } else {
          // Otherwise, show success message and reload transactions
          alert(`Payment initiated successfully!\nAmount: ₦${amount}\nTokens: ${this.calculatedTokens}`);
          this.loadTransactions();
        }
        
        this.buyTokensForm.reset();
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Payment error:', err);
        this.error.set(err.error?.message || 'Payment initialization failed');
        this.isLoading.set(false);
        alert(`Payment failed: ${this.error()}`);
      }
    });
  }
}




