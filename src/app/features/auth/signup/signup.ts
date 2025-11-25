import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { authService } from '../../../core/services/auth';
import { RegisterRequest } from '../../../core/models/api.model';

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './signup.html',
  styleUrl: './signup.css'
})
export class Signup implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(authService);
  private readonly router = inject(Router);

  signupForm!: FormGroup;
  
  // Signals for reactive state management
  readonly showPassword = signal(false);
  readonly isLoading = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);
  
  // Path for the illustration image on the left.
  readonly illustrationPath: string = 'assets/form-image.png';

  ngOnInit(): void {
    // Redirect if already authenticated
    if (this.authService.isAuthenticated()) {
      const isAdmin = this.authService.isAdmin();
      this.router.navigate(isAdmin ? ['/admin/dashboard'] : ['/user/dashboard']);
      return;
    }

    this.signupForm = this.fb.group({
      companyName: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      acceptTerms: [false, [Validators.requiredTrue]]
    });
  }

  togglePasswordVisibility(): void {
    this.showPassword.update(value => !value);
  }

  onSubmit(): void {
    if (this.signupForm.valid) {
      this.errorMessage.set(null);
      this.successMessage.set(null);
      this.isLoading.set(true);

      const formValue = this.signupForm.value;
      const registerData: RegisterRequest = {
        name: formValue.companyName,
        email: formValue.email,
        password: formValue.password
      };

      console.log('📤 Registering user:', { name: registerData.name, email: registerData.email, password: registerData.password, });

      this.authService.register(registerData).subscribe({
        next: (response) => {
          console.log('✅ Registration successful:', response);
          this.isLoading.set(false);
          this.successMessage.set('Account created successfully! Redirecting to login...');
          
          // Clear form
          this.signupForm.reset();
          
          // Redirect to login after 2 seconds
          setTimeout(() => {
            this.router.navigate(['/auth/login'], {
              queryParams: { registered: 'true', email: registerData.email }
            });
          }, 2000);
        },
        error: (error) => {
          console.error('❌ Registration error:', error);
          this.isLoading.set(false);
          
          // Handle different error scenarios
          if (error.status === 400) {
            this.errorMessage.set(error.error?.message || 'Invalid registration data. Please check your information.');
          } else if (error.status === 409 || error.status === 422) {
            this.errorMessage.set('An account with this email already exists. Please login instead.');
          } else if (error.status === 0) {
            this.errorMessage.set('Cannot connect to server. Please check your internet connection.');
          } else if (error.error?.message) {
            this.errorMessage.set(error.error.message);
          } else {
            this.errorMessage.set('Registration failed. Please try again later.');
          }
        }
      });
    } else {
      // Mark all fields as touched to show validation errors
      this.markFormGroupTouched(this.signupForm);
    }
  }

  signInWithGoogle(): void {
    console.log('🔐 Google sign-in clicked');
    // TODO: Implement Google OAuth sign-in logic
    this.errorMessage.set('Google sign-in not yet implemented. Coming soon!');
    
    setTimeout(() => this.errorMessage.set(null), 3000);
  }

  navigateToLogin(): void {
    this.router.navigate(['/auth/login']);
  }

  // Helper method to mark all form controls as touched
  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();

      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }

  // Getters for easy access to form controls in template
  get companyName() {
    return this.signupForm.get('companyName');
  }

  get email() {
    return this.signupForm.get('email');
  }

  get password() {
    return this.signupForm.get('password');
  }

  get acceptTerms() {
    return this.signupForm.get('acceptTerms');
  }

  get passwordStrength(): string {
    const password = this.password?.value || '';
    if (password.length === 0) return '';
    if (password.length < 8) return 'weak';
    if (password.length < 12) return 'medium';
    return 'strong';
  }

  get passwordStrengthColor(): string {
    const strength = this.passwordStrength;
    if (strength === 'weak') return 'bg-red-500';
    if (strength === 'medium') return 'bg-yellow-500';
    if (strength === 'strong') return 'bg-green-500';
    return 'bg-gray-300';
  }
}
