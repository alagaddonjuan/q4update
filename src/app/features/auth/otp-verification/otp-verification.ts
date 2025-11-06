import { Component,OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'; // Required for ngModel

@Component({
  selector: 'app-otp-verification',
  imports: [CommonModule, FormsModule],
  templateUrl: './otp-verification.html',
  styleUrl: './otp-verification.css'
})
export class OtpVerification {
   // Placeholder path for the illustration image on the left.
  illustrationPath: string = 'assets/otp-verification.png';

  // Array to hold individual OTP digits
  otpDigits: string[] = ['', '', '', '', '']; 
  
  // Combine digits into a single string for submission
  otpCode: string = ''; 

  // Timer for resend functionality (optional, but common in OTP flows)
  resendCountdown: number = 60; // e.g., 60 seconds
  countdownInterval: any;

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
   * Placeholder for the verification logic.
   * This would typically call a service to send the OTP to your backend.
   */
  verifyOtp(): void {
    if (this.otpCode.length === this.otpDigits.length) {
      console.log('Verifying OTP:', this.otpCode);
      alert('OTP Submitted: ' + this.otpCode + ' (Check console for verification logic)');
      // Add your API call here, e.g., this.authService.verifyOtp(this.otpCode).subscribe(...)
    } else {
      alert('Please enter the complete OTP.');
    }
  }

  /**
   * Placeholder for the resend OTP logic.
   * This would typically call a service to request a new OTP.
   */
  resendOtp(): void {
    if (this.resendCountdown === 0) {
      console.log('Resending OTP to:', this.recipient);
      alert('Resending OTP to ' + this.recipient);
      this.resendCountdown = 60; // Reset countdown
      this.startResendCountdown();
      // Add your API call here, e.g., this.authService.resendOtp(this.recipient).subscribe(...)
    } else {
      console.log('Please wait before resending OTP.');
    }
  }

  /**
   * Starts the countdown timer for the resend OTP button.
   */
  startResendCountdown(): void {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
    }
    this.countdownInterval = setInterval(() => {
      if (this.resendCountdown > 0) {
        this.resendCountdown--;
      } else {
        clearInterval(this.countdownInterval);
      }
    }, 1000);
  }
}
