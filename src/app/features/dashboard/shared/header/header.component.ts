import { Component, ElementRef, HostListener, Input, ViewChild,inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { authService }  from '../../../../core/services/auth';
import { DashboardData } from '../../../../core/models/api.model';
import { ClientApiService } from '../../../../core/services/client-api';

@Component({
    selector: 'app-header',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './header.component.html',
})
export class HeaderComponent {

    private readonly authService = inject(authService);
    private readonly clientApi = inject(ClientApiService);
    @Input() pageTitle: string = 'Dashboard';
    @Input() userType: 'admin' | 'client' = 'client';

    @ViewChild('details') details!: ElementRef<HTMLDetailsElement>;
    readonly dashboardData = signal<DashboardData | null>(null);

    constructor(private router: Router,
         private elementRef: ElementRef,) { }

    @HostListener('document:click', ['$event'])
    onDocumentClick(event: MouseEvent): void {
        if (this.details && !this.elementRef.nativeElement.contains(event.target)) {
            this.details.nativeElement.open = false;
        }
    }

    navigateToProfilePage() {
        const route = this.userType === 'admin' ? '/admin/settings' : '/user/profile';
        this.router.navigate([route]);
        if (this.details) {
            this.details.nativeElement.open = false;
        }
    }

    signOut() {
        console.log(`${this.userType} logging out...`);
        this.authService.logout();
    }
}