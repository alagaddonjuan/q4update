import { Component,OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  selector: 'app-forgot-password',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './forgot-password.html',
  styleUrl: './forgot-password.css'
})
export class ForgotPassword implements OnInit {
 forgotPasswordForm!: FormGroup;
  isSubmitting = false;
  showSuccessMessage = false;
  illustrationPath: string = 'assets/form-image.png';
  

  constructor(private fb: FormBuilder,private router: Router) {}

  ngOnInit(): void {
    this.forgotPasswordForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]]
    });
  }

  onSubmit(): void {
    if (this.forgotPasswordForm.valid) {
      this.isSubmitting = true;
      console.log('Password reset requested for:', this.forgotPasswordForm.value.email);
      
      // Simulate API call
      setTimeout(() => {
        this.isSubmitting = false;
        this.showSuccessMessage = true;
        
        // Hide success message after 5 seconds
        setTimeout(() => {
          this.showSuccessMessage = false;
        }, 5000);
      }, 1500);
      
      // Handle password reset logic here
    } else {
      // Mark field as touched to show validation error
      this.forgotPasswordForm.get('email')?.markAsTouched();
    }
  }

  goBack(): void {
    console.log('Navigate back to sign in');
    // Handle navigation back to sign in page
    this.router.navigate(['/login']);
  }
}
