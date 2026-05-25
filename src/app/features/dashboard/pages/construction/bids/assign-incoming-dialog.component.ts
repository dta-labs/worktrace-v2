
import { Component, Inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';

export interface AssignIncomingDialogData {
  currentAssignee?: string | null;
}

@Component({
    selector: 'app-assign-incoming-dialog',
    imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule
],
    template: `
    <div class="wt-assign-wrap">
      <div class="wt-assign-header">
        <div class="wt-assign-title">Assign Incoming Bid</div>
        <div class="wt-assign-sub">Set the estimator or bidder responsible for this request.</div>
      </div>
    
      <div class="wt-assign-body">
        <label class="wt-assign-label" for="assignIncomingName">Assign to *</label>
    
        <mat-form-field appearance="outline" class="wt-assign-field">
          <input
            id="assignIncomingName"
            matInput
            [formControl]="form.controls.name"
            placeholder="e.g. Juan Perez"
            autocomplete="off"
            />
            <mat-hint>Use the same display name your team recognizes.</mat-hint>
            @if (form.controls.name.invalid && form.controls.name.touched) {
              <mat-error>Name is required</mat-error>
            }
          </mat-form-field>
        </div>
    
        <div class="wt-assign-actions">
          <button mat-stroked-button type="button" class="wt-btn-cancel" (click)="close()">Cancel</button>
          <button mat-flat-button color="primary" type="button" class="wt-btn-assign" [disabled]="form.invalid" (click)="save()">
            Assign
          </button>
        </div>
      </div>
    `,
    styles: [
        `
      :host {
        display: block;
        width: 100%;
        color: var(--assign-text);

        --assign-text: #e8eef8;
        --assign-muted: rgba(230, 236, 245, 0.82);
        --assign-label: #d7e3ff;
        --assign-bg: linear-gradient(180deg, #0b1530 0%, #08101f 100%);
        --assign-border: rgba(255, 255, 255, 0.08);
        --assign-field-bg: rgba(255, 255, 255, 0.03);
        --assign-field-border: rgba(255, 255, 255, 0.18);
        --assign-field-border-hover: rgba(79, 160, 255, 0.45);
        --assign-field-border-focus: rgba(79, 160, 255, 0.75);
        --assign-placeholder: rgba(230, 236, 245, 0.55);
        --assign-hint: rgba(230, 236, 245, 0.64);
        --assign-cancel-text: #e8eef8;
        --assign-cancel-border: rgba(255, 255, 255, 0.16);
        --assign-cancel-bg: rgba(255, 255, 255, 0.04);
        --assign-cancel-hover-bg: rgba(255, 255, 255, 0.08);
        --assign-primary-bg: #2563eb;
        --assign-primary-text: #ffffff;
        --assign-primary-hover-bg: #1d4ed8;
      }

      :host-context([data-theme='midnight']) {
        --assign-text: #dbe5f1;
        --assign-muted: #9fb1c8;
        --assign-label: #c8d6ea;
        --assign-bg: linear-gradient(180deg, #08192f 0%, #071325 100%);
        --assign-border: rgba(148, 163, 184, 0.2);
        --assign-field-bg: rgba(96, 165, 250, 0.06);
        --assign-field-border: rgba(148, 163, 184, 0.24);
        --assign-field-border-hover: rgba(96, 165, 250, 0.52);
        --assign-field-border-focus: rgba(96, 165, 250, 0.8);
        --assign-placeholder: rgba(203, 213, 225, 0.65);
        --assign-hint: rgba(191, 204, 220, 0.76);
        --assign-cancel-text: #dbe5f1;
        --assign-cancel-border: rgba(148, 163, 184, 0.32);
        --assign-cancel-bg: rgba(148, 163, 184, 0.08);
        --assign-cancel-hover-bg: rgba(148, 163, 184, 0.15);
        --assign-primary-bg: #3b82f6;
        --assign-primary-text: #ffffff;
        --assign-primary-hover-bg: #2563eb;
      }

      :host-context([data-theme='light']) {
        --assign-text: #0f172a;
        --assign-muted: #475569;
        --assign-label: #1e293b;
        --assign-bg: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
        --assign-border: rgba(15, 23, 42, 0.12);
        --assign-field-bg: #ffffff;
        --assign-field-border: rgba(15, 23, 42, 0.2);
        --assign-field-border-hover: rgba(37, 99, 235, 0.38);
        --assign-field-border-focus: rgba(37, 99, 235, 0.72);
        --assign-placeholder: #64748b;
        --assign-hint: #64748b;
        --assign-cancel-text: #334155;
        --assign-cancel-border: rgba(15, 23, 42, 0.2);
        --assign-cancel-bg: #ffffff;
        --assign-cancel-hover-bg: rgba(15, 23, 42, 0.05);
        --assign-primary-bg: #2563eb;
        --assign-primary-text: #ffffff;
        --assign-primary-hover-bg: #1d4ed8;
      }

      :host-context([data-theme='aurora']) {
        --assign-text: #0f172a;
        --assign-muted: #475569;
        --assign-label: #1e293b;
        --assign-bg: linear-gradient(180deg, #f8fbff 0%, #eef6ff 100%);
        --assign-border: rgba(37, 99, 235, 0.18);
        --assign-field-bg: #ffffff;
        --assign-field-border: rgba(37, 99, 235, 0.24);
        --assign-field-border-hover: rgba(37, 99, 235, 0.46);
        --assign-field-border-focus: rgba(37, 99, 235, 0.78);
        --assign-placeholder: #64748b;
        --assign-hint: #64748b;
        --assign-cancel-text: #334155;
        --assign-cancel-border: rgba(37, 99, 235, 0.28);
        --assign-cancel-bg: rgba(255, 255, 255, 0.92);
        --assign-cancel-hover-bg: rgba(37, 99, 235, 0.08);
        --assign-primary-bg: #2563eb;
        --assign-primary-text: #ffffff;
        --assign-primary-hover-bg: #1d4ed8;
      }

      .wt-assign-wrap {
        width: 100%;
        background: var(--assign-bg);
        border: 1px solid var(--assign-border);
        overflow: hidden;
      }

      .wt-assign-header {
        padding: 22px 22px 14px;
        border-bottom: 1px solid var(--assign-border);
      }

      .wt-assign-title {
        margin: 0;
        font-size: 18px;
        font-weight: 700;
        line-height: 1.2;
        color: var(--assign-text);
      }

      .wt-assign-sub {
        margin-top: 8px;
        font-size: 13px;
        line-height: 1.45;
        color: var(--assign-muted);
      }

      .wt-assign-body {
        padding: 18px 22px 10px;
      }

      .wt-assign-label {
        display: block;
        margin-bottom: 10px;
        font-size: 13px;
        font-weight: 700;
        color: var(--assign-label);
      }

      .wt-assign-field {
        width: 100%;
      }

      :host ::ng-deep .wt-assign-field .mat-mdc-text-field-wrapper {
        background: var(--assign-field-bg) !important;
      }

      :host ::ng-deep .wt-assign-field .mdc-notched-outline__leading,
      :host ::ng-deep .wt-assign-field .mdc-notched-outline__notch,
      :host ::ng-deep .wt-assign-field .mdc-notched-outline__trailing {
        border-color: var(--assign-field-border) !important;
      }

      :host ::ng-deep .wt-assign-field.mat-focused .mdc-notched-outline__leading,
      :host ::ng-deep .wt-assign-field.mat-focused .mdc-notched-outline__notch,
      :host ::ng-deep .wt-assign-field.mat-focused .mdc-notched-outline__trailing {
        border-color: var(--assign-field-border-focus) !important;
      }

      :host ::ng-deep .wt-assign-field:hover .mdc-notched-outline__leading,
      :host ::ng-deep .wt-assign-field:hover .mdc-notched-outline__notch,
      :host ::ng-deep .wt-assign-field:hover .mdc-notched-outline__trailing {
        border-color: var(--assign-field-border-hover) !important;
      }

      :host ::ng-deep .wt-assign-field .mat-mdc-input-element {
        color: var(--assign-text) !important;
      }

      :host ::ng-deep .wt-assign-field .mat-mdc-input-element::placeholder {
        color: var(--assign-placeholder) !important;
        opacity: 1;
      }

      :host ::ng-deep .wt-assign-field .mdc-floating-label,
      :host ::ng-deep .wt-assign-field .mat-mdc-floating-label {
        color: var(--assign-muted) !important;
      }

      :host ::ng-deep .wt-assign-field .mat-mdc-form-field-hint,
      :host ::ng-deep .wt-assign-field .mat-mdc-form-field-error {
        color: var(--assign-hint) !important;
      }

      .wt-assign-actions {
        display: flex;
        justify-content: flex-end;
        gap: 10px;
        padding: 8px 22px 20px;
      }

      .wt-btn-cancel,
      .wt-btn-assign {
        min-width: 104px;
        border-radius: 12px;
      }

      .wt-btn-cancel {
        color: var(--assign-cancel-text) !important;
        border-color: var(--assign-cancel-border) !important;
        background: var(--assign-cancel-bg) !important;
      }

      .wt-btn-cancel:hover {
        background: var(--assign-cancel-hover-bg) !important;
      }

      .wt-btn-assign {
        background: var(--assign-primary-bg) !important;
        color: var(--assign-primary-text) !important;
      }

      .wt-btn-assign:hover {
        background: var(--assign-primary-hover-bg) !important;
      }

      .wt-btn-assign[disabled] {
        opacity: 0.5;
      }
    `,
    ]
})
export class AssignIncomingDialogComponent {
  form = this.fb.group({
    name: ['', Validators.required],
  });

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<AssignIncomingDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: AssignIncomingDialogData
  ) {
    const prefill = (data?.currentAssignee ?? '').toString().trim();
    if (prefill) this.form.patchValue({ name: prefill });
  }

  close(): void {
    this.dialogRef.close(null);
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const name = (this.form.value.name ?? '').toString().trim();
    this.dialogRef.close(name || null);
  }
}
