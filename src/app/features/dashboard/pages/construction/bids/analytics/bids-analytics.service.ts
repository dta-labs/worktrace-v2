import { Injectable } from '@angular/core';
import {
  Firestore,
  collection,
  collectionData,
  doc,
  docData,
} from '@angular/fire/firestore';
import { BehaviorSubject, combineLatest, Observable, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';

type AnyDoc = any;

@Injectable({ providedIn: 'root' })
export class BidsAnalyticsService {
  // Compatibility: some components subscribe to this for user-friendly error messages.
  private lastErrorSubject = new BehaviorSubject<string | null>(null);
  lastError$ = this.lastErrorSubject.asObservable();

  constructor(private firestore: Firestore) {}

  private setError(err: unknown) {
    const msg =
      (err as any)?.message ||
      (typeof err === 'string' ? err : 'Unexpected analytics error');
    this.lastErrorSubject.next(msg);
  }

  // --------- WorkTrace schema helpers (robust fallbacks) ---------

  private toDate(v: any): Date | null {
    return v?.toDate?.() || (v instanceof Date ? v : null);
  }

  /** Official analytics date: prefer convertedAt, fall back to deliveredAt/receivedAt/bidDueAt/createdAt */
  private getBidDate(b: AnyDoc): Date | null {
    return (
      this.toDate(b?.convertedAt) ||
      this.toDate(b?.deliveredAt) ||
      this.toDate(b?.receivedAt) ||
      this.toDate(b?.bidDueAt) ||
      this.toDate(b?.createdAt) ||
      null
    );
  }

  /** Official amount: manualTotal > calculatedTotal > sum(breakdown.*) */
  private getBidAmount(b: AnyDoc): number {
    const manual = Number(b?.manualTotal);
    if (Number.isFinite(manual) && manual > 0) return manual;

    const calc = Number(b?.calculatedTotal);
    if (Number.isFinite(calc) && calc > 0) return calc;

    const bd = b?.breakdown || b?.snapshot?.breakdown || null;
    if (!bd || typeof bd !== 'object') return 0;

    const keys = [
      'labor',
      'materials',
      'equipment',
      'consumables',
      'rentals',
      'subcontracts',
      'other',
      'overhead',
      'profitMarkup',
      'perDiem',
      'tax',
      'permitsFees',
      'permits',
      'fees',
      'contingency',
    ];

    let sum = 0;
    for (const k of keys) {
      const n = Number((bd as any)[k]);
      if (Number.isFinite(n)) sum += n;
    }
    return sum;
  }

  private getProject(b: AnyDoc): string {
    return (
      b?.project ||
      b?.projectName ||
      b?.job ||
      b?.jobName ||
      b?.snapshot?.project ||
      b?.snapshot?.projectName ||
      b?.snapshot?.job ||
      b?.snapshot?.jobName ||
      '—'
    );
  }

  private getClient(b: AnyDoc): string {
    return (
      b?.client ||
      b?.clientName ||
      b?.customer ||
      b?.customerName ||
      b?.snapshot?.client ||
      b?.snapshot?.clientName ||
      b?.snapshot?.customer ||
      b?.snapshot?.customerName ||
      '—'
    );
  }

  /**
   * Estimator identity raw value.
   * Preference order: estimator email/name > bidderEmail > bidderUid > createdBy
   */
  private getEstimatorRaw(b: AnyDoc): string {
    // This version: Estimator = converter (Save & Convert). DeliveredBy is same.
    const v =
      b?.convertedByEmail ||
      b?.deliveredByEmail ||
      b?.estimatorEmail ||
      b?.bidderEmail ||
      b?.estimator ||
      b?.bidderUid ||
      b?.createdByEmail ||
      b?.createdBy ||
      'Unassigned';
    return String(v);
  }

  private looksLikeUid(v: string): boolean {
    // Firebase UID is typically ~28 chars and has no '@'
    return !!v && !v.includes('@') && v.length >= 18;
  }

  private shortenId(v: string): string {
    if (!v) return 'Unassigned';
    if (v.includes('@')) return v.toLowerCase();
    if (v.length <= 12) return v;
    return `${v.slice(0, 6)}…${v.slice(-4)}`;
  }

  /** Build a map uid -> best label (email or displayName) from users/{uid} */
  private userLabelMap$(uids: string[]): Observable<Record<string, string>> {
    const uniq = Array.from(new Set(uids.filter(Boolean)));
    if (!uniq.length) return of({});

    const streams = uniq.map((uid) =>
      docData(doc(this.firestore, 'users', uid) as any, { idField: 'id' }).pipe(
        map((u: any) => (u?.email || u?.displayName || u?.name || null) as string | null),
        catchError(() => of(null))
      )
    );

    return combineLatest(streams).pipe(
      map((labels) => {
        const out: Record<string, string> = {};
        uniq.forEach((uid, i) => {
          const label = labels[i];
          if (label) out[uid] = String(label).toLowerCase();
        });
        return out;
      })
    );
  }

  private getAllBids() {
    const bidsRef = collection(this.firestore, 'bids');
    return collectionData(bidsRef, { idField: 'id' });
  }

  // --------- Public API used by the UI ---------

  getYearKPIs() {
    const year = new Date().getFullYear();

    return this.getAllBids().pipe(
      map((bids: AnyDoc[]) => {
        const thisYear = bids.filter((b) => {
          const d = this.getBidDate(b);
          return d && d.getFullYear() === year;
        });

        const delivered = thisYear.filter((b) => b?.status === 'Delivered' || !!b?.deliveredAt).length;
        const totalEstimated = thisYear.reduce((s, b) => s + this.getBidAmount(b), 0);
        const average = thisYear.length ? totalEstimated / thisYear.length : 0;
        const active = thisYear.filter((b) => !(b?.status === 'Delivered' || !!b?.deliveredAt)).length;

        return { totalEstimated, delivered, average, active };
      }),
      catchError((err) => {
        this.setError(err);
        return of({ totalEstimated: 0, delivered: 0, average: 0, active: 0 });
      })
    );
  }

  getMonthlyTotals(year: number) {
    return this.getAllBids().pipe(
      map((bids: AnyDoc[]) => {
        const months = Array.from({ length: 12 }).map((_, i) => ({
          monthIndex: i,
          amount: 0,
          count: 0,
        }));

        bids.forEach((b) => {
          const d = this.getBidDate(b);
          if (!d || d.getFullYear() !== year) return;

          const m = d.getMonth();
          months[m].amount += this.getBidAmount(b);
          months[m].count += 1;
        });

        const maxAmount = Math.max(1, ...months.map((m) => m.amount));
        return { months, maxAmount };
      }),
      catchError((err) => {
        this.setError(err);
        const months = Array.from({ length: 12 }).map((_, i) => ({
          monthIndex: i,
          amount: 0,
          count: 0,
        }));
        return of({ months, maxAmount: 1 });
      })
    );
  }

  getEstimatorRanking(year: number) {
    return this.getAllBids().pipe(
      switchMap((bids: AnyDoc[]) => {
        const uids = bids
          .map((b) => this.getEstimatorRaw(b))
          .filter((v) => this.looksLikeUid(v));

        return this.userLabelMap$(uids).pipe(
          map((labelMap) => {
            const mapBy = new Map<string, { email: string; amount: number; count: number }>();

            bids.forEach((b) => {
              const d = this.getBidDate(b);
              if (!d || d.getFullYear() !== year) return;

              const raw = this.getEstimatorRaw(b);
              const label = this.looksLikeUid(raw) ? (labelMap[raw] || this.shortenId(raw)) : raw.toLowerCase();

              const row = mapBy.get(label) || { email: label, amount: 0, count: 0 };
              row.amount += this.getBidAmount(b);
              row.count += 1;
              mapBy.set(label, row);
            });

            const rows = Array.from(mapBy.values()).sort((a, b) => b.amount - a.amount);
            const maxAmount = Math.max(1, ...rows.map((r) => r.amount));
            return { rows, maxAmount };
          })
        );
      }),
      catchError((err) => {
        this.setError(err);
        return of({ rows: [], maxAmount: 1 });
      })
    );
  }

  getRecentBids(year: number) {
    return this.getAllBids().pipe(
      switchMap((bids: AnyDoc[]) => {
        const uids = bids
          .map((b) => this.getEstimatorRaw(b))
          .filter((v) => this.looksLikeUid(v));

        return this.userLabelMap$(uids).pipe(
          map((labelMap) =>
            bids
              .filter((b) => {
                const d = this.getBidDate(b);
                return d && d.getFullYear() === year;
              })
              .map((b) => {
                const raw = this.getEstimatorRaw(b);
                const estimatorLabel = this.looksLikeUid(raw)
                  ? (labelMap[raw] || this.shortenId(raw))
                  : raw.toLowerCase();

                const total = this.getBidAmount(b);

                return {
                  project: this.getProject(b),
                  client: this.getClient(b),

                  // Some UIs still bind to createdBy; keep both for compatibility.
                  estimator: estimatorLabel,
                  createdBy: estimatorLabel,

                  total,
                  date: this.getBidDate(b),
                };
              })
          )
        );
      }),
      catchError((err) => {
        this.setError(err);
        return of([] as any[]);
      })
    );
  }
}
