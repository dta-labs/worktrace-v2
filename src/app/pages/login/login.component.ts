import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { getAuth, signInWithEmailAndPassword } from '@angular/fire/auth';
import { Router } from '@angular/router';

@Component({
  standalone: true,
  selector: 'app-login',
  imports: [CommonModule, ReactiveFormsModule],
  template: `
  <div class="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100">
    <form [formGroup]="form" (ngSubmit)="login()" class="w-full max-w-sm p-8 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
      <h1 class="text-2xl font-bold mb-6">Sign in</h1>
      <input class="w-full mb-4 px-3 py-2 rounded-md border border-neutral-300 dark:border-neutral-700"
             type="email" formControlName="email" placeholder="Email" />
      <input class="w-full mb-4 px-3 py-2 rounded-md border border-neutral-300 dark:border-neutral-700"
             type="password" formControlName="password" placeholder="Password" />
      <button class="w-full py-2 rounded-md bg-indigo-600 text-white font-medium"
              [disabled]="form.invalid || loading">
        {{ loading ? 'Signing in...' : 'Sign in' }}
      </button>
      <p *ngIf="error" class="mt-4 text-sm text-red-500">{{ error }}</p>
    </form>
  </div>
  `
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private auth = getAuth();
  private router = inject(Router);

  loading = false;
  error: string | null = null;

  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]]
  });

  async login() {
    if (this.form.invalid) return;
    this.loading = true;
    const { email, password } = this.form.value;
    try {
      await signInWithEmailAndPassword(this.auth, email!, password!);
      this.router.navigateByUrl('/');
    } catch (e: any) {
      this.error = e.message || 'Login failed';
    } finally {
      this.loading = false;
    }
  }
}
