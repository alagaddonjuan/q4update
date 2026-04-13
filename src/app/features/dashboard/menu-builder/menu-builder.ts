import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ClientApiService } from '../../../core/services/client-api';
import { AlertService } from '../../../core/services/alert.service';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';

interface UssdMenu {
  id: number;
  name: string;
  description?: string;
  status: 'Active' | 'Inactive';
  isActive?: boolean;
  itemsCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

@Component({
  selector: 'app-menu-builder',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './menu-builder.html',
  styleUrl: './menu-builder.css',
})
export class MenuBuilder implements OnInit {
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder); //

  private readonly clientApi = inject(ClientApiService);
  alertService = inject(AlertService);

  // Signals for reactive state management
  private readonly menusSignal = signal<UssdMenu[]>([]);
  readonly isLoading = signal<boolean>(true);
  readonly activeMenuId = computed(() => this.menusSignal().find(m => m.isActive)?.id ?? null);
  readonly isTogglingStatus = signal<{ [key: number]: boolean }>({}); //

  // Modal state for creating new menu
  readonly showCreateMenuModal = signal<boolean>(false);
  createMenuForm: FormGroup = this.fb.group({
    menu_name: ['', Validators.required],
    ussd_code: [''],
  });

  constructor() {
  }

  // Expose menus as readonly getter
  get menus(): UssdMenu[] {
    return this.menusSignal();
  }

  ngOnInit(): void {
    this.loadMenus();
  }

  loadMenus(): void {
    this.isLoading.set(true);
    // this.error.set(null);

    this.clientApi.getUssdMenus().subscribe({
      next: (menus) => {
        console.log('📋 USSD Menus loaded:', menus);

        const transformedMenus = menus.map(menu => ({
          id: menu.id || menu.menu_id,
          name: menu.name || menu.menu_name || 'Untitled Menu',
          description: menu.description,
          status: this.normalizeStatus(menu.is_active || menu.status),
          isActive: menu.is_active === true || menu.is_active === 1,
          itemsCount: menu.items_count || menu.itemsCount || 0,
          createdAt: menu.created_at || menu.createdAt,
          updatedAt: menu.updated_at || menu.updatedAt
        }));

        this.menusSignal.set(transformedMenus);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('❌ Error loading USSD menus:', err);

        if (err.status === 404) {
          this.alertService.error('USSD menu feature is not available yet.');

          // Fallback data for development
          this.menusSignal.set([
            {
              id: 1,
              name: 'Main Menu',
              description: 'Default main menu',
              status: 'Active',
              isActive: true,
              itemsCount: 5,
              createdAt: new Date().toISOString()
            },
            {
              id: 2,
              name: 'Modern Lottery Menu',
              description: 'Lottery services menu',
              status: 'Inactive',
              isActive: false,
              itemsCount: 3,
              createdAt: new Date().toISOString()
            }
          ]);
        } else if (err.status === 0) {
          this.alertService.error('Cannot connect to server. Please check if the API is running.');
        } else {
          this.alertService.error('Failed to load USSD menus. Please try again.');
        }

        this.isLoading.set(false);
      }
    });
  }

  editMenu(menu: UssdMenu): void {
    console.log('✏️ Editing menu:', menu);
    // Navigate to edit page with menu ID
    this.router.navigate(['/user/menus', menu.id, 'edit']);
  }

  toggleMenuStatus(menu: UssdMenu): void {
    const menuId = menu.id;
    const newStatus: 'Active' | 'Inactive' = menu.status === 'Active' ? 'Inactive' : 'Active';
    const isActivePayload = newStatus === 'Active';

    // Set loading state for this specific menu
    this.isTogglingStatus.update(state => ({ ...state, [menuId]: true }));

    const updateStateLocally = () => {
      this.menusSignal.update(menus =>
        menus.map(m => {
          if (m.id === menuId) {
            return { ...m, status: newStatus, isActive: newStatus === 'Active' };
          }
          if (newStatus === 'Active') {
            return { ...m, status: 'Inactive', isActive: false };
          }
          return m;
        })
      );
      this.alertService.success(`Menu "${menu.name}" is now ${newStatus}`);
      this.isTogglingStatus.update(state => ({ ...state, [menuId]: false }));
    };

    this.clientApi.setActiveMenu(menuId, isActivePayload).subscribe({
      next: () => {
        updateStateLocally();
      },
      error: (err) => {
        console.error(`❌ Error changing menu status to ${newStatus}:`, err);

        if (err.status === 404) {
          updateStateLocally();
        } else {
          this.isTogglingStatus.update(state => ({ ...state, [menuId]: false }));
          if (err.status === 400) {
            this.alertService.error(err.error?.message || 'Invalid menu ID.');
          } else if (err.status === 403) {
            this.alertService.error('You do not have permission to modify menus.');
          } else {
            this.alertService.error(`Failed to update menu "${menu.name}". Please try again.`);
          }
        }
      }
    });
  }

  openCreateMenuModal(): void {
    this.showCreateMenuModal.set(true);
    this.createMenuForm.reset(); // Clear form when opening
  }

  closeCreateMenuModal(): void {
    this.showCreateMenuModal.set(false);
  }

  createMenu(): void {
    if (this.createMenuForm.invalid) {
      this.createMenuForm.markAllAsTouched();
      this.alertService.warning('Please fill in all required fields correctly.');
      return;
    }

    const { menu_name, ussd_code } = this.createMenuForm.value;

    if (!menu_name) {
      this.alertService.error('Menu name is required.');
      return;
    }

    this.clientApi.createUssdMenu({ menu_name, ussd_code }).subscribe({
      next: (response) => {
        this.alertService.success(`Menu "${menu_name}" created successfully!`);
        this.closeCreateMenuModal();
        this.loadMenus(); // Reload the list of menus to include the new one
      },
      error: (err) => {
        console.error('❌ Error creating new menu:', err);
        this.alertService.error(err.error?.message || 'Failed to create menu. Please try again.');
      }
    });
  }

  // This method is no longer needed as openCreateMenuModal() is called directly from the button
  createNewMenu(): void {
    this.openCreateMenuModal();
  }

  deleteMenu(menu: UssdMenu, event: Event): void {
    event.stopPropagation(); // Prevent triggering editMenu

    if (!confirm(`Are you sure you want to delete "${menu.name}"? This action cannot be undone.`)) {
      return;
    }

    console.log('🗑️ Deleting menu:', menu.name);

    // TODO: Implement delete API call
    // this.clientApi.deleteUssdMenu(menu.id).subscribe(...)

    // For now, remove locally
    this.menusSignal.update(menus => menus.filter(m => m.id !== menu.id));
    this.alertService.success(`Menu "${menu.name}" has been deleted`);
  }

  duplicateMenu(menu: UssdMenu, event: Event): void {
    event.stopPropagation(); // Prevent triggering editMenu

    // TODO: Implement duplicate API call
    // For now, create a copy locally
    const newMenu: UssdMenu = {
      id: Date.now(), // Temporary ID
      name: `${menu.name} (Copy)`,
      description: menu.description,
      status: 'Inactive',
      isActive: false,
      itemsCount: menu.itemsCount,
      createdAt: new Date().toISOString()
    };

    this.menusSignal.update(menus => [...menus, newMenu]);
    this.alertService.success(`Menu "${menu.name}" has been duplicated`);
  }

  refreshMenus(): void {
    this.loadMenus();
  }

  // Helper methods
  private normalizeStatus(status: any): 'Active' | 'Inactive' {
    if (typeof status === 'boolean') {
      return status ? 'Active' : 'Inactive';
    }
    if (typeof status === 'number') {
      return status === 1 ? 'Active' : 'Inactive';
    }
    if (typeof status === 'string') {
      const normalized = status.toLowerCase();
      if (normalized === 'active' || normalized === '1' || normalized === 'true') {
        return 'Active';
      }
    }
    return 'Inactive';
  }

  formatDate(dateString: string | undefined): string {
    if (!dateString) return 'N/A';

    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-NG', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (e) {
      return 'N/A';
    }
  }

  isMenuToggling(menuId: number): boolean {
    return this.isTogglingStatus()[menuId] || false;
  }

  get totalMenus(): number {
    return this.menusSignal().length;
  }

  get activeMenusCount(): number {
    return this.menusSignal().filter(m => m.status === 'Active').length;
  }

  get inactiveMenusCount(): number {
    return this.menusSignal().filter(m => m.status === 'Inactive').length;
  }
}
