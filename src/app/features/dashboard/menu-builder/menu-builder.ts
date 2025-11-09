import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

interface UssdMenu {
  id: number;
  name: string;
  status: 'Active' | 'Inactive';
}

@Component({
  selector: 'app-menu-builder',
  imports: [CommonModule],
  templateUrl: './menu-builder.html',
  styleUrl: './menu-builder.css',
})

export class MenuBuilder {
  menus: UssdMenu[] = [
    {
      id: 1,
      name: 'Main Menu',
      status: 'Active'
    },
    {
      id: 2,
      name: 'Modern Lottery Menu',
      status: 'Inactive'
    }
  ];

  constructor(private router: Router) { }

  editMenu(menu: UssdMenu): void {
    // Navigate to edit page with menu ID
    this.router.navigate(['/user/menus', menu.id, 'edit']);

    // Alternative routing options:
    // this.router.navigate(['/menus/edit', menu.id]);
    // this.router.navigate(['/edit-menu', menu.id]);
    // this.router.navigate(['/menus', menu.id]);
  }

  toggleMenuStatus(menu: UssdMenu): void {
    const newStatus = menu.status === 'Active' ? 'Inactive' : 'Active';
    menu.status = newStatus;
    console.log(`Menu "${menu.name}" status changed to ${newStatus}`);
    alert(`Menu "${menu.name}" is now ${newStatus}`);
  }
}
