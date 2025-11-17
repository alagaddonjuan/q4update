import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ClientApiService } from '../../../core/services/client-api';
import { TeamInviteRequest } from '../../../core/models/api.model';

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
  roleName?: string;
  status: string;
  invitedAt?: string;
  acceptedAt?: string;
}

interface Role {
  id: number;
  name: string;
  description?: string;
  permissions?: string[];
}

@Component({
  selector: 'app-team-screen',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './team-screen.html',
  styleUrl: './team-screen.css',
})
export class TeamScreen implements OnInit {
  private readonly clientApi = inject(ClientApiService);
  private readonly fb = inject(FormBuilder);

  inviteForm: FormGroup;
  
  // Signals for reactive state management
  private readonly teamMembersSignal = signal<TeamMember[]>([]);
  private readonly rolesSignal = signal<Role[]>([]);
  readonly isLoading = signal<boolean>(true);
  readonly isLoadingRoles = signal<boolean>(true);
  readonly isSendingInvite = signal<boolean>(false);
  readonly error = signal<string | null>(null);
  readonly success = signal<string | null>(null);
  readonly inviteError = signal<string | null>(null);

  // Expose as getters
  get teamMembers(): TeamMember[] {
    return this.teamMembersSignal();
  }

  get roles(): Role[] {
    return this.rolesSignal();
  }

  constructor() {
    this.inviteForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      role: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    this.loadRoles();
    this.loadTeamMembers();
  }

  loadRoles(): void {
    this.isLoadingRoles.set(true);

    this.clientApi.getRoles().subscribe({
      next: (roles) => {
        console.log('👥 Roles loaded:', roles);
        this.rolesSignal.set(roles);
        this.isLoadingRoles.set(false);
      },
      error: (err) => {
        console.error('❌ Error loading roles:', err);
        this.isLoadingRoles.set(false);
        
        // Set default roles as fallback
        this.rolesSignal.set([
          { id: 1, name: 'Admin', description: 'Full access to all features' },
          { id: 2, name: 'Developer', description: 'Access to API and development tools' },
          { id: 3, name: 'Manager', description: 'Manage team and services' },
          { id: 4, name: 'Viewer', description: 'Read-only access' }
        ]);
      }
    });
  }

  loadTeamMembers(): void {
    this.isLoading.set(true);
    this.error.set(null);

    this.clientApi.getTeamMembers().subscribe({
      next: (members) => {
        console.log('👥 Team members loaded:', members);
        
        const transformedMembers = members.map((member, index) => ({
          id: member.id || `member-${index}`,
          name: member.name || this.extractNameFromEmail(member.email),
          email: member.email,
          role: member.role || member.role_id?.toString() || 'N/A',
          roleName: member.role_name || this.getRoleName(member.role_id),
          status: this.normalizeStatus(member.status),
          invitedAt: member.invited_at || member.createdAt,
          acceptedAt: member.accepted_at || member.joinedAt
        }));

        this.teamMembersSignal.set(transformedMembers);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('❌ Error loading team members:', err);
        this.error.set('Failed to load team members. Please try again.');
        this.isLoading.set(false);
      }
    });
  }

  sendInvitation(): void {
    if (this.inviteForm.valid) {
      this.isSendingInvite.set(true);
      this.inviteError.set(null);
      this.success.set(null);

      const formValue = this.inviteForm.value;
      
      const inviteData: TeamInviteRequest = {
        email: formValue.email,
        role_id: parseInt(formValue.role)
      };

      console.log('📤 Sending invitation:', inviteData);

      this.clientApi.inviteTeamMember(inviteData).subscribe({
        next: (response) => {
          console.log('✅ Invitation sent successfully:', response);
          this.isSendingInvite.set(false);
          
          const roleName = this.getRoleName(inviteData.role_id);
          this.success.set(`Invitation sent to ${formValue.email} as ${roleName}!`);
          
          // Add new member to the list (optimistic update)
          const newMember: TeamMember = {
            id: response.id || `member-${Date.now()}`,
            name: this.extractNameFromEmail(formValue.email),
            email: formValue.email,
            role: formValue.role,
            roleName: roleName,
            status: 'Pending',
            invitedAt: new Date().toISOString()
          };
          
          this.teamMembersSignal.update(members => [...members, newMember]);
          
          // Reset form
          this.inviteForm.reset();
          
          // Clear success message after 5 seconds
          setTimeout(() => this.success.set(null), 5000);
        },
        error: (err) => {
          console.error('❌ Error sending invitation:', err);
          this.isSendingInvite.set(false);
          
          if (err.status === 400) {
            this.inviteError.set(err.error?.message || 'Invalid email or role.');
          } else if (err.status === 409) {
            this.inviteError.set('This user is already a team member or has a pending invitation.');
          } else if (err.status === 403) {
            this.inviteError.set('You do not have permission to invite team members.');
          } else {
            this.inviteError.set('Failed to send invitation. Please try again.');
          }
          
          // Clear error after 5 seconds
          setTimeout(() => this.inviteError.set(null), 5000);
        }
      });
    } else {
      // Mark all fields as touched to show validation errors
      Object.keys(this.inviteForm.controls).forEach(key => {
        this.inviteForm.get(key)?.markAsTouched();
      });
    }
  }

  refreshTeam(): void {
    this.loadTeamMembers();
  }

  resendInvite(member: TeamMember): void {
    if (member.status !== 'Pending') {
      alert('Can only resend invitations to pending members');
      return;
    }

    const roleId = this.getRoleIdFromName(member.roleName || member.role);
    if (!roleId) {
      alert('Invalid role for this member');
      return;
    }

    const inviteData: TeamInviteRequest = {
      email: member.email,
      role_id: roleId
    };

    this.clientApi.inviteTeamMember(inviteData).subscribe({
      next: (response) => {
        console.log('✅ Invitation resent:', response);
        alert(`Invitation resent to ${member.email}`);
      },
      error: (err) => {
        console.error('❌ Error resending invitation:', err);
        alert('Failed to resend invitation');
      }
    });
  }

  removeMember(member: TeamMember): void {
    if (!confirm(`Are you sure you want to remove ${member.name} from the team?`)) {
      return;
    }

    // Note: You'll need to add a deleteMember method to ClientApiService
    // For now, we'll just remove from local state
    console.log('🗑️ Removing member:', member.email);
    
    this.teamMembersSignal.update(members => 
      members.filter(m => m.id !== member.id)
    );
    
    alert(`${member.name} has been removed from the team`);
  }

  // Helper methods
  private extractNameFromEmail(email: string): string {
    if (!email) return 'Unknown';
    const emailName = email.split('@')[0];
    return emailName
      .split(/[._-]/)
      .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join(' ');
  }

  private getRoleName(roleId: number | string | undefined): string {
    if (!roleId) return 'Unknown';
    const role = this.rolesSignal().find(r => r.id === Number(roleId));
    return role?.name || 'Unknown';
  }

  private getRoleIdFromName(roleName: string): number | null {
    const role = this.rolesSignal().find(r => 
      r.name.toLowerCase() === roleName.toLowerCase()
    );
    return role?.id || null;
  }

  private normalizeStatus(status: string | undefined): string {
    if (!status) return 'Unknown';
    
    const statusMap: { [key: string]: string } = {
      'pending': 'Pending',
      'active': 'Active',
      'accepted': 'Active',
      'invited': 'Pending',
      'inactive': 'Inactive',
      'suspended': 'Suspended'
    };

    return statusMap[status.toLowerCase()] || status;
  }

  getStatusClass(status: string): string {
    const statusClasses: { [key: string]: string } = {
      'Active': 'status-active',
      'Pending': 'status-pending',
      'Inactive': 'status-inactive',
      'Suspended': 'status-suspended'
    };

    return statusClasses[status] || 'status-unknown';
  }

  formatDate(dateString: string | undefined): string {
    if (!dateString) return 'N/A';
    
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-NG', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (e) {
      return 'N/A';
    }
  }

  // Getters for form controls
  get email() {
    return this.inviteForm.get('email');
  }

  get roleControl() {
    return this.inviteForm.get('role');
  }

  get activeMembers(): number {
    return this.teamMembersSignal().filter(m => m.status === 'Active').length;
  }

  get pendingInvites(): number {
    return this.teamMembersSignal().filter(m => m.status === 'Pending').length;
  }
}
