
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';

interface TeamMember {
  name: string;
  email: string;
  role: string;
  status: string;
}

@Component({
  selector: 'app-team-screen',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './team-screen.html',
  styleUrl: './team-screen.css',
})
export class TeamScreen {
   inviteForm: FormGroup;
  teamMembers: TeamMember[] = [];

  constructor(private fb: FormBuilder) {
    this.inviteForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      role: ['', Validators.required]
    });
  }

  sendInvitation(): void {
    if (this.inviteForm.valid) {
      const formValue = this.inviteForm.value;
      
      // Extract name from email (before @)
      const emailName = formValue.email.split('@')[0];
      const name = emailName.charAt(0).toUpperCase() + emailName.slice(1);
      
      // Add new member to the list
      const newMember: TeamMember = {
        name: name,
        email: formValue.email,
        role: formValue.role,
        status: 'Pending'
      };
      
      this.teamMembers.push(newMember);
      
      console.log('Invitation sent:', formValue);
      
      // Reset form
      this.inviteForm.reset();
      
      alert(`Invitation sent to ${formValue.email} as ${formValue.role}!`);
    }
  }
}
