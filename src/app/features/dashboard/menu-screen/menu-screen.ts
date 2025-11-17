import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ClientApiService } from '../../../core/services/client-api';
import { MenuItemRequest } from '../../../core/models/api.model';

interface MenuItem {
  id?: number;
  trigger: string;
  responseType: 'CON' | 'END';
  responseText: string;
  parentId?: number | null;
  children?: MenuItem[];
}

@Component({
  selector: 'app-menu-screen',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './menu-screen.html',
  styleUrl: './menu-screen.css'
})
export class MenuScreen implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly clientApi = inject(ClientApiService);

  addItemForm: FormGroup;
  
  // Signals for reactive state management
  private readonly menuItemsSignal = signal<MenuItem[]>([]);
  readonly menuName = signal<string>('Loading...');
  readonly menuId = signal<number | null>(null);
  readonly isLoading = signal<boolean>(true);
  readonly isSaving = signal<boolean>(false);
  readonly isDeleting = signal<{ [key: number]: boolean }>({});
  readonly error = signal<string | null>(null);
  readonly success = signal<string | null>(null);
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
      this.error.set('Invalid menu ID');
      this.isLoading.set(false);
    }
  }

  loadMenuDetails(menuId: number): void {
    this.isLoading.set(true);
    this.error.set(null);

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
          console.log('⚠️ Menu not found. Using fallback data.');
          this.error.set('Menu not found. Showing sample structure.');
          
          // Fallback data for development
          this.menuName.set('Sample Menu');
          this.menuItemsSignal.set([
            {
              id: 1,
              trigger: 'ROOT',
              responseType: 'CON',
              responseText: 'Welcome to our service\n1. Check Balance\n2. Buy Airtime\n3. Transfer',
              children: [
                {
                  id: 2,
                  trigger: '1',
                  responseType: 'END',
                  responseText: 'Your balance is N5,000',
                  parentId: 1
                },
                {
                  id: 3,
                  trigger: '2',
                  responseType: 'CON',
                  responseText: 'Enter amount for airtime:',
                  parentId: 1
                }
              ]
            }
          ]);
        } else if (err.status === 0) {
          this.error.set('Cannot connect to server. Please check if the API is running.');
        } else {
          this.error.set('Failed to load menu details. Please try again.');
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
        this.error.set('Invalid menu ID');
        return;
      }

      this.isSaving.set(true);
      this.error.set(null);
      this.success.set(null);

      const formValue = this.addItemForm.value;
      const parentForChild = this.parentForNewChild();

      const itemData: MenuItemRequest = {
        parent_item_id: parentForChild?.id || null,
        option_trigger: formValue.trigger,
        response_type: formValue.responseType,
        response_text: formValue.responseText
      };

      console.log('➕ Adding menu item:', itemData);

      this.clientApi.addMenuItem(menuId, itemData).subscribe({
        next: (response) => {
          console.log('✅ Menu item added successfully:', response);
          this.isSaving.set(false);
          this.success.set('Menu item added successfully!');
          
          // Reload menu to get updated structure
          this.loadMenuDetails(menuId);
          
          // Reset form and parent reference
          this.addItemForm.reset({ responseType: 'CON' });
          this.parentForNewChild.set(null);
          
          // Clear success message after 3 seconds
          setTimeout(() => this.success.set(null), 3000);
        },
        error: (err) => {
          console.error('❌ Error adding menu item:', err);
          this.isSaving.set(false);
          
          if (err.status === 404) {
            console.log('⚠️ API not available. Adding locally.');
            this.handleLocalAdd(formValue, parentForChild);
          } else if (err.status === 400) {
            this.error.set(err.error?.message || 'Invalid menu item data.');
          } else {
            this.error.set('Failed to add menu item. Please try again.');
          }
          
          setTimeout(() => this.error.set(null), 5000);
        }
      });
    } else {
      Object.keys(this.addItemForm.controls).forEach(key => {
        this.addItemForm.get(key)?.markAsTouched();
      });
    }
  }

  private handleLocalAdd(formValue: any, parent: MenuItem | null): void {
    const newItem: MenuItem = {
      id: Date.now(),
      trigger: formValue.trigger,
      responseType: formValue.responseType,
      responseText: formValue.responseText,
      parentId: parent?.id || null,
      children: []
    };

    if (parent) {
      // Add as child
      this.menuItemsSignal.update(items => 
        items.map(item => {
          if (item.id === parent.id) {
            return {
              ...item,
              children: [...(item.children || []), newItem]
            };
          }
          return item;
        })
      );
    } else {
      // Add as root item
      this.menuItemsSignal.update(items => [...items, newItem]);
    }

    this.success.set('Menu item added locally (API not available)');
    this.addItemForm.reset({ responseType: 'CON' });
    this.parentForNewChild.set(null);
    this.isSaving.set(false);
    
    setTimeout(() => this.success.set(null), 3000);
  }

  addChild(parent: MenuItem): void {
    console.log('➕ Adding child to:', parent.trigger);
    this.parentForNewChild.set(parent);
    this.success.set(`Adding child item under "${parent.trigger}"`);
    
    // Scroll to form
    setTimeout(() => {
      const form = document.querySelector('form');
      form?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
    
    setTimeout(() => this.success.set(null), 3000);
  }

  editItem(item: MenuItem): void {
    console.log('✏️ Editing item:', item.trigger);
    this.editingItem.set(item);
    
    // Populate form with item data
    this.addItemForm.patchValue({
      trigger: item.trigger,
      responseType: item.responseType,
      responseText: item.responseText
    });
    
    this.success.set(`Editing item "${item.trigger}"`);
    setTimeout(() => this.success.set(null), 3000);
    
    // TODO: Implement update logic when form is submitted
  }

  deleteItem(index: number): void {
    const item = this.menuItems[index];
    if (!item.id) return;

    if (!confirm(`Are you sure you want to delete "${item.trigger}"? This will also delete all child items.`)) {
      return;
    }

    console.log('🗑️ Deleting item:', item.trigger);
    
    this.isDeleting.update(state => ({ ...state, [item.id!]: true }));
    this.error.set(null);

    this.clientApi.deleteMenuItem(item.id).subscribe({
      next: (response) => {
        console.log('✅ Menu item deleted successfully:', response);
        
        // Remove from local state
        this.menuItemsSignal.update(items => items.filter((_, i) => i !== index));
        
        this.success.set(`Menu item "${item.trigger}" deleted successfully`);
        this.isDeleting.update(state => ({ ...state, [item.id!]: false }));
        
        setTimeout(() => this.success.set(null), 3000);
      },
      error: (err) => {
        console.error('❌ Error deleting menu item:', err);
        this.isDeleting.update(state => ({ ...state, [item.id!]: false }));
        
        if (err.status === 404) {
          console.log('⚠️ API not available. Deleting locally.');
          this.menuItemsSignal.update(items => items.filter((_, i) => i !== index));
          this.success.set(`Menu item "${item.trigger}" deleted locally`);
        } else {
          this.error.set('Failed to delete menu item. Please try again.');
        }
        
        setTimeout(() => {
          this.error.set(null);
          this.success.set(null);
        }, 3000);
      }
    });
  }

  deleteChild(parent: MenuItem, childIndex: number): void {
    const child = parent.children?.[childIndex];
    if (!child || !child.id) return;

    if (!confirm(`Are you sure you want to delete "${child.trigger}"?`)) {
      return;
    }

    console.log('🗑️ Deleting child item:', child.trigger);
    
    this.isDeleting.update(state => ({ ...state, [child.id!]: true }));

    this.clientApi.deleteMenuItem(child.id).subscribe({
      next: (response) => {
        console.log('✅ Child menu item deleted successfully:', response);
        
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
        
        this.success.set(`Menu item "${child.trigger}" deleted successfully`);
        this.isDeleting.update(state => ({ ...state, [child.id!]: false }));
        
        setTimeout(() => this.success.set(null), 3000);
      },
      error: (err) => {
        console.error('❌ Error deleting child menu item:', err);
        this.isDeleting.update(state => ({ ...state, [child.id!]: false }));
        
        if (err.status === 404) {
          console.log('⚠️ API not available. Deleting locally.');
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
          this.success.set(`Menu item "${child.trigger}" deleted locally`);
        } else {
          this.error.set('Failed to delete menu item. Please try again.');
        }
        
        setTimeout(() => {
          this.error.set(null);
          this.success.set(null);
        }, 3000);
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/user/menu-builder']);
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