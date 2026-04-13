import { Component, OnInit, inject, signal, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormControl } from '@angular/forms';
import { AuthService } from '../../../core/services/auth';
import { Router, RouterLink } from '@angular/router';
import { LoginRequest } from '../../../core/models/api.model';


@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class Login implements OnInit {
  @ViewChild('tokenInput') tokenInput?: ElementRef<HTMLInputElement>;

  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  signinForm: FormGroup;

  // Reactive state with signals
  readonly showPassword = signal(false);
  readonly isLoading = signal(false);
  readonly show2FAChallenge = signal(false);
  readonly errorMessage = signal<string | null>(null);
  illustrationPath: string = 'assets/form-image.png';

  constructor() {
    // Initialize the form in the constructor to ensure it's available when the template renders
    this.signinForm = new FormGroup({
      email: new FormControl('', [Validators.required, Validators.email]),
      password: new FormControl('', [Validators.required]),
      twoFactorToken: new FormControl('', [Validators.pattern('^[0-9]{6}$')]),
      rememberMe: new FormControl(false)
    });
  }



  ngOnInit(): void {
    // Redirect if already authenticated
    if (this.authService.isAuthenticated()) {
      this.router.navigate(['/user']);
      return;
    }
  }

  togglePasswordVisibility(): void {
    this.showPassword.update(value => !value);
  }

  onSubmit(): void {
    // If 2FA is required, ensure the token is provided
    if (this.show2FAChallenge()) {
      this.signinForm.get('twoFactorToken')?.setValidators([Validators.required, Validators.pattern('^[0-9]{6}$')]);
      this.signinForm.get('twoFactorToken')?.updateValueAndValidity();
    }

    if (this.signinForm.valid) {
      this.errorMessage.set(null);
      this.isLoading.set(true);

      const loginData: LoginRequest = {
        email: this.signinForm.value.email,
        password: this.signinForm.value.password,
        token: this.signinForm.value.twoFactorToken || undefined
      };

      this.authService.login(loginData).subscribe({
        next: (response) => {
          this.isLoading.set(false);

          // Trigger 2FA screen if enabled on account and token hasn't been provided yet
          if (response.user?.is_2fa_enabled === 1 && !loginData.token) {
            this.show2FAChallenge.set(true);
            this.errorMessage.set('Please enter your 6-digit verification code.');

            // Auto-focus the 2FA input field after it's rendered
            setTimeout(() => {
              this.tokenInput?.nativeElement.focus();
            }, 0);
            return;
          }

          // Navigate based on user role
          if (response.user?.is_admin === 1) {
            this.router.navigate(['/admin']);
          } else {
            this.router.navigate(['/user']);
          }
        },
        error: (error) => {
          this.isLoading.set(false);

          // Handle different error scenarios
          if (error.status === 401) {
            this.errorMessage.set('Invalid email or password');
          } else if (error.status === 403) {
            this.errorMessage.set('Account is suspended. Please contact support.');
          } else if (error.error?.message) {
            this.errorMessage.set(error.error.message);
          } else {
            this.errorMessage.set('An error occurred. Please try again.');
          }

          console.error('Login error:', error);
        }
      });
    } else {
      // Mark all fields as touched to show validation errors
      this.markFormGroupTouched(this.signinForm);
    }
  }

  onTokenInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const value = input.value.replace(/[^0-9]/g, '');
    this.signinForm.get('twoFactorToken')?.setValue(value, { emitEvent: false });
  }

  signInWithGoogle(): void {
    console.log('Sign in with Google clicked');
    // Handle Google sign-in logic here
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
  get email() {
    return this.signinForm.get('email');
  }

  get password() {
    return this.signinForm.get('password');
  }

  get twoFactorToken() {
    return this.signinForm.get('twoFactorToken');
  }
}
