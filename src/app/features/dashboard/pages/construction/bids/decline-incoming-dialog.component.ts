import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-decline-incoming-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatButtonModule],
  template: `
    <div class="wt-modal">
      <div class="wt-modal-header">
        <div>
          <div class="wt-modal-title">Remove incoming bid</div>
          <div class="wt-modal-subtitle">
            This will move the item to <b>Declined</b> (it won’t show in the main list).
            It will be logged with user and time.
          </div>
        </div>
      </div>

      <div class="wt-modal-body">
        <div class="wt-danger-box">
          <div class="wt-danger-title">You are removing:</div>
          <div class="wt-danger-text">{{ data?.title || '(no title)' }}</div>
          <div class="wt-danger-meta" *ngIf="data?.projectName || data?.clientName">
            <span *ngIf="data?.clientName">{{ data.clientName }}</span>
            <span *ngIf="data?.clientName && data?.projectName"> • </span>
            <span *ngIf="data?.projectName">{{ data.projectName }}</span>
          </div>
        </div>

        <form [formGroup]="form" autocomplete="off">
          <mat-form-field appearance="outline" class="w-100">
            <mat-label>Justification (required)</mat-label>
            <textarea matInput rows="4" formControlName="reason" placeholder="Why are you declining/removing this opportunity?"></textarea>
            <mat-error *ngIf="form.controls.reason.invalid && form.controls.reason.touched">Justification is required</mat-error>
          </mat-form-field>
        </form>
      </div>

      <div class="wt-modal-actions">
        <button mat-stroked-button type="button" (click)="cancel()">Cancel</button>
        <button mat-flat-button color="warn" type="button" [disabled]="form.invalid" (click)="confirm()">Remove</button>
      </div>
    </div>
  `,
  styles: [`
    .w-100 { width: 100%; }
    .wt-danger-box{
      border: 1px solid rgba(255,90,90,.35);
      background: rgba(255,90,90,.06);
      border-radius: 12px;
      padding: 12px 14px;
      margin-bottom: 14px;
    }
    .wt-danger-title{ font-weight: 600; margin-bottom: 6px; }
    .wt-danger-text{ opacity: .95; }
    .wt-danger-meta{ opacity: .75; margin-top: 4px; font-size: 12px; }
  `]
})
export class DeclineIncomingDialogComponent {
  private fb = inject(FormBuilder);
  private ref = inject(MatDialogRef<DeclineIncomingDialogComponent>);
  data = inject(MAT_DIALOG_DATA) as any;

  form = this.fb.group({
    reason: ['', [Validators.required, Validators.minLength(3)]],
  });

  cancel() { this.ref.close(null); }

  confirm() {
    const reason = (this.form.controls.reason.value ?? '').toString().trim();
    if (!reason) return;
    this.ref.close(reason);
  }
}