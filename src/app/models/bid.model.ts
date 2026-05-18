export type BidStatus = 'Pending' | 'Sent' | 'Won' | 'Lost' | 'No Response' | 'Cancelled';
export type BidPriority = 'Low' | 'Medium' | 'High' | 'Urgent';

export interface BidCostBreakdown {
  laborAmount?: number;
  laborHours?: number;
  equipmentAmount?: number;
  materialsAmount?: number;
  subsistenceAmount?: number;
  rentalsAmount?: number;
  subcontractorAmount?: number;
}

export interface Bid {
  id?: string;

  bidNumber?: string;
  dateReceived?: any; // Firestore Timestamp | Date
  dueDate?: any;      // Firestore Timestamp | Date
  dateSent?: any;     // Firestore Timestamp | Date

  client?: string;       // company name (v1)
  contactName?: string;
  contactPhone?: string;
  projectName?: string;

  estimatorId?: string;  // uid (optional v1)
  estimatorName?: string;
  estimatorEmail?: string | null;

  status: BidStatus;
  priority: BidPriority;

  amount?: number;       // total bid amount (optional if using breakdown)
  totalAmount?: number;  // backward-compat / UI uses this
  costs?: BidCostBreakdown;

  linkedProjectId?: string | null;

  // optional notes
  notes?: string;

  // audit/attribution
  createdBy?: string;
  createdByEmail?: string | null;

  createdAt?: any;
  updatedBy?: string;
  updatedAt?: any;
}

export interface BidAuditLogEntry {
  id?: string;
  bidId: string;
  editedBy: string;
  editedAt: any; // Timestamp
  reason: string;
  changes: Record<string, { before: any; after: any }>;
}
