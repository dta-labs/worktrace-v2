import { FollowupBadgeComponent } from '../followup-badge/followup-badge.component';
import { CommonModule, DatePipe } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';

type LocationState = 'all' | 'loaded' | 'not_loaded';

@Component({
    selector: 'app-bids-created',
    imports: [
        FollowupBadgeComponent, CommonModule, ReactiveFormsModule, DatePipe
    ],
    templateUrl: './bids-created.component.html',
    styleUrls: ['./bids-created.component.css']
})
export class BidsCreatedComponent implements OnChanges {
  @Input() rows: any[] = [];
  // Optional hooks (kept for compatibility with parent templates)
  @Input() getBidId?: (row: any) => string | undefined;
  @Input() getLocationLabel?: (row: any) => string;
  @Output() viewPdfClick = new EventEmitter<string>();

  @Output() openBidClick = new EventEmitter<string>();

  filteredRows: any[] = [];

  stats = { total: 0, good: 0, warn: 0, bad: 0 };

  createdByOptions: string[] = [];
  locationStateOptions: Array<{ value: LocationState; label: string }> = [
    { value: 'all', label: 'All' },
    { value: 'loaded', label: 'Loaded' },
    { value: 'not_loaded', label: 'Not Loaded' },
  ];

  filters = new FormGroup({
    q: new FormControl<string>(''),
    createdBy: new FormControl<string>('all'),
    locationState: new FormControl<LocationState>('all'),
    convertedFrom: new FormControl<string>(''),
    convertedTo: new FormControl<string>(''),
  });

  constructor() {
    // Refilter on any change
    this.filters.valueChanges.subscribe(() => this.applyFilters());
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['rows']) {
      this.createdByOptions = this.uniqueNonEmpty(
        (this.rows ?? []).map(r => this.getCreatedByDisplay(r))
      );
      this.applyFilters();
    }
  }

  clear(): void {
    this.filters.setValue({
      q: '',
      createdBy: 'all',
      locationState: 'all',
      convertedFrom: '',
      convertedTo: '',
    });
  }

  applyFilters(): void {
    const q = (this.filters.controls['q'].value ?? '').toLowerCase().trim();
    const createdBy = this.filters.controls['createdBy'].value ?? 'all';
    const locationState = this.filters.controls['locationState'].value ?? 'all';
    const convertedFrom = this.toDate(this.filters.controls['convertedFrom'].value);
    const convertedTo = this.toDate(this.filters.controls['convertedTo'].value);

    this.filteredRows = (this.rows ?? []).filter(r => {
      // Search
      if (q) {
        // Firestore docs can have either `client`/`project` OR `clientName`/`projectName`
        // depending on which flow created the record.
        const clientText = (r?.clientName ?? r?.client ?? '').toString();
        const projectText = (r?.projectName ?? r?.project ?? '').toString();

        const hay = [
          clientText,
          projectText,
          this.getLocationText(r),
          this.getCreatedByDisplay(r),
          this.toDisplayDate(r)?.toISOString?.() ?? '',
        ]
          .map(v => (v ?? '').toString().toLowerCase())
          .join(' ');
        if (!hay.includes(q)) return false;
      }

      // Created By
      if (createdBy !== 'all') {
        if (this.getCreatedByDisplay(r) !== createdBy) return false;
      }

      // Location loaded state
      if (locationState !== 'all') {
        const loaded = this.isLocationLoaded(r);
        if (locationState === 'loaded' && !loaded) return false;
        if (locationState === 'not_loaded' && loaded) return false;
      }

      // Converted date range
      const conv = this.toDisplayDate(r);
      if (convertedFrom && conv && conv < convertedFrom) return false;
      if (convertedTo && conv && conv > this.endOfDay(convertedTo)) return false;

      return true;
    });

    // Update counters (based on filtered results)
    const stats = { total: 0, good: 0, warn: 0, bad: 0 };
    for (const r of this.filteredRows) {
      stats.total++;
      const cls = this.daysSinceClass(r);
      if (cls === 'good') stats.good++;
      else if (cls === 'warn') stats.warn++;
      else if (cls === 'bad') stats.bad++;
    }
    this.stats = stats;
  }

  // UI helpers
  resolveBidId(r: any): string | undefined {
    const v = (r?.bidId ?? r?.id ?? undefined);
    return typeof v === 'string' && v.trim() ? v : undefined;
  }

  toDisplayDate(r: any): Date | null {
    // "Converted" date in your data model
    return this.toDate(r?.convertedAt ?? r?.convertedDate ?? r?.converted ?? r?.createdAt ?? null);
  }

  daysSinceCreated(r: any): string {
    const d = this.toDisplayDate(r);
    if (!d) return '—';
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    return String(days);
  }

  /**
   * Color code the "Days Since" pill:
   *  - 0–7 days: green
   *  - 8–21 days: amber
   *  - 22+ days: red
   */
  daysSinceClass(r: any): string {
    const d = this.toDisplayDate(r);
    if (!d) return 'na';
    const now = new Date();
    const days = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
    if (days <= 7) return 'good';
    if (days <= 21) return 'warn';
    return 'bad';
  }

  isLocationLoaded(r: any): boolean {
    const fp = r?.folderPath;
    const addr = r?.jobsiteAddress;
    const hasFp = typeof fp === 'string' && fp.trim().length > 0;
    const hasAddr =
      !!addr &&
      (typeof addr === 'string'
        ? addr.trim().length > 0
        : !!(addr?.line1 || addr?.city || addr?.state || addr?.zip));
    return hasFp || hasAddr;
  }

    getLocationText(r: any): string {
    // 1) Explicit snapshots/labels (preferred)
    const direct =
      r?.locationLabel ??
      r?.locationText ??
      r?.location ??
      r?.jobsiteLocation ??
      r?.jobsite ??
      r?.site ??
      '';
    if (typeof direct === 'string' && direct.trim()) return direct.trim();

    // 2) Folder path (legacy)
    const fp = r?.folderPath ?? r?.folder ?? r?.folderName;
    if (typeof fp === 'string' && fp.trim()) return fp.trim();

    // 3) Structured address (recommended)
    const a = r?.jobsiteAddress ?? r?.address ?? r?.addressPrimary ?? null;
    if (!a) return '';
    if (typeof a === 'string') return a.trim();
    const parts = [a?.line1, a?.line2, a?.city, a?.state, a?.zip].filter(Boolean);
    return parts.join(', ');
  }

  getCreatedByDisplay(r: any): string {
    // This version: "Created By" column represents the Estimator/Converter (Save & Convert).
    const v =
      r?.convertedByEmail ||
      r?.deliveredByEmail ||
      r?.estimatorEmail ||
      r?.bidderEmail ||
      r?.createdByLabel ||
      r?.createdByEmail ||
      r?.createdBy ||
      '—';
    return (typeof v === 'string' && v.trim()) ? v.trim() : '—';
  }


  clearFilters(): void {
    this.filters.reset({
      q: '',
      createdBy: '',
      locationState: undefined,
      convertedFrom: null,
      convertedTo: null,
    });
  }

  /** Template helper: always show location badge, even when not loaded */
  getLocationState(_row: any): boolean {
    return true;
  }

  resolveCreatedByUid(row: any): string | null {
    return (row?.createdByUid ?? row?.createdBy ?? null) as any;
  }

  resolveCreatedByEmail(row: any): string {
    const v =
      row?.createdByEmail ??
      row?.createdByLabel ??
      row?.createdByName ??
      row?.createdBy ??
      '';
    return (v ?? '').toString();
  }

  openBid(bidId?: string | null): void {
    const id = (bidId ?? undefined) as string | undefined;
    if (!id) return;
    this.openBidClick.emit(id);
  }

  openPdf(row: any): void {
    const pdfPath = (row?.pdfPath ?? row?.pdfUrl ?? row?.pdf ?? '') as string;
    if (!pdfPath) return;
    this.viewPdfClick.emit(pdfPath);
  }
  private uniqueNonEmpty(values: string[]): string[] {
    return Array.from(new Set(values.map(v => (v ?? '').toString().trim()).filter(v => !!v))).sort();
  }

  private toDate(value: any): Date | null {
    if (!value) return null;
    if (value instanceof Date) return value;
    if (typeof value?.toDate === 'function') {
      const d = value.toDate();
      return d instanceof Date && !isNaN(d.getTime()) ? d : null;
    }
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }

  private endOfDay(d: Date): Date {
    const x = new Date(d);
    x.setHours(23, 59, 59, 999);
    return x;
  }
}