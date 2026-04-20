import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MenuItemRequest } from '../../../../core/models/api.model';
import { AlertService } from '../../../../core/services/alert.service';
import { ClientApiService } from '../../../../core/services/client-api';
import { CommonModule } from '@angular/common';

interface MenuItem {
  id?: number;
  trigger: string;
  responseType: 'CON' | 'END';
  responseText: string;
  parentId?: number | null;
  children?: MenuItem[];
}

@Component({
  selector: 'app-admin-builder-details',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './admin-builder-details.html',
  styleUrl: './admin-builder-details.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminBuilderDetails {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly clientApi = inject(ClientApiService);
  alertService = inject(AlertService);

  addItemForm: FormGroup;

  // Signals for reactive state management
  private readonly menuItemsSignal = signal<MenuItem[]>([]);
  readonly menuName = signal<string>('Loading...');
  readonly menuId = signal<number | null>(null);
  readonly isLoading = signal<boolean>(true);
  readonly isSaving = signal<boolean>(false);
  readonly isDeleting = signal<{ [key: number]: boolean }>({});
  readonly editingItem = signal<MenuItem | null>(null);
  readonly parentForNewChild = signal<MenuItem | null>(null);

  get menuItems(): MenuItem[] {
    return this.menuItemsSignal();
  }

  constructor() {
    this.addItemForm = this.fb.group({
      trigger: ['', Validators.required],
      responseType: ['CON', Validators.required],
      responseText: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.menuId.set(+id);
      this.loadMenuDetails(+id);
    } else {
      this.alertService.error('Invalid menu ID');
      this.isLoading.set(false);
    }
  }

  loadMenuDetails(menuId: number): void {
    this.isLoading.set(true);

    this.clientApi.getMenuDetails(menuId).subscribe({
      next: (response) => {
        console.log('📋 Menu details loaded:', response);

        // Set menu name
        this.menuName.set(response.menu?.name || response.name || `Menu ${menuId}`);

        // Transform and organize items in hierarchical structure
        const items = response.items || response.menu_items || [];
        const organizedItems = this.organizeMenuItems(items);

        this.menuItemsSignal.set(organizedItems);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('❌ Error loading menu details:', err);

        if (err.status === 404) {
          this.alertService.error('Menu not found.');
          this.menuName.set('Not Found');
        } else if (err.status === 0) {
          this.alertService.error('Cannot connect to server. Please check if the API is running.');
        } else {
          this.alertService.error(err.error?.message || 'Failed to load menu details. Please try again.');
        }

        this.isLoading.set(false);
      }
    });
  }

  private organizeMenuItems(items: any[]): MenuItem[] {
    const itemsMap = new Map<number, MenuItem>();
    const rootItems: MenuItem[] = [];

    // First pass: Create all items
    items.forEach(item => {
      const menuItem: MenuItem = {
        id: item.id || item.item_id,
        trigger: item.option_trigger || item.trigger || '',
        responseType: (item.response_type || item.responseType || 'CON') as 'CON' | 'END',
        responseText: item.response_text || item.responseText || '',
        parentId: item.parent_item_id || item.parentId || null,
        children: []
      };
      itemsMap.set(menuItem.id!, menuItem);
    });

    // Second pass: Organize hierarchy
    itemsMap.forEach(item => {
      if (item.parentId === null || item.parentId === undefined) {
        rootItems.push(item);
      } else {
        const parent = itemsMap.get(item.parentId);
        if (parent) {
          parent.children = parent.children || [];
          parent.children.push(item);
        }
      }
    });

    return rootItems;
  }

  addItem(): void {
    if (this.addItemForm.valid) {
      const menuId = this.menuId();
      if (!menuId) {
        this.alertService.error('Invalid menu ID');
        return;
      }

      this.isSaving.set(true);

      const formValue = this.addItemForm.value;
      const parentForChild = this.parentForNewChild();
      const editing = this.editingItem();

      const itemData: MenuItemRequest = {
        parent_item_id: parentForChild?.id || null,
        option_number: formValue.trigger,
        option_trigger: formValue.trigger,
        option_text: formValue.responseText,
        response_text: formValue.responseText,
        action_type: formValue.responseType,
        response_type: formValue.responseType
      };

      if (editing && editing.id) {
        console.log('✏️ Updating menu item:', itemData);

        this.clientApi.updateMenuItem(editing.id, itemData).subscribe({
          next: (response) => {
            console.log('✅ Menu item updated successfully:', response);
            this.isSaving.set(false);
            this.alertService.success('Menu item updated successfully!');

            this.loadMenuDetails(menuId);
            this.cancelEdit();
          },
          error: (err) => {
            console.error('❌ Error updating menu item:', err);
            this.isSaving.set(false);
            this.alertService.error(err.error?.message || 'Failed to update menu item. Please try again.');
          }
        });
      } else {
        console.log('➕ Adding menu item:', itemData);

        this.clientApi.addMenuItem(menuId, itemData).subscribe({
          next: (response) => {
            console.log('✅ Menu item added successfully:', response);
            this.isSaving.set(false);
            this.alertService.success('Menu item added successfully!');

            // Reload menu to get updated structure
            this.loadMenuDetails(menuId);

            // Reset form and parent reference
            this.addItemForm.reset({ responseType: 'CON' });
            this.parentForNewChild.set(null);
          },
          error: (err) => {
            console.error('❌ Error adding menu item:', err);
            this.isSaving.set(false);
            this.alertService.error(err.error?.message || 'Failed to add menu item. Please try again.');
          }
        });
      }
    } else {
      Object.keys(this.addItemForm.controls).forEach(key => {
        this.addItemForm.get(key)?.markAsTouched();
      });
    }
  }

  addChild(parent: MenuItem): void {
    this.cancelEdit();
    this.parentForNewChild.set(parent);

    // Automatically calculate the next numeric trigger based on existing children
    let nextTrigger = '1';
    if (parent.children && parent.children.length > 0) {
      const numericTriggers = parent.children
        .map((c) => parseInt(c.trigger, 10))
        .filter((n) => !isNaN(n));

      if (numericTriggers.length > 0) {
        nextTrigger = (Math.max(...numericTriggers) + 1).toString();
      }
    }

    // Pre-populate the form with the suggested trigger
    this.addItemForm.patchValue({ trigger: nextTrigger });

    this.alertService.info(`Adding child item under "${parent.trigger}"`);

    // Scroll to form
    setTimeout(() => {
      const form = document.querySelector('form');
      form?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  }

  editItem(item: MenuItem): void {
    this.cancelEdit();
    this.editingItem.set(item);

    // Populate form with item data
    this.addItemForm.patchValue({
      trigger: item.trigger,
      responseType: item.responseType,
      responseText: item.responseText
    });
  }

  deleteItem(item: MenuItem): void {
    if (!item.id) return;
    const menuId = this.menuId();
    if (!menuId) return;

    if (!confirm(`Are you sure you want to delete "${item.trigger}"? This will also delete all child items.`)) {
      return;
    }

    this.isDeleting.update(state => ({ ...state, [item.id!]: true }));

    this.clientApi.deleteMenuItem(item.id).subscribe({
      next: (response) => {
        // Re-fetch tree structure to ensure deep items are correctly updated
        this.loadMenuDetails(menuId);

        this.alertService.success(`Menu item "${item.trigger}" deleted successfully`);
        this.isDeleting.update(state => ({ ...state, [item.id!]: false }));
      },
      error: (err) => {
        this.isDeleting.update(state => ({ ...state, [item.id!]: false }));
        this.alertService.error(err.error?.message || 'Failed to delete menu item. Please try again.');
      }
    });
  }

  deleteChild(parent: MenuItem, childIndex: number): void {
    const child = parent.children?.[childIndex];
    if (!child || !child.id) return;

    if (!confirm(`Are you sure you want to delete "${child.trigger}"?`)) {
      return;
    }

    this.isDeleting.update(state => ({ ...state, [child.id!]: true }));

    this.clientApi.deleteMenuItem(child.id).subscribe({
      next: (response) => {
        // Remove child from parent
        this.menuItemsSignal.update(items =>
          items.map(item => {
            if (item.id === parent.id) {
              return {
                ...item,
                children: item.children?.filter((_, i) => i !== childIndex) || []
              };
            }
            return item;
          })
        );

        this.alertService.success(`Menu item "${child.trigger}" deleted successfully`);
        this.isDeleting.update(state => ({ ...state, [child.id!]: false }));
      },
      error: (err) => {
        this.isDeleting.update(state => ({ ...state, [child.id!]: false }));
        this.alertService.error(err.error?.message || 'Failed to delete menu item. Please try again.');
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/admin/ussd-builder']);
  }

  // Helper methods for template
  getFirstLine(text: string): string {
    return text.split('\n')[0];
  }

  hasMultipleLines(text: string): boolean {
    return text.split('\n').length > 1;
  }

  getRestLines(text: string): string[] {
    const lines = text.split('\n');
    return lines.slice(1);
  }

  isItemDeleting(itemId: number | undefined): boolean {
    if (!itemId) return false;
    return this.isDeleting()[itemId] || false;
  }

  cancelEdit(): void {
    this.editingItem.set(null);
    this.parentForNewChild.set(null);
    this.addItemForm.reset({ responseType: 'CON' });
  }
}
