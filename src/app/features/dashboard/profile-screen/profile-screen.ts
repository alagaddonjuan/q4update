import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';

interface ApiKey {
  name: string;
  key: string;
  created: string;
}


@Component({
  selector: 'app-profile-screen',
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  standalone: true,
  templateUrl: './profile-screen.html',
  styleUrls: ['./profile-screen.css']
})

export class ProfileScreen  implements OnInit {

  profileForm!: FormGroup;
  apiKeys: ApiKey[] = [];
  newApiKeyName: string = '';
  mobileMenuOpen: boolean = false;  
  
  
  constructor(private fb: FormBuilder) {}

  ngOnInit(): void {
    this.initializeForm();
    this.loadMockData();
  }

  initializeForm(): void {
    this.profileForm = this.fb.group({
      fullName: ['Marvin McKinney', Validators.required],
      email: ['marvin@deepcreep.com', [Validators.required, Validators.email]],
      password: [''],
      country: ['']
    });
  }

  loadMockData(): void {
    // Mock API keys data
    this.apiKeys = [];
  }

  onSubmit(): void {
    if (this.profileForm.valid) {
      console.log('Form submitted:', this.profileForm.value);
      // Handle form submission logic here
      alert('Profile updated successfully!');
    } else {
      // Mark all fields as touched to show validation errors
      Object.keys(this.profileForm.controls).forEach(key => {
        this.profileForm.get(key)?.markAsTouched();
      });
    }
  }

  generateApiKey(): void {
    if (!this.newApiKeyName.trim()) {
      alert('Please enter a name for the API key');
      return;
    }

    const newKey: ApiKey = {
      name: this.newApiKeyName,
      key: this.generateRandomKey(),
      created: new Date().toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      })
    };

    this.apiKeys.push(newKey);
    this.newApiKeyName = '';
    console.log('New API key generated:', newKey);
  }

  deleteApiKey(index: number): void {
    if (confirm('Are you sure you want to delete this API key?')) {
      this.apiKeys.splice(index, 1);
      console.log('API key deleted');
    }
  }

  generateRandomKey(): string {
    const prefix = 'sk_';
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let key = prefix;
    for (let i = 0; i < 32; i++) {
      key += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return key.substring(0, 20) + '...';
  }

  enable2FA(): void {
    console.log('Enable 2FA clicked');
    alert('2FA setup wizard would open here');
  }

  toggleMobileMenu(): void {
    this.mobileMenuOpen = !this.mobileMenuOpen;
  }
}