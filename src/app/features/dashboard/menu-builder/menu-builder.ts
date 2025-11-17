import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ClientApiService } from '../../../core/services/client-api';

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
  imports: [CommonModule],
  templateUrl: './menu-builder.html',
  styleUrl: './menu-builder.css',
})
export class MenuBuilder implements OnInit {
  private readonly router = inject(Router);
  private readonly clientApi = inject(ClientApiService);

  // Signals for reactive state management
  private readonly menusSignal = signal<UssdMenu[]>([]);
  readonly isLoading = signal<boolean>(true);
  readonly error = signal<string | null>(null);
  readonly success = signal<string | null>(null);
  readonly activeMenuId = signal<number | null>(null);
  readonly isTogglingStatus = signal<{ [key: number]: boolean }>({});

  // Expose menus as readonly getter
  get menus(): UssdMenu[] {
    return this.menusSignal();
  }

  ngOnInit(): void {
    this.loadMenus();
  }

  loadMenus(): void {
    this.isLoading.set(true);
    this.error.set(null);

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

        // Find active menu
        const activeMenu = transformedMenus.find(m => m.isActive);
        if (activeMenu) {
          this.activeMenuId.set(activeMenu.id);
        }

        this.menusSignal.set(transformedMenus);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('❌ Error loading USSD menus:', err);
        
        if (err.status === 404) {
          console.log('⚠️ USSD menus endpoint not found. Using fallback data.');
          this.error.set('USSD menu feature is not available yet.');
          
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
          this.activeMenuId.set(1);
        } else if (err.status === 0) {
          this.error.set('Cannot connect to server. Please check if the API is running.');
        } else {
          this.error.set('Failed to load USSD menus. Please try again.');
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
    
    // Set loading state for this specific menu
    this.isTogglingStatus.update(state => ({ ...state, [menuId]: true }));
    this.error.set(null);
    this.success.set(null);

    console.log(`🔄 Toggling menu "${menu.name}" status to ${newStatus}`);

    // If activating a menu, use setActiveMenu API
    if (newStatus === 'Active') {
      this.clientApi.setActiveMenu(menuId).subscribe({
        next: (response) => {
          console.log('✅ Menu activated successfully:', response);
          
          // Update all menus: deactivate others, activate this one
          this.menusSignal.update(menus => 
            menus.map(m => ({
              ...m,
              status: m.id === menuId ? 'Active' : 'Inactive',
              isActive: m.id === menuId
            }))
          );
          
          this.activeMenuId.set(menuId);
          this.success.set(`Menu "${menu.name}" is now Active`);
          this.isTogglingStatus.update(state => ({ ...state, [menuId]: false }));
          
          // Clear success message after 3 seconds
          setTimeout(() => this.success.set(null), 3000);
        },
        error: (err) => {
          console.error('❌ Error activating menu:', err);
          this.isTogglingStatus.update(state => ({ ...state, [menuId]: false }));
          
          if (err.status === 404) {
            console.log('⚠️ setActiveMenu API not available. Updating locally.');
            this.handleLocalToggle(menu, newStatus);
          } else if (err.status === 400) {
            this.error.set(err.error?.message || 'Invalid menu ID.');
          } else if (err.status === 403) {
            this.error.set('You do not have permission to activate menus.');
          } else {
            this.error.set(`Failed to activate menu "${menu.name}". Please try again.`);
          }
          
          setTimeout(() => this.error.set(null), 5000);
        }
      });
    } else {
      // Deactivating - just update locally (API usually doesn't have deactivate endpoint)
      this.handleLocalToggle(menu, newStatus);
    }
  }

  private handleLocalToggle(menu: UssdMenu, newStatus: 'Active' | 'Inactive'): void {
    const menuId = menu.id;
    
    // Update menu status locally
    this.menusSignal.update(menus => 
      menus.map(m => {
        if (m.id === menuId) {
          return { ...m, status: newStatus, isActive: newStatus === 'Active' };
        }
        // If activating this menu, deactivate others
        if (newStatus === 'Active') {
          return { ...m, status: 'Inactive', isActive: false };
        }
        return m;
      })
    );
    
    if (newStatus === 'Active') {
      this.activeMenuId.set(menuId);
    }
    
    this.success.set(`Menu "${menu.name}" is now ${newStatus}`);
    this.isTogglingStatus.update(state => ({ ...state, [menuId]: false }));
    
    setTimeout(() => this.success.set(null), 3000);
  }

  createNewMenu(): void {
    console.log('➕ Creating new menu');
    // TODO: Implement create new menu functionality
    // Option 1: Navigate to create page
    // this.router.navigate(['/user/menus/create']);
    
    // Option 2: Open modal/dialog
    alert('Create new menu feature coming soon!');
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
    this.success.set(`Menu "${menu.name}" has been deleted`);
    
    setTimeout(() => this.success.set(null), 3000);
  }

  duplicateMenu(menu: UssdMenu, event: Event): void {
    event.stopPropagation(); // Prevent triggering editMenu
    
    console.log('📋 Duplicating menu:', menu.name);
    
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
    this.success.set(`Menu "${menu.name}" has been duplicated`);
    
    setTimeout(() => this.success.set(null), 3000);
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
