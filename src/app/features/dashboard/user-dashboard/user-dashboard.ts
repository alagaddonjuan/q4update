import { Component, OnInit, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterOutlet,NavigationEnd } from '@angular/router';
import { filter } from 'rxjs';



@Component({
  selector: 'app-user-dashboard',
  standalone: true,
  imports: [CommonModule, RouterOutlet,],
  templateUrl: './user-dashboard.html',
  styleUrls: ['./user-dashboard.css']
})
export class UserDashboard implements OnInit {
currentUrl: string = '';
isSidebarOpen = false;

constructor(private router: Router) {}

  pageTitle = "Dashboard";

  changeTitle(title:string) {
    this.pageTitle = title;
    localStorage.setItem('pageTitle', title);
  }

  toggleSidebar() {this
    this.isSidebarOpen = !this.isSidebarOpen;
  }

  closeSidebar() {
    this.isSidebarOpen = false;
  }

  getInitials(name: string): string {
    return name.split(' ').map(n => n[0]).join('');
  }
  navigateToDashboardPage() {
       this.router.navigate(['user', 'dashboard']);

  }
  navigateToServicesPage() {
    this.router.navigate(['user', 'services']);
  }
  navigateToUssdPage() {
    this.router.navigate(['user', 'ussd']);
  }
  navigateToMenuPage() {
    this.router.navigate(['user', 'menu-builder']);
  }
  navigateToBillingPage() {
    this.router.navigate(['user', 'billing']);
  }
  navigateToTeamPage() {
    this.router.navigate(['user', 'team']);
  }
  navigateToProfilePage() {
    this.router.navigate(['user', 'profile']);
  }


  signOut() {
    console.log('Logging out...');
  }
    ngOnInit() {
    const savedTitle = localStorage.getItem('pageTitle');
    if (savedTitle) {
      this.pageTitle = savedTitle;
    }
    // Subscribe to route changes to update currentUrl
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: NavigationEnd) => {
      this.currentUrl = event.urlAfterRedirects;
    });

    // Set initial URL
    this.currentUrl = this.router.url;
  }
  // Method to check if a path is active
  isActive(path: string): boolean {
    return this.currentUrl === path || this.currentUrl.startsWith(path);
  }

}
