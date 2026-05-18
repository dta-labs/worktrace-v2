import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { FormArray, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';

import { ClientsService, ClientItem } from '../../construction/bids/clients.service';

type CompanyType = 'GC' | 'SUB' | 'MECH' | 'OTHER' | 'BOTH';

@Component({
  selector: 'app-create-company',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSnackBarModule,
    MatSelectModule,
    MatIconModule,
  ],
  templateUrl: './create-company.component.html',
  styleUrls: ['./create-company.component.scss'],
})
export class CreateCompanyComponent {
  private fb = inject(FormBuilder);
  private snack = inject(MatSnackBar);
  private clientsSvc = inject(ClientsService);

  @Output() saved = new EventEmitter<void>();

  private _editClient: ClientItem | null = null;
  private currentEditId: string | null = null;

  @Input() set editClient(v: ClientItem | null) {
    // Ignore repeated sets for the same doc
    const nextId = v?.id ?? null;
    if (nextId && nextId === this.currentEditId) return;

    this._editClient = v;
    this.currentEditId = nextId;

    if (v) this.loadFromClient(v);
  }
  get editClient(): ClientItem | null {
    return this._editClient;
  }

  saving = false;
  errorMsg: string | null = null;

  form = this.fb.group({
    name: ['', Validators.required],
    companyType: ['GC' as CompanyType],

    notes: [''],

    // Address (simple single address for now)
    addrLine1: [''],
    addrLine2: [''],
    addrCity: [''],
    addrState: [''],
    addrZip: [''],

    // Contacts
    contacts: this.fb.array([] as any[]),
  });

  get c() {
    return this.form.controls;
  }

  get contacts(): FormArray {
    return this.form.get('contacts') as FormArray;
  }

  private loadFromClient(client: ClientItem): void {
    // Reset contacts first
    while (this.contacts.length) this.contacts.removeAt(0);

    const addr = client.addressPrimary ?? {};
    this.form.patchValue({
      name: client.name ?? '',
      companyType: (client.companyType ?? 'GC') as CompanyType,
      notes: client.notes ?? '',
      addrLine1: (addr as any).line1 ?? '',
      addrLine2: (addr as any).line2 ?? '',
      addrCity: (addr as any).city ?? '',
      addrState: (addr as any).state ?? '',
      addrZip: (addr as any).zip ?? '',
    });

    const contacts = (client.contacts ?? []) as any[];
    if (contacts.length) {
      for (const x of contacts) {
        this.contacts.push(
          this.fb.group({
            fullName: (x.fullName ?? '').toString(),
            email: (x.email ?? '').toString(),
            phone: (x.phone ?? '').toString(),
            role: (x.role ?? '').toString(),
            isPrimary: !!x.isPrimary,
          })
        );
      }
      // Ensure at least one primary
      if (!contacts.some((x) => !!x.isPrimary)) this.setPrimary(0);
    } else {
      // If old records only have mainContact fields, we can seed one contact (optional)
      const seedName = (client.mainContactName ?? '').toString().trim();
      const seedEmail = (client.mainContactEmail ?? '').toString().trim();
      const seedPhone = (client.mainContactPhone ?? '').toString().trim();
      if (seedName || seedEmail || seedPhone) {
        this.contacts.push(
          this.fb.group({
            fullName: seedName || 'Main Contact',
            email: seedEmail,
            phone: seedPhone,
            role: '',
            isPrimary: true,
          })
        );
      }
    }
  }

  addContact(): void {
    this.contacts.push(
      this.fb.group({
        fullName: ['', Validators.required],
        email: [''],
        phone: [''],
        role: [''],
        isPrimary: [this.contacts.length === 0], // first contact becomes primary by default
      })
    );
  }

  removeContact(index: number): void {
    if (index < 0 || index >= this.contacts.length) return;
    const wasPrimary = !!this.contacts.at(index).get('isPrimary')?.value;
    this.contacts.removeAt(index);

    // Keep at least one primary if contacts exist
    if (wasPrimary && this.contacts.length > 0) {
      this.setPrimary(0);
    }
  }

  setPrimary(index: number): void {
    for (let i = 0; i < this.contacts.length; i++) {
      this.contacts.at(i).get('isPrimary')?.setValue(i === index);
    }
  }

  reset(): void {
    this.form.reset({
      name: '',
      companyType: 'GC',
      notes: '',
      addrLine1: '',
      addrLine2: '',
      addrCity: '',
      addrState: '',
      addrZip: '',
    });
    while (this.contacts.length) this.contacts.removeAt(0);
    this.errorMsg = null;
    this.currentEditId = null;
    this._editClient = null;
  }

  async submit(): Promise<void> {
    this.errorMsg = null;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const v = this.form.getRawValue();
    const name = (v.name ?? '').toString().trim();
    if (!name) {
      this.form.controls.name.setErrors({ required: true });
      return;
    }

    const contacts = (v.contacts ?? [])
      .map((x: any) => ({
        fullName: (x.fullName ?? '').toString().trim(),
        email: (x.email ?? '').toString().trim(),
        phone: (x.phone ?? '').toString().trim(),
        role: (x.role ?? '').toString().trim(),
        isPrimary: !!x.isPrimary,
      }))
      .filter((x: any) => !!x.fullName);

    // Ensure primary contact rule
    if (contacts.length > 0 && !contacts.some((c: any) => c.isPrimary)) {
      contacts[0].isPrimary = true;
    }

    const primary = contacts.find((c: any) => c.isPrimary) ?? null;

    const address = {
      line1: (v.addrLine1 ?? '').toString().trim(),
      line2: (v.addrLine2 ?? '').toString().trim(),
      city: (v.addrCity ?? '').toString().trim(),
      state: (v.addrState ?? '').toString().trim(),
      zip: (v.addrZip ?? '').toString().trim(),
    };

    this.saving = true;
    try {
      await this.clientsSvc.upsertClient({
        name,
        companyType: v.companyType as CompanyType,
        // Keep backward-compatible main contact fields (snapshot)
        mainContactName: primary?.fullName ?? '',
        mainContactEmail: primary?.email ?? '',
        mainContactPhone: primary?.phone ?? '',
        notes: (v.notes ?? '').toString().trim(),
        contacts,
        addressPrimary: address,
      });

      this.snack.open('Company saved', 'OK', { duration: 2200 });
      this.reset();
      this.saved.emit();
    } catch (e: any) {
      const msg = (e?.message ?? '').toString();
      this.errorMsg = msg || 'Failed to save company.';
      this.snack.open(this.errorMsg ?? 'Failed to save company.', 'OK', { duration: 4500 });
    } finally {
      this.saving = false;
    }
  }
}
