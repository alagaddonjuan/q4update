import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { Auth } from '../services/auth';

@Component({
  selector: 'app-password-success',
  imports: [],
  templateUrl: './password-success.html',
  styleUrl: './password-success.css',
})
export class PasswordSuccess {
  // Path for the illustration image on the left.
  illustrationPath: string = 'assets/reset-image.png';

  constructor(private router: Router, private authService: Auth) { }

  // navigate to login page
  returnToLogin(): void {
    console.log('Navigating back to Login page...');
    this.router.navigate(['/login']);
  }
}
