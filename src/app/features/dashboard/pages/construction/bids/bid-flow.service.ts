import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  collection,
  doc,
  runTransaction,
  serverTimestamp,
  getDoc,
  collectionData,
  docData,
  updateDoc,
  deleteField,
  setDoc,
} from '@angular/fire/firestore';

import { Storage, ref, uploadBytes, uploadBytesResumable, getDownloadURL } from '@angular/fire/storage';
import { Auth } from '@angular/fire/auth';
import { DriveFunctionsService } from '@app/core/services/drive-functions.service';
import { BidsSettingsService } from '@app/core/services/bids-settings.service';
import { Observable, map, switchMap, firstValueFrom, take } from 'rxjs';

export type PartidaCategory =
  | 'labor'
  | 'equipment'
  | 'materials'
  | 'consumables'
  | 'rentals'
  | 'subcontracts'
  | 'perDiem'
  | 'overhead'
  | 'profitMarkup'
  | 'other';

const EMPTY_BREAKDOWN = {
  labor: 0,
  equipment: 0,
  materials: 0,
  consumables: 0,
  rentals: 0,
  subcontracts: 0,
  perDiem: 0,
  overhead: 0,
  profitMarkup: 0,
  other: 0,
};

type BidVersionStatus = 'draft' | 'locked' | 'delivered';

function versionIdFromNumber(n: number): string {
  const nn = Math.max(1, Math.floor(Number(n) || 1));
  return `v${nn}`;
}

function nowTs(): any {
  return serverTimestamp();
}

function sumBreakdown(b: any): number {
  return Object.values(b || {}).reduce((a: number, v: any) => a + Number(v ?? 0), 0);
}

export interface PartidaLine {
  id?: string;
  category: PartidaCategory;
  description?: string;
  amount: number;
  hours?: number;
  createdAt?: any;
  createdByUid?: string;
  createdByEmail?: string;
}

@Injectable({ providedIn: 'root' })
export class BidFlowService {
  private fs = inject(Firestore);
  private storage = inject(Storage);
  private auth = inject(Auth);
  private driveFns = inject(DriveFunctionsService);
  private bidsSettings = inject(BidsSettingsService);

  /** Utility: enforce a hard timeout for operations that can hang (offline / stalled requests). */
  private withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
    let t: any;
    const timeout = new Promise<never>((_, reject) => {
      t = setTimeout(() => reject(new Error(message)), ms);
    });
    return Promise.race([promise.finally(() => clearTimeout(t)), timeout]);
  }

  /**
   * Convert an Incoming Bid (bidInbox/{id}) into a formal Bid (bids/{id}) atomically.
   * - Prevents duplicates (if already converted, returns existing bidId)
   * - Copies key fields (client, project, due date, received date)
   * - Initializes accounting breakdown/totals
   * - Creates revision #1 snapshot
   */
  async convertIncomingToBid(incomingId: string): Promise<string> {
    const incomingRef = doc(this.fs, 'bidInbox', incomingId);
    const bidderUid = this.auth.currentUser?.uid;
    if (!bidderUid) throw new Error('Not signed in');
    const bidsCol = collection(this.fs, 'bids');

    return runTransaction(this.fs, async (tx) => {
      const incSnap = await tx.get(incomingRef);
      if (!incSnap.exists()) throw new Error('Incoming bid not found');

      const inc: any = incSnap.data();

      // If already converted, return existing bidId
      if (inc.status === 'Assigned' && inc.bidId) return inc.bidId;

      const newBidRef = doc(bidsCol); // id generated without write
      const bidId = newBidRef.id;

      const receivedAt = inc.dateReceived ?? inc.receivedAt ?? inc.createdAt ?? null;
      const bidDueAt = inc.bidDueDate ?? inc.bidDueAt ?? null;

      const folderPath = inc.folderPath ?? inc.folder ?? '';
      const jobsiteFull = String(
        inc.jobsiteAddress?.full ??
        inc.jobsiteAddressFull ??
        inc.jobsiteAddress ??
        inc.siteAddress ??
        inc.jobAddress ??
        inc.location ??
        ''
      ).trim();

      const bidDoc: any = {
        incomingId,

        title: inc.projectName || inc.title || 'New Bid',
        clientName: inc.client || inc.clientName || '',
        projectName: inc.projectName || '',

        source: inc.source ?? 'incoming',
        folder: folderPath,
        folderPath,

        jobsiteAddress: jobsiteFull
          ? {
            full: jobsiteFull,
            loadedAt: serverTimestamp(),
            loadedByUid: bidderUid,

          }
          : null,
        jobsiteAddressFull: jobsiteFull,

        contactName: inc.contactName ?? inc.contact ?? '',
        contactEmail: inc.contactEmail ?? inc.email ?? '',
        contactPhone: inc.contactPhone ?? inc.phone ?? '',

        notes: inc.notes ?? '',
        attachmentLinks: inc.attachmentLinks ?? [],

        receivedAt,
        bidDueAt,

        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        convertedAt: serverTimestamp(),

        status: 'Delivered',
        deliveredAt: serverTimestamp(),
        deliveredByUid: bidderUid,
        deliveredByEmail: (this.auth.currentUser?.email ?? undefined),

        bidderUid,

        // Follow-Up tracking (CRM)
        followUpCount: 0,
        lastFollowUpAt: null,
        nextFollowUpAt: null,



        // Who created the Incoming (original creator)
        createdByUid: (inc?.createdByUid ?? inc?.createdById ?? inc?.createdByUserId ?? null),
        createdBy: String(inc?.createdByEmail ?? inc?.createdByLabel ?? inc?.createdBy ?? '').trim(),
        createdByEmail: String(inc?.createdByEmail ?? inc?.createdByLabel ?? inc?.createdBy ?? '').trim(),

        // Estimator / Converter (this version: Save & Convert = Delivered)
        convertedByUid: bidderUid,
        convertedByEmail: String(this.auth.currentUser?.email ?? '').trim(),

        breakdown: { ...EMPTY_BREAKDOWN },
        calculatedTotal: 0,

        officialPdfCurrent: null,
        officialPdfUpdatedAt: null,

        // Legacy revision counter (activity log)
        revCounter: 1,

        // New versioning model
        versionCount: 1,
        draftVersionId: 'v1',
        currentVersionId: null,
      };

      // Write bid
      tx.set(newBidRef, bidDoc);

      // Update incoming
      tx.update(incomingRef, {
        status: 'Assigned',
        bidId,
        convertedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // Create revision #1
      const revRef = doc(collection(newBidRef, 'revisions'));
      tx.set(revRef, {
        revNumber: 1,
        createdAt: serverTimestamp(),
        createdByUid: bidderUid,

        createdByEmail: (this.auth.currentUser?.email ?? undefined),
        changeType: 'create',
        note: 'Converted from Incoming Bids',
        snapshot: {
          status: bidDoc.status,
          bidDueAt: bidDoc.bidDueAt ?? null,
          calculatedTotal: bidDoc.calculatedTotal,
          breakdown: bidDoc.breakdown,
          pdfCurrent: bidDoc.officialPdfCurrent,
        },
      });

      // Create Version v1 (draft) as the only editable workspace
      const v1Ref = doc(collection(newBidRef, 'versions'), 'v1');
      tx.set(v1Ref, {
        versionNumber: 1,
        status: 'draft' as BidVersionStatus,
        isSelected: true,
        createdAt: nowTs(),
        createdByUid: bidderUid,

        createdByEmail: (this.auth.currentUser?.email ?? undefined),
        breakdown: { ...bidDoc.breakdown },
        calculatedTotal: bidDoc.calculatedTotal,
        manualTotal: null,
        pdf: null,
      });

      return bidId;
    });
  }

  /**
   * Create a *draft* bid for an Incoming Bid WITHOUT removing it from the Incoming list.
   *
   * Why: opening the Bid editor should not instantly convert/remove the row.
   * The row should only move to "Bids Created" after the user presses Save & Convert
   * (and total > 0).
   */
  async createDraftBidFromIncoming(incomingId: string): Promise<string> {
    const incomingRef = doc(this.fs, 'bidInbox', incomingId);
    const bidderUid = this.auth.currentUser?.uid;
    if (!bidderUid) throw new Error('Not signed in');
    const bidsCol = collection(this.fs, 'bids');

    const bidId = await runTransaction(this.fs, async (tx) => {
      const incSnap = await tx.get(incomingRef);
      if (!incSnap.exists()) throw new Error('Incoming bid not found');
      const inc: any = incSnap.data();

      // Already converted
      if (inc.status === 'Assigned' && inc.bidId) return inc.bidId;

      // Draft already exists
      if (inc.draftBidId) return String(inc.draftBidId);

      const newBidRef = doc(bidsCol);
      const bidId = newBidRef.id;

      const receivedAt = inc.dateReceived ?? inc.receivedAt ?? inc.createdAt ?? null;
      const bidDueAt = inc.bidDueDate ?? inc.bidDueAt ?? null;

      const folderPath = inc.folderPath ?? inc.folder ?? '';
      const jobsiteFull = String(
        inc.jobsiteAddress?.full ??
        inc.jobsiteAddressFull ??
        inc.jobsiteAddress ??
        inc.siteAddress ??
        inc.jobAddress ??
        inc.location ??
        ''
      ).trim();

      const bidDoc: any = {
        incomingId,

        title: inc.projectName || inc.title || 'New Bid',
        clientName: inc.client || inc.clientName || '',
        projectName: inc.projectName || '',

        source: inc.source ?? 'incoming',
        folder: inc.folderPath ?? inc.folder ?? '',
        notes: inc.notes ?? '',
        attachmentLinks: inc.attachmentLinks ?? [],

        receivedAt,
        bidDueAt,

        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        convertedAt: null,

        status: 'draft',
        bidderUid,

        // Follow-Up tracking (CRM)
        followUpCount: 0,
        lastFollowUpAt: null,
        nextFollowUpAt: null,



        breakdown: { ...EMPTY_BREAKDOWN },
        calculatedTotal: 0,

        officialPdfCurrent: null,
        officialPdfUpdatedAt: null,

        // Legacy revision counter (activity log)
        revCounter: 1,

        // New versioning model
        versionCount: 1,
        draftVersionId: 'v1',
        currentVersionId: null,
        isDraft: true,
      };

      // Create draft bid
      tx.set(newBidRef, bidDoc);

      // Link the draft to the incoming row but keep it in Incoming (no bidId / no convertedAt)
      tx.update(incomingRef, {
        draftBidId: bidId,
        draftCreatedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // Revision #1 (draft)
      const revRef = doc(collection(newBidRef, 'revisions'));
      tx.set(revRef, {
        revNumber: 1,
        createdAt: serverTimestamp(),
        createdByUid: bidderUid,

        createdByEmail: (this.auth.currentUser?.email ?? undefined),
        changeType: 'draft-create',
        note: 'Draft created from Incoming Bids (not converted yet)',
        snapshot: {
          status: bidDoc.status,
          bidDueAt: bidDoc.bidDueAt ?? null,
          calculatedTotal: bidDoc.calculatedTotal,
          breakdown: bidDoc.breakdown,
          pdfCurrent: bidDoc.officialPdfCurrent,
        },
      });

      // Version v1 (draft)
      const v1Ref = doc(collection(newBidRef, 'versions'), 'v1');
      tx.set(v1Ref, {
        versionNumber: 1,
        status: 'draft' as BidVersionStatus,
        createdAt: nowTs(),
        createdByUid: bidderUid,

        createdByEmail: (this.auth.currentUser?.email ?? undefined),
        breakdown: { ...bidDoc.breakdown },
        calculatedTotal: bidDoc.calculatedTotal,
        manualTotal: null,
        pdf: null,
      });

      return bidId;
    });


    // After Firestore transaction succeeds, attempt to create/reuse the Drive folder structure.
    // This is best-effort: if Drive fails, we keep the Bid draft and show a controlled error elsewhere.
    try {
      const incomingRef = doc(this.fs, 'bidInbox', incomingId);
      const incomingSnap = await getDoc(incomingRef);
      const inc: any = incomingSnap.exists() ? incomingSnap.data() : null;

      const settings = await firstValueFrom(this.bidsSettings.watch$().pipe(take(1)));
      const enabled = !!settings?.enabled;
      const rootFolderId = (settings?.rootFolderId ?? '').toString().trim();

      if (enabled && rootFolderId && inc) {
        const clientName = (inc.client ?? '').toString().trim();
        const projectName = (inc.projectName ?? '').toString().trim();

        // Use dateReceived if present; fall back to now (server timestamps are not available client-side).
        const receivedAt =
          (inc.dateReceived?.toDate ? inc.dateReceived.toDate() : inc.dateReceived) ?? new Date();

        if (clientName && projectName) {
          const res = await this.driveFns.createBidFolder({
            rootFolderId,
            clientName,
            projectName,
            receivedAt: (receivedAt instanceof Date) ? receivedAt.getTime() : receivedAt,
            template: Array.isArray(settings?.subfolderTemplate) ? settings!.subfolderTemplate! : undefined,
          });

          if (res?.success && res.projectFolderId) {
            await updateDoc(doc(this.fs, 'bids', bidId), {
              drive: {
                year: res.year ?? undefined,
                yearFolderId: res.yearFolderId ?? undefined,
                clientFolderId: res.clientFolderId ?? undefined,
                projectFolderId: res.projectFolderId ?? undefined,
                rootFolderId,
                updatedAt: serverTimestamp(),
              },
            });

            // Also keep a reference in the Incoming row (useful for UI "Open Drive" later).
            await updateDoc(incomingRef, {
              drive: {
                year: res.year ?? undefined,
                yearFolderId: res.yearFolderId ?? undefined,
                clientFolderId: res.clientFolderId ?? undefined,
                projectFolderId: res.projectFolderId ?? undefined,
                rootFolderId,
                updatedAt: serverTimestamp(),
              },
            });
          }
        }
      }
    } catch (err) {
      // swallow Drive errors (best-effort). Use console to help debugging during rollout.
      console.warn('Drive folder create/reuse failed (non-blocking):', err);
    }

    return bidId;

  }

  /**
   * Create a new editable Version (draft) with one click.
   * Rule: only one draft exists at a time.
   * Behavior:
   * - If a draft exists, we lock it and make it current.
   * - Then we create the next version as the new draft, copying breakdown from the current version.
   */
  async createNewVersion(bidId: string, note: string = 'New version'): Promise<string> {
    const uid = this.auth.currentUser?.uid;
    if (!uid) throw new Error('Not signed in');

    const bidRef = doc(this.fs, 'bids', bidId);
    return runTransaction(this.fs, async (tx) => {
      const bidSnap = await tx.get(bidRef);
      if (!bidSnap.exists()) throw new Error('Bid not found');
      const bid: any = bidSnap.data();



      // Guardrails: do not allow v2+ before the bid is converted (v1 must be the first official version).
      if (bid?.isDraft || !bid?.convertedAt) {
        throw new Error('Cannot create a new version until the bid is converted (v1 must be created first).');
      }
      const currentDraftId = String(bid?.draftVersionId ?? '').trim();
      const currentVersionId = String(bid?.currentVersionId ?? '').trim();
      const versionCount = Math.max(1, Number(bid?.versionCount ?? 1) || 1);

      // Determine base version to copy from
      const baseId = currentDraftId || currentVersionId || 'v1';
      const baseRef = doc(collection(bidRef, 'versions'), baseId);
      const baseSnap = await tx.get(baseRef);
      const base: any = baseSnap.exists() ? baseSnap.data() : null;
      // NOTE:
      // A new draft version should start clean.
      // We DO NOT copy totals/breakdown from the previous version because that makes
      // the new version look "already estimated" even when it has no line items/PDF yet.
      // Capture previous totals for audit/logging, but DO NOT copy them into the new draft.
      const prevBreakdown = base?.breakdown ?? bid?.breakdown ?? { ...EMPTY_BREAKDOWN };
      const prevTotal = Number(base?.calculatedTotal ?? bid?.calculatedTotal ?? sumBreakdown(prevBreakdown)) || 0;

      // Clean state for the new draft version.
      const baseBreakdown = { ...EMPTY_BREAKDOWN };
      const baseTotal = 0;

      // If a draft exists, lock it (becomes current)
      if (currentDraftId) {
        tx.update(doc(collection(bidRef, 'versions'), currentDraftId), {
          status: 'locked' as BidVersionStatus,
          lockedAt: nowTs(),
          lockedByUid: uid,
        });
        tx.update(bidRef, {
          currentVersionId: currentDraftId,
          draftVersionId: null,
        });
      }

      const nextNumber = versionCount + 1;
      const nextId = versionIdFromNumber(nextNumber);
      const nextRef = doc(collection(bidRef, 'versions'), nextId);
      const cleanNote = String(note ?? '').trim().slice(0, 120);

      tx.set(nextRef, {
        versionNumber: nextNumber,
        status: 'draft' as BidVersionStatus,
        createdAt: nowTs(),
        createdByUid: uid,
        createdByEmail: (this.auth.currentUser?.email ?? undefined),
        // New draft starts clean (no inherited totals).
        note: cleanNote,
        breakdown: { ...EMPTY_BREAKDOWN },
        calculatedTotal: 0,
        manualTotal: null,
        pdf: null,
      });

      tx.update(bidRef, {
        versionCount: nextNumber,
        draftVersionId: nextId,
        updatedAt: nowTs(),
      });

      // Also create an activity log entry (legacy 'revisions') so you don't lose traceability
      const nextRev = Math.max(1, Number(bid?.revCounter ?? 1) || 1) + 1;
      tx.update(bidRef, { revCounter: nextRev });
      const revRef = doc(collection(bidRef, 'revisions'));
      tx.set(revRef, {
        revNumber: nextRev,
        createdAt: nowTs(),
        createdByUid: uid,
        createdByEmail: (this.auth.currentUser?.email ?? undefined),
        changeType: 'version',
        note: `Created ${nextId}: ${cleanNote}`,
        snapshot: {
          // Snapshot of what we were working with before starting the new clean draft.
          calculatedTotal: prevTotal,
          breakdown: prevBreakdown,
          draftVersionId: nextId,
          currentVersionId: currentDraftId || currentVersionId || null,
        },
      });

      return nextId;
    });
  }

  /**
   * Finalize conversion: move Incoming → Bids Created.
   * This sets bidInbox.bidId + convertedAt and also sets bids.convertedAt.
   */
  async finalizeDraftConversion(incomingId: string, bidId: string): Promise<void> {
    const incomingRef = doc(this.fs, 'bidInbox', incomingId);
    const bidRef = doc(this.fs, 'bids', bidId);
    const bidderUid = this.auth.currentUser?.uid;
    if (!bidderUid) throw new Error('Not signed in');

    await runTransaction(this.fs, async (tx) => {
      const incSnap = await tx.get(incomingRef);
      if (!incSnap.exists()) throw new Error('Incoming bid not found');
      const inc: any = incSnap.data();

      const bidSnap = await tx.get(bidRef);
      if (!bidSnap.exists()) throw new Error('Bid not found');
      const bid: any = bidSnap.data();

      // Require an official PDF on the current draft version before conversion.
      const draftVid = String(bid?.draftVersionId ?? '').trim() || 'v1';
      const draftVRef = doc(collection(bidRef, 'versions'), draftVid);
      const draftVSnap = await tx.get(draftVRef);
      const draftV: any = draftVSnap.exists() ? draftVSnap.data() : null;
      const pdfUrl = String(draftV?.pdf?.url ?? draftV?.pdf?.downloadUrl ?? draftV?.pdfUrl ?? '').trim();
      if (!pdfUrl) {
        throw new Error('Official PDF is required to convert this Incoming Bid into a Bid.');
      }

      // Already converted
      if (inc.status === 'Assigned' && inc.bidId) return;

      // Safety: ensure we are converting the linked draft (or a previously-created bid)
      const linked = String(inc.draftBidId ?? inc.bidId ?? '');
      if (linked && linked !== String(bidId)) {
        throw new Error('This Incoming Bid is linked to a different draft. Please refresh and try again.');
      }

      tx.update(bidRef, {
        convertedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        isDraft: false,

        // Temporary rule (per Yoanny): converting a Bid implies it was delivered
        status: 'Delivered',
        deliveredAt: serverTimestamp(),
        deliveredByUid: bidderUid,
        deliveredByEmail: (this.auth.currentUser?.email ?? undefined),
      });

      tx.update(incomingRef, {
        status: 'Assigned',
        bidId,
        convertedAt: serverTimestamp(),
        draftBidId: deleteField(),
        draftCreatedAt: deleteField(),
        updatedAt: serverTimestamp(),
      });

      // Revision snapshot marking conversion
      const nextRev = Number(bid.revCounter ?? 1) + 1;
      tx.update(bidRef, { revCounter: nextRev });
      const revRef = doc(collection(bidRef, 'revisions'));
      tx.set(revRef, {
        revNumber: nextRev,
        createdAt: serverTimestamp(),
        createdByUid: bidderUid,

        createdByEmail: (this.auth.currentUser?.email ?? undefined),
        changeType: 'convert',
        note: 'Converted from Incoming Bids',
        snapshot: {
          status: bid.status ?? 'draft',
          bidDueAt: bid.bidDueAt ?? null,
          calculatedTotal: bid.calculatedTotal ?? 0,
          breakdown: bid.breakdown ?? { ...EMPTY_BREAKDOWN },
          pdfCurrent: bid.officialPdfCurrent ?? null,
        },
      });
    });
  }


  /**
   * Upload Official PDF to Storage with versioning:
   * Storage path: bids/{bidId}/official/bid_v{version}.pdf
   *
   * NOTE: This uploads to Storage only. Linking it into Firestore (files + current + revision)
   * should be done next (we will wire this in the Bid details page).
   */
  async uploadOfficialPdfToStorage(bidId: string, version: number, file: File): Promise<string> {
    const path = `bids/${bidId}/official/bid_v${version}.pdf`;
    const storageRef = ref(this.storage, path);
    // Resumable upload + timeout so the UI never gets stuck in "Uploading..."
    await this.uploadWithTimeout(storageRef, file, 600_000);
    return path;
  }

  /**
   * Upload official bid PDF and return a download URL.
   * We store the downloadUrl in Firestore (officialPdfPath).
   */
  async uploadOfficialPdf(bidId: string, version: number, file: File): Promise<string> {
    const path = `bids/${bidId}/versions/v${version}/official.pdf`;
    const storageRef = ref(this.storage, path);
    // Resumable upload + timeout so the UI never gets stuck in "Uploading..."
    await this.uploadWithTimeout(storageRef, file, 600_000);
    // Also guard the download URL fetch (read rules / transient network issues can stall)
    return await this.getDownloadURLWithTimeout(storageRef, 30_000);
  }

  private getDownloadURLWithTimeout(storageRef: any, timeoutMs: number): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error('Could not finalize upload (download URL). Please try again.'));
      }, timeoutMs);

      getDownloadURL(storageRef)
        .then((url) => {
          clearTimeout(timer);
          resolve(url);
        })
        .catch((err) => {
          clearTimeout(timer);
          reject(err);
        });
    });
  }

  /**
   * Upload a file to Firebase Storage in a resumable way with a hard timeout.
   * This prevents the UI from getting stuck showing "Uploading..." indefinitely
   * if the network stalls or the request never resolves.
   */
  private uploadWithTimeout(storageRef: any, file: File, timeoutMs: number): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const task = uploadBytesResumable(storageRef, file, { contentType: file.type || 'application/pdf' });

      const timer = setTimeout(() => {
        try {
          task.cancel();
        } catch {
          // ignore
        }
        reject(new Error('Upload timed out. Please check your internet connection and try again.'));
      }, timeoutMs);

      task.on(
        'state_changed',
        // progress handler (logs percent)
        (snapshot) => {
          try {
            const pct = snapshot.totalBytes ? Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100) : 0;
            // eslint-disable-next-line no-console
            console.log('[PDF upload]', pct + '%');
          } catch {
            // ignore
          }
        },
        (err) => {
          clearTimeout(timer);
          reject(err);
        },
        () => {
          clearTimeout(timer);
          resolve();
        }
      );
    });
  }

  /** Stream partidas for the current draft version (one doc per category). */
  partidasDraft$(bidId: string): Observable<PartidaLine[]> {
    const bidRef = doc(this.fs, 'bids', bidId);
    return (docData(bidRef) as Observable<any>).pipe(
      map((bid) => String(bid?.draftVersionId ?? 'v1')),
      // collectionData needs a ref; we map into a stream via a small helper
      // (AngularFire doesn't support collectionData inside map cleanly with types, but runtime is fine.)
      // We'll keep this as a separate method used by the component (it uses its own query anyway).
      map(() => [])
    );
  }

  /** Stream a single bid doc (for totals / pdf path rendering). */
  bid$(bidId: string): Observable<any> {
    const bidRef = doc(this.fs, 'bids', bidId);
    return docData(bidRef, { idField: 'id' }) as Observable<any>;
  }

  /**
   * Stream partidas for the current *draft version*.
   * Data model: one document per category under:
   *   bids/{bidId}/versions/{draftVersionId}/partidas/{category}
   * This makes duplicates (e.g., two "equipment") impossible.
   */
  partidas$(bidId: string): Observable<PartidaLine[]> {
    const bidRef = doc(this.fs, 'bids', bidId);
    return (docData(bidRef) as Observable<any>).pipe(
      map((bid) => String(bid?.draftVersionId ?? 'v1')),
      switchMap((draftVersionId) => {
        const partidasCol = collection(this.fs, `bids/${bidId}/versions/${draftVersionId}/partidas`);
        return collectionData(partidasCol, { idField: 'id' }) as Observable<any[]>;
      }),
      map((docs) =>
        (docs ?? []).map((d: any) => ({
          id: d?.id,
          category: d?.category ?? d?.id,
          description: d?.description ?? '',
          amount: Number(d?.amount ?? 0),
          hours: d?.hours != null ? Number(d?.hours) : undefined,
        }))
      )
    );
  }

  /** Sum of partidas amounts (fallback if breakdown isn't present yet). */
  partidasSum$(bidId: string): Observable<number> {
    return this.partidas$(bidId).pipe(
      map((lines) =>
        (lines ?? []).reduce((acc: number, l: any) => acc + Number(l?.amount ?? 0), 0)
      )
    );
  }

  /**
   * Upsert a category amount into the current *draft version*.
   * This enforces: one category only (no duplicates).
   */
  async addPartida(bidId: string, input: { category: PartidaCategory; description?: string; amount: number; hours?: number }): Promise<void> {
    const uid = this.auth.currentUser?.uid;
    if (!uid) throw new Error('Not signed in');

    // Firestore does NOT allow undefined field values. Also, Labor lines require hours.
    if (input.category === 'labor') {
      const hrs = Number(input.hours);
      if (!Number.isFinite(hrs) || hrs <= 0) {
        throw new Error('Hours are required for Labor and must be > 0');
      }
    }

    const bidRef = doc(this.fs, 'bids', bidId);
    const versionsCol = collection(this.fs, `bids/${bidId}/versions`);

    await runTransaction(this.fs, async (tx) => {
      const bidSnap = await tx.get(bidRef);
      if (!bidSnap.exists()) throw new Error('Bid not found');
      const bid: any = bidSnap.data();

      const draftVersionId = String(bid?.draftVersionId ?? '').trim();
      if (!draftVersionId) {
        throw new Error("No draft version exists. Click 'Create New Version' before editing partidas.");
      }

      const vRef = doc(versionsCol, draftVersionId);
      const vSnap = await tx.get(vRef);
      if (!vSnap.exists()) throw new Error('Draft version not found');
      const ver: any = vSnap.data();
      if (String(ver?.status ?? '') !== 'draft') {
        throw new Error('This version is read-only. Create a new version to edit.');
      }

      const amount = Number(input.amount ?? 0);
      const cat = input.category;

      // 1) upsert one doc per category (no duplicates possible)
      const pRef = doc(collection(vRef, 'partidas'), cat);
      const prevSnap = await tx.get(pRef);
      const prev: any = prevSnap.exists() ? prevSnap.data() : null;
      const prevAmount = Number(prev?.amount ?? 0) || 0;

      const partida: any = {
        category: cat,
        description: (input.description ?? '').trim(),
        amount,
        updatedAt: nowTs(),
        updatedByUid: uid,
        updatedByEmail: (this.auth.currentUser?.email ?? undefined),
      };
      if (!prevSnap.exists()) {
        partida.createdAt = nowTs();
        partida.createdByUid = uid;
        partida.createdByEmail = (this.auth.currentUser?.email ?? undefined);
      }
      if (cat === 'labor') partida.hours = Number(input.hours);
      tx.set(pRef, partida, { merge: true } as any);

      // 2) update breakdown by replacing this category amount (not incrementing)
      const current = ver.breakdown ?? bid.breakdown ?? { ...EMPTY_BREAKDOWN };
      const next = { ...current, [cat]: amount };
      const nextCalc = sumBreakdown(next);

      tx.update(vRef, {
        breakdown: next,
        calculatedTotal: nextCalc,
        updatedAt: nowTs(),
        updatedByUid: uid,
      });

      tx.update(bidRef, {
        breakdown: next,
        calculatedTotal: nextCalc,
        updatedAt: serverTimestamp(),
      });

      // 3) revision
      const nextRev = Number(bid.revCounter ?? 1) + 1;
      tx.update(bidRef, { revCounter: nextRev });
      const revRef = doc(collection(bidRef, 'revisions'));
      tx.set(revRef, {
        revNumber: nextRev,
        createdAt: serverTimestamp(),
        createdByUid: uid,
        createdByEmail: (this.auth.currentUser?.email ?? undefined),
        changeType: 'partidas',
        note: `${prevSnap.exists() ? 'Updated' : 'Added'} partida (${cat}) $${amount}`,
        snapshot: {
          status: bid.status ?? 'draft',
          bidDueAt: bid.bidDueAt ?? null,
          calculatedTotal: nextCalc,
          breakdown: next,
          pdfCurrent: bid.officialPdfCurrent ?? null,
          versionId: draftVersionId,
        },
      });
    });
  }

  /** Update official PDF path (download URL or storage path) for a bid. */
  async updateBidPdf(bidId: string, officialPdfPath: string): Promise<void> {
    const bidRef = doc(this.fs, 'bids', bidId);
    const safePath = (officialPdfPath ?? '').trim();
    if (!safePath) throw new Error('Official PDF URL/path is required');

    await updateDoc(bidRef, {
      officialPdfPath: safePath,
      updatedAt: serverTimestamp(),
    });
  }

  /**
   * Save the official PDF metadata under the current draft version.
   * Note: per your rules, a new PDF should be attached to a new version. The UI will enforce that.
   */
  async updateDraftVersionPdf(bidId: string, downloadUrl: string, fileName: string | null = null): Promise<void> {
    const uid = this.auth.currentUser?.uid;
    if (!uid) throw new Error('Not signed in');
    const bidRef = doc(this.fs, 'bids', bidId);

    await this.withTimeout(
      runTransaction(this.fs, async (tx) => {
        const bidSnap = await tx.get(bidRef);
        if (!bidSnap.exists()) throw new Error('Bid not found');
        const bid: any = bidSnap.data();

        const draftVersionId = String(bid?.draftVersionId ?? '').trim();
        if (!draftVersionId) {
          throw new Error("No draft version exists. Click 'Create New Version' before uploading a PDF.");
        }

        const vRef = doc(collection(bidRef, 'versions'), draftVersionId);
        const vSnap = await tx.get(vRef);
        if (!vSnap.exists()) throw new Error('Draft version not found');
        const ver: any = vSnap.data();
        if (String(ver?.status ?? '') !== 'draft') {
          throw new Error('This version is read-only. Create a new version to upload a PDF.');
        }

        tx.update(vRef, {
          pdf: {
            url: String(downloadUrl),
            fileName: fileName ? String(fileName) : null,
            uploadedAt: nowTs(),
            uploadedByUid: uid,
            uploadedByEmail: (this.auth.currentUser?.email ?? undefined),
          },
          updatedAt: nowTs(),
          updatedByUid: uid,
        });

        // NOTE: We intentionally do NOT write PDF pointers on the bid root.
        // PDFs are version-scoped: bids/{bidId}/versions/{versionId}/pdf
        // This prevents confusion and keeps history correct.
      }),
      20000,
      'Timed out saving PDF metadata to Firestore. Check your network/Firestore connection.',
    );
  }

  /** Convert a Firebase Storage path into a downloadable URL. */
  async resolveStoragePathToDownloadUrl(storagePath: string): Promise<string> {
    const p = String(storagePath ?? '').trim();
    if (!p) throw new Error('Storage path is required');
    const storageRef = ref(this.storage, p);
    return await this.withTimeout(
      getDownloadURL(storageRef),
      15000,
      'Timed out resolving storage path to download URL.',
    );
  }

  // (removed duplicate partidas$ and addPartidaAndRecalc; use partidas$ + addPartida above)
}
