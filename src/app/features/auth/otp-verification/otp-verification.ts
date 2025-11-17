import { Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { authService } from '../../../core/services/auth'; // Update path as needed
import { finalize } from 'rxjs/operators';

@Component({
  selector: 'app-otp-verification',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './otp-verification.html',
  styleUrl: './otp-verification.css'
})
export class OtpVerification implements OnInit, OnDestroy {
  private readonly authService = inject(authService);
  private readonly router = inject(Router);

  // Placeholder path for the illustration image on the left.
  illustrationPath: string = 'assets/otp-verification.png';

  // Array to hold individual OTP digits
  otpDigits: string[] = ['', '', '', '', '']; 
  
  // Combine digits into a single string for submission
  otpCode: string = ''; 

  // Signals for reactive state management
  readonly isLoading = signal<boolean>(false);
  readonly errorMessage = signal<string>('');
  readonly successMessage = signal<string>('');
  
  // Timer for resend functionality
  resendCountdown = signal<number>(60);
  countdownInterval: any;

  // Computed signal to check if resend is available
  readonly canResend = computed(() => this.resendCountdown() === 0);

  // Placeholder for the email/phone number the OTP was sent to
  // You would typically get this from a previous route or service.
  recipient: string = 'your_email@example.com'; 

  ngOnInit(): void {
    // Start countdown when component initializes
    this.startResendCountdown();
  }

  ngOnDestroy(): void {
    // Clear interval to prevent memory leaks
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
    }
  }

  /**
   * Handles input for each OTP digit, automatically moving focus.
   * @param event The keyboard event.
   * @param index The index of the current input field.
   */
  handleOtpInput(event: any, index: number): void {
    const input = event.target as HTMLInputElement;
    let value = input.value;

    // Clear any error messages when user starts typing
    if (this.errorMessage()) {
      this.errorMessage.set('');
    }

    // Allow only one digit
    if (value.length > 1) {
      input.value = value.charAt(0);
      value = value.charAt(0);
    }

    this.otpDigits[index] = value;
    this.otpCode = this.otpDigits.join(''); // Update the full OTP code

    // Move focus to the next input if a digit was entered and it's not the last field
    if (value && index < this.otpDigits.length - 1) {
      const nextInput = document.getElementById(`otp-input-${index + 1}`);
      if (nextInput) {
        nextInput.focus();
      }
    } else if (!value && index > 0) { // If backspace is pressed on an empty field, move focus back
      const prevInput = document.getElementById(`otp-input-${index - 1}`);
      if (prevInput) {
        prevInput.focus();
      }
    }
  }

  /**
   * Handles paste events for the OTP input.
   * Pastes the entire string into the fields.
   */
  handleOtpPaste(event: ClipboardEvent): void {
    event.preventDefault(); // Prevent default paste behavior
    const pasteData = event.clipboardData?.getData('text');
    if (pasteData) {
      const pasteDigits = pasteData.trim().split('').filter(char => /\d/.test(char)); // Filter to get only digits
      
      for (let i = 0; i < this.otpDigits.length; i++) {
        if (pasteDigits[i]) {
          this.otpDigits[i] = pasteDigits[i];
        } else {
          this.otpDigits[i] = ''; // Clear remaining fields if paste data is shorter
        }
      }
      this.otpCode = this.otpDigits.join('');

      // Move focus to the last filled input or the last input if fully filled
      const lastFilledIndex = Math.min(pasteDigits.length - 1, this.otpDigits.length - 1);
      if (lastFilledIndex >= 0) {
        const lastInput = document.getElementById(`otp-input-${lastFilledIndex}`);
        if (lastInput) {
          lastInput.focus();
        }
      }
    }
  }

  /**
   * Verifies the OTP by calling the auth service
   */
  verifyOtp(): void {
    // Validate OTP is complete
    if (this.otpCode.length !== this.otpDigits.length) {
      this.errorMessage.set('Please enter the complete OTP.');
      return;
    }
    console.log('Verifying OTP:', this.otpCode);
    // Clear previous messages
    this.errorMessage.set('');
    this.successMessage.set('');
    this.isLoading.set(true);

    // Call the auth service to verify OTP
    this.authService.verify2FA(this.otpCode)
      .pipe(
        finalize(() => this.isLoading.set(false))
      )
      .subscribe({
        next: (response) => {
          console.log('OTP verification successful:', response);
          this.successMessage.set('Verification successful! Redirecting...');
          
          // Store auth data if returned in response
          if (response.token && response.isAdmin !== undefined) {
            // The service will handle storing token and admin status
          }
          
          // Redirect to dashboard or appropriate page after successful verification
          setTimeout(() => {
            this.router.navigate(['/dashboard']);
          }, 1500);
        },
        error: (error) => {
          console.error('OTP verification failed:', error);
          this.errorMessage.set(
            error.error?.message || 
            'Invalid or expired OTP. Please try again.'
          );
          
          // Clear OTP fields on error
          this.clearOtpFields();
        }
      });
  }

  /**
   * Resends the OTP by calling the auth service
   */
  resendOtp(): void {
    if (!this.canResend()) {
      console.log('Please wait before resending OTP.');
      return;
    }

    // Clear previous messages
    this.errorMessage.set('');
    this.successMessage.set('');
    this.isLoading.set(true);

    // You'll need to add a resendOTP method to your authService
    // For now, using forgotPassword as an example
    // Replace with actual resend endpoint
    // this.authService.forgotPassword(this.recipient)
    //   .pipe(
    //     finalize(() => this.isLoading.set(false))
    //   )
    //   .subscribe({
    //     next: (response) => {
    //       console.log('OTP resent successfully:', response);
    //       this.successMessage.set('New OTP sent successfully!');
    //       this.resendCountdown.set(60); // Reset countdown
    //       this.startResendCountdown();
    //       this.clearOtpFields();
    //     },
    //     error: (error) => {
    //       console.error('Failed to resend OTP:', error);
    //       this.errorMessage.set(
    //         error.error?.message || 
    //         'Failed to resend OTP. Please try again later.'
    //       );
    //     }
    //   });
  }

  /**
   * Starts the countdown timer for the resend OTP button.
   */
  private startResendCountdown(): void {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
    }
    this.countdownInterval = setInterval(() => {
      const currentCount = this.resendCountdown();
      if (currentCount > 0) {
        this.resendCountdown.set(currentCount - 1);
      } else {
        clearInterval(this.countdownInterval);
      }
    }, 1000);
  }

  /**
   * Clears all OTP input fields
   */
  private clearOtpFields(): void {
    this.otpDigits = ['', '', '', '', ''];
    this.otpCode = '';
    
    // Focus on first input
    const firstInput = document.getElementById('otp-input-0');
    if (firstInput) {
      firstInput.focus();
    }
  }
}