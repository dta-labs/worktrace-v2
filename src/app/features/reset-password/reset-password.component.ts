import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  standalone: true,
  selector: 'app-reset-password',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './reset-password.component.html',
  styleUrls: ['./reset-password.component.scss']
})
export class ResetPasswordComponent {
  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]]
  });

  loading = false;
  message = '';
  error = '';

  constructor(private fb: FormBuilder, private auth: AuthService, private router: Router) {}

  async submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading = true;
    this.error = '';
    this.message = '';

    try {
      await this.auth.resetPassword(this.form.value.email!);
      this.message = 'We sent you a reset link. Please check your email.';
    } catch (e: any) {
      this.error = this.mapFirebaseError(e?.code);
    } finally {
      this.loading = false;
    }
  }

  backToLogin() {
    this.router.navigate(['/login']);
  }

  private mapFirebaseError(code?: string): string {
    switch (code) {
      case 'auth/invalid-email': return 'Invalid email address.';
      case 'auth/user-not-found': return 'No account found with this email.';
      case 'auth/network-request-failed': return 'Network error. Try again.';
      default: return 'Could not send the reset email. Please try again.';
    }
  }
}