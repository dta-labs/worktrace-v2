import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { BehaviorSubject, combineLatest, firstValueFrom, of } from 'rxjs';
import { catchError, map, switchMap, take } from 'rxjs/operators';
import { BidFlowService } from './bid-flow.service';

import { MatTabsModule } from '@angular/material/tabs';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatTableModule } from '@angular/material/table';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Router } from '@angular/router';

import { BidsService } from './bids.service';
import { BidInboxService, BidInboxItem } from './bid-inbox.service';
import { BidsCreatedComponent } from './components/bids-created/bids-created.component';
import { IncomingBidDialogComponent, IncomingBidDialogResult } from './incoming-bid-dialog.component';
import { LocationViewDialogComponent } from './location-view-dialog.component';
import { IncomingDuplicateDialogComponent } from './incoming-duplicate-dialog.component';
import { EditPriorityDialogComponent } from './edit-reason-dialog.component';
import { PartidasDialogComponent } from './partidas-dialog.component';
import { AssignIncomingDialogComponent } from './assign-incoming-dialog.component';
import { DeclineIncomingDialogComponent } from './decline-incoming-dialog.component';
import { TrashIncomingDialogComponent } from './trash-incoming-dialog.component';
import { Auth } from '@angular/fire/auth';
import { Firestore, doc, docData, getDoc } from '@angular/fire/firestore';

import { BidsAnalyticsOverviewComponent } from './analytics/bids-analytics-overview.component';
 
type BidStatus = 'draft' | 'submitted' | 'won' | 'lost' | 'canceled';

@Component({
    selector: 'app-bids-page',
    imports: [
        CommonModule,
        ReactiveFormsModule,
        MatTabsModule,
        MatCardModule,
        MatFormFieldModule,
        MatInputModule,
        MatSelectModule,
        MatButtonModule,
        MatIconModule,
        MatTooltipModule,
        MatDatepickerModule,
        MatNativeDateModule,
        MatTableModule,
        MatDialogModule,
        MatSnackBarModule,
        BidsCreatedComponent,
        BidsAnalyticsOverviewComponent
    ],
    templateUrl: './bids.component.html',
    styleUrls: ['./bids.component.scss']
})
export class BidsPageComponent implements OnInit {
  private fb = inject(FormBuilder);
  private bidsSvc = inject(BidsService);
  private inboxSvc = inject(BidInboxService);
  private bidFlow = inject(BidFlowService);
  private dialog = inject(MatDialog);
  private snack = inject(MatSnackBar);
  private router = inject(Router);
  private auth = inject(Auth);
  private firestore = inject(Firestore); 
  isAdmin = false;

  saving = false;
  errorMsg: string | null = null;
  successMsg: string | null = null;
ngOnInit(): void {
  void this.loadAdmin();
}

private async loadAdmin(): Promise<void> {
  try {
    const user = await this.auth.currentUser;
    if (!user) {
      this.isAdmin = false;
      return;
    }

    const snap = await getDoc(doc(this.firestore, 'users', user.uid));
    if (!snap.exists()) {
      // Dev-friendly default (same pattern as Construction/Overview)
      this.isAdmin = true;
      return;
    }

    const data = snap.data() as any;

    // If the user doc exists but role is missing/empty, treat as admin (dev-friendly)
    const roleRaw = (data?.role ?? '').toString().trim();
    if (!roleRaw) {
      this.isAdmin = true;
      return;
    }

    const roleStr = roleRaw.toLowerCase();
    this.isAdmin = roleStr === 'admin';
  } catch {
    this.isAdmin = false;
  }
}


  form = this.fb.group({
    title: ['', Validators.required],
    clientName: ['', Validators.required],
    amount: [null as number | null, Validators.required],
    dueDate: [null as Date | null],
    status: ['draft' as BidStatus, Validators.required],
    notes: [''],
  });


  private incomingBidDueSort$ = new BehaviorSubject<'none' | 'asc' | 'desc'>('none');
  incomingBidDueSortDirection: 'none' | 'asc' | 'desc' = 'none';
  // --- Incoming Bids (Inbox) ---
  incomingColumns: string[] = [
    'dateReceived',
    'client',
    'projectName',
    'location',
    'bidDueDate',
    'daysPending',
    'createdByLabel',
    'assignedTo',
    'priority',
    'actions',
  ];

trashColumns: string[] = [
  'dateReceived',
  'client',
  'projectName',
  'location',
  'bidDueDate',
  'daysPending',
  'createdByLabel',
  'assignedTo',
  'priority',
  'deleteReason',
  'deletedByEmail',
  'deletedAt',
];


  // --- Bids Created (Converted from Inbox) ---
  createdColumns: string[] = [
    'convertedAt',
    'client',
    'projectName',
    'location',
    'bidDueDate',
    'daysPending',
    'createdByLabel',
    'actions',
  ];

  incomingBids$ = this.inboxSvc.inbox$();

  /**
   * We keep "Incoming" strictly as the inbox of NOT-YET-created bids.
   * The moment an inbox row has a bidId, it is considered "Created" and moves to the next tab.
   * (PDF can be uploaded later from the bid modal; it should not keep the item in Incoming.)
   */
  private hasBidId(r: any): boolean {
    return !!r?.bidId;
  }


// Normalize Firestore Timestamp/string/Date into Date | null
private toJsDate(v: any): Date | null {
  if (!v) return null;
  try {
    if (v instanceof Date) return v;
    if (typeof v === 'object' && typeof v.toDate === 'function') return v.toDate();
    if (typeof v === 'number') return new Date(v);
    if (typeof v === 'string') {
      // Supports ISO date (yyyy-mm-dd) or full ISO timestamp
      const s = v.trim();
      if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
        const [y, m, d] = s.split('-').map(n => parseInt(n, 10));
        return new Date(y, m - 1, d);
      }
      const dt = new Date(s);
      return isNaN(dt.getTime()) ? null : dt;
    }
    return null;
  } catch {
    return null;
  }
}

private startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

private computeDaysPending(bidDue: Date | null): number | null {
  if (!bidDue) return null;
  const today = this.startOfDay(new Date());
  const due = this.startOfDay(bidDue);
  const diffMs = due.getTime() - today.getTime();
  return Math.ceil(diffMs / (24 * 60 * 60 * 1000));
}

private enrichInboxRow(r: any): any {
  const bidDue = this.toJsDate(r?.bidDueDate ?? r?.bidDueAt ?? r?.bidDue ?? null);
  const dateReceived = this.toJsDate(r?.dateReceived ?? r?.receivedAt ?? null);
  const daysPending = this.computeDaysPending(bidDue);
  const isOverdue = bidDue ? this.startOfDay(bidDue).getTime() < this.startOfDay(new Date()).getTime() : false;
  return {
    ...r,
    bidDueDate: bidDue,
    dateReceived: dateReceived ?? r?.dateReceived,
    daysPending,
    isOverdue,
  };
}


  pendingInboxBids$ = combineLatest([
    this.incomingBids$,
    this.incomingBidDueSort$
  ]).pipe(
    map(([rows, sortDir]) => {
      const prepared = (rows ?? [])
        .filter(r => !this.hasBidId(r))
        .map(r => this.enrichInboxRow(r));

      return this.sortIncomingRowsByBidDue(prepared, sortDir);
    })
  );

  // Header counters (Incoming active, not in Trash, and not yet converted to a Bid)
  toBidCount$ = this.pendingInboxBids$.pipe(
    map(rows => (rows ?? []).length)
  );

  urgentCount$ = this.pendingInboxBids$.pipe(
    map(rows => (rows ?? []).filter(r => (r?.priority || 'normal') === 'urgent').length)
  );


private sortIncomingRowsByBidDue(rows: any[], sortDir: 'none' | 'asc' | 'desc'): any[] {
  if (sortDir === 'none') return rows;

  const copy = [...rows];
  const getTime = (row: any): number | null => {
    const d = this.toJsDate(row?.bidDueDate ?? row?.bidDueAt ?? row?.bidDue ?? null);
    return d ? this.startOfDay(d).getTime() : null;
  };

  copy.sort((a, b) => {
    const ta = getTime(a);
    const tb = getTime(b);

    if (ta === null && tb === null) return 0;
    if (ta === null) return 1;
    if (tb === null) return -1;

    return sortDir === 'asc' ? ta - tb : tb - ta;
  });

  return copy;
}

onIncomingBidDueHeaderClick(): void {
  const next: 'none' | 'asc' | 'desc' =
    this.incomingBidDueSortDirection === 'none'
      ? 'asc'
      : this.incomingBidDueSortDirection === 'asc'
        ? 'desc'
        : 'none';

  this.incomingBidDueSortDirection = next;
  this.incomingBidDueSort$.next(next);
}

getIncomingBidDueSortLabel(): string {
  return this.incomingBidDueSortDirection === 'asc'
    ? 'Bid Due ↑'
    : this.incomingBidDueSortDirection === 'desc'
      ? 'Bid Due ↓'
      : 'Bid Due';
}


trashInboxBids$ = this.inboxSvc.trash$().pipe(
  map(rows => (rows ?? []).map(r => this.enrichInboxRow(r)).filter(r => !this.hasBidId(r)))
);

  /**
   * "Bids Created" is a list of converted inbox items.
   * The Inbox document does NOT always carry a reliable creator email.
   * The modal (Open Bid) reads creator from the real /bids/{bidId} doc.
   * We hydrate the list rows with that same field so the table matches the modal.
   */
  createdInboxBids$ = this.incomingBids$.pipe(
    map(rows => (rows ?? []).filter(r => this.hasBidId(r))),
    switchMap(rows => {
      if (!rows.length) return of([]);

      const hydrated$ = rows.map(row => {
        const bidId = this.getBidId(row);
        if (!bidId) return of(row);

        return docData(doc(this.firestore, 'bids', bidId) as any).pipe(
          take(1),
          map((bid: any) => {
            const convertedByEmail =
              bid?.convertedByEmail ||
              bid?.deliveredByEmail ||
              bid?.estimatorEmail ||
              bid?.bidderEmail ||
              (row as any)?.convertedByEmail ||
              (row as any)?.createdByEmail ||
              (row as any)?.createdByLabel;

            return {
              ...row,
              convertedByEmail,
              createdByLabel: convertedByEmail || (row as any)?.createdByLabel || '—',
              // Follow-Up summary lives on the Bid doc (parent). Needed for list badges.
              followUpCount: bid?.followUpCount ?? 0,
              lastFollowUpAt: bid?.lastFollowUpAt ?? null,
              nextFollowUpAt: bid?.nextFollowUpAt ?? null,
            };
          }),
          catchError(() => of({
            ...row,
            createdByLabel: (row as any)?.createdByEmail || (row as any)?.createdByLabel || '—',
          }))
        );
      });

      return combineLatest(hydrated$);
    })
  );
incomingActionLabel(row: any): string {
    const id = row?.id ?? '';
    if (this.creatingId === id) return 'Creating…';
    return (row as any)?.bidId ? 'Open' : 'Create Bid';
  }

  createdActionLabel(row: any): string {
    return (row as any)?.bidId ? 'Open Bid' : 'Bid Created';
  }

  getBidId(row: any): string | undefined {
    const v = (row as any)?.bidId;
    return v ? String(v) : undefined;
  }


  getLocationLabel(row: any): string {
    const r: any = row || {};
    const city = r.city || r.projectCity || r.jobCity || r.locationCity;
    const state = r.state || r.projectState || r.jobState || r.locationState;

    // Address-like fields (we keep a wide fallback so old data still shows)
    const address =
      r.address ||
      r.projectAddress ||
      r.siteAddress ||
      r.jobAddress ||
      r.location ||
      r.addressLine ||
      r.address1;

    const cityState =
      city || state ? `${city || ''}${city && state ? ', ' : ''}${state || ''}` : '';

    if (cityState && address) return `${cityState} – ${String(address)}`;
    if (cityState) return cityState;
    if (address) return String(address);
    return '—';
  }

  /** Returns the physical jobsite address saved on the record (if any). */
  getJobsiteAddress(row: any): string {
    const r: any = row || {};
    const raw =
      r?.jobsiteAddress?.full ||
      r?.jobsiteAddressFull ||
      r?.jobsite ||
      r?.jobsiteLocation ||
      r?.siteLocation ||
      r?.siteAddress ||
      r?.jobAddress ||
      r?.projectAddress ||
      r?.address ||
      r?.location ||
      '';
    return (raw ?? '').toString().trim();
  }

  getJobsiteButtonLabel(row: any): string {
    return this.getJobsiteAddress(row) ? 'Location loaded' : 'Location not loaded';
  }

  openJobsite(row: any) {
    const address = this.getJobsiteAddress(row);
    if (!address) return;
    this.dialog.open(LocationViewDialogComponent, {
      width: '640px',
      maxWidth: '92vw',
      data: { address },
    });
  }


  creatingId: string | null = null;

  // Helper for template (Angular templates cannot use type casts like "(r as any)")
  getIncomingActionLabel(r: any): string {
    const id = (r?.id ?? '') as string;
    if (this.creatingId === id) return 'Creating…';
    if ((r as any)?.bidId) return 'Open Bid';
    return 'Create Bid';
  }


  /** Prevent full table re-render on row interactions (click, focus, hover). */
  trackById = (_: number, row: any) => row?.id ?? row?.bidId ?? row?.projectNormalized ?? _;

  async addIncomingBid(): Promise<void> {
    const createRef = this.dialog.open(IncomingBidDialogComponent, {
      width: '920px',
      maxWidth: '96vw',
      panelClass: 'wt-dialog-panel',
    });
    const attempted = (await firstValueFrom(createRef.afterClosed())) as IncomingBidDialogResult | null;
    if (!attempted) return;

    // Check duplicates (Client + Project)
    const existing = await this.inboxSvc.findDuplicate(attempted.client, attempted.projectName);
    if (!existing) {
      await this.inboxSvc.createIncoming({
        client: attempted.client,
        projectName: attempted.projectName,
        dateReceived: attempted.dateReceived,
        bidDueDate: attempted.bidDueDate,
        contactName: attempted.contactName,
        contactEmail: attempted.contactEmail,
        contactPhone: attempted.contactPhone,
        jobsiteAddress: (attempted as any).jobsiteAddress ?? '',
        source: 'email',
        priority: (attempted as any).priority ?? 'normal',
      });
      return;
    }

    // Duplicate found: do NOT create. Offer to add an UPDATE with reason.
    const dupRef = this.dialog.open(IncomingDuplicateDialogComponent, {
      width: '900px',
      maxWidth: '96vw',
      data: { existing, attempted },
    });
    const dupRes = (await firstValueFrom(dupRef.afterClosed())) as any;
    if (!dupRes || dupRes.action !== 'update') return;

    await this.inboxSvc.addIncomingUpdate(existing, dupRes.patch ?? {}, dupRes.reason ?? '', dupRes.note ?? '');
  }

  async onSave() {
    this.errorMsg = null;
    this.successMsg = null;

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving = true;
    try {
      await this.bidsSvc.createBid(this.form.getRawValue());
      this.successMsg = 'Bid saved successfully';
      this.form.reset({ status: 'draft' });
    } catch (e: any) {
      this.errorMsg = e?.message ?? 'Error saving bid';
    } finally {
      this.saving = false;
    }
  }


async createBidFromIncoming(r: BidInboxItem) {
  if (!r) return;

  const rid = (r.id ?? '').toString();
  if (!rid) return;

  // If already converted, just open.
  if ((r as any).bidId) {
    this.openPartidasDialog(String((r as any).bidId), r, rid);
    return;
  }

  // If a draft exists, continue it (do NOT remove from Incoming list).
  if ((r as any).draftBidId) {
    this.openPartidasDialog(String((r as any).draftBidId), r, rid);
    return;
  }

  this.creatingId = rid;

  try {
    // Create a draft bid and keep the Incoming row in place.
    const bidId = await this.bidFlow.createDraftBidFromIncoming(rid);
    this.openPartidasDialog(bidId, r, rid);
  } catch (e: any) {
    console.error('Create Bid failed', e);
    const msg =
      e?.code === 'permission-denied'
        ? 'Permission denied. Check Firestore rules for bids and bidInbox.'
        : e?.message || 'Could not create bid.';
    this.snack.open(msg, 'OK', { duration: 5000 });
  } finally {
    this.creatingId = null;
  }
}

  openPartidasDialog(bidId: string, r?: BidInboxItem, incomingId?: string) {
    if (!bidId) return;

    this.dialog.open(PartidasDialogComponent, {
      width: '1100px',
      maxWidth: '98vw',
      maxHeight: '92vh',
      height: 'auto',
      autoFocus: false,
      restoreFocus: false,
      panelClass: ['wt-dialog-panel', 'wt-dialog-panel--scroll'],
      backdropClass: 'wt-dialog-backdrop',
      data: {
        bidId,
        incomingId: incomingId ?? null,
        title: r ? `${r.client ?? ''} – ${r.projectName ?? 'Bid'} (Line Items)` : 'Bid Line Items',
      },
    });
  }

  openBid(bidId: string) {
    if (!bidId) return;
    // Use the same editor dialog for consistency (and to avoid schema mismatch with legacy bid pages)
    this.openPartidasDialog(String(bidId));
  }


  viewPdf(url: string | null | undefined): void {
    const u = (url ?? '').trim();
    if (!u) return;
    window.open(u, '_blank', 'noopener,noreferrer');
  }

async editPriority(r: BidInboxItem): Promise<void> {
  if (!r?.id) return;
  if (r.status === 'Assigned') return;

  const ref = this.dialog.open(EditPriorityDialogComponent, {
    width: '560px',
    maxWidth: '96vw',
    panelClass: 'wt-dialog-panel',
    data: { priority: (r as any)?.priority ?? 'normal' },
  });
  const next = (await firstValueFrom(ref.afterClosed())) as string | null;
  if (next === null) return;

  await this.inboxSvc.addIncomingUpdate(r, { priority: next as any }, 'Priority updated');
}

  async assignIncoming(r: BidInboxItem): Promise<void> {
    if (!r?.id) return;

    const ref = this.dialog.open(AssignIncomingDialogComponent, {
      width: '460px',
      maxWidth: '92vw',
      panelClass: ['wt-dialog-panel', 'wt-assign-dialog'],
      backdropClass: 'wt-dialog-backdrop',
      hasBackdrop: true,
      autoFocus: false,
      restoreFocus: false,
      data: { currentAssignee: (r as any)?.assignedToName ?? null },
    });

    const name = (await firstValueFrom(ref.afterClosed())) as string | null;
    if (!name) return;

    try {
      await this.inboxSvc.assignByName(r.id, name);
      this.snack.open(`Assigned to ${name}`, 'OK', { duration: 2500 });
    } catch (e: any) {
      const msg = (e?.message ?? '').toString();
      if (msg.startsWith('ALREADY_ASSIGNED:')) {
        const current = msg.replace('ALREADY_ASSIGNED:', '').trim();
        const ok = window.confirm(`This item is already assigned to ${current}. Reassign to ${name}?`);
        if (!ok) return;
        await this.inboxSvc.assignByName(r.id, name, { forceReassign: true });
        this.snack.open(`Reassigned to ${name}`, 'OK', { duration: 2500 });
        return;
      }
      this.snack.open(e?.message || 'Could not assign.', 'OK', { duration: 5000 });
    }
  }

  async unassignIncoming(r: BidInboxItem): Promise<void> {
    if (!r?.id) return;
    const current = ((r as any)?.assignedToName ?? '').toString().trim();
    const ok = window.confirm(current ? `Unassign this item from ${current}?` : 'Unassign this item?');
    if (!ok) return;
    try {
      await this.inboxSvc.unassign(r.id);
      this.snack.open('Unassigned', 'OK', { duration: 2000 });
    } catch (e: any) {
      this.snack.open(e?.message || 'Could not unassign.', 'OK', { duration: 5000 });
    }
  }

  async declineIncoming(r: BidInboxItem): Promise<void> {
    if (!r?.id) return;

    // Prevent declining if already converted to a Bid
    if ((r as any)?.bidId) {
      this.snack.open('This item is already converted to a Bid.', 'OK', { duration: 3500 });
      return;
    }

    const ref = this.dialog.open(DeclineIncomingDialogComponent, {
      width: '520px',
      maxWidth: '94vw',
      panelClass: 'wt-assign-dialog',
      backdropClass: 'wt-dialog-backdrop',
      hasBackdrop: true,
      data: { title: (r as any)?.projectName || (r as any)?.title, clientName: (r as any)?.clientName, projectName: (r as any)?.projectName },
    });

    const reason = (await firstValueFrom(ref.afterClosed())) as string | null;
    if (!reason) return;

    try {
      await this.inboxSvc.decline(r.id, reason);
      this.snack.open('Incoming bid moved to Declined.', 'OK', { duration: 3000 });
    } catch (e: any) {
      this.snack.open(e?.message || 'Could not remove item.', 'OK', { duration: 5000 });
    }
  }

  async moveToTrash(r: BidInboxItem): Promise<void> {
    if (!r?.id) return;

    // Prevent trashing if already converted to a Bid
    if ((r as any)?.bidId) {
      this.snack.open('This item is already converted to a Bid.', 'OK', { duration: 3500 });
      return;
    }

    const ref = this.dialog.open(TrashIncomingDialogComponent, {
      width: '520px',
      maxWidth: '94vw',
      panelClass: ['wt-dialog-panel', 'wt-assign-dialog'],
      backdropClass: 'wt-dialog-backdrop',
      hasBackdrop: true,
      data: { title: (r as any)?.projectName || (r as any)?.title, clientName: (r as any)?.clientName || (r as any)?.client, projectName: (r as any)?.projectName },
    });

    const reason = (await firstValueFrom(ref.afterClosed())) as string | null;
    if (!reason) return;

    try {
      await this.inboxSvc.moveToTrash(r.id, reason);
      this.snack.open('Moved to Incoming Bids Trash.', 'OK', { duration: 3000 });
    } catch (e: any) {
      this.snack.open(e?.message || 'Could not move item.', 'OK', { duration: 5000 });
    }
  }

  // (Export/TV View removed for now — we'll bring it back later if you want)
  getDaysBadgeClass(days: number): string {
    if (days < 0) return 'days-badge--overdue';
    if (days <= 2) return 'days-badge--urgent';
    if (days <= 7) return 'days-badge--soon';
    return 'days-badge--ok';
  }
  getDaysTooltip(days: number): string {
    if (days < 0) return `Overdue by ${Math.abs(days)} day(s)`;
    if (days === 0) return 'Due today';
    return `${days} day(s) left`;
  }


}