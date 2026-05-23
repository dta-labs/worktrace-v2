import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { map, startWith } from 'rxjs/operators';
import { combineLatest, Observable } from 'rxjs';

import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';

import { ClientsService, ClientItem } from '../../construction/bids/clients.service';

type CompanyTypeFilter = 'ALL' | 'GC' | 'SUB' | 'MECH' | 'OTHER';
type StatusFilter = 'ALL' | 'ACTIVE' | 'INACTIVE';

@Component({
    selector: 'app-companies-list',
    imports: [
        CommonModule,
        ReactiveFormsModule,
        MatCardModule,
        MatFormFieldModule,
        MatInputModule,
        MatSelectModule,
        MatButtonModule,
        MatIconModule,
        MatTableModule,
    ],
    templateUrl: './companies-list.component.html',
    styleUrls: ['./companies-list.component.scss']
})
export class CompaniesListComponent {
  private clientsSvc = inject(ClientsService);
  private fb = inject(FormBuilder);

  @Output() edit = new EventEmitter<ClientItem>();

  displayedColumns: string[] = [
    'name',
    'type',
    'primaryContact',
    'phone',
    'location',
    'status',
    'actions',
  ];

  filters = this.fb.group({
    q: [''],
    type: ['ALL' as CompanyTypeFilter],
    status: ['ALL' as StatusFilter],
  });

  private raw$: Observable<ClientItem[]> = this.clientsSvc.clients$().pipe(
    map((rows: ClientItem[] | null) => rows || []),
    startWith([] as ClientItem[])
  );
rows$: Observable<ClientItem[]> = combineLatest([
    this.raw$,
    this.filters.valueChanges.pipe(startWith(this.filters.getRawValue())),
  ]).pipe(
    map(([rows, f]) => {
      const q = (f.q ?? '').toString().trim().toLowerCase();
      const type = (f.type ?? 'ALL') as CompanyTypeFilter;
      const status = (f.status ?? 'ALL') as StatusFilter;

      return (rows ?? [])
        .filter((r) => {
          if (type !== 'ALL' && (r.companyType ?? 'GC') !== type) return false;
          if (status !== 'ALL') {
            const active = (r.isActive ?? true) === true;
            if (status === 'ACTIVE' && !active) return false;
            if (status === 'INACTIVE' && active) return false;
          }
          if (!q) return true;

          const blob = [
            r.name,
            r.mainContactName,
            r.mainContactEmail,
            r.mainContactPhone,
            r.addressPrimary?.city,
            r.addressPrimary?.state,
          ]
            .filter(Boolean)
            .join(' ')
            .toLowerCase();

          return blob.includes(q);
        })
        .sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''));
    })
  );

  clearSearch(): void {
    this.filters.patchValue({ q: '' });
  }

  editRow(row: ClientItem): void {
    this.edit.emit(row);
  }

  // Helper display values (kept here to avoid complex template)
  typeLabel(t?: any): string {
    const v = (t ?? 'GC').toString();
    switch (v) {
      case 'GC': return 'General Contractor';
      case 'SUB': return 'Subcontractor';
      case 'MECH': return 'Mechanical Contractor';
      case 'OTHER': return 'Other';
      case 'BOTH': return 'GC + SUB';
      default: return v;
    }
  }

  statusLabel(active?: boolean): string {
    return (active ?? true) ? 'Active' : 'Inactive';
  }

  locationLabel(r: ClientItem): string {
    const city = (r.addressPrimary?.city ?? '').toString().trim();
    const state = (r.addressPrimary?.state ?? '').toString().trim();
    const out = [city, state].filter(Boolean).join(', ');
    return out || '—';
  }
}
