import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { BidInboxItem } from './bid-inbox.service';
import { IncomingBidDialogResult } from './incoming-bid-dialog.component';

export interface DuplicateDialogData {
  existing: BidInboxItem;
  attempted: IncomingBidDialogResult;
}

export interface DuplicateDialogResult {
  action: 'open' | 'update' | 'cancel';
  reason?: string;
  note?: string;
  patch?: Partial<BidInboxItem>;
}

@Component({
    selector: 'app-incoming-duplicate-dialog',
    imports: [
        CommonModule,
        ReactiveFormsModule,
        MatDialogModule,
        MatFormFieldModule,
        MatInputModule,
        MatButtonModule,
        MatDatepickerModule,
        MatNativeDateModule,
    ],
    template: `
    <h2 mat-dialog-title>Existing request found</h2>
    <div mat-dialog-content>
      <p>
        An <b>Incoming Bid</b> already exists for:
        <b>{{ data.existing.client }}</b> — <b>{{ data.existing.projectName }}</b>
      </p>

      <div class="summary">
        <div><span class="k">Received:</span> {{ data.existing.dateReceived | date:'MM/dd/yyyy' }}</div>
        <div><span class="k">Due:</span> {{ data.existing.bidDueDate | date:'MM/dd/yyyy' }}</div>
        <div><span class="k">Created By:</span> {{ data.existing.createdByLabel || '—' }}</div>
        <div><span class="k">Updated:</span> {{ data.existing.updatedAt | date:'MM/dd/yyyy' }}</div>
      </div>

      <p class="muted">
        We won’t create a duplicate. If anything changed (new deadline, new contact, new plans), add an <b>Update</b> with a reason.
      </p>

      <form [formGroup]="form" class="grid">
        <mat-form-field appearance="outline" class="col-12">
          <mat-label>Reason for update *</mat-label>
          <input matInput formControlName="reason" placeholder="e.g., Client extended deadline / Addendum / Wrong date entered" />
        </mat-form-field>

        <mat-form-field appearance="outline" class="col-6">
          <mat-label>New Bid Due Date</mat-label>
          <input matInput [matDatepicker]="dd" formControlName="bidDueDate" />
          <mat-datepicker-toggle matSuffix [for]="dd"></mat-datepicker-toggle>
          <mat-datepicker #dd></mat-datepicker>
        </mat-form-field>

        <mat-form-field appearance="outline" class="col-6">
          <mat-label>Contact Name</mat-label>
          <input matInput formControlName="contactName" />
        </mat-form-field>

        <mat-form-field appearance="outline" class="col-6">
          <mat-label>Contact Email</mat-label>
          <input matInput formControlName="contactEmail" />
        </mat-form-field>

        <mat-form-field appearance="outline" class="col-6">
          <mat-label>Contact Phone</mat-label>
          <input matInput formControlName="contactPhone" />
        </mat-form-field>

        <mat-form-field appearance="outline" class="col-12">
          <mat-label>Note (optional)</mat-label>
          <textarea matInput rows="3" formControlName="note"></textarea>
        </mat-form-field>
      </form>
    </div>

    <div mat-dialog-actions align="end">
      <button mat-stroked-button (click)="openExisting()">Open existing</button>
      <button mat-stroked-button (click)="cancel()">Cancel</button>
      <button mat-flat-button color="primary" (click)="applyUpdate()">Apply Update</button>
    </div>
  `,
    styles: [
        `
      .summary{display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin:8px 0 12px 0}
      .k{opacity:.75;margin-right:6px}
      .muted{opacity:.75}
      .grid{display:grid;grid-template-columns:repeat(12,1fr);gap:12px}
      .col-12{grid-column:span 12}
      .col-6{grid-column:span 6}
      @media (max-width:900px){.col-6{grid-column:span 12}}
    `,
    ]
})
export class IncomingDuplicateDialogComponent {
  readonly data = inject(MAT_DIALOG_DATA) as DuplicateDialogData;
  private ref = inject(MatDialogRef<IncomingDuplicateDialogComponent, DuplicateDialogResult>);
  private fb = inject(FormBuilder);

  form = this.fb.group({
    reason: ['', Validators.required],
    bidDueDate: [this.data.attempted.bidDueDate ?? null],
    contactName: [this.data.attempted.contactName ?? ''],
    contactEmail: [this.data.attempted.contactEmail ?? ''],
    contactPhone: [this.data.attempted.contactPhone ?? ''],
    note: [''],
  });

  openExisting() {
    this.ref.close({ action: 'open' });
  }

  cancel() {
    this.ref.close({ action: 'cancel' });
  }

  applyUpdate() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const v = this.form.getRawValue();
    const patch: Partial<BidInboxItem> = {};

    // Only apply fields that are actually set and different.
    if (v.bidDueDate && JSON.stringify(v.bidDueDate) !== JSON.stringify(this.data.existing.bidDueDate)) patch.bidDueDate = v.bidDueDate;
    if ((v.contactName ?? '').trim() && (v.contactName ?? '').trim() !== (this.data.existing.contactName ?? '')) patch.contactName = (v.contactName ?? '').trim();
    if ((v.contactEmail ?? '').trim() && (v.contactEmail ?? '').trim() !== (this.data.existing.contactEmail ?? '')) patch.contactEmail = (v.contactEmail ?? '').trim();
    if ((v.contactPhone ?? '').trim() && (v.contactPhone ?? '').trim() !== (this.data.existing.contactPhone ?? '')) patch.contactPhone = (v.contactPhone ?? '').trim();

    this.ref.close({
      action: 'update',
      reason: v.reason ?? '',
      note: v.note ?? '',
      patch,
    });
  }
}
