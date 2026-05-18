import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  collection,
  addDoc,
  collectionData,
  doc,
  updateDoc,
  query,
  orderBy,
  CollectionReference,
  DocumentReference,
  serverTimestamp,
} from '@angular/fire/firestore';
import { Auth } from '@angular/fire/auth';
import { Observable } from 'rxjs';
import { Bid, BidAuditLogEntry, BidPriority, BidStatus } from '../models/bid.model';

/** Utility: remove undefined deeply (same idea as in ProjectService) */
function removeUndefinedDeep<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) return obj.map(removeUndefinedDeep) as any;
  if (typeof obj === 'object') {
    const out: any = {};
    for (const [k, v] of Object.entries(obj as any)) {
      if (v === undefined) continue;
      out[k] = removeUndefinedDeep(v);
    }
    return out;
  }
  return obj;
}

/** Utility: compute diff between before/after (shallow for v1) */
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
export class BidService {
  private firestore = inject(Firestore);
  private auth = inject(Auth);

  bids$(): Observable<Bid[]> {
    const col = collection(this.firestore, 'bids') as CollectionReference<Bid>;
    const q = query(col, orderBy('updatedAt', 'desc'));
    return collectionData(q, { idField: 'id' }) as Observable<Bid[]>;
  }

  async createBid(seed: Partial<Bid>): Promise<DocumentReference<Bid>> {
    const user = this.auth.currentUser;
    const col = collection(this.firestore, 'bids') as CollectionReference<Bid>;

    const payload = removeUndefinedDeep({
      bidNumber: seed.bidNumber ?? '',
      client: seed.client ?? '',
      projectName: seed.projectName ?? '',
      contactName: seed.contactName ?? '',
      contactPhone: seed.contactPhone ?? '',
      dateReceived: seed.dateReceived ?? null,
      dueDate: seed.dueDate ?? null,
      dateSent: seed.dateSent ?? null,
      status: (seed.status ?? 'Pending') as BidStatus,
      priority: (seed.priority ?? 'Medium') as BidPriority,
      amount: seed.amount ?? 0,
      totalAmount: seed.amount ?? 0,
      costs: seed.costs ?? {},
      linkedProjectId: seed.linkedProjectId ?? null,
      estimatorId: seed.estimatorId ?? null,
      estimatorName: seed.estimatorName ?? '',
      createdBy: user?.uid ?? null,
        createdByEmail: (this.auth.currentUser?.email ?? undefined),
      createdAt: serverTimestamp(),
      updatedBy: user?.uid ?? null,
      updatedAt: serverTimestamp(),
    }) as Bid;

    return addDoc(col, payload);
  }

  async updateBid(bidId: string, patch: Partial<Bid>, reason: string, before: Bid): Promise<void> {
    const user = this.auth.currentUser;
    if (!reason || !reason.trim()) throw new Error('Reason for modification is required.');

    const ref = doc(this.firestore, 'bids', bidId) as DocumentReference<Bid>;

    const after = { ...before, ...patch, updatedBy: user?.uid ?? null, updatedAt: '__SERVER__' };
    const changes = diffObject(before, after);

    const updatePayload = removeUndefinedDeep({
      ...(patch.amount !== undefined ? { totalAmount: patch.amount } : {}),
      ...patch,
      updatedBy: user?.uid ?? null,
      updatedAt: serverTimestamp(),
    }) as Partial<Bid>;

    await updateDoc(ref, updatePayload as any);

    // Audit log entry
    const auditCol = collection(this.firestore, `bids/${bidId}/auditLog`) as CollectionReference<BidAuditLogEntry>;
    const auditEntry = removeUndefinedDeep({
      bidId,
      editedBy: user?.uid ?? 'unknown',
      editedAt: serverTimestamp(),
      reason: reason.trim(),
      changes,
    }) as BidAuditLogEntry;

    await addDoc(auditCol, auditEntry);
  }
}
