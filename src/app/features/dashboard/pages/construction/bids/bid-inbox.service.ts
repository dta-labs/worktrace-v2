import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  CollectionReference,
  DocumentReference,
  addDoc,
  collection,
  collectionData,
  docData,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  updateDoc,
  where,
} from '@angular/fire/firestore';
import { Auth } from '@angular/fire/auth';
import { Observable, combineLatest, of } from 'rxjs';
import { catchError, map, switchMap, take } from 'rxjs/operators';

export type BidInboxStatus = 'Incoming' | 'Assigned' | 'No-Bid';

export type BidPriority = 'urgent' | 'high' | 'normal' | 'low';

export interface BidInboxItem {
  id?: string;

  client: string;
  projectName: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;

  dateReceived?: any; // Timestamp | Date
  bidDueDate?: any;  // Timestamp | Date

  // UI helpers
  isOverdue?: boolean;
  /** Days remaining until Bid Due (negative means overdue). */
  daysPending?: number | null;
  bidId?: string;
  /** Draft bid id used while preparing a bid but before final conversion. */
  draftBidId?: string;
  draftCreatedAt?: any;

  source?: string; // email | web | pm | admin | etc.
  status: BidInboxStatus;

  /**
   * TEMP (no users yet): free-text name of who this incoming request is assigned to.
   * Later we will add assignedToUid and keep this as displayName.
   */
  assignedToName?: string | null;
  assignedAt?: any;
  assignedByName?: string | null;

  /** Priority to work this incoming request in the queue. */
  priority?: BidPriority;

  /** Legacy field kept for backward compatibility (old UI used this). */
  pendingReason?: string;

  /** Physical jobsite address (separate from Drive folder path). */
  jobsiteAddress?: {
    full: string;
    loadedAt?: any;
    loadedByUid?: string | null;
    loadedByLabel?: string;
  } | null;

  // normalized for duplicate detection
  clientNormalized: string;
  projectNormalized: string;

  updatesCount?: number; // legacy counter (kept for history/analytics later)

  createdBy?: string | null;
  createdByEmail?: string | null;
  createdByLabel?: string;
  createdAt?: any;
  updatedBy?: string | null;
  updatedByLabel?: string;
  updatedAt?: any;

  // --- Soft delete (Trash) ---
  deleted?: boolean;
  deletedAt?: any;
  deleteReason?: string;
  deletedByUid?: string | null;
  deletedByEmail?: string | null;
}

export interface BidInboxUpdateEntry {
  id?: string;
  editedBy: string;
  editedByLabel: string;
  editedAt: any;
  reason: string;
  note?: string;
  changes: Record<string, { before: any; after: any }>;
}

function norm(v: string): string {
  return (v ?? '')
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[\s\-_/]+/g, ' ')
    .replace(/[^a-z0-9 ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function diffObject(before: any, after: any): Record<string, { before: any; after: any }> {
  const changes: Record<string, { before: any; after: any }> = {};
  const keys = new Set([...Object.keys(before || {}), ...Object.keys(after || {})]);
  keys.forEach((k) => {
    const b = before?.[k];
    const a = after?.[k];
    if (JSON.stringify(b) !== JSON.stringify(a)) changes[k] = { before: b, after: a };
  });
  return changes;
}

@Injectable({ providedIn: 'root' })
export class BidInboxService {
  private fs = inject(Firestore);
  private auth = inject(Auth);

  private toJsDate(value: any): Date | null {
    if (!value) return null;
    if (value instanceof Date) return value;
    if (typeof value?.toDate === 'function') return value.toDate();
    if (typeof value?.seconds === 'number') return new Date(value.seconds * 1000);
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }

  private col(): CollectionReference<BidInboxItem> {
    return collection(this.fs, 'bidInbox') as CollectionReference<BidInboxItem>;
  }

  /** Stream of inbox items for the list */
inbox$(): Observable<BidInboxItem[]> {
  const q = query(this.col(), orderBy('updatedAt', 'desc'));
  return (collectionData(q, { idField: 'id' }) as Observable<BidInboxItem[]>).pipe(
    map((rows) => {
      rows = (rows ?? [])
        // Keep Declined hidden from the main list
        .filter((r: any) => (r as any)?.status !== 'Declined')
        // Keep Trash hidden from the main list
        .filter((r: any) => !((r as any)?.deleted === true));
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      return rows.map((r) => {
        const dateReceived = this.toJsDate((r as any).dateReceived);
        const bidDueDate = this.toJsDate((r as any).bidDueDate);
        let isOverdue = false;
        let daysPending: number | null = null;

        if (bidDueDate) {
          const d = new Date(bidDueDate);
          d.setHours(0, 0, 0, 0);
          isOverdue = d < today;

          // Days remaining (0 = due today). Negative means overdue.
          const diffMs = d.getTime() - today.getTime();
          daysPending = Math.ceil(diffMs / 86400000);
        }

        return {
          ...r,
          client: r.client ?? '',
          projectName: r.projectName ?? '',
          priority: ((r as any).priority ?? 'normal') as BidPriority,
          createdByLabel: r.createdByLabel ?? (r.createdBy ? r.createdBy : '—'),
        createdByEmail: (this.auth.currentUser?.email ?? undefined),
          dateReceived,
          bidDueDate,
          isOverdue,
          daysPending,
        };
      });
    })
  );
}
/** Stream of soft-deleted inbox items (Trash) */
trash$(): Observable<BidInboxItem[]> {
  // We order by updatedAt to avoid requiring extra composite indexes.
  // UI will display deletedAt if present.
  const q = query(this.col(), orderBy('updatedAt', 'desc'));
  return (collectionData(q, { idField: 'id' }) as Observable<BidInboxItem[]>).pipe(
    map((rows) => (rows ?? []).filter((r: any) => (r as any)?.deleted === true))
  );
}


  
/** Mark an incoming request as converted into a formal Bid. */
async markConverted(incoming: BidInboxItem, bidId: string): Promise<void> {
  if (!incoming?.id) throw new Error('Incoming item is missing id.');
  await updateDoc(doc(this.fs, `bidInbox/${incoming.id}`) as DocumentReference, {
    status: 'Assigned',
    bidId,
    updatedAt: serverTimestamp(),
    updatedBy: this.auth.currentUser?.uid ?? null,
    updatedByLabel: this.auth.currentUser?.displayName ?? this.auth.currentUser?.email ?? 'unknown',
  } as any);
}

/** Duplicate detection WITHOUT composite index: query by clientNormalized then filter projectNormalized in-memory */
  async findDuplicate(client: string, projectName: string): Promise<BidInboxItem | null> {
    const c = norm(client);
    const p = norm(projectName);
    if (!c || !p) return null;

    const q = query(this.col(), where('clientNormalized', '==', c));
    const snap = await getDocs(q);
    const match = snap.docs
      .map((d) => ({ id: d.id, ...(d.data() as any) } as BidInboxItem))
      .find((row) => row.projectNormalized === p);
    return match ?? null;
  }

  async createIncoming(payload: Omit<BidInboxItem, 'id' | 'clientNormalized' | 'projectNormalized' | 'status' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy'>): Promise<DocumentReference<BidInboxItem>> {
    const user = this.auth.currentUser;
    const createdByLabel = user?.displayName ?? user?.email ?? 'unknown';
    const docPayload: BidInboxItem = {
      client: payload.client?.trim() ?? '',
      projectName: payload.projectName?.trim() ?? '',
      contactName: payload.contactName?.trim() ?? '',
      contactEmail: payload.contactEmail?.trim() ?? '',
      contactPhone: payload.contactPhone?.trim() ?? '',
      dateReceived: payload.dateReceived ?? null,
      bidDueDate: payload.bidDueDate ?? null,
      source: payload.source ?? 'email',
      priority: (((payload as any).priority ?? 'normal') as BidPriority),
      pendingReason: (payload as any).pendingReason?.toString().trim() || 'Missing info',
      jobsiteAddress: (() => {
        const raw = ((payload as any).jobsiteAddress ?? (payload as any).jobsiteAddressFull ?? '').toString().trim();
        if (!raw) return null;
        return {
          full: raw,
          loadedAt: serverTimestamp(),
          loadedByUid: user?.uid ?? null,
          loadedByLabel: createdByLabel,
        };
      })(),
      status: 'Incoming',
      clientNormalized: norm(payload.client),
      projectNormalized: norm(payload.projectName),
      updatesCount: 0,
      createdBy: user?.uid ?? null,
        createdByEmail: (this.auth.currentUser?.email ?? undefined),
      createdByLabel,
      createdAt: serverTimestamp(),
      updatedBy: user?.uid ?? null,
      updatedByLabel: createdByLabel,
      updatedAt: serverTimestamp(),
    };
    return addDoc(this.col(), docPayload);
  }

  /** Apply an update ("U1, U2...") to an existing INCOMING request. Requires reason. */
  async addIncomingUpdate(existing: BidInboxItem, patch: Partial<BidInboxItem>, reason: string, note?: string): Promise<void> {
    const user = this.auth.currentUser;
    const editedByLabel = user?.displayName ?? user?.email ?? 'unknown';
    if (!reason || !reason.trim()) throw new Error('Reason is required for updates.');
    if (!existing?.id) throw new Error('Missing existing record id.');

    // Build "after" to compute diff (only on a safe subset)
    const before = {
      bidDueDate: existing.bidDueDate ?? null,
      contactName: existing.contactName ?? '',
      contactEmail: existing.contactEmail ?? '',
      contactPhone: existing.contactPhone ?? '',
      source: existing.source ?? '',
      priority: ((existing as any).priority ?? 'normal'),
      pendingReason: existing.pendingReason ?? '',
    };
    const after = {
      ...before,
      ...(patch.bidDueDate !== undefined ? { bidDueDate: patch.bidDueDate } : {}),
      ...(patch.contactName !== undefined ? { contactName: patch.contactName } : {}),
      ...(patch.contactEmail !== undefined ? { contactEmail: patch.contactEmail } : {}),
      ...(patch.contactPhone !== undefined ? { contactPhone: patch.contactPhone } : {}),
      ...(patch.source !== undefined ? { source: patch.source } : {}),
      ...( (patch as any).priority !== undefined ? { priority: (patch as any).priority } : {}),
      ...(patch.pendingReason !== undefined ? { pendingReason: patch.pendingReason } : {}),
    };
    const changes = diffObject(before, after);

    // Update main document (keep client/project immutable here)
    const ref = doc(this.fs, 'bidInbox', existing.id) as DocumentReference<BidInboxItem>;
    const nextCount = (existing.updatesCount ?? 0) + 1;
    await updateDoc(ref as any, {
      ...patch,
      updatesCount: nextCount,
      updatedBy: user?.uid ?? null,
      updatedByLabel: editedByLabel,
      updatedAt: serverTimestamp(),
    } as any);

    // Write update entry in a subcollection
    const updatesCol = collection(this.fs, `bidInbox/${existing.id}/updates`) as CollectionReference<BidInboxUpdateEntry>;
    await addDoc(updatesCol, {
      editedBy: user?.uid ?? 'unknown',
      editedByLabel,
      editedAt: serverTimestamp(),
      reason: reason.trim(),
      note: note?.trim() || undefined,
      changes,
    } as any);
  }

  /**
   * TEMP (no users yet): assign an incoming request by free-text name.
   * Uses a transaction to prevent accidental overwrites.
   */
  async assignByName(incomingId: string, assignedToName: string, opts?: { forceReassign?: boolean; assignedByName?: string }): Promise<void> {
    const id = (incomingId ?? '').toString().trim();
    const name = (assignedToName ?? '').toString().trim();
    if (!id) throw new Error('Missing incoming id');
    if (!name) throw new Error('Assignee name is required');

    const force = !!opts?.forceReassign;
    const assignedByName = (opts?.assignedByName ?? '').toString().trim() || null;
    const ref = doc(this.fs, 'bidInbox', id) as DocumentReference<BidInboxItem>;

    await runTransaction(this.fs, async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists()) throw new Error('Incoming bid not found');
      const cur = snap.data() as any;
      const already = (cur?.assignedToName ?? '').toString().trim();
      if (already && !force) {
        // Encode current assignee so the UI can show a friendly confirm.
        throw new Error(`ALREADY_ASSIGNED:${already}`);
      }

      tx.update(ref as any, {
        assignedToName: name,
        assignedAt: serverTimestamp(),
        assignedByName,
        status: 'Assigned',
        updatedAt: serverTimestamp(),
      });
    });
  }

  /** Remove assignment (admin-only in UI for now). */
  async unassign(incomingId: string): Promise<void> {
    const id = (incomingId ?? '').toString().trim();
    if (!id) throw new Error('Missing incoming id');
    const ref = doc(this.fs, 'bidInbox', id) as DocumentReference<BidInboxItem>;
    await updateDoc(ref as any, {
      assignedToName: null,
      assignedAt: null,
      assignedByName: null,
      status: 'Incoming',
      updatedAt: serverTimestamp(),
    });
  }

  /** Decline (soft-remove) an incoming item with justification + audit. */
  async decline(incomingId: string, reason: string): Promise<void> {
    const id = (incomingId ?? '').toString().trim();
    if (!id) throw new Error('Missing incoming id');

    const why = (reason ?? '').toString().trim();
    if (!why) throw new Error('Justification is required');

    const ref = doc(this.fs, 'bidInbox', id) as DocumentReference<BidInboxItem>;
    const uid = this.auth.currentUser?.uid ?? null;
    const email = (this.auth.currentUser?.email ?? null) as any;

    await updateDoc(ref as any, {
      status: 'Declined',
      declinedReason: why,
      declinedAt: serverTimestamp(),
      declinedByUid: uid,
      declinedByEmail: email,
      updatedAt: serverTimestamp(),
    });
  }

  /** Move an incoming item to Trash (soft delete) with justification + audit. */
  async moveToTrash(incomingId: string, reason: string): Promise<void> {
    const id = (incomingId ?? '').toString().trim();
    if (!id) throw new Error('Missing incoming id');

    const why = (reason ?? '').toString().trim();
    if (!why) throw new Error('Justification is required');

    const ref = doc(this.fs, 'bidInbox', id) as DocumentReference<BidInboxItem>;
    const uid = this.auth.currentUser?.uid ?? null;
    const email = (this.auth.currentUser?.email ?? null) as any;

    await updateDoc(ref as any, {
      deleted: true,
      deletedAt: serverTimestamp(),
      deleteReason: why,
      deletedByUid: uid,
      deletedByEmail: email,
      updatedAt: serverTimestamp(),
    });
  }
}