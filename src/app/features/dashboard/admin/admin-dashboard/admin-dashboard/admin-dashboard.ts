import { AdminStats, ManualTransaction, PricingTierPrices, PricingTiersResponse, SendAnnouncementRequest } from './../../../../../core/models/api.model';
import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal, WritableSignal, OnInit, AfterViewInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { AdminApi } from '../../../../../core/services/admin-api';
import { AlertService } from '../../../../../core/services/alert.service';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

@Component({
  selector: 'app-admin-dashboard',
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './admin-dashboard.html',
  styleUrl: './admin-dashboard.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminDashboard implements OnInit, AfterViewInit, OnDestroy {

  adminApi = inject(AdminApi);
  alertService = inject(AlertService);
  fb = inject(FormBuilder);

  @ViewChild('chartCanvas') chartCanvas!: ElementRef<HTMLCanvasElement>;
  chart: Chart | null = null;

  // Modal state
  showEditPricesModal = signal(false);
  selectedTier = signal<PricingTiersResponse | null>(null);

  // Top-Up Client Wallet
  topUpForm = this.fb.nonNullable.group({
    clientId: ["", Validators.compose([Validators.required])],
    amount: ["", Validators.compose([Validators.required, Validators.min(1)])],
  })

  transactionForm = this.fb.nonNullable.group({
    clientId: ["", Validators.compose([Validators.required])],
    transactionType: ["", Validators.compose([Validators.required])],
    amount: ["", Validators.compose([Validators.required, Validators.min(1)])],
    reason: [""],
  })

  announcementForm = this.fb.nonNullable.group({
    subject: ["", Validators.compose([Validators.required])],
    message: ["", Validators.compose([Validators.required])],
  })

  // Edit Prices Form
  editPricesForm = this.fb.nonNullable.group({
    sms_price: ["", Validators.compose([Validators.required, Validators.min(0)])],
    ussd_multiplier: ["", Validators.compose([Validators.required, Validators.min(0)])],
  })

  createTierForm = this.fb.nonNullable.group({
    tier_name: ["", Validators.compose([Validators.required])],
  })


  // Pricing Tiers
  pricingTiers = signal<PricingTiersResponse[]>([]);
  adminStats: WritableSignal<AdminStats | null> = signal(null);
  isStatsLoading = signal(false);

  ngOnInit() {
    this.getStats();
    this.getPricingTiers();
  }

  ngAfterViewInit(): void {
    // Chart initialized after data load
  }

  ngOnDestroy(): void {
    if (this.chart) {
      this.chart.destroy();
    }
  }

  getStats() {
    this.isStatsLoading.set(true);
    this.adminApi.getStats().subscribe({
      next: (stats) => {
        this.adminStats.set(stats);
        this.isStatsLoading.set(false);

        // Create chart after data is loaded
        setTimeout(() => {
          this.createChart(stats as any);
        }, 100);
      },
      error: (err) => {
        this.isStatsLoading.set(false);
        console.error('Error fetching stats:', err);
        this.alertService.error(`Failed to fetch admin stats: ${err.message || err}`);
      }
    })
  }

  createChart(data: any): void {
    if (!this.chartCanvas) return;

    const ctx = this.chartCanvas.nativeElement.getContext('2d');
    if (ctx) {
      if (this.chart) {
        this.chart.destroy();
      }

      const chartLabels = data?.chartLabels || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      const ussdValues = data?.ussdChartValues || [0, 0, 0, 0, 0, 0, 0];
      const smsValues = data?.smsChartValues || [0, 0, 0, 0, 0, 0, 0];

      this.chart = new Chart(ctx, {
        type: 'line',
        data: {
          labels: chartLabels,
          datasets: [
            {
              label: 'USSD Sessions',
              data: ussdValues,
              borderColor: '#14b8a6',
              backgroundColor: 'rgba(20, 184, 166, 0.1)',
              fill: true,
              tension: 0.4,
              pointRadius: 4,
              pointBackgroundColor: '#14b8a6'
            },
            {
              label: 'SMS Sent',
              data: smsValues,
              borderColor: '#3b82f6',
              backgroundColor: 'rgba(59, 130, 246, 0.1)',
              fill: true,
              tension: 0.4,
              pointRadius: 4,
              pointBackgroundColor: '#3b82f6'
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: true,
              position: 'top'
            },
            tooltip: {
              backgroundColor: '#1f2937',
              padding: 12,
              titleColor: '#fff',
              bodyColor: '#fff',
              borderColor: '#14b8a6',
              borderWidth: 1
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              grid: {
                color: '#f3f4f6'
              }
            },
            x: {
              grid: {
                display: false
              }
            }
          }
        }
      });
    }
  }

  addCredit() {
    if (this.topUpForm.valid) {
      const { clientId, amount } = this.topUpForm.value;

      this.adminApi.manualTopup({
        clientId: Number(clientId),
        amount: Number(amount)
      }).subscribe({
        next: (response) => {
          this.alertService.success(`Successfully added ${amount} tokens to client ${clientId}`);
          this.topUpForm.reset();
        },
        error: (err) => {
          console.error('Error adding credit:', err);
          this.alertService.error(`Failed to add credit: ${err.message || err}`);
        }
      });
    } else {
      console.warn('Top-Up form is invalid');
      this.alertService.warning('Please fill in all required fields correctly.');
    }
  }

  getPricingTiers() {
    this.adminApi.getPricingTiers().subscribe({
      next: (tiers) => {
        this.pricingTiers.set(tiers || [])
      },
      error: (err) => {
        console.error('Error fetching pricing tiers:', err);
        this.alertService.error(`Failed to fetch pricing tiers: ${err.message || err}`);
      }
    })
  }

  openEditPricesModal(tier: any) {
    this.selectedTier.set(tier);

    // Pre-populate the form with current values
    this.editPricesForm.patchValue({
      sms_price: tier.sms_price || 0,
      ussd_multiplier: tier.ussd_multiplier || 0,
    });

    this.showEditPricesModal.set(true);
  }

  closeEditPricesModal() {
    this.showEditPricesModal.set(false);
    this.selectedTier.set(null);
    this.editPricesForm.reset();
  }

  savePrices() {
    if (!this.editPricesForm.valid) {
      this.alertService.warning('Please fill in all required fields correctly.');
      return;
    }

    const tier = this.selectedTier();
    if (!tier) {
      this.alertService.warning('No tier selected');
      return;
    }

    const updateTier: PricingTierPrices = {
      // tierName: tier.tier_name,
      sms_price: String(this.editPricesForm.value.sms_price || ''),
      ussd_multiplier: String(this.editPricesForm.value.ussd_multiplier || ''),
    };

    this.adminApi.updateTierPrices(tier.id, updateTier).subscribe({
      next: (response) => {
        this.alertService.success(`Prices for ${tier.tier_name} updated successfully`);
        this.closeEditPricesModal();
        this.getPricingTiers(); // Refresh the tiers list
      },
      error: (err) => {
        console.error('Error updating prices:', err);
        this.alertService.error(`Failed to update prices: ${err.message || err}`);
      }
    })
  }

  createTier() {
    if (!this.createTierForm.valid) {
      this.alertService.warning('Please provide a valid tier name.');
      return;
    }
    const tier = { tier_name: (this.createTierForm.value.tier_name || '').trim() };

    this.adminApi.createPricingTier(tier).subscribe({
      next: (res: any) => {
        this.alertService.success(res?.message || 'Pricing tier created successfully');

        this.createTierForm.reset();
        this.getPricingTiers();
      },
      error: (err) => {
        console.error('Error creating pricing tier:', err);
        this.alertService.error(`Failed to create pricing tier: ${err.message || err}`);
      }
    })
  }

  processTransaction() {
    if (!this.transactionForm.valid) {
      this.alertService.warning('Please fill in all required fields correctly.');
      return;
    }

    const manualTransaction: ManualTransaction = {
      clientId: Number(this.transactionForm.value.clientId),
      type: this.transactionForm.value.transactionType || '',
      amount: Number(this.transactionForm.value.amount),
      reason: this.transactionForm.value.reason || ''
    };

    this.adminApi.manualTransaction(manualTransaction).subscribe({
      next: (response) => {
        this.alertService.success('Transaction processed successfully');
        this.transactionForm.reset();
      },
      error: (err) => {
        console.error('Error processing transaction:', err);
        this.alertService.error(`Failed to process transaction: ${err.message || err}`);
      }
    })
  }

  sendAnnouncement() {
    if (!this.announcementForm.valid) {
      this.alertService.warning('Please fill in all required fields correctly.');
      return;
    }

    const announcement: SendAnnouncementRequest = {
      subject: this.announcementForm.value.subject || '',
      message: this.announcementForm.value.message || '',
    };

    this.adminApi.sendAnnouncement(announcement).subscribe({
      next: (response) => {
        this.alertService.success('Announcement sent successfully');
        this.announcementForm.reset();
      },
      error: (err) => {
        console.error('Error sending announcement:', err);
        this.alertService.error(`Failed to send announcement: ${err.message || err}`);
      }
    })
  }
}
