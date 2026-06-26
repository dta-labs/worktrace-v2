import { Component, inject } from '@angular/core';

import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';

@Component({
    selector: 'app-reason-dialog',
    imports: [ReactiveFormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatButtonModule],
    template: `
  <h2 mat-dialog-title>Reason for modification</h2>
  <div mat-dialog-content>
    <mat-form-field appearance="outline" class="full">
      <mat-label>Explain why you are editing this bid</mat-label>
      <textarea matInput rows="4" [formControl]="reason"></textarea>
      @if (reason.invalid) {
        <mat-error>Reason is required.</mat-error>
      }
    </mat-form-field>
  </div>
  <div mat-dialog-actions align="end">
    <button mat-button (click)="close(null)">Cancel</button>
    <button mat-flat-button color="primary" (click)="submit()" [disabled]="reason.invalid">Save</button>
  </div>
  `,
    styles: [`.full{ width: 100%; }`]
})
export class ReasonDialogComponent {
  private ref = inject(MatDialogRef<ReasonDialogComponent>);
  private fb = inject(FormBuilder);

  reason = this.fb.control('', { nonNullable: true, validators: [Validators.required, Validators.minLength(3)] });

  close(v: string | null) { this.ref.close(v); }
  submit() { this.ref.close(this.reason.value); }
}
