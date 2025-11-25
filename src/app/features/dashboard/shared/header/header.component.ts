import { Component, ElementRef, HostListener, Input, ViewChild,computed,inject, signal } from '@angular/core';
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
    readonly dashboardData$ = this.clientApi.getDashboard();
    dashboardDataSnapshot: DashboardData | null = null;
   
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
    getInitials(name?: string ): string {
        const userName = name || this.dashboardDataSnapshot?.client?.name || '';
        // Split by spaces and get first letter of each word
        const words = userName.trim().split(/\s+/);
        
        if (words.length === 0) return '';
        
        // Get first letter of first name and last name (or first two words)
        if (words.length === 1) {
        // Single word: take first two characters
        return words[0].substring(0, 2).toUpperCase();
        }
        
        // Multiple words: take first letter of first and last word
        const firstInitial = words[0].charAt(0);
        const lastInitial = words[words.length - 1].charAt(0);
        
        return (firstInitial + lastInitial).toUpperCase();
        }
        getAvatarColor(name?: string): string {
            const userName = name || this.dashboardDataSnapshot?.client?.name || 'User';
            
            // Generate a hash from the name
            let hash = 0;
            for (let i = 0; i < userName.length; i++) {
            hash = userName.charCodeAt(i) + ((hash << 5) - hash);
            }
            
            // Predefined color palette (professional looking colors)
            const colors = [
            'bg-teal-700',

            ];
            
            // Use hash to pick a color
            const index = Math.abs(hash) % colors.length;
            return colors[index];
        }
            ngOnInit() {
                this.dashboardData$.subscribe(data => {
                    this.dashboardDataSnapshot = data;
                    // log values after data arrives
                    console.log(this.getInitials());
                    console.log(this.getAvatarColor());
                    console.log(this.dashboardDataSnapshot);
                });
         }
}