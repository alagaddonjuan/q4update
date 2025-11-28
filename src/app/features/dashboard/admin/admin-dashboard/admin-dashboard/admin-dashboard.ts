import { AdminStats, ManualTransaction, PricingTierPrices, PricingTiersResponse, SendAnnouncementRequest } from './../../../../../core/models/api.model';
import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal, WritableSignal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { AdminApi } from '../../../../../core/services/admin-api';
import { AlertService } from '../../../../../core/services/alert.service';

@Component({
  selector: 'app-admin-dashboard',
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './admin-dashboard.html',
  styleUrl: './admin-dashboard.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminDashboard {

  adminApi = inject(AdminApi);
  alertService = inject(AlertService);
  fb = inject(FormBuilder);

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

  ngOnInit() {
    this.getStats();
    this.getPricingTiers();
  }

  getStats() {
    this.adminApi.getStats().subscribe({
      next: (stats) => {
        this.adminStats.set(stats);
      },
      error: (err) => {
        console.error('Error fetching stats:', err);
        this.alertService.error(`Failed to fetch admin stats: ${err.message || err}`);
      }
    })
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
    // const tierName = this.tier_Name.value.trim();
    const tier = { tier_name: (this.createTierForm.value.tier_name || '').trim() };

    this.adminApi.createPricingTier(tier).subscribe({
      next: (response) => {
        this.alertService.success(`Pricing tier "${this.createTierForm.value}" created successfully`);
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
