import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';

interface MenuItem {
  id: string;
  trigger: string;
  responseType: 'CON' | 'END';
  responseText: string;
  children: MenuItem[];
}

@Component({
  selector: 'app-menu-screen',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './menu-screen.html',
  styleUrl: './menu-screen.css',
})
export class MenuScreen implements OnInit {
  menuName: string = 'Main Menu';
  menuId: string = '';
  addItemForm: FormGroup;
  
  menuItems: MenuItem[] = [
    {
      id: '1',
      trigger: 'ROOT',
      responseType: 'CON',
      responseText: 'Welcome to Modern Lottery\n1. Play Games\n2. Check results\n3. Wallets',
      children: [
        {
          id: '1-1',
          trigger: '1',
          responseType: 'CON',
          responseText: 'Choose the game you want to play:\n1. Keno 20/80\n2. Modern New 5/90',
          children: []
        },
        {
          id: '1-2',
          trigger: 'new airtime',
          responseType: 'CON',
          responseText: 'airtime 1',
          children: []
        },
        {
          id: '1-3',
          trigger: '2',
          responseType: 'CON',
          responseText: 'send sms\nhello',
          children: []
        }
      ]
    }
  ];

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute
  ) {
    this.addItemForm = this.fb.group({
      trigger: ['', Validators.required],
      responseType: ['CON', Validators.required],
      responseText: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.menuId = params['id'];
      // Load menu data based on ID
      console.log('Loading menu with ID:', this.menuId);
    });
  }

  getFirstLine(text: string): string {
    return text.split('\n')[0];
  }

  hasMultipleLines(text: string): boolean {
    return text.includes('\n');
  }

  getRestLines(text: string): string[] {
    const lines = text.split('\n');
    return lines.slice(1);
  }

  addItem(): void {
    if (this.addItemForm.valid) {
      const formValue = this.addItemForm.value;
      
      const newItem: MenuItem = {
        id: this.generateId(),
        trigger: formValue.trigger,
        responseType: formValue.responseType,
        responseText: formValue.responseText,
        children: []
      };
      
      this.menuItems.push(newItem);
      this.addItemForm.reset({ responseType: 'CON' });
      
      console.log('Item added:', newItem);
    }
  }

  addChild(parent: MenuItem): void {
    console.log('Adding child to:', parent);
    // You could open a modal or navigate to a form to add a child
    alert(`Add child to: ${parent.trigger}`);
  }

  editItem(item: MenuItem): void {
    console.log('Editing item:', item);
    // Populate form with item data for editing
    this.addItemForm.patchValue({
      trigger: item.trigger,
      responseType: item.responseType,
      responseText: item.responseText
    });
    alert(`Editing: ${item.trigger}`);
  }

  deleteItem(index: number): void {
    if (confirm('Are you sure you want to delete this item?')) {
      this.menuItems.splice(index, 1);
      console.log('Item deleted at index:', index);
    }
  }

  deleteChild(parent: MenuItem, childIndex: number): void {
    if (confirm('Are you sure you want to delete this child item?')) {
      parent.children.splice(childIndex, 1);
      console.log('Child deleted at index:', childIndex);
    }
  }

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }

}
