import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ClientApiService } from '../../../core/services/client-api';
import { TeamInviteRequest } from '../../../core/models/api.model';
import { AlertService } from '../../../core/services/alert.service';

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
  alertService = inject(AlertService);

  inviteForm: FormGroup;

  // Signals for reactive state management
  readonly rawMembers = signal<any[]>([]);
  readonly roles = signal<Role[]>([]);
  readonly isLoading = signal<boolean>(true);
  readonly isLoadingRoles = signal<boolean>(true);

  // Computed state combines raw members and roles automatically, preventing race conditions
  readonly teamMembers = computed<TeamMember[]>(() => {
    const currentRoles = this.roles();
    return this.rawMembers().map((member, index) => {
      const roleId = member.role_id;
      const matchedRole = currentRoles.find(r => Number(r.id) === Number(roleId));

      return {
        id: member.id || `member-${index}`,
        name: member.name || this.extractNameFromEmail(member.email),
        email: member.email,
        role: roleId?.toString() || 'N/A',
        roleName: matchedRole?.name || member.role_name || 'Unknown',
        status: this.normalizeStatus(member.status),
        invitedAt: member.invited_at || member.createdAt,
        acceptedAt: member.accepted_at || member.joinedAt
      };
    });
  });

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
      next: (roles: any[]) => {

        const transformedRoles = roles.map(role => ({
          id: role.id,
          name: role.name || role.role_name || 'Unknown Role', // Support API returning `name`
          description: role.description || '' // Ensure description is available if needed
        }));

        this.roles.set(transformedRoles);
        this.isLoadingRoles.set(false);
      },
      error: (err) => {
        console.error('❌ Error loading roles:', err);
        this.isLoadingRoles.set(false);

        // Fallback roles are correctly defined using 'name' key, so they are safe:
        this.roles.set([
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

    this.clientApi.getTeamMembers().subscribe({
      next: (members) => {
        this.rawMembers.set(members);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('❌ Error loading team members:', err);
        this.alertService.error('Failed to load team members. Please try again.');
        this.isLoading.set(false);
      }
    });
  }

  sendInvitation(): void {
    if (this.inviteForm.valid) {
      const formValue = this.inviteForm.value;

      const inviteData: TeamInviteRequest = {
        email: formValue.email,
        role_id: parseInt(formValue.role)
      };

      this.clientApi.inviteTeamMember(inviteData).subscribe({
        next: (response) => {
          const selectedRole = this.roles().find(r => r.id === inviteData.role_id);
          const roleName = selectedRole?.name || 'Unknown';

          this.alertService.success(`Invitation sent to ${formValue.email} as ${roleName}!`);

          // Add raw new member to the list (optimistic update maps cleanly via computed)
          const newRawMember = {
            id: response.id || `member-${Date.now()}`,
            name: this.extractNameFromEmail(formValue.email),
            email: formValue.email,
            role_id: inviteData.role_id,
            status: 'Pending',
            invited_at: new Date().toISOString()
          };

          this.rawMembers.update(members => [...members, newRawMember]);

          // Reset form
          this.inviteForm.reset({ role: '' });
        },
        error: (err) => {
          console.error('❌ Error sending invitation:', err);
          if (err.status === 400) {
            this.alertService.error(err.error?.message || 'Invalid email or role.');
          } else if (err.status === 409) {
            this.alertService.error('This user is already a team member or has a pending invitation.');
          } else if (err.status === 403) {
            this.alertService.error('You do not have permission to invite team members.');
          } else {
            this.alertService.error('Failed to send invitation. Please try again.');
          }
        }
      });
    } else {
      // Mark all fields as touched to show validation errors
      Object.keys(this.inviteForm.controls).forEach(key => {
        this.inviteForm.get(key)?.markAsTouched();
      });
    }
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

  get roleControl() {
    return this.inviteForm.get('role');
  }
}
