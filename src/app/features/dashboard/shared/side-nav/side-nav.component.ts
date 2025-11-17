import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
    Router,
    RouterLink,
    RouterLinkActive,
    NavigationEnd,
} from '@angular/router';
import { filter } from 'rxjs';

interface NavLink {
    path: string;
    label: string;
    icon?: string;
    svg?: string;
    isActiveMatch: 'full' | 'prefix';
}

@Component({
    selector: 'app-side-nav',
    standalone: true,
    imports: [CommonModule, RouterLink, RouterLinkActive],
    templateUrl: './side-nav.component.html',
})
export class SideNavComponent implements OnInit {
    @Input() userType: 'admin' | 'client' = 'client';
    @Output() titleChanged = new EventEmitter<string>();

    isSidebarOpen = false;
    currentUrl: string = '';
    navLinks: NavLink[] = [];
    logoPath: string = '/assets/logo.png';

    private adminLinks: NavLink[] = [
        { path: '/admin/dashboard', label: 'Dashboard', icon: '/assets/user/Group.png', isActiveMatch: 'full' },
        { path: '/admin/users', label: 'Clients', svg: 'M337.711 241.3a16 16 0 0 0-11.461 3.988c-18.739 16.561-43.688 25.682-70.25 25.682s-51.511-9.121-70.25-25.683a16.007 16.007 0 0 0-11.461-3.988c-78.926 4.274-140.752 63.672-140.752 135.224v107.152C33.537 499.293 46.9 512 63.332 512h385.336c16.429 0 29.8-12.707 29.8-28.325V376.523c-.005-71.552-61.831-130.95-140.757-135.223zM446.463 480H65.537V376.523c0-52.739 45.359-96.888 104.351-102.8C193.75 292.63 224.055 302.97 256 302.97s62.25-10.34 86.112-29.245c58.992 5.91 104.351 50.059 104.351 102.8zM256 234.375a117.188 117.188 0 1 0-117.188-117.187A117.32 117.32 0 0 0 256 234.375zM256 32a85.188 85.188 0 1 1-85.188 85.188A85.284 85.284 0 0 1 256 32z', isActiveMatch: 'prefix' },
        { path: '/admin/settings', label: 'Transaction Logs', icon: '/assets/user/stash_billing-info.png', isActiveMatch: 'prefix' },
        { path: '/admin/sms-logs', label: 'SMS Logs', icon: '/assets/user/stash_billing-info.png', isActiveMatch: 'prefix' },
        { path: '/admin/airtime-logs', label: 'Airtime Logs', icon: '/assets/user/stash_billing-info.png', isActiveMatch: 'prefix' },
        { path: '/admin/settings', label: 'Settings', svg: 'M337.711 241.3a16 16 0 0 0-11.461 3.988c-18.739 16.561-43.688 25.682-70.25 25.682s-51.511-9.121-70.25-25.683a16.007 16.007 0 0 0-11.461-3.988c-78.926 4.274-140.752 63.672-140.752 135.224v107.152C33.537 499.293 46.9 512 63.332 512h385.336c16.429 0 29.8-12.707 29.8-28.325V376.523c-.005-71.552-61.831-130.95-140.757-135.223zM446.463 480H65.537V376.523c0-52.739 45.359-96.888 104.351-102.8C193.75 292.63 224.055 302.97 256 302.97s62.25-10.34 86.112-29.245c58.992 5.91 104.351 50.059 104.351 102.8zM256 234.375a117.188 117.188 0 1 0-117.188-117.187A117.32 117.32 0 0 0 256 234.375zM256 32a85.188 85.188 0 1 1-85.188 85.188A85.284 85.284 0 0 1 256 32z', isActiveMatch: 'prefix' },
    ];

    private clientLinks: NavLink[] = [
        { path: '/user/dashboard', label: 'Dashboard', icon: '/assets/user/Group.png', isActiveMatch: 'full' },
        { path: '/user/services', label: 'Service', icon: '/assets/user/music-icon.png', isActiveMatch: 'prefix' },
        { path: '/user/ussd', label: 'USSD', icon: '/assets/user/vector-ussd.png', isActiveMatch: 'prefix' },
        { path: '/user/menu-builder', label: 'Menu Builder', icon: '/assets/user/stash_billing-info.png', isActiveMatch: 'prefix' },
        { path: '/user/billing', label: 'Billing', icon: '/assets/user/stash_billing-info.png', isActiveMatch: 'prefix' },
        { path: '/user/team', label: 'Team', icon: '/assets/user/stash_billing-info.png', isActiveMatch: 'prefix' },
    ];

    constructor(private router: Router) { }

    ngOnInit(): void {
        if (this.userType === 'admin') {
            this.navLinks = this.adminLinks;
            this.logoPath = '/assets/logo.png';
        } else {
            this.navLinks = this.clientLinks;
            this.logoPath = '/assets/logo.png';
        }

        this.router.events
            .pipe(filter((event) => event instanceof NavigationEnd))
            .subscribe((event: NavigationEnd) => {
                this.currentUrl = event.urlAfterRedirects;
                this.closeSidebar();
            });

        this.currentUrl = this.router.url;
    }

    toggleSidebar() {
        this.isSidebarOpen = !this.isSidebarOpen;
    }

    closeSidebar() {
        this.isSidebarOpen = false;
    }

    onLinkClicked(label: string) {
        if (this.userType === 'client') {
            // Remap label to match expected title
            const titleMap: { [key: string]: string } = {
                'Service': 'Service',
                'USSD': 'USSD Service',
                'Menu Builder': 'USSD Menu Builder',
                'Billing': 'Billing & Top-Up',
                'Team': 'Team Management'
            };
            this.titleChanged.emit(titleMap[label] || label);
        }
        this.closeSidebar();
    }

    isActive(path: string): boolean {
        const link = this.navLinks.find(l => l.path === path);
        if (link?.isActiveMatch === 'full') {
            return this.currentUrl === path;
        }
        return this.currentUrl.startsWith(path);
    }
}