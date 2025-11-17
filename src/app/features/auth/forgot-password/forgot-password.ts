import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { authService } from '../../../core/services/auth'; // Update path as needed
import { finalize } from 'rxjs/operators';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './forgot-password.html',
  styleUrl: './forgot-password.css'
})
export class ForgotPassword implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly authService = inject(authService);

  forgotPasswordForm!: FormGroup;
  illustrationPath: string = 'assets/form-image.png';

  // Signals for reactive state management
  readonly isSubmitting = signal<boolean>(false);
  readonly showSuccessMessage = signal<boolean>(false);
  readonly errorMessage = signal<string>('');
  readonly submittedEmail = signal<string>('');

  ngOnInit(): void {
    this.forgotPasswordForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]]
    });
  }

  onSubmit(): void {
    // Validate form
    if (this.forgotPasswordForm.invalid) {
      // Mark field as touched to show validation error
      this.forgotPasswordForm.get('email')?.markAsTouched();
      return;
    }
    console.log()

    const email = this.forgotPasswordForm.value.email;
    
    // Clear previous messages
    this.errorMessage.set('');
    this.showSuccessMessage.set(false);
    this.isSubmitting.set(true);

    // Call auth service to request password reset
    this.authService.forgotPassword(email)
      .pipe(
        finalize(() => this.isSubmitting.set(false))
      )
      .subscribe({
        next: (response) => {
          console.log('Password reset email sent successfully:', response);
          
          // Store the submitted email for display in success message
          this.submittedEmail.set(email);
          this.showSuccessMessage.set(true);
          
          // Reset the form
          this.forgotPasswordForm.reset();
          
          // Hide success message after 5 seconds
          setTimeout(() => {
            this.showSuccessMessage.set(false);
          }, 5000);
          
          // Optionally redirect to login after a delay
          // setTimeout(() => {
          //   this.router.navigate(['/auth/login']);
          // }, 6000);
        },
        error: (error) => {
          console.error('Failed to send password reset email:', error);
          
          // Handle different error scenarios
          if (error.status === 404) {
            this.errorMessage.set('No account found with this email address.');
          } else if (error.status === 429) {
            this.errorMessage.set('Too many requests. Please try again later.');
          } else {
            this.errorMessage.set(
              error.error?.message || 
              'Failed to send password reset email. Please try again.'
            );
          }
          
          // Clear error message after 5 seconds
          setTimeout(() => {
            this.errorMessage.set('');
          }, 5000);
        }
      });
  }

  goBack(): void {
    console.log('Navigate back to sign in');
    this.router.navigate(['/auth/login']);
  }

  // Getter for easy access to form control in template
  get emailControl() {
    return this.forgotPasswordForm.get('email');
  }

  // Helper method to check if email field has error
  hasEmailError(): boolean {
    const control = this.emailControl;
    return !!(control && control.invalid && (control.dirty || control.touched));
  }

  // Get specific email error message
  getEmailErrorMessage(): string {
    const control = this.emailControl;
    if (control?.hasError('required')) {
      return 'Email is required';
    }
    if (control?.hasError('email')) {
      return 'Please enter a valid email address';
    }
    return '';
  }
}