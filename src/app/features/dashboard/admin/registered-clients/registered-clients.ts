import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ClientsResponse, PricingTiersResponse } from '../../../../core/models/api.model';
import { AdminApi } from '../../../../core/services/admin-api';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AlertService } from '../../../../core/services/alert.service';

@Component({
  selector: 'app-registered-clients',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './registered-clients.html',
  styleUrl: './registered-clients.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegisteredClients {
  clientService = inject(AdminApi);
  adminApi = inject(AdminApi);
  alertService = inject(AlertService);

  fb = inject(FormBuilder);

  clients = signal<ClientsResponse[]>([]);
  // Modal state
  showEditClientsModal = signal(false);
  selectedClient = signal<ClientsResponse | null>(null);

  // Confirmation Modal state
  showConfirmationModal = signal(false);
  clientToConfirm = signal<ClientsResponse | null>(null);
  confirmationAction = signal<'enable' | 'disable' | 'approve' | 'reject' | null>(null);

  pricingTiers = signal<PricingTiersResponse[]>([]);

  // Submission state
  isSubmitting = signal(false);
  isLoading = signal(false);
  submitError = signal<string | null>(null);
  originalPricingTierId = signal<number | null>(null);

  // Edit Clients Form
  editClientsForm = this.fb.nonNullable.group({
    name: ["", Validators.compose([Validators.required])],
    ussd_code: [""],
    sender_id: [""],
    pricingTier: [""],
  })

  ngOnInit() {
    this.getClients();
    this.getPricingTiers();
  }

  getClients() {
    this.isLoading.set(true);
    this.clientService.getClients().subscribe({
      next: (response) => {
        this.clients.set(response.data || []);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Error fetching clients:', err);
        this.alertService.error(`Failed to fetch clients: ${err.message || err}`);
        this.isLoading.set(false);
      }
    })
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

  approveClient(client: ClientsResponse) {
    this.openConfirmationModal(client, 'approve');
  }

  rejectClient(client: ClientsResponse) {
    this.openConfirmationModal(client, 'reject');
  }

  disableClient(client: ClientsResponse) {
    this.openConfirmationModal(client, 'disable');
  }

  enableClient(client: ClientsResponse) {
    this.openConfirmationModal(client, 'enable');
  }

  openEditClientsModal(client: ClientsResponse) {
    // Set the selected client  
    this.selectedClient.set(client);
    // Store original pricing tier id for comparison
    this.originalPricingTierId.set(client.pricing_tier_id || null);

    // Pre-populate the form with current values
    this.editClientsForm.patchValue({
      name: client.name || '',
      ussd_code: client.ussd_code || '',
      sender_id: client.sender_id || '',
      pricingTier: client.pricing_tier_id ? String(client.pricing_tier_id) : '',
    });

    this.showEditClientsModal.set(true);
  }

  closeEditClientsModal() {
    this.showEditClientsModal.set(false);
    this.selectedClient.set(null);
    this.submitError.set(null);
    this.originalPricingTierId.set(null);
    this.editClientsForm.reset();
  }

  openConfirmationModal(client: ClientsResponse, action: 'enable' | 'disable' | 'approve' | 'reject') {
    this.clientToConfirm.set(client);
    this.confirmationAction.set(action);
    this.showConfirmationModal.set(true);
  }

  closeConfirmationModal() {
    this.showConfirmationModal.set(false);
    this.clientToConfirm.set(null);
    this.confirmationAction.set(null);
  }

  confirmAction() {
    const client = this.clientToConfirm();
    const action = this.confirmationAction();

    if (!client || !action) {
      return;
    }

    let status: 'active' | 'suspended';
    switch (action) {
      case 'enable':
      case 'approve':
        status = 'active';
        break;
      case 'disable':
      case 'reject':
        status = 'suspended';
        break;
      default:
        return;
    }

    this.adminApi.updateClientStatus(client.id, status).subscribe({
      next: () => {
        client.status = status === 'active' ? 'active' : 'disabled';
        const actionText = action.charAt(0).toUpperCase() + action.slice(1);
        this.alertService.success(`Client ${client.name} has been ${actionText.toLowerCase()}ed`);
        this.closeConfirmationModal();
      },
      error: (err) => {
        console.error(`Error performing ${action} on client:`, err);
        this.alertService.error(`Failed to ${action} client. Please try again.`);
      }
    });
  }

  submit() {
    if (this.editClientsForm.invalid || !this.selectedClient() || this.isSubmitting()) {
      return;
    }

    this.isSubmitting.set(true);
    this.submitError.set(null);

    const clientId = this.selectedClient()!.id;
    const detailsPayload = {
      name: this.editClientsForm.value.name || '',
      ussd_code: this.editClientsForm.value.ussd_code || '',
      sender_id: this.editClientsForm.value.sender_id || '',
    };

    const newPricingTierId = this.editClientsForm.value.pricingTier
      ? parseInt(this.editClientsForm.value.pricingTier, 10)
      : null;
    const pricingTierChanged = newPricingTierId !== this.originalPricingTierId();

    // First request: Update client details
    this.adminApi.updateClientDetails(clientId, detailsPayload).subscribe({
      next: (updatedClient: any) => {
        // Update the client list with new details
        this.clients.update(clients => clients.map(client =>
          client.id === updatedClient.id
            ? { ...client, ...updatedClient }
            : client
        ));

        // Second request: Assign tier to client if pricing tier changed
        if (pricingTierChanged && newPricingTierId) {
          this.adminApi.assignTierToClient(clientId, newPricingTierId).subscribe({
            next: () => {
              // Update the client with new pricing tier info
              this.clients.update(clients => clients.map(client =>
                client.id === clientId
                  ? { ...client, pricing_tier_id: newPricingTierId }
                  : client
              ));
              this.closeEditClientsModal();
              this.alertService.success('Client updated successfully!');
              this.isSubmitting.set(false);
            },
            error: (err) => {
              console.error('Error assigning tier to client:', err);
              this.submitError.set('Client details updated, but failed to assign pricing tier. Please try again.');
              this.isSubmitting.set(false);
            }
          });
        } else {
          // No pricing tier change, just close modal
          this.closeEditClientsModal();
          this.alertService.success('Client details updated successfully!');
          this.isSubmitting.set(false);
        }
      },
      error: (err) => {
        this.alertService.error('Error updating client details:', err);
        this.submitError.set('Failed to update client. Please try again.');
        this.isSubmitting.set(false);
      }
    });
  }
}
