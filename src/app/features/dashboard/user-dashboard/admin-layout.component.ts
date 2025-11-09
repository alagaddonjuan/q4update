import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { HeaderComponent } from './../shared/header/header.component';
import { SideNavComponent } from './../shared/side-nav/side-nav.component';

@Component({
    selector: 'app-admin-layout',
    standalone: true,
    imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, HeaderComponent, SideNavComponent],
    templateUrl: './admin-layout.component.html',
})
export class AdminLayoutComponent { }