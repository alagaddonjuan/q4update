import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { Auth } from '../services/auth';

@Component({
  selector: 'app-password-success',
  standalone: true,
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
    this.router.navigate(['/login']);
  }
}
