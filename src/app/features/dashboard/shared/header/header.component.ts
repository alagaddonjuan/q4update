import { Component, ElementRef, HostListener, Input, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
    selector: 'app-header',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './header.component.html',
})
export class HeaderComponent {
    @Input() pageTitle: string = 'Dashboard';
    @Input() userType: 'admin' | 'client' = 'client';

    @ViewChild('details') details!: ElementRef<HTMLDetailsElement>;

    constructor(private router: Router, private elementRef: ElementRef) { }

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
        // Add actual sign-out logic here
        this.router.navigate(['/auth/login']);
        if (this.details) {
            this.details.nativeElement.open = false;
        }
    }
}