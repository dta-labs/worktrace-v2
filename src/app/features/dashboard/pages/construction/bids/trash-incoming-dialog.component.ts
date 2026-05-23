import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';

@Component({
    selector: 'app-trash-incoming-dialog',
    imports: [
        CommonModule,
        MatDialogModule,
        ReactiveFormsModule,
        MatFormFieldModule,
        MatInputModule,
        MatButtonModule,
    ],
    template: `
    <h2 mat-dialog-title>Move to Trash</h2>

    <mat-dialog-content class="dialog-content">
      <div class="dialog-subtitle">
        This will hide the item from <b>Incoming Bids</b> and move it to <b>Incoming Bids Trash</b>.
        It will be logged with user and time.
      </div>

      <div class="wt-danger-box">
        <div class="wt-danger-title">You are moving:</div>
        <div class="wt-danger-text">{{ data?.title || '(no title)' }}</div>
        <div class="wt-danger-meta" *ngIf="data?.projectName || data?.clientName">
          <span *ngIf="data?.clientName">{{ data.clientName }}</span>
          <span *ngIf="data?.clientName && data?.projectName"> • </span>
          <span *ngIf="data?.projectName">{{ data.projectName }}</span>
        </div>
      </div>

      <form [formGroup]="form" autocomplete="off">
        <mat-form-field appearance="outline" class="w-100">
          <mat-label>Reason (required)</mat-label>
          <textarea
            matInput
            rows="4"
            formControlName="reason"
            placeholder="Why are you moving this to trash?"></textarea>
          <mat-error *ngIf="form.controls.reason.invalid && form.controls.reason.touched">
            Reason is required
          </mat-error>
        </mat-form-field>
      </form>
    </mat-dialog-content>

    <mat-dialog-actions align="end" class="dialog-actions">
      <button mat-stroked-button type="button" class="wt-btn-cancel" (click)="cancel()">Cancel</button>
      <button mat-flat-button color="warn" type="button" [disabled]="form.invalid" (click)="confirm()">
        Move
      </button>
    </mat-dialog-actions>
  `,
    styles: [`
    :host {
      --trash-surface-bg: linear-gradient(180deg, #111827 0%, #0b1222 100%);
      --trash-text: #f8fafc;
      --trash-muted: rgba(226, 232, 240, .86);
      --trash-border: rgba(255, 255, 255, .12);
      --trash-field-bg: rgba(8, 15, 30, .9);
      --trash-field-border: rgba(59, 130, 246, .55);
      --trash-field-border-focus: #3b82f6;
      --trash-label: #93c5fd;
      --trash-placeholder: rgba(226, 232, 240, .60);
      --trash-cancel-text: #f8fafc;
      --trash-cancel-border: rgba(255, 255, 255, .32);
      --trash-cancel-bg: rgba(255, 255, 255, .08);
      --trash-cancel-hover-bg: rgba(255, 255, 255, .16);
      --trash-move-bg: #b91c1c;
      --trash-move-text: #ffffff;
      --trash-move-hover-bg: #991b1b;
      --trash-danger-border: rgba(255, 90, 90, .38);
      --trash-danger-bg: rgba(255, 90, 90, .09);
      --trash-danger-title: #fecaca;
      --trash-danger-text: #fee2e2;
      --trash-danger-meta: rgba(254, 226, 226, .86);
    }

    :host-context([data-theme='dark']) {
      --trash-surface-bg: linear-gradient(180deg, #111827 0%, #0b1222 100%);
      --trash-text: #f8fafc;
      --trash-muted: rgba(226, 232, 240, .86);
      --trash-border: rgba(255, 255, 255, .12);
      --trash-field-bg: rgba(8, 15, 30, .9);
      --trash-field-border: rgba(59, 130, 246, .55);
      --trash-field-border-focus: #3b82f6;
      --trash-label: #93c5fd;
      --trash-placeholder: rgba(226, 232, 240, .60);
      --trash-cancel-text: #f8fafc;
      --trash-cancel-border: rgba(255, 255, 255, .32);
      --trash-cancel-bg: rgba(255, 255, 255, .08);
      --trash-cancel-hover-bg: rgba(255, 255, 255, .16);
      --trash-move-bg: #b91c1c;
      --trash-move-text: #ffffff;
      --trash-move-hover-bg: #991b1b;
      --trash-danger-border: rgba(255, 90, 90, .38);
      --trash-danger-bg: rgba(255, 90, 90, .09);
      --trash-danger-title: #fecaca;
      --trash-danger-text: #fee2e2;
      --trash-danger-meta: rgba(254, 226, 226, .86);
    }

    :host-context([data-theme='midnight']) {
      --trash-surface-bg: linear-gradient(180deg, #0a1426 0%, #07101f 100%);
      --trash-text: #dbe5f1;
      --trash-muted: #b8c7dc;
      --trash-border: rgba(148, 163, 184, .24);
      --trash-field-bg: rgba(11, 25, 45, .92);
      --trash-field-border: rgba(96, 165, 250, .58);
      --trash-field-border-focus: #60a5fa;
      --trash-label: #93c5fd;
      --trash-placeholder: rgba(191, 204, 220, .68);
      --trash-cancel-text: #e2e8f0;
      --trash-cancel-border: rgba(148, 163, 184, .46);
      --trash-cancel-bg: rgba(148, 163, 184, .14);
      --trash-cancel-hover-bg: rgba(148, 163, 184, .22);
      --trash-move-bg: #dc2626;
      --trash-move-text: #ffffff;
      --trash-move-hover-bg: #b91c1c;
      --trash-danger-border: rgba(248, 113, 113, .46);
      --trash-danger-bg: rgba(127, 29, 29, .28);
      --trash-danger-title: #fecaca;
      --trash-danger-text: #ffe4e6;
      --trash-danger-meta: rgba(254, 226, 226, .88);
    }

    :host-context([data-theme='light']) {
      --trash-surface-bg: #ffffff;
      --trash-text: #0f172a;
      --trash-muted: #334155;
      --trash-border: rgba(15, 23, 42, .12);
      --trash-field-bg: #ffffff;
      --trash-field-border: rgba(37, 99, 235, .38);
      --trash-field-border-focus: #2563eb;
      --trash-label: #334155;
      --trash-placeholder: #64748b;
      --trash-cancel-text: #334155;
      --trash-cancel-border: rgba(15, 23, 42, .20);
      --trash-cancel-bg: #ffffff;
      --trash-cancel-hover-bg: rgba(15, 23, 42, .05);
      --trash-move-bg: #dc2626;
      --trash-move-text: #ffffff;
      --trash-move-hover-bg: #b91c1c;
      --trash-danger-border: rgba(220, 38, 38, .36);
      --trash-danger-bg: rgba(254, 226, 226, .95);
      --trash-danger-title: #991b1b;
      --trash-danger-text: #7f1d1d;
      --trash-danger-meta: #991b1b;
    }

    :host-context([data-theme='aurora']) {
      --trash-surface-bg: linear-gradient(180deg, #f8fbff 0%, #eef6ff 100%);
      --trash-text: #0f172a;
      --trash-muted: #334155;
      --trash-border: rgba(37, 99, 235, .18);
      --trash-field-bg: #ffffff;
      --trash-field-border: rgba(37, 99, 235, .42);
      --trash-field-border-focus: #2563eb;
      --trash-label: #1e3a8a;
      --trash-placeholder: #64748b;
      --trash-cancel-text: #334155;
      --trash-cancel-border: rgba(37, 99, 235, .28);
      --trash-cancel-bg: rgba(255, 255, 255, .94);
      --trash-cancel-hover-bg: rgba(37, 99, 235, .08);
      --trash-move-bg: #dc2626;
      --trash-move-text: #ffffff;
      --trash-move-hover-bg: #b91c1c;
      --trash-danger-border: rgba(239, 68, 68, .38);
      --trash-danger-bg: rgba(254, 226, 226, .92);
      --trash-danger-title: #991b1b;
      --trash-danger-text: #7f1d1d;
      --trash-danger-meta: #991b1b;
    }

    /* Critical fix: make the dialog surface a vertical flex container so content can scroll without clipping */
    :host ::ng-deep .mat-mdc-dialog-container .mdc-dialog__surface,
    :host ::ng-deep .mat-mdc-dialog-surface {
      display: flex;
      flex-direction: column;
      overflow: hidden;
      max-height: 90vh;
      background: var(--trash-surface-bg) !important;
      border: 1px solid var(--trash-border) !important;
      color: var(--trash-text) !important;
    }

    .dialog-content {
      display: flex;
      flex-direction: column;
      gap: 16px;
      padding-top: 8px;
      min-width: 520px;
      max-width: 92vw;
      flex: 1 1 auto;
      overflow: auto;
    }

    .dialog-actions {
      margin: 0;
      flex: 0 0 auto;
    }

    .dialog-subtitle {
      color: var(--trash-muted);
      font-size: 12px;
      line-height: 1.45;
    }

    :host ::ng-deep .mat-mdc-dialog-content,
    :host ::ng-deep mat-dialog-content,
    :host ::ng-deep .mat-mdc-dialog-actions,
    :host ::ng-deep mat-dialog-actions {
      color: var(--trash-text) !important;
    }

    .dialog-subtitle b {
      color: var(--trash-text);
    }

    :host ::ng-deep .mat-mdc-dialog-title,
    :host ::ng-deep h2[mat-dialog-title] {
      color: var(--trash-text) !important;
      font-weight: 800;
    }

    .w-100 { width: 100%; }

    :host ::ng-deep .mat-mdc-form-field { width: 100%; }
    :host ::ng-deep .mat-mdc-form-field .mdc-notched-outline__leading,
    :host ::ng-deep .mat-mdc-form-field .mdc-notched-outline__notch,
    :host ::ng-deep .mat-mdc-form-field .mdc-notched-outline__trailing {
      border-color: var(--trash-field-border) !important;
    }
    :host ::ng-deep .mat-mdc-form-field.mat-focused .mdc-notched-outline__leading,
    :host ::ng-deep .mat-mdc-form-field.mat-focused .mdc-notched-outline__notch,
    :host ::ng-deep .mat-mdc-form-field.mat-focused .mdc-notched-outline__trailing {
      border-color: var(--trash-field-border-focus) !important;
    }
    :host ::ng-deep .mat-mdc-form-field .mdc-text-field--outlined {
      background: var(--trash-field-bg);
      border-radius: 12px;
    }
    :host ::ng-deep .mat-mdc-floating-label,
    :host ::ng-deep .mdc-floating-label {
      color: var(--trash-label) !important;
    }
    :host ::ng-deep .mat-mdc-input-element,
    :host ::ng-deep textarea.mat-mdc-input-element {
      color: var(--trash-text) !important;
      caret-color: var(--trash-text) !important;
    }
    :host ::ng-deep .mat-mdc-input-element::placeholder,
    :host ::ng-deep textarea.mat-mdc-input-element::placeholder {
      color: var(--trash-placeholder) !important;
      opacity: 1;
    }

    :host ::ng-deep .mat-mdc-form-field-subscript-wrapper,
    :host ::ng-deep .mat-mdc-form-field-hint,
    :host ::ng-deep .mat-mdc-form-field-error {
      color: var(--trash-muted) !important;
    }

    :host ::ng-deep .dialog-actions .mat-mdc-stroked-button {
      color: var(--trash-cancel-text) !important;
      border-color: var(--trash-cancel-border) !important;
      background: var(--trash-cancel-bg) !important;
    }

    :host ::ng-deep .dialog-actions .mat-mdc-stroked-button:hover {
      background: var(--trash-cancel-hover-bg) !important;
    }

    :host ::ng-deep .dialog-actions .wt-btn-cancel,
    :host ::ng-deep .dialog-actions .wt-btn-cancel.mat-mdc-stroked-button,
    :host ::ng-deep .dialog-actions button.wt-btn-cancel.mat-mdc-stroked-button {
      color: var(--trash-cancel-text) !important;
      border-color: var(--trash-cancel-border) !important;
      background: var(--trash-cancel-bg) !important;
      border-width: 1px !important;
      font-weight: 700 !important;
      box-shadow: none !important;
      --mdc-outlined-button-label-text-color: var(--trash-cancel-text);
      --mdc-outlined-button-outline-color: var(--trash-cancel-border);
      --mdc-outlined-button-container-color: var(--trash-cancel-bg);
    }

    :host ::ng-deep .dialog-actions .wt-btn-cancel:hover,
    :host ::ng-deep .dialog-actions .wt-btn-cancel.mat-mdc-stroked-button:hover,
    :host ::ng-deep .dialog-actions button.wt-btn-cancel.mat-mdc-stroked-button:hover {
      background: var(--trash-cancel-hover-bg) !important;
      border-color: var(--trash-cancel-border) !important;
      color: var(--trash-cancel-text) !important;
      --mdc-outlined-button-label-text-color: var(--trash-cancel-text);
      --mdc-outlined-button-outline-color: var(--trash-cancel-border);
      --mdc-outlined-button-container-color: var(--trash-cancel-hover-bg);
    }

    :host ::ng-deep .dialog-actions .mat-mdc-unelevated-button,
    :host ::ng-deep .dialog-actions .mat-mdc-raised-button {
      background: var(--trash-move-bg) !important;
      color: var(--trash-move-text) !important;
    }

    :host ::ng-deep .dialog-actions .mat-mdc-unelevated-button:hover,
    :host ::ng-deep .dialog-actions .mat-mdc-raised-button:hover {
      background: var(--trash-move-hover-bg) !important;
    }

    .wt-danger-box{
      border: 1px solid var(--trash-danger-border);
      background: var(--trash-danger-bg);
      border-radius: 12px;
      padding: 12px 14px;
    }
    .wt-danger-title{ color: var(--trash-danger-title); font-weight: 700; margin-bottom: 6px; }
    .wt-danger-text{ color: var(--trash-danger-text); font-weight: 600; }
    .wt-danger-meta{ color: var(--trash-danger-meta); margin-top: 4px; font-size: 12px; }
  `]
})
export class TrashIncomingDialogComponent {
  private fb = inject(FormBuilder);
  private ref = inject(MatDialogRef<TrashIncomingDialogComponent>);
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
  getPreviewDays(): number | null {
    const value = this.form.get('bidDueDate')?.value;
    if (!value) return null;
    const due = new Date(value);
    const today = new Date();
    today.setHours(0,0,0,0);
    due.setHours(0,0,0,0);
    const diff = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  }

  getPreviewText(): string {
    const days = this.getPreviewDays();
    if (days === null) return '';
    if (days < 0) return `Overdue by ${Math.abs(days)} day(s)`;
    if (days === 0) return 'Due today';
    return `${days} day(s) remaining`;
  }

  getPreviewClass(): string {
    const days = this.getPreviewDays();
    if (days === null) return '';
    if (days < 0) return 'due-overdue';
    if (days <= 2) return 'due-urgent';
    return 'due-normal';
  }


}
