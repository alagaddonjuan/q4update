import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterOutlet, NavigationEnd } from '@angular/router';
import { HeaderComponent } from '../shared/header/header.component';
import { SideNavComponent } from '../shared/side-nav/side-nav.component';

@Component({
    selector: 'app-client-layout',
    standalone: true,
    imports: [CommonModule, RouterOutlet, HeaderComponent, SideNavComponent],
    templateUrl: './client-layout.component.html',
})
export class ClientLayoutComponent implements OnInit {
    constructor(private router: Router) { }

    pageTitle = 'Dashboard';

    changeTitle(title: string) {
        this.pageTitle = title;
        localStorage.setItem('pageTitle', title);
    }

    // The signOut method is now in the shared HeaderComponent
    ngOnInit() {
        const savedTitle = localStorage.getItem('pageTitle');
        if (savedTitle) {
            this.pageTitle = savedTitle;
        }
    }
}