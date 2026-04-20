import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AdminApi } from '../../../../core/services/admin-api';
import { adminUssdMenuBuilderResponse } from '../../../../core/models/api.model';
import { AlertService } from '../../../../core/services/alert.service';
import { ClientApiService } from '../../../../core/services/client-api';

@Component({
  selector: 'app-admin-ussd-builder',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './admin-builder.html',
  styleUrl: './admin-builder.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminBuilder {
  private readonly adminApi = inject(AdminApi);
  private readonly clientApi = inject(ClientApiService);
  private readonly router = inject(Router);
  alertService = inject(AlertService);

  // Signals for state management
  private readonly menusSignal = signal<adminUssdMenuBuilderResponse[]>([]);
  readonly isLoading = signal<boolean>(true);
  readonly isTogglingStatus = signal<{ [key: number]: boolean }>({});
  readonly showDeleteModal = signal<boolean>(false);
  readonly selectedMenuForDelete = signal<adminUssdMenuBuilderResponse | null>(null);

  get menus(): adminUssdMenuBuilderResponse[] {
    return this.menusSignal();
  }

  ngOnInit() {
    this.loadMenus();
  }

  loadMenus(): void {
    this.isLoading.set(true);
    this.adminApi.ussdMenuBuilder().subscribe({
      next: (response) => {
        this.menusSignal.set(response);
        this.isLoading.set(false);
      },
      error: (error) => {
        this.alertService.error('Failed to fetch USSD Menus');
        this.isLoading.set(false);
      }
    });
  }

  toggleMenuStatus(menu: adminUssdMenuBuilderResponse): void {
    const menuId = menu.id;
    const newStatus: boolean = menu.is_active === 1 ? false : true;

    // Set loading state for this specific menu
    this.isTogglingStatus.update(state => ({ ...state, [menuId]: true }));

    const updateStateLocally = () => {
      this.menusSignal.update(menus =>
        menus.map(m => {
          if (m.id === menuId) {
            return { ...m, is_active: newStatus ? 1 : 0 };
          }
          return m;
        })
      );
      this.alertService.success(`Menu "${menu.menu_name}" is now ${newStatus ? 'Active' : 'Inactive'}`);
      this.isTogglingStatus.update(state => ({ ...state, [menuId]: false }));
    };

    this.clientApi.setActiveMenu(menuId, newStatus).subscribe({
      next: () => {
        updateStateLocally();
      },
      error: (err) => {
        console.error(`❌ Error changing menu status:`, err);
        this.alertService.error('Failed to update menu status');
        this.isTogglingStatus.update(state => ({ ...state, [menuId]: false }));
      }
    });
  }

  openDeleteModal(menu: adminUssdMenuBuilderResponse): void {
    this.selectedMenuForDelete.set(menu);
    this.showDeleteModal.set(true);
  }

  closeDeleteModal(): void {
    this.showDeleteModal.set(false);
    this.selectedMenuForDelete.set(null);
  }

  deleteMenu(): void {
    const menu = this.selectedMenuForDelete();
    if (!menu) return;

    const menuId = menu.id;
    this.isTogglingStatus.update(state => ({ ...state, [menuId]: true }));

    this.adminApi.deleteAdminMenuItem(menuId).subscribe({
      next: () => {
        this.alertService.success(`Menu "${menu.menu_name}" has been deleted`);
        // Remove from local list
        this.menusSignal.update(menus => menus.filter(m => m.id !== menuId));
        this.isTogglingStatus.update(state => ({ ...state, [menuId]: false }));
        this.closeDeleteModal();
      },
      error: (err) => {
        console.error('❌ Error deleting menu:', err);
        this.alertService.error(err.error?.message || 'Failed to delete menu. Please try again.');
        this.isTogglingStatus.update(state => ({ ...state, [menuId]: false }));
      }
    });
  }

  openMenuBuilder(menu: adminUssdMenuBuilderResponse): void {
    // Navigate to builder page with menu ID
    this.router.navigate(['/admin/menu-builder', menu.id]);
  }

  refreshMenus(): void {
    this.loadMenus();
  }

  isMenuToggling(menuId: number): boolean {
    return this.isTogglingStatus()[menuId] || false;
  }

  getStatusLabel(isActive: number | boolean): string {
    return isActive === 1 || isActive === true ? 'Active' : 'Inactive';
  }
}
