import { CommonModule } from '@angular/common';
import { Component, Inject, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { Auth } from '@angular/fire/auth';
import {
  Firestore,
  collectionData,
  docData,
  collection,
  doc,
  limit,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from '@angular/fire/firestore';
import {
  BehaviorSubject,
  Observable,
  Subscription,
  catchError,
  combineLatest,
  defer,
  firstValueFrom,
  map,
  of,
  shareReplay,
  switchMap,
} from 'rxjs';
import { BidFlowService } from './bid-flow.service';
import { FollowUpLogDialogComponent } from './followup-log-dialog.component';

// -----------------------------
// Local types (keep lightweight)
// -----------------------------
export type PartidaCategory =
  | 'labor'
  | 'equipment'
  | 'materials'
  | 'consumables'
  | 'rentals'
  | 'subcontracts'
  | 'other';

export interface PartidaLine {
  id?: string;
  category: PartidaCategory;
  description: string;
  amount: number;
  // Only used for labor rows
  hours?: number | null;

  // Audit fields (optional)
  createdAt?: any;
  createdByUid?: string;
  createdByEmail?: string;
}

export interface PartidasDialogData {
  bidId: string;
  incomingId?: string | null;
}

interface FollowUpModalContext {
  assignedToName: string;
  createdBy: string;
  createdByEmail: string;
  clientContactName: string;
  clientContactEmail: string;
  clientContactPhone: string;
  lastFollowUpBy: string;
  lastFollowUpAt: Date | null;
}

@Component({
    selector: 'app-partidas-dialog',
    imports: [
        CommonModule,
        ReactiveFormsModule,
        MatDialogModule,
        MatButtonModule,
        MatIconModule,
        MatFormFieldModule,
        MatInputModule,
        MatSelectModule,
    ],
    templateUrl: './partidas-dialog.component.html',
    styleUrls: ['./partidas-dialog.component.scss']
})
export class PartidasDialogComponent implements OnInit, OnDestroy {
  private subs = new Subscription();

  // Selected version for viewing (can be locked/delivered). Editing is ONLY allowed on the current draft.
  private selectedVersionIdSubject = new BehaviorSubject<string | null>(null);
  readonly selectedVersionId$ = this.selectedVersionIdSubject.asObservable();

  readonly bidId: string;
  incomingId: string | null;
  versionNumber = 1;
  draftVersionId: string | null = null;
  selectedVersionId: string | null = null;

  // Header text (template expects these directly)
  client = '';
  project = '';

  // UI state
  saving = false;
  savingMeta = false;
  uploadingPdf = false;
  errorMsg: string | null = null;
  metaMsg: string | null = null;
  pdfMsg: string | null = null;
  metaSavedAt: Date | null = null;

  pdfHref: string | null = null;
  pdfPreviewUrl: SafeResourceUrl | null = null;

  categories: { value: PartidaCategory; label: string }[] = [
    { value: 'materials', label: 'Materials' },
    { value: 'equipment', label: 'Equipment' },
    { value: 'labor', label: 'Labor' },
    { value: 'consumables', label: 'Consumables' },
    { value: 'rentals', label: 'Rentals' },
    { value: 'subcontracts', label: 'Subcontracts' },
    { value: 'other', label: 'Other' },
  ];

  addedCategories = new Set<PartidaCategory>();

  // Forms
  form: FormGroup;
  totalsForm: FormGroup;

  // Firestore streams
  // Field initializers run before the constructor body, so DI-assigned props like
  // `this.firestore` can still be undefined here. We wrap the initial read in `defer()`
  // so the Firestore call executes on subscription (after DI is ready).
  readonly bid$ = defer(() => docData(doc(this.firestore, `bids/${this.data.bidId}`), { idField: 'id' })).pipe(
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  /** Active draft version document stream */
  readonly draftVersion$ = this.bid$.pipe(
    map((bid: any) => String(bid?.draftVersionId ?? '')),
    switchMap((vid) => {
      this.draftVersionId = vid || null;
      this.versionNumber = Number((vid || 'v1').replace('v', '')) || 1;
      // Default selection: draft if present, otherwise keep current selection.
      if (vid && !this.selectedVersionIdSubject.value) {
        this.setSelectedVersion(vid);
      }
      return vid
        ? (docData(doc(this.firestore, `bids/${this.data.bidId}/versions/${vid}`), { idField: 'id' }) as Observable<any>)
        : of(null);
    }),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  /** All versions for navigation (sidebar) */
  readonly versions$ = collectionData(
    query(collection(this.firestore, `bids/${this.data.bidId}/versions`), orderBy('versionNumber', 'desc')),
    { idField: 'id' },
  ).pipe(
    map((rows: any[]) => (rows ?? []).map((r) => ({
      isSelected: !!r?.isSelected,
      id: String(r?.id ?? ''),
      versionNumber: Number(r?.versionNumber ?? 0) || 0,
      status: String(r?.status ?? 'draft'),
      calculatedTotal: Number(r?.calculatedTotal ?? 0) || 0,
      createdAt: r?.createdAt,
    }))),
    shareReplay({ bufferSize: 1, refCount: true }),
  );



  readonly selectedVersion$ = this.selectedVersionId$.pipe(
    switchMap((vid) => {
      const id = String(vid ?? '').trim();
      if (!id) return of(null);
      return docData(doc(this.firestore, `bids/${this.data.bidId}/versions/${id}`), { idField: 'id' }) as Observable<any>;
    }),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

/**
 * Versioning is only allowed AFTER conversion (v1 is the first official version).
 * Additionally, you may only create the NEXT draft when the CURRENT draft is selected
 * and has both: (a) a PDF attached and (b) a non‑zero calculated total.
 */
readonly canCreateNewVersion$ = combineLatest([
  this.bid$,
  this.selectedVersion$,
]).pipe(
  map(([bid, ver]: any[]) => {
    if (!bid || bid?.isDraft || !bid?.convertedAt) return false;
    const draftId = String(bid?.draftVersionId ?? '').trim();
    const selectedId = String(ver?.id ?? '').trim();
    if (!draftId || !selectedId || draftId !== selectedId) return false;
    const total = Number(ver?.calculatedTotal ?? 0) || 0;
    const hasPdf = this.hasPdfAttached(ver);
    return hasPdf && total > 0;
  }),
  shareReplay({ bufferSize: 1, refCount: true }),
);

  /** Selected version document stream (for viewing). */

  /** One doc per category (no duplicates) for the SELECTED version (read-only if not draft). */
  readonly partidas$: Observable<PartidaLine[]> = this.selectedVersionId$.pipe(
    map((vid) => String(vid ?? '').trim()),
    switchMap((vid) => {
      if (!vid) return of([] as PartidaLine[]);
      const qref = query(collection(this.firestore, `bids/${this.data.bidId}/versions/${vid}/partidas`), orderBy('category', 'asc'));
      return (collectionData(qref, { idField: 'id' }) as unknown as Observable<PartidaLine[]>);
    }),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  /** Calculated total comes from the SELECTED version */
  readonly calculatedTotal$ = this.selectedVersion$.pipe(
    map((v: any) => Number(v?.calculatedTotal ?? 0) || 0),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  /** Only the current draft is editable */
  readonly isEditable$ = combineLatest([this.bid$, this.selectedVersion$]).pipe(
    map(([bid, ver]: any[]) => {
      const draftId = String(bid?.draftVersionId ?? '').trim();
      const selId = String(ver?.id ?? '').trim();
      const status = String(ver?.status ?? '').trim();
      return !!(draftId && selId && draftId === selId && status === 'draft');
    }),
    shareReplay({ bufferSize: 1, refCount: true }),
  );



  /**
   * Can edit/replace the official PDF?
   *
   * Rule: If this Bid was born from Incoming Bids, the ORIGINAL PDF (v1) is immutable.
   * To attach a different PDF, the user must create a new draft version.
   */
  readonly canEditPdf$ = combineLatest([this.isEditable$, this.bid$, this.selectedVersion$]).pipe(
    map(([editable, bid, ver]: any[]) => {
      if (!editable) return false;

      const incomingId = this.pickString(bid?.incomingId, this.incomingId, '');
      const hasIncoming = !!String(incomingId ?? '').trim();

      const versionId = String(ver?.id ?? '').trim();
      const hasPdf = !!this.pickString(
        ver?.pdf?.downloadUrl,
        ver?.pdf?.url,
        ver?.pdf?.storagePath,
        ver?.pdfUrl,
        ver?.officialPdf,
        ''
      );

      const locked = hasIncoming && versionId === 'v1' && hasPdf;
      return !locked;
    }),
    shareReplay(1)
  );
  // Pretty summary for the header
  // NOTE: We try to display human-friendly values (email / name) instead of raw IDs.
  // If we can't read the related docs due to missing data or permissions, we fall back to shortened IDs.
  bidSummary$ = this.bid$.pipe(
    switchMap((bid: any) => {
      const createdByUid = this.pickString(bid?.createdByUid, bid?.bidderUid, '');
      const incomingIdRaw = this.pickString(bid?.incomingId, this.data.incomingId, this.incomingId, '');

      const user$ = createdByUid
        ? docData(doc(this.firestore, `users/${createdByUid}`)).pipe(catchError(() => of(null)))
        : of(null);

      const incoming$ = incomingIdRaw
        ? docData(doc(this.firestore, `bidInbox/${incomingIdRaw}`)).pipe(catchError(() => of(null)))
        : of(null);

      return combineLatest([of(bid), user$, incoming$]);
    }),
    map(([bid, user, incoming]: any[]) => {
      const client = this.pickString(bid?.clientName, bid?.client, bid?.clientId, '—');
      const project = this.pickString(bid?.projectName, bid?.title, bid?.project, '—');
      const location = this.pickString(
        // Prefer the Bid doc (post-conversion)
        bid?.jobsiteLocation,
        bid?.jobsiteAddress?.full,
        bid?.jobsiteAddress,
        bid?.location,
        bid?.address,

        // Fallback to Incoming (pre-conversion / drafts)
        incoming?.jobsiteLocation,
        incoming?.jobsiteAddress?.full,
        incoming?.jobsiteAddress,
        incoming?.location,
        incoming?.address,

        '—',
      );

      const folderPath = this.pickString(bid?.folderPath, bid?.folder, incoming?.folderPath, incoming?.folder, '—');

      const receivedAt = this.toDate(bid?.receivedAt ?? bid?.dateReceived);
      const convertedAt = this.toDate(bid?.convertedAt);
      const bidDueAt = this.toDate(bid?.bidDueAt ?? bid?.bidDueDate);

      const createdByEmailFromBid = typeof (bid as any)?.createdBy === 'string' ? (bid as any).createdBy : '';
      const createdByEmailFromIncoming = typeof (incoming as any)?.createdBy === 'string' ? (incoming as any).createdBy : '';
      const createdByEmail = this.pickString(
        bid?.createdByEmail,
        createdByEmailFromBid,
        (bid as any)?.createdBy?.email,
        incoming?.createdByEmail,
        createdByEmailFromIncoming,
        user?.email,
        user?.userEmail,
        this.auth.currentUser?.email ?? '',
        '',
      );
      const createdByName = this.pickString(bid?.createdByName, user?.displayName, user?.name, user?.fullName, '');
      const createdByUid = this.pickString(bid?.createdByUid, bid?.bidderUid, '');

      // Friendly label: prefer name/email, show "You" for the current signed-in user,
      // and avoid exposing raw UIDs in the UI.
      const isMe = !!(createdByUid && this.auth.currentUser?.uid && createdByUid === this.auth.currentUser?.uid);
      const createdBy = this.pickString(createdByName, '')
        ? `${createdByName}${createdByEmail ? ` (${createdByEmail})` : ''}`
        : (createdByEmail || (isMe ? 'You' : 'Unknown user'));

      const incomingIdRaw = this.pickString(bid?.incomingId, this.data.incomingId, this.incomingId, '');
      const incomingTitle = this.pickString(
        incoming?.title,
        incoming?.projectName,
        incoming?.subject,
        incoming?.clientName,
        '',
      );
      // Show a compact Incoming ID only. The title/project is already shown in the summary.
      const incomingId = incomingIdRaw ? this.shortenId(incomingIdRaw) : '—';

      const status = this.pickString(bid?.status, bid?.classification, 'draft');

      return {
        client,
        project,
        location,
        folderPath,
        createdBy,
        status,
        // Template expects these names
        receivedAt,
        convertedAt,
        bidDueAt,
        // Backwards/utility aliases
        received: receivedAt,
        converted: convertedAt,
        due: bidDueAt,
        incomingId,
      };
    }),
  );

  /**
   * Follow-ups stream for the current bid.
   *
   * IMPORTANT: keep this as a property, not a method invoked from the template.
   * If you call a method that builds an Observable from the template, Angular
   * will execute it on every change detection cycle, producing a NEW Firestore
   * listener each time and freezing the UI.
   */

  readonly followUpContext$ = this.bid$.pipe(
    switchMap((bid: any) => {
      const createdByUid = this.pickString(bid?.createdByUid, bid?.bidderUid, '');
      const incomingIdRaw = this.pickString(bid?.incomingId, this.data.incomingId, this.incomingId, '');

      const user$ = createdByUid
        ? docData(doc(this.firestore, `users/${createdByUid}`)).pipe(catchError(() => of(null)))
        : of(null);

      const incoming$ = incomingIdRaw
        ? docData(doc(this.firestore, `bidInbox/${incomingIdRaw}`)).pipe(catchError(() => of(null)))
        : of(null);

      return combineLatest([of(bid), user$, incoming$, this.followups$]);
    }),
    map(([bid, user, incoming, followups]: any[]) => {
      const currentUserEmail = this.auth.currentUser?.email ?? '';

      const createdByEmail = this.pickString(
        bid?.createdByEmail,
        typeof bid?.createdBy === 'string' ? bid.createdBy : '',
        incoming?.createdByEmail,
        typeof incoming?.createdBy === 'string' ? incoming.createdBy : '',
        user?.email,
        user?.userEmail,
        currentUserEmail,
        '',
      );

      const createdBy = this.pickString(
        bid?.createdByName,
        user?.displayName,
        user?.name,
        user?.fullName,
        bid?.createdByLabel,
        incoming?.createdByLabel,
        createdByEmail,
        '—',
      );

      const assignedToName = this.pickString(
        bid?.assignedToName,
        bid?.bidOwnerName,
        incoming?.assignedToName,
        incoming?.assignedByName,
        createdBy,
        'Unassigned',
      );

      const clientContactName = this.pickString(
        bid?.contactName,
        bid?.clientContactName,
        incoming?.contactName,
        '—',
      );

      const clientContactEmail = this.pickString(
        bid?.contactEmail,
        bid?.clientContactEmail,
        incoming?.contactEmail,
        '',
      );

      const clientContactPhone = this.pickString(
        bid?.contactPhone,
        bid?.clientContactPhone,
        incoming?.contactPhone,
        '',
      );

      const latest = Array.isArray(followups) && followups.length ? followups[0] : null;
      const lastFollowUpBy = this.pickString(
        latest?.createdByLabel,
        latest?.createdByName,
        latest?.createdByEmail,
        '',
      );
      const lastFollowUpAt = this.toDate(latest?.createdAt);

      return {
        assignedToName,
        createdBy,
        createdByEmail,
        clientContactName,
        clientContactEmail,
        clientContactPhone,
        lastFollowUpBy,
        lastFollowUpAt,
      } as FollowUpModalContext;
    }),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  followups$: Observable<any[]>;

  constructor(
    private fb: FormBuilder,
    private auth: Auth,
    private firestore: Firestore,
    private sanitizer: DomSanitizer,
    private bidFlow: BidFlowService,
    private dialog: MatDialog,
    private dialogRef: MatDialogRef<PartidasDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: PartidasDialogData,
  ) {
    this.bidId = data.bidId;
    this.incomingId = data.incomingId ?? null;

    // Follow-ups: create ONE stream and reuse it in the template.
    // (Do not build Observables from template-called methods; it can create
    // multiple Firestore listeners and freeze the page.)
    const fuRef = collection(this.firestore, 'bids', this.bidId, 'followups');
    const fuQ = query(fuRef, orderBy('createdAt', 'desc'), limit(20));
    this.followups$ = collectionData(fuQ, { idField: 'id' }).pipe(
      map((rows) => (rows ?? []) as any[]),
      shareReplay({ bufferSize: 1, refCount: true }),
    );

    this.form = this.fb.group({
      category: new FormControl<PartidaCategory>('materials', { nonNullable: true, validators: [Validators.required] }),
      description: new FormControl<string>('', { nonNullable: true }),
      amount: new FormControl<number | null>(null, [Validators.required, Validators.min(0.01)]),
      hours: new FormControl<number | null>(null, [Validators.min(0)]),
    });

    this.totalsForm = this.fb.group({
      officialPdfPath: new FormControl<string>('', { nonNullable: true }),
    });
  }

  get isLabor(): boolean {
    return this.form.controls['category'].value === 'labor';
  }

  ngOnInit(): void {
    // Track categories already used
    this.subs.add(
      this.partidas$.subscribe((rows: any[]) => {
        this.addedCategories = new Set((rows ?? []).map((r) => r?.category).filter(Boolean));
      }),
    );

    // Ensure we always have a selected version (draft preferred; else latest by number)
    this.subs.add(
      combineLatest([this.bid$, this.versions$]).subscribe(([bid, versions]: any[]) => {
        const draftId = String(bid?.draftVersionId ?? '').trim();
        const currentId = String(bid?.currentVersionId ?? '').trim();
        const best = draftId || currentId || (versions?.[0]?.id ?? null);
        if (best && !this.selectedVersionIdSubject.value) {
          this.setSelectedVersion(best);
        }
      }),
    );

    // Load bid metadata (pdf, counters)
    this.subs.add(
      this.bid$.subscribe(async (bid: any) => {
        this.incomingId = this.pickString(bid?.incomingId, this.incomingId, null);
        // IMPORTANT: draftVersion$ is not necessarily subscribed by the template.
        // Keep draftVersionId + versionNumber in sync here so editability guards and
        // Storage paths are correct even if draftVersion$ isn't consumed.
        const draftId = String(bid?.draftVersionId ?? '').trim();
        this.draftVersionId = draftId || null;
        this.versionNumber = Number((draftId || 'v1').replace('v', '')) || 1;

        // Default selection: always jump to the current draft if nothing is selected yet.
        if (draftId && !this.selectedVersionIdSubject.value) {
          this.setSelectedVersion(draftId);
        }

        // Header fields
        this.client = this.pickString(bid?.clientName, bid?.client, this.client);
        this.project = this.pickString(bid?.projectName, bid?.title, bid?.project, this.project);

        // PDF display is version-scoped. We populate it from selectedVersion$ below.
      }),
    );

    // Ensure draftVersion$ side-effects (legacy) remain active even if the template doesn't consume it.
    this.subs.add(this.draftVersion$.subscribe());

    // Keep PDF view in sync with the selected version (read-only for locked versions).
    this.subs.add(
      this.selectedVersion$.subscribe((ver: any) => {
        void this.syncPdfForVersion(ver);
      }),
    );

    // IMPORTANT:
    // Do NOT drive reactive-form disabled state from the template via [disabled] when using formControlName.
    // That triggers Angular warnings and can leave the form in an inconsistent state.
    // Instead, toggle the form enabled/disabled from code based on isEditable$.
    this.subs.add(
      this.isEditable$.subscribe((editable) => {
        if (editable) {
          this.form.enable({ emitEvent: false });
        } else {
          this.form.disable({ emitEvent: false });
        }
      }),
    );

  }

  private async syncPdfForVersion(ver: any): Promise<void> {
  const raw = this.pickString(
    ver?.pdf?.downloadUrl,
    ver?.pdf?.url,
    ver?.pdf?.storagePath,
    ver?.pdfUrl,
    ver?.officialPdf,
    ''
  );

  if (!raw) {
    this.totalsForm.controls['officialPdfPath'].setValue('');
    this.pdfHref = null;
    this.pdfPreviewUrl = null;
    return;
  }

  try {
    let resolved = String(raw);

    // If we stored a Firebase Storage path, resolve it to a download URL.
    if (!resolved.startsWith('http')) {
      resolved = await this.bidFlow.resolveStoragePathToDownloadUrl(resolved);
    }

    this.totalsForm.controls['officialPdfPath'].setValue(resolved);
    this.pdfHref = resolved;
    this.pdfPreviewUrl = this.sanitizer.bypassSecurityTrustResourceUrl(resolved);
  } catch {
    // ignore
  }
}

async createNewVersion(): Promise<void> {
    // Only allow creating from the CURRENT draft (editable) version
    const isEditable = await firstValueFrom(this.isEditable$);
    if (!isEditable) {
      this.dialog.open(InfoDialogComponent, {
        width: '420px',
        data: {
          title: 'Select current draft',
          message: 'To create a new version, first select the current draft (editable) version on the left.'
        }
      });
      return;
    }

    const v: any = await firstValueFrom(this.selectedVersion$);
    if (!v) return;

    // Hard rules:
    // - You can only create the next version from the current editable draft.
    // - That draft must already have BOTH: (1) a PDF attached and (2) at least one line-item amount (> 0).
    // This prevents creating chains of empty drafts.
    const pdfFromForm = String(this.totalsForm?.controls?.['officialPdfPath']?.value ?? '').trim();
    const hasPdf = !!pdfFromForm || this.hasPdfAttached(v);
    const computedTotal = Number((await firstValueFrom(this.calculatedTotal$)) ?? 0);

    if (!hasPdf || !(computedTotal > 0)) {
      this.dialog.open(InfoDialogComponent, {
        width: '480px',
        data: {
          title: 'Finish this draft first',
          message:
            'Before creating a new version, the current draft must have BOTH an official PDF uploaded and at least one line item (total > 0).'
        }
      });
      return;
    }

    const ref = this.dialog.open(VersionReasonDialogComponent, {
      width: '520px',
      data: { reason: '' }
    });

    const reason = (await firstValueFrom(ref.afterClosed())) as string | undefined;
    if (reason === undefined) return; // cancelled

    const note = (reason ?? '').trim();
    if (!note) {
      this.dialog.open(InfoDialogComponent, {
        width: '420px',
        data: { title: 'Reason required', message: 'Please enter a short reason for creating this version.' }
      });
      return;
    }

    try {
      // Enforce the same rule as the UI flag (canCreateNewVersion$):
      // require at least one line item (total > 0) and an official PDF on the current draft.
      const canCreate = await firstValueFrom(this.canCreateNewVersion$);
      if (!canCreate) {
        this.dialog.open(InfoDialogComponent, {
          width: '460px',
          data: {
            title: 'Not ready yet',
            message: 'To create a new version, the current draft must have at least one line item (total > 0) and an official PDF attached.'
          }
        });
        return;
      }

      const newId = await this.bidFlow.createNewVersion(this.bidId, note);

      // Immediately switch selection to the newly created draft version
      // so the note and totals shown match the version the user just created.
      this.setSelectedVersion(newId);
    } catch (err) {
      console.error(err);
      this.dialog.open(InfoDialogComponent, {
        width: '420px',
        data: { title: 'Error', message: 'Could not create the new version. Please try again.' }
      });
    }
  }

  selectVersion(versionId: string): void {
    this.setSelectedVersion(versionId);
  }

  close(): void {
    this.dialogRef.close();
  }

  async add(): Promise<void> {
    this.errorMsg = null;
    this.pdfMsg = null;

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving = true;
    try {
      const editable = await firstValueFrom(this.isEditable$);
      if (!editable) {
        throw new Error('This version is read-only. Click Create New Version to edit.');
      }
      const v = this.form.getRawValue();
      const payload: any = {
        category: v.category,
        description: (v.description ?? '').trim(),
        amount: Number(v.amount ?? 0) || 0,
        hours: v.category === 'labor' ? (Number(v.hours ?? 0) || 0) : null,
        createdAt: new Date(),
      };

      // Allow multiple "Materials" etc lines? For now, keep it simple: allow duplicates.
      await this.bidFlow.addPartida(this.bidId, payload);

      // Pick next category that hasn't been used yet (nice UX)
      const next = this.categories.map((c) => c.value).find((c) => !this.addedCategories.has(c));
      this.form.patchValue({
        category: next ?? v.category,
        description: '',
        amount: null,
        hours: null,
      });
      this.form.markAsPristine();
      this.form.markAsUntouched();
    } catch (e: any) {
      this.errorMsg = e?.message ?? 'Could not add line item.';
    } finally {
      this.saving = false;
    }
  }

  async onOfficialPdfSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input?.files?.[0];
    if (!file) return;

    // PDF is locked for the original (v1) of bids created from Incoming Bids
    const canEditPdf = await firstValueFrom(this.canEditPdf$);
    if (!canEditPdf) {
      this.errorMsg = "This bid’s original PDF is locked. Create a new draft version to upload a new PDF.";
      if (input) input.value = "";
      return;
    }

    this.errorMsg = null;
    this.pdfMsg = null;
    this.uploadingPdf = true;

    try {
      // IMPORTANT: Do NOT await isEditable$ here. In dialogs it can fail to emit and hang,
      // leaving the UI stuck on "Uploading..." forever.
      // We rely on locally-tracked IDs (kept in sync by subscriptions) for a fast guard.
      const draftId = String(this.draftVersionId ?? '').trim();
      const selId = String(this.selectedVersionId ?? '').trim();
      const editable = !!(draftId && selId && draftId === selId);
      if (!editable) throw new Error('This version is read-only. Create a new draft version to upload a PDF.');

      // Upload to Storage and store the STORAGE PATH (not a download URL).
      // This avoids hanging if getDownloadURL is blocked/stalls; we can resolve it later when needed.
      const storagePath = await this.bidFlow.uploadOfficialPdfToStorage(this.bidId, this.versionNumber, file);
      await this.bidFlow.updateDraftVersionPdf(this.bidId, storagePath, file.name);

      this.totalsForm.controls['officialPdfPath'].setValue(storagePath);
      this.pdfHref = null;
      this.pdfPreviewUrl = null;

      // Best-effort preview: resolve path -> download URL (optional)
      try {
        const url = await this.bidFlow.resolveStoragePathToDownloadUrl(storagePath);
        this.pdfHref = url;
        this.pdfPreviewUrl = this.sanitizer.bypassSecurityTrustResourceUrl(url);
      } catch {
        // Preview is optional; conversion will still work using the storage path.
      }
      this.pdfMsg = 'PDF uploaded & saved.';
      this.metaSavedAt = new Date();
    } catch (e: any) {
      this.errorMsg = e?.message ?? 'Could not upload PDF.';
    } finally {
      this.uploadingPdf = false;
      if (input) input.value = '';
    }
  }

  async saveAndConvert(): Promise<void> {
    this.errorMsg = null;
    this.metaMsg = null;

    if (!this.incomingId) {
      this.errorMsg = 'Missing Incoming ID for this bid.';
      return;
    }

    // Require at least one partida before converting
    const total = await firstValueFrom(this.calculatedTotal$);
    if (!total || total <= 0) {
      this.errorMsg = 'Add at least one line item (amount > 0) before converting.';
      return;
    }

    // If PDF URL/path is present, persist it UNDER THE DRAFT VERSION (not bid root)
    // This keeps PDFs historical per version.
    const rawPdf = String(this.totalsForm.controls['officialPdfPath'].value ?? '').trim();
    if (rawPdf) {
      try {
        const resolved = rawPdf.startsWith('http')
          ? rawPdf
          : await this.bidFlow.resolveStoragePathToDownloadUrl(rawPdf);
        await this.bidFlow.updateDraftVersionPdf(this.bidId, resolved, null);
        this.pdfHref = resolved;
        this.pdfPreviewUrl = this.sanitizer.bypassSecurityTrustResourceUrl(resolved);
        this.totalsForm.controls['officialPdfPath'].setValue(resolved);
      } catch {
        // ignore and still allow conversion
      }
    }

// Hard requirement: official PDF must be attached before converting.
const finalPdf = String(this.totalsForm.controls['officialPdfPath'].value ?? '').trim();
if (!finalPdf) {
  this.errorMsg = 'Attach the official estimate PDF before converting.';
  return;
}

this.savingMeta = true;
    try {
      await this.bidFlow.finalizeDraftConversion(this.incomingId, this.bidId);
      this.metaMsg = 'Converted to Bid.';
      this.dialogRef.close(true);
    } catch (e: any) {
      this.errorMsg = e?.message ?? 'Could not convert to a Bid.';
    } finally {
      this.savingMeta = false;
    }
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  private setSelectedVersion(id: string): void {
    const vid = String(id ?? '').trim();
    if (!vid) return;
    this.selectedVersionId = vid;
    this.selectedVersionIdSubject.next(vid);
  }

  private toDate(value: any): Date | null {
    if (!value) return null;
    if (value instanceof Date) return value;
    if (typeof value?.toDate === 'function') return value.toDate();
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }

  private pickString(...vals: any[]): string {
    for (const v of vals) {
      if (v === null || v === undefined) continue;
      const s = String(v).trim();
      if (s) return s;
    }
    return '';
  }

  private hasPdfAttached(ver: any): boolean {
    // Accept both legacy and new shapes.
    const pathOrUrl = this.pickString(
      ver?.pdf?.storagePath,
      ver?.pdf?.downloadUrl,
      ver?.officialPdfPath,
      ver?.officialPdfUrl,
      ver?.pdfPath,
      ver?.pdfUrl,
      ver?.pdf,
    );
    return !!pathOrUrl;
  }

  private shortenId(id: string): string {
    const s = String(id);
    if (s.length <= 12) return s;
    return `${s.slice(0, 6)}…${s.slice(-4)}`;
  }


  async openFollowUpLog(): Promise<void> {
    if (!this.bidId) return;

    const context = await firstValueFrom(this.followUpContext$).catch(() => null);

    this.dialog.open(FollowUpLogDialogComponent, {
      data: {
        bidId: this.bidId,
        context,
      },
      autoFocus: false,
      restoreFocus: false,
      panelClass: 'wt-dialog-panel',
    });
  }


  async markVersionAsSelected(versionId: string, versions: any[]): Promise<void> {
    const bidId = this.data.bidId;
    const batch = [];
    for (const v of versions) {
      const ref = doc(this.firestore, `bids/${bidId}/versions/${v.id}`);
      batch.push(updateDoc(ref, { isSelected: v.id === versionId }));
    }
    await Promise.all(batch);

    const selected = versions.find(v => v.id === versionId);
    if (selected) {
      await updateDoc(doc(this.firestore, `bids/${bidId}`), {
        selectedVersion: {
          versionId: selected.id,
          total: selected.calculatedTotal,
          selectedAt: serverTimestamp(),
          selectedBy: this.auth.currentUser?.email ?? ''
        }
      });
    }
  }

}


@Component({
    selector: 'app-info-dialog',
    imports: [CommonModule, MatDialogModule, MatButtonModule],
    template: `
    <div class="wt-dialog">
      <h2 class="wt-title">{{ data.title || 'Info' }}</h2>
      <div class="wt-body">{{ data.message || '' }}</div>
      <div class="wt-actions">
        <button mat-button (click)="close()">OK</button>
      </div>
    </div>
  `,
    styles: [`
    .wt-dialog { padding: 18px 18px 10px; color: #e8e8e8; background: #0f1218; }
    .wt-title { margin: 0 0 10px; font-size: 16px; font-weight: 700; }
    .wt-body { font-size: 13px; line-height: 1.45; opacity: .9; }
    .wt-actions { display:flex; justify-content:flex-end; margin-top: 16px; }
  `]
})
export class InfoDialogComponent {
  constructor(
    private ref: MatDialogRef<InfoDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { title?: string; message?: string }
  ) {}
  close() { this.ref.close(); }
}

@Component({
    selector: 'app-version-reason-dialog',
    imports: [CommonModule, ReactiveFormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatButtonModule],
    template: `
    <div class="wt-dialog">
      <h2 class="wt-title">Reason for creating this new version</h2>

      <mat-form-field appearance="outline" class="wt-field">
        <mat-label>Short note (required)</mat-label>
        <input matInput [formControl]="reasonCtrl" maxlength="120" autocomplete="off" />
        <mat-hint align="end">{{ reasonCtrl.value.length }}/120</mat-hint>
        <mat-error *ngIf="reasonCtrl.invalid">Please enter a short reason.</mat-error>
      </mat-form-field>

      <div class="wt-actions">
        <button mat-button (click)="cancel()">Cancel</button>
        <button mat-raised-button color="primary" [disabled]="reasonCtrl.invalid" (click)="ok()">OK</button>
      </div>
    </div>
  `,
    styles: [`
    .wt-dialog { padding: 18px 18px 10px; color: #e8e8e8; background: #0f1218; }
    .wt-title { margin: 0 0 12px; font-size: 16px; font-weight: 700; }
    .wt-field { width: 100%; }
    .wt-actions { display:flex; justify-content:flex-end; gap: 8px; margin-top: 14px; }
  `]
})
export class VersionReasonDialogComponent {
  reasonCtrl = new FormControl<string>(this.data?.reason ?? '', { nonNullable: true, validators: [Validators.required] });

  constructor(
    private ref: MatDialogRef<VersionReasonDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { reason?: string }
  ) {}

  cancel() { this.ref.close(undefined); }
  ok() { this.ref.close((this.reasonCtrl.value ?? '').trim()); }
}