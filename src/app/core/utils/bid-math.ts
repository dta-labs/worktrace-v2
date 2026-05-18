import { BidBreakdown, PartidaCategory } from '../models/bids.models';

export const EMPTY_BREAKDOWN: BidBreakdown = {
  labor: 0,
  equipment: 0,
  materials: 0,
  consumables: 0,
  rentals: 0,
  subcontracts: 0,
  other: 0,
};

export function addToBreakdown(
  b: BidBreakdown,
  cat: PartidaCategory,
  amount: number
): BidBreakdown {
  return { ...b, [cat]: (b[cat] ?? 0) + (amount ?? 0) };
}

export function sumBreakdown(b: BidBreakdown): number {
  return Object.values(b).reduce((a, v) => a + (v ?? 0), 0);
}
