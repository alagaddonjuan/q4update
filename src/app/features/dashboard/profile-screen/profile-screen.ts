import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ClientApiService } from '../../../core/services/client-api';
import { AuthService } from '../../../core/services/auth';
import { ApiKeyRequest } from '../../../core/models/api.model';
import { AlertService } from '../../../core/services/alert.service';

interface ApiKey {
  id?: number;
  name: string;
  key: string;
  key_name?: string;
  api_key?: string;
  created: string;
  created_at?: string;
  whitelist_ips?: string;
}

@Component({
  selector: 'app-profile-screen',
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  standalone: true,
  templateUrl: './profile-screen.html',
  styleUrls: ['./profile-screen.css']
})
export class ProfileScreen implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly clientApi = inject(ClientApiService);
  private readonly authService = inject(AuthService);
  alertService = inject(AlertService);

  profileForm!: FormGroup;
  newApiKeyName: string = '';
  mobileMenuOpen: boolean = false;

  // Signals for reactive state management
  private readonly apiKeysSignal = signal<ApiKey[]>([]);
  readonly isLoadingProfile = signal<boolean>(true);
  readonly isLoadingKeys = signal<boolean>(true);
  readonly isSavingProfile = signal<boolean>(false);
  readonly isGeneratingKey = signal<boolean>(false);
  readonly isDeletingKey = signal<{ [key: number]: boolean }>({});
  readonly profileError = signal<string | null>(null);
  readonly profileSuccess = signal<string | null>(null);
  readonly newlyGeneratedKey = signal<string | null>(null);

  get apiKeys(): ApiKey[] {
    return this.apiKeysSignal();
  }

  ngOnInit(): void {
    this.initializeForm();
    this.loadProfileData();
    this.loadApiKeys();
  }

  initializeForm(): void {
    this.profileForm = this.fb.group({
      fullName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.minLength(8)]],
      country: ['']
    });
  }

  loadProfileData(): void {
    this.isLoadingProfile.set(true);
    this.profileError.set(null);

    this.clientApi.getDashboard().subscribe({
      next: (data) => {
        console.log('👤 Profile data loaded:', data);

        if (data.client) {
          this.profileForm.patchValue({
            fullName: data.client.name || '',
            email: data.client.email || '',
            country: data.client.country || ''
          });
        }

        this.isLoadingProfile.set(false);
      },
      error: (err) => {
        console.error('❌ Error loading profile:', err);

        if (err.status === 404) {
          console.log('⚠️ Using fallback profile data');
          this.profileForm.patchValue({
            fullName: 'User',
            email: 'user@example.com'
          });
        } else {
          this.profileError.set('Failed to load profile data.');
        }

        this.isLoadingProfile.set(false);
      }
    });
  }

  loadApiKeys(): void {
    this.isLoadingKeys.set(true);

    this.clientApi.getApiKeys().subscribe({
      next: (keys) => {

        const transformedKeys = keys.map(key => ({
          id: key.id,
          name: key.key_name || key.name || 'Unnamed Key',
          key: key.api_key || key.key || 'sk_***************',
          created: this.formatDate(key.created_at || key.created),
          whitelist_ips: key.whitelisted_ips || key.whitelist_ips || ''
        }));

        this.apiKeysSignal.set(transformedKeys);
        this.isLoadingKeys.set(false);
      },
      error: (err) => {
        console.error('❌ Error loading API keys:', err);

        if (err.status === 404) {
          this.apiKeysSignal.set([]);
        } else {
          this.alertService.error('Failed to load API keys.');
        }

        this.isLoadingKeys.set(false);
      }
    });
  }

  onSubmit(): void {
    if (this.profileForm.valid) {
      this.isSavingProfile.set(true);
      this.profileError.set(null);
      this.profileSuccess.set(null);

      const formValue = this.profileForm.value;
      const updateData: any = {
        name: formValue.fullName
      };

      // Only include password if it was changed
      if (formValue.password && formValue.password.trim()) {
        updateData.password = formValue.password;
      }

      console.log('💾 Updating profile:', updateData);

      this.clientApi.updateProfile(updateData).subscribe({
        next: (response) => {
          console.log('✅ Profile updated successfully:', response);
          this.isSavingProfile.set(false);
          this.profileSuccess.set('Profile updated successfully!');

          // Clear password field after successful update
          this.profileForm.patchValue({ password: '' });

          setTimeout(() => this.profileSuccess.set(null), 5000);
        },
        error: (err) => {
          console.error('❌ Error updating profile:', err);
          this.isSavingProfile.set(false);

          if (err.status === 404) {
            console.log('⚠️ API not available. Showing success locally.');
            this.profileSuccess.set('Profile updated locally (API not available)');
            setTimeout(() => this.profileSuccess.set(null), 5000);
          } else if (err.status === 400) {
            this.profileError.set(err.error?.message || 'Invalid profile data.');
          } else if (err.status === 401) {
            this.profileError.set('Session expired. Please login again.');
            setTimeout(() => this.authService.logout(), 2000);
          } else {
            this.profileError.set('Failed to update profile. Please try again.');
          }

          setTimeout(() => this.profileError.set(null), 5000);
        }
      });
    } else {
      // Mark all fields as touched to show validation errors
      Object.keys(this.profileForm.controls).forEach(key => {
        this.profileForm.get(key)?.markAsTouched();
      });
    }
  }

  generateApiKey(): void {
    if (!this.newApiKeyName.trim()) {
      this.alertService.info('Please enter a name for the API key');
      return;
    }

    this.isGeneratingKey.set(true);
    this.newlyGeneratedKey.set(null);

    const keyData: ApiKeyRequest = {
      key_name: this.newApiKeyName.trim()
    };

    this.clientApi.createApiKey(keyData).subscribe({
      next: (response) => {
        console.log('✅ API key generated successfully:', response);
        this.isGeneratingKey.set(false);

        // Store the full key temporarily for display
        if (response.api_key) {
          this.newlyGeneratedKey.set(response.api_key);
        }

        const newKey: ApiKey = {
          id: response.id,
          name: this.newApiKeyName,
          key: response.api_key || this.generateRandomKey(),
          created: new Date().toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
          }),
          whitelist_ips: ''
        };

        this.apiKeysSignal.update(keys => [...keys, newKey]);
        this.newApiKeyName = '';
        this.alertService.success('API key generated successfully! Save it now, you won\'t be able to see it again.');

        // Clear the newly generated key display after 30 seconds
        setTimeout(() => 30000);
      },
      error: (err) => {
        console.error('❌ Error generating API key:', err);
        this.isGeneratingKey.set(false);

        if (err.status === 404) {
          const localKey: ApiKey = {
            id: Date.now(),
            name: this.newApiKeyName,
            key: this.generateRandomKey(),
            created: new Date().toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric'
            })
          };
          this.apiKeysSignal.update(keys => [...keys, localKey]);
          this.newApiKeyName = '';
          this.alertService.success('API key created locally (API not available)');
        } else if (err.status === 400) {
          this.alertService.error(err.error?.message || 'Invalid API key name.');
        } else {
          this.alertService.error('Failed to generate API key. Please try again.');
        }
      }
    });
  }

  deleteApiKey(index: number): void {
    const key = this.apiKeys[index];
    if (!key.id) {
      this.apiKeysSignal.update(keys => keys.filter((_, i) => i !== index));
      return;
    }

    if (!confirm(`Are you sure you want to delete "${key.name}"? This action cannot be undone.`)) {
      return;
    }

    this.isDeletingKey.update(state => ({ ...state, [key.id!]: true }));

    this.clientApi.deleteApiKey(key.id).subscribe({
      next: (response) => {
        console.log('✅ API key deleted successfully:', response);

        this.apiKeysSignal.update(keys => keys.filter((_, i) => i !== index));
        this.alertService.success(`API key "${key.name}" deleted successfully`);
        this.isDeletingKey.update(state => ({ ...state, [key.id!]: false }));
      },
      error: (err) => {
        console.error('❌ Error deleting API key:', err);
        this.alertService.error('❌ Error deleting API key:', err);
        this.isDeletingKey.update(state => ({ ...state, [key.id!]: false }));

        if (err.status === 404) {
          this.apiKeysSignal.update(keys => keys.filter((_, i) => i !== index));
          this.alertService.success(`API key "${key.name}" deleted locally`);
        } else {
          this.alertService.error('Failed to delete API key. Please try again.');
        }
      }
    });
  }

  copyToClipboard(text: string): void {
    navigator.clipboard.writeText(text).then(() => {
      this.alertService.success('API key copied to clipboard!');
    }).catch(err => {
      console.error('Failed to copy:', err);
      this.alertService.error('Failed to copy to clipboard');
    });
  }

  enable2FA(): void {
    this.alertService.error('2FA setup is not yet implemented. Coming soon!');
  }

  toggleMobileMenu(): void {
    this.mobileMenuOpen = !this.mobileMenuOpen;
  }

  // Helper methods
  private generateRandomKey(): string {
    const prefix = 'sk_';
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let key = prefix;
    for (let i = 0; i < 32; i++) {
      key += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return key.substring(0, 20) + '...';
  }

  private formatDate(dateString: string | undefined): string {
    if (!dateString) {
      return new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    }

    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (e) {
      return dateString;
    }
  }

  isKeyDeleting(keyId: number | undefined): boolean {
    if (!keyId) return false;
    return this.isDeletingKey()[keyId] || false;
  }

  get fullName() {
    return this.profileForm.get('fullName');
  }

  get email() {
    return this.profileForm.get('email');
  }

  get password() {
    return this.profileForm.get('password');
  }

  // Generate initials from user's name for avatar
  getInitials(name?: string): string {
    const userName = name || this.profileForm.get('fullName')?.value || 'User';

    // Split by spaces and get first letter of each word
    const words = userName.trim().split(/\s+/);

    if (words.length === 0) return 'U';

    // Get first letter of first name and last name (or first two words)
    if (words.length === 1) {
      // Single word: take first two characters
      return words[0].substring(0, 2).toUpperCase();
    }

    // Multiple words: take first letter of first and last word
    const firstInitial = words[0].charAt(0);
    const lastInitial = words[words.length - 1].charAt(0);

    return (firstInitial + lastInitial).toUpperCase();
  }

  // Generate consistent color based on name
  getAvatarColor(name?: string): string {
    const userName = name || this.profileForm.get('fullName')?.value || 'User';

    // Generate a hash from the name
    let hash = 0;
    for (let i = 0; i < userName.length; i++) {
      hash = userName.charCodeAt(i) + ((hash << 5) - hash);
    }

    // Predefined color palette (professional looking colors)
    const colors = [
      'bg-teal-700',

    ];

    // Use hash to pick a color
    const index = Math.abs(hash) % colors.length;
    return colors[index];
  }

  // Alternative: Get gradient background
  getAvatarGradient(name?: string): string {
    const userName = name || this.profileForm.get('fullName')?.value || 'User';

    // Generate a hash from the name
    let hash = 0;
    for (let i = 0; i < userName.length; i++) {
      hash = userName.charCodeAt(i) + ((hash << 5) - hash);
    }

    // Predefined gradient combinations
    const gradients = [
      'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
      'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
      'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
      'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
      'linear-gradient(135deg, #30cfd0 0%, #330867 100%)',
      'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
      'linear-gradient(135deg, #ff9a56 0%, #ff6a88 100%)',
      'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
      'linear-gradient(135deg, #e0c3fc 0%, #8ec5fc 100%)'
    ];

    const index = Math.abs(hash) % gradients.length;
    return gradients[index];
  }
}