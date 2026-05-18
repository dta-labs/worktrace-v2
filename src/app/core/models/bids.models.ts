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

export interface IncomingBid {
  title: string;
  clientName: string;
  projectName: string;

  source?: string;         // email/manual/etc
  folder?: string;         // opcional
  notes?: string;
  attachmentLinks?: string[];

  receivedAt: any;         // Firestore Timestamp
  bidDueAt?: any | null;   // Firestore Timestamp | null

  status: 'incoming' | 'bid_created' | 'delivered';
  bidId?: string | null;

  createdByUid: string;
  assignedToUid?: string | null;

  convertedAt?: any | null;  // Firestore Timestamp
}

export interface BidBreakdown {
  labor: number;
  equipment: number;
  materials: number;
  consumables: number;
  rentals: number;
  subcontracts: number;
  other: number;
}

export interface BidDoc {
  incomingId: string;

  title: string;
  clientName: string;
  projectName: string;

  source?: string;
  folder?: string;
  notes?: string;
  attachmentLinks?: string[];

  receivedAt: any;       // Timestamp (copiado del incoming)
  bidDueAt?: any | null; // Timestamp | null

  createdAt: any;        // serverTimestamp
  updatedAt: any;        // serverTimestamp
  convertedAt: any;      // serverTimestamp

  status: 'draft' | 'completed' | 'delivered' | 'won' | 'lost';

  bidderUid: string;

  breakdown: BidBreakdown;
  calculatedTotal: number;
  manualTotal: number | null;
  difference: number | null;

  // Versioning counter for revisions
  revCounter?: number;

  officialPdfCurrent: null | {
    fileId: string;
    version: number;
    storagePath: string;
  };
  officialPdfUpdatedAt?: any | null;
}

export interface PartidaLine {
  category: PartidaCategory;
  description?: string;
  amount: number;
  hours?: number;
  createdAt: any;
  createdByUid: string;
}
