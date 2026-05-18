import { Injectable } from '@angular/core';
import {
  Firestore,
  doc,
  collection,
  runTransaction,
  serverTimestamp,
} from '@angular/fire/firestore';

import { IncomingBid, BidDoc, PartidaCategory } from '../models/bids.models';
import { EMPTY_BREAKDOWN, addToBreakdown, sumBreakdown } from '../utils/bid-math';

/**
 * WorkTrace Bids Service (Firestore modular SDK)
 *
 * Collections:
 * - incomingBids/{incomingId}
 * - bids/{bidId}
 *   - partidas/{partidaId}
 *   - files/{fileId}
 *   - revisions/{revId}
 */
@Injectable({ providedIn: 'root' })
export class BidsService {
  constructor(private firestore: Firestore) {}

  /**
   * Convert incoming -> bid (atomic).
   * - Prevents duplicates: if already converted, returns existing bidId.
   * - Copies key fields from incoming into bid doc (snapshot-like header).
   * - Writes first revision snapshot (revNumber=1).
   */
  async convertIncomingToBid(incomingId: string, bidderUid: string): Promise<string> {
    const incomingRef = doc(this.firestore, 'incomingBids', incomingId);
    const bidsCol = collection(this.firestore, 'bids');

    const bidId = await runTransaction(this.firestore, async (tx) => {
      const incomingSnap = await tx.get(incomingRef);
      if (!incomingSnap.exists()) throw new Error('Incoming bid not found');

      const incoming = incomingSnap.data() as IncomingBid;

      // If already converted, return the existing bidId (no duplicates)
      if (incoming.status === 'bid_created' && incoming.bidId) {
        return incoming.bidId;
      }

      const newBidRef = doc(bidsCol); // generates id
      const newBidId = newBidRef.id;

      const bidDoc: BidDoc = {
        incomingId,

        title: incoming.title ?? '',
        clientName: incoming.clientName ?? '',
        projectName: incoming.projectName ?? '',

        source: incoming.source ?? '',
        folder: incoming.folder ?? '',
        notes: incoming.notes ?? '',
        attachmentLinks: incoming.attachmentLinks ?? [],

        receivedAt: incoming.receivedAt,
        bidDueAt: incoming.bidDueAt ?? null,

        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        convertedAt: serverTimestamp(),

        status: 'draft',
        bidderUid,

        breakdown: { ...EMPTY_BREAKDOWN },
        calculatedTotal: 0,
        manualTotal: null,
        difference: null,

        revCounter: 1,

        officialPdfCurrent: null,
        officialPdfUpdatedAt: null,
      };

      // Write bid
      tx.set(newBidRef, bidDoc);

      // Update incoming (lock create, store bidId + convertedAt)
      tx.update(incomingRef, {
        status: 'bid_created',
        bidId: newBidId,
        convertedAt: serverTimestamp(),
      });

      // Create first revision snapshot
      const revRef = doc(collection(newBidRef, 'revisions'));
      tx.set(revRef, {
        revNumber: 1,
        createdAt: serverTimestamp(),
        createdByUid: bidderUid,
        changeType: 'create',
        note: 'Converted from Incoming Bid',
        snapshot: {
          status: bidDoc.status,
          bidDueAt: bidDoc.bidDueAt ?? null,
          manualTotal: bidDoc.manualTotal,
          calculatedTotal: bidDoc.calculatedTotal,
          breakdown: bidDoc.breakdown,
          pdfCurrent: bidDoc.officialPdfCurrent,
        },
      });

      return newBidId;
    });

    return bidId;
  }

  /**
   * Add a partida line and update bid totals (incremental).
   * Creates a revision snapshot.
   *
   * NOTE: This uses incremental totals (safe, fast). If you need strict
   * consistency across many edits/clients, move recalculation to a Cloud Function later.
   */
  async addPartidaAndRecalc(
    bidId: string,
    uid: string,
    payload: { category: PartidaCategory; description: string; amount: number }
  ): Promise<void> {
    const bidRef = doc(this.firestore, 'bids', bidId);
    const partidasCol = collection(this.firestore, 'bids', bidId, 'partidas');

    await runTransaction(this.firestore, async (tx) => {
      const bidSnap = await tx.get(bidRef);
      if (!bidSnap.exists()) throw new Error('Bid not found');

      const bid: any = bidSnap.data();

      // 1) Create partida
      const partidaRef = doc(partidasCol);
      tx.set(partidaRef, {
        category: payload.category,
        description: payload.description ?? '',
        amount: Number(payload.amount ?? 0),
        createdAt: serverTimestamp(),
        createdByUid: uid,
      });

      // 2) Update breakdown/totals incrementally
      const currentBreakdown = bid.breakdown ?? { ...EMPTY_BREAKDOWN };
      const nextBreakdown = addToBreakdown(
        currentBreakdown,
        payload.category,
        Number(payload.amount ?? 0)
      );
      const nextCalculated = sumBreakdown(nextBreakdown);

      const manualTotal = bid.manualTotal ?? null;
      const diff = manualTotal == null ? null : Number(manualTotal) - nextCalculated;

      tx.update(bidRef, {
        breakdown: nextBreakdown,
        calculatedTotal: nextCalculated,
        difference: diff,
        updatedAt: serverTimestamp(),
      });

      // 3) Revision snapshot
      const nextRev = Number(bid.revCounter ?? 1) + 1;
      tx.update(bidRef, { revCounter: nextRev });

      const revRef = doc(collection(bidRef, 'revisions'));
      tx.set(revRef, {
        revNumber: nextRev,
        createdAt: serverTimestamp(),
        createdByUid: uid,
        changeType: 'partidas',
        note: `Added partida (${payload.category})`,
        snapshot: {
          status: bid.status,
          bidDueAt: bid.bidDueAt ?? null,
          manualTotal: bid.manualTotal ?? null,
          calculatedTotal: nextCalculated,
          breakdown: nextBreakdown,
          pdfCurrent: bid.officialPdfCurrent ?? null,
        },
      });
    });
  }

  /** Set manual total (required before delivered) and record a revision. */
  async setManualTotal(bidId: string, uid: string, manualTotal: number): Promise<void> {
    const bidRef = doc(this.firestore, 'bids', bidId);

    await runTransaction(this.firestore, async (tx) => {
      const bidSnap = await tx.get(bidRef);
      if (!bidSnap.exists()) throw new Error('Bid not found');

      const bid: any = bidSnap.data();
      const calc = Number(bid.calculatedTotal ?? 0);
      const mt = Number(manualTotal);
      const diff = mt - calc;

      tx.update(bidRef, {
        manualTotal: mt,
        difference: diff,
        updatedAt: serverTimestamp(),
      });

      const nextRev = Number(bid.revCounter ?? 1) + 1;
      tx.update(bidRef, { revCounter: nextRev });

      const revRef = doc(collection(bidRef, 'revisions'));
      tx.set(revRef, {
        revNumber: nextRev,
        createdAt: serverTimestamp(),
        createdByUid: uid,
        changeType: 'totals',
        note: `Manual total set to ${mt}`,
        snapshot: {
          status: bid.status,
          bidDueAt: bid.bidDueAt ?? null,
          manualTotal: mt,
          calculatedTotal: calc,
          breakdown: bid.breakdown ?? { ...EMPTY_BREAKDOWN },
          pdfCurrent: bid.officialPdfCurrent ?? null,
        },
      });
    });
  }
}
