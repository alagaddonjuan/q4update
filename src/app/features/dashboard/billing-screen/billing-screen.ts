import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ClientApiService } from '../../../core/services/client-api';
import { AlertService } from '../../../core/services/alert.service';

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
  alertService = inject(AlertService);

  buyTokensForm: FormGroup;
  conversionRate = signal<number>(1);
  transactions = signal<Transaction[]>([]);
  isLoading = signal<boolean>(false);

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

    this.apiService.getTransactionHistory().subscribe({
      next: (data) => {
        const transformedTransactions = data.map((tx: any) => ({
          date: new Date(tx.created_at).toLocaleDateString(),
          reference: tx.reference || 'N/A',
          amount: `₦${tx.amount}`,
          tokens: tx.tokens || 0,
          status: tx.status || 'Unknown'
        }));
        this.transactions.set(transformedTransactions);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Error loading transactions:', err);
        this.alertService.error('Failed to load transaction history');
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
          this.alertService.error(`Payment initiated successfully!\nAmount: ₦${amount}\nTokens: ${this.calculatedTokens}`);
          this.loadTransactions();
        }

        this.buyTokensForm.reset();
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Payment error:', err);
        this.alertService.error(err.error?.message || 'Payment initialization failed');
        this.isLoading.set(false);
      }
    });
  }
}




