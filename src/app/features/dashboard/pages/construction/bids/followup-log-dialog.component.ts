
import { Component, Inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { Auth } from '@angular/fire/auth';
import {
  Firestore,
  addDoc,
  collection,
  doc,
  serverTimestamp,
  updateDoc,
} from '@angular/fire/firestore';
import { increment, Timestamp } from 'firebase/firestore';

export interface FollowUpLogDialogContext {
  assignedToName?: string | null;
  createdBy?: string | null;
  createdByEmail?: string | null;
  clientContactName?: string | null;
  clientContactEmail?: string | null;
  clientContactPhone?: string | null;
  lastFollowUpBy?: string | null;
  lastFollowUpAt?: Date | null;
}

export interface FollowUpLogDialogData {
  bidId: string;
  context?: FollowUpLogDialogContext | null;
}
type FollowUpType = 'call' | 'email' | 'client_reply' | 'internal_note';
type FollowUpOutcome =
  | 'reviewing'
  | 'price_high'
  | 'price_ok'
  | 'need_revision'
  | 'no_answer'
  | 'won_pending'
  | 'lost_price'
  | 'lost_scope'
  | 'lost_time'
  | 'other';

@Component({
    selector: 'app-followup-log-dialog',
    imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule
],
    templateUrl: './followup-log-dialog.component.html',
    styleUrls: ['./followup-log-dialog.component.scss']
})
export class FollowUpLogDialogComponent {
  saving = false;
  errorMsg: string | null = null;

  readonly context = this.data?.context ?? null;

  get hasContext(): boolean {
    return !!(
      this.displayAssignedTo ||
      this.displayCreatedBy ||
      this.displayClientContact ||
      this.displayLastFollowUp
    );
  }

  get displayAssignedTo(): string {
    return this.cleanLabel(this.context?.assignedToName) || 'Unassigned';
  }

  get displayCreatedBy(): string {
    const createdBy = this.cleanLabel(this.context?.createdBy);
    const createdByEmail = this.cleanLabel(this.context?.createdByEmail);
    if (createdBy && createdByEmail && !createdBy.includes(createdByEmail)) {
      return `${createdBy} (${createdByEmail})`;
    }
    return createdBy || createdByEmail || '—';
  }

  get displayClientContact(): string {
    const name = this.cleanLabel(this.context?.clientContactName);
    const email = this.cleanLabel(this.context?.clientContactEmail);
    const phone = this.cleanLabel(this.context?.clientContactPhone);
    return [name, email, phone].filter(Boolean).join(' • ') || '—';
  }

  get displayLastFollowUp(): string {
    const by = this.cleanLabel(this.context?.lastFollowUpBy);
    const at = this.context?.lastFollowUpAt instanceof Date ? this.context.lastFollowUpAt : null;
    if (by && at) return `${by} • ${at.toLocaleDateString()}`;
    if (by) return by;
    if (at) return at.toLocaleDateString();
    return 'No follow-up yet';
  }


  // UI helpers for conditional fields
  contactLabel = 'Contact';
  showContactName = true;
  showContactEmail = false;
  showContactPhone = false;

  form = this.fb.group({
    type: this.fb.control<FollowUpType>('call', { validators: [Validators.required], nonNullable: true }),
    outcome: this.fb.control<FollowUpOutcome>('reviewing', { validators: [Validators.required], nonNullable: true }),
    note: this.fb.control<string>('', { validators: [Validators.maxLength(2000)], nonNullable: true }),
    nextDate: this.fb.control<string>('', {}),

    // Contact context (who did we talk to / who sent the email)
    contactName: this.fb.control<string>('', { nonNullable: true }),
    contactEmail: this.fb.control<string>('', { nonNullable: true }),
    contactPhone: this.fb.control<string>('', { nonNullable: true }),
  });


  private cleanLabel(value: unknown): string {
    return String(value ?? '').trim();
  }

  constructor(
    private fb: FormBuilder,
    private fs: Firestore,
    private auth: Auth,
    private ref: MatDialogRef<FollowUpLogDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: FollowUpLogDialogData,
  ) {
    // Keep validators + labels aligned with the selected type.
    this.applyTypeRules(this.form.controls.type.value);
    this.form.controls.type.valueChanges.subscribe((t) => this.applyTypeRules(t));
  }

  private applyTypeRules(t: FollowUpType): void {
    // Reset validators first
    const name = this.form.controls.contactName;
    const email = this.form.controls.contactEmail;
    const phone = this.form.controls.contactPhone;

    name.clearValidators();
    email.clearValidators();
    phone.clearValidators();

    this.showContactName = true;
    this.showContactEmail = false;
    this.showContactPhone = false;
    this.contactLabel = 'Contact';

    if (t === 'call') {
      this.contactLabel = 'Spoke with';
      this.showContactPhone = true;
      name.setValidators([Validators.required, Validators.maxLength(120)]);
      phone.setValidators([Validators.maxLength(50)]);
    } else if (t === 'email') {
      this.contactLabel = 'Sent to';
      this.showContactEmail = true;
      this.showContactPhone = false;
      email.setValidators([Validators.required, Validators.email, Validators.maxLength(180)]);
      name.setValidators([Validators.maxLength(120)]);
    } else if (t === 'client_reply') {
      this.contactLabel = 'From';
      this.showContactEmail = true;
      this.showContactPhone = false;
      email.setValidators([Validators.required, Validators.email, Validators.maxLength(180)]);
      name.setValidators([Validators.maxLength(120)]);
    } else {
      // internal_note: hide contact fields to keep it clean
      this.showContactName = false;
      this.showContactEmail = false;
      this.showContactPhone = false;
      this.contactLabel = 'Contact';
    }

    name.updateValueAndValidity({ emitEvent: false });
    email.updateValueAndValidity({ emitEvent: false });
    phone.updateValueAndValidity({ emitEvent: false });
  }

  private parseNextDate(dateStr: string): Timestamp | null {
    const s = (dateStr || '').trim();
    if (!s) return null;
    const [y, m, d] = s.split('-').map((n) => Number(n));
    if (!y || !m || !d) return null;
    const dt = new Date(y, m - 1, d, 9, 0, 0, 0);
    return Timestamp.fromDate(dt);
  }

  async save(): Promise<void> {
    if (this.saving) return;
    this.errorMsg = '';

    const bidId = (this.data?.bidId ?? '').trim();
    if (!bidId) {
      this.errorMsg = 'Missing bidId.';
      return;
    }

    const user = this.auth.currentUser;
    if (!user) {
      this.errorMsg = 'Not signed in.';
      return;
    }

    this.saving = true;
    try {
      const nextTs = this.parseNextDate(this.form.controls['nextDate'].value || '');

      const contactName = (this.form.controls['contactName'].value || '').trim();
      const contactEmail = (this.form.controls['contactEmail'].value || '').trim();
      const contactPhone = (this.form.controls['contactPhone'].value || '').trim();

      const followupsCol = collection(this.fs, 'bids', bidId, 'followups');
      await addDoc(followupsCol, {
        createdAt: serverTimestamp(),
        createdByUid: user.uid,
        createdByEmail: user.email ?? '',
        type: this.form.controls['type'].value,
        outcome: this.form.controls['outcome'].value,
        note: (this.form.controls['note'].value || '').trim(),
        // For tracking / nicer history rendering
        contactName: contactName || null,
        contactEmail: contactEmail || null,
        contactPhone: contactPhone || null,
        nextFollowUpAt: nextTs ?? null,
      });

      const bidRef = doc(this.fs, 'bids', bidId);
      await updateDoc(bidRef, {
        lastFollowUpAt: serverTimestamp(),
        nextFollowUpAt: nextTs ?? null,
        followUpCount: increment(1),
        updatedAt: serverTimestamp(),
      } as any);

      this.ref.close(true);
    } catch (e: any) {
      this.errorMsg = e?.message ?? 'Failed to save follow-up.';
    } finally {
      this.saving = false;
    }
  }

  close(): void {
    this.ref.close(false);
  }
}
