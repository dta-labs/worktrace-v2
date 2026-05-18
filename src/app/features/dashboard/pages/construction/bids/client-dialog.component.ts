import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';

import { ClientsService, ClientItem } from './clients.service';

export interface ClientDialogData {
  name?: string;
  mainContactName?: string;
  mainContactEmail?: string;
  mainContactPhone?: string;
  notes?: string;
}

export interface ClientDialogResult {
  client: ClientItem;
}

@Component({
  selector: 'app-client-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatDialogModule],
  template: `
    <div class="wt-modal" role="dialog" aria-modal="true">
      <div class="wt-modal-head">
        <div class="wt-modal-title">Add Client</div>
        <button type="button" class="wt-icon-btn" (click)="close()">✕</button>
      </div>

      <div class="wt-modal-body">
        <form [formGroup]="form" autocomplete="off">
          <div class="wt-grid">
            <div class="wt-field wt-full">
              <label>Client Name *</label>
              <input type="text" formControlName="name" placeholder="Company name" />
              <div class="tiny" *ngIf="hint">{{ hint }}</div>
            </div>

            <div class="wt-field">
              <label>Main Contact Name</label>
              <input type="text" formControlName="mainContactName" />
            </div>

            <div class="wt-field">
              <label>Main Contact Email</label>
              <input type="email" formControlName="mainContactEmail" />
            </div>

            <div class="wt-field">
              <label>Main Contact Phone</label>
              <input type="text" formControlName="mainContactPhone" />
            </div>

            <div class="wt-field wt-full">
              <label>Notes</label>
              <input type="text" formControlName="notes" placeholder="Optional" />
            </div>
          </div>
        </form>
      </div>

      <div class="wt-error" *ngIf="errorMsg">{{ errorMsg }}</div>
      <div class="wt-modal-actions">
        <button type="button" class="btn" (click)="close()" [disabled]="saving">Cancel</button>
        <button type="button" class="btn btn-primary" (click)="save()" [disabled]="saving">{{ saving ? "Saving..." : "Save" }}</button>
      </div>
    </div>
  `,
  styles: [
    `
      .wt-modal{box-sizing:border-box;width:min(760px,92vw);max-height:82vh;overflow-y:auto;overflow-x:hidden;background:#0f1115;border:1px solid rgba(255,255,255,.08);border-radius:16px;padding:14px}
      .wt-modal-head{display:flex;align-items:center;justify-content:space-between;padding:6px 6px 10px}
      .wt-modal-title{font-size:18px;font-weight:700}
      .wt-icon-btn{background:transparent;border:0;color:#fff;font-size:18px;cursor:pointer}
      .wt-modal-body{padding:0 6px 10px}
      .wt-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
      .wt-field{display:flex;flex-direction:column;gap:6px}
      .wt-full{grid-column:1 / -1}
      .wt-field label{opacity:.75;font-size:12px}
      .wt-field input{box-sizing:border-box;width:100%;background:#12151b;border:1px solid rgba(255,255,255,.10);border-radius:10px;color:#fff;padding:10px}
      .wt-modal-actions{display:flex;justify-content:flex-end;gap:10px;padding:10px 6px 0}
      .btn{border:1px solid rgba(255,255,255,.16);background:rgba(255,255,255,.04);color:#fff;border-radius:12px;padding:10px 14px;cursor:pointer;font-weight:700}
      .btn:hover{background:rgba(255,255,255,.08)}
      .btn-primary{border-color:rgba(106,163,255,.55);background:rgba(106,163,255,.18)}
      .btn-primary:hover{background:rgba(106,163,255,.26)}
      .tiny{opacity:.72;font-size:12px}
      .wt-error{color:#ff8a8a;font-size:12px;margin:6px 6px 0}
      @media (max-width: 900px){.wt-grid{grid-template-columns:1fr}}
    `,
  ],
})
export class ClientDialogComponent {
  saving = false;
  errorMsg: string | null = null;

  private fb = inject(FormBuilder);
  private ref = inject(MatDialogRef<ClientDialogComponent, ClientDialogResult | null>);
  private data = inject(MAT_DIALOG_DATA, { optional: true }) as ClientDialogData | null;
  private clientsSvc = inject(ClientsService);

  hint: string | null = null;

  form = this.fb.group({
    name: [this.data?.name ?? '', Validators.required],
    mainContactName: [this.data?.mainContactName ?? ''],
    mainContactEmail: [this.data?.mainContactEmail ?? ''],
    mainContactPhone: [this.data?.mainContactPhone ?? ''],
    notes: [this.data?.notes ?? ''],
  });

  close() {
    this.ref.close(null);
  }

  async save() {
    this.errorMsg = null;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving = true;
    const raw = this.form.getRawValue() as any;
    const name = (raw.name ?? '').toString().trim();
    try {
      const client = await this.clientsSvc.upsertClient({
        name,
        mainContactName: raw.mainContactName,
        mainContactEmail: raw.mainContactEmail,
        mainContactPhone: raw.mainContactPhone,
        notes: raw.notes,
      });
      this.ref.close({ client });
    } catch (e: any) {
      const code = e?.code ?? '';
      if (code === 'permission-denied') {
        this.errorMsg = 'Missing permissions to create/update clients. Ask an admin to enable access.';
      } else {
        this.errorMsg = 'Could not save client. Please try again.';
      }
      // Keep the dialog open so the user can copy/paste data or cancel.
      console.error(e);
    } finally {
      this.saving = false;
    }
  }
}
