import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  CollectionReference,
  doc,
  addDoc,
  collection,
  collectionData,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from '@angular/fire/firestore';
import { Auth } from '@angular/fire/auth';
import { Observable } from 'rxjs';

export interface ClientItem {
  id?: string;
  name: string;
  nameNormalized: string;
  // Optional client-level contact info (company contact). Can be reused on bids.
  mainContactName?: string;
  mainContactEmail?: string;
  mainContactPhone?: string;
  notes?: string;
  companyType?: 'GC' | 'SUB' | 'MECH' | 'OTHER' | 'BOTH';
  addressPrimary?: { line1?: string; line2?: string; city?: string; state?: string; zip?: string; country?: string };
  contacts?: Array<{ fullName: string; email?: string; phone?: string; role?: string; isPrimary?: boolean }>; 
  isActive?: boolean;
  createdAt?: any;
  createdBy?: string | null;
  createdByLabel?: string;
  updatedAt?: any;
  updatedBy?: string | null;
  updatedByLabel?: string;

  createdByEmail?: string | null;
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

@Injectable({ providedIn: 'root' })
export class ClientsService {
  private fs = inject(Firestore);
  private auth = inject(Auth);

  private col(): CollectionReference<ClientItem> {
    return collection(this.fs, 'clients') as CollectionReference<ClientItem>;
  }

  clients$(): Observable<ClientItem[]> {
    const q = query(this.col(), orderBy('name', 'asc'));
    return collectionData(q, { idField: 'id' }) as Observable<ClientItem[]>;
  }

  /** Find a client by normalized name (case/spacing/punctuation-insensitive). */
  async findByName(name: string): Promise<ClientItem | null> {
    const n = norm(name);
    if (!n) return null;
    const q = query(this.col(), where('nameNormalized', '==', n));
    const snap = await getDocs(q);
    const doc0 = snap.docs[0];
    return doc0 ? ({ id: doc0.id, ...(doc0.data() as any) } as ClientItem) : null;
  }

  /** Ensure a client exists. Creates it if missing. Returns the existing or created client. */
  async ensureClient(name: string): Promise<ClientItem> {
    return this.upsertClient({ name });
  }

  /**
   * Create or update a client by normalized name.
   * - If client exists: updates provided optional fields and returns updated snapshot.
   * - If client missing: creates it.
   *
   * Empty strings are treated as "no change" to prevent accidental wiping.
   */
  async upsertClient(input: {
    name: string;
    mainContactName?: string;
    mainContactEmail?: string;
    mainContactPhone?: string;
    notes?: string;
  companyType?: 'GC' | 'SUB' | 'MECH' | 'OTHER' | 'BOTH';
  addressPrimary?: { line1?: string; line2?: string; city?: string; state?: string; zip?: string; country?: string };
  contacts?: Array<{ fullName: string; email?: string; phone?: string; role?: string; isPrimary?: boolean }>; 
    isActive?: boolean;
  }): Promise<ClientItem> {
    const trimmed = (input?.name ?? '').trim();
    if (!trimmed) throw new Error('Client name is required.');

    const existing = await this.findByName(trimmed);
    const user = this.auth.currentUser;
    const userLabel = user?.displayName ?? user?.email ?? 'unknown';

    const contactName = (input.mainContactName ?? '').toString().trim();
    const contactEmail = (input.mainContactEmail ?? '').toString().trim();
    const contactPhone = (input.mainContactPhone ?? '').toString().trim();
    const notes = (input.notes ?? '').toString().trim();

    const companyType = (input.companyType ?? undefined) as any;
    const addressPrimary = input.addressPrimary ?? undefined;
    const contacts = input.contacts ?? undefined;

    if (existing?.id) {
      const patch: Partial<ClientItem> = {
        updatedAt: serverTimestamp(),
        updatedBy: user?.uid ?? null,
        updatedByLabel: userLabel,
      };
      if (contactName) patch.mainContactName = contactName;
      if (contactEmail) patch.mainContactEmail = contactEmail;
      if (contactPhone) patch.mainContactPhone = contactPhone;
      if (notes) patch.notes = notes;
      if (companyType) patch.companyType = companyType;
      if (addressPrimary) patch.addressPrimary = addressPrimary as any;
      if (contacts) patch.contacts = contacts as any;
      if (typeof input.isActive === 'boolean') patch.isActive = input.isActive;

      await updateDoc(doc(this.fs, 'clients', existing.id) as any, patch as any);
      return { ...existing, ...patch, id: existing.id };
    }

    const payload: ClientItem = {
      name: trimmed,
      nameNormalized: norm(trimmed),
      isActive: typeof input.isActive === 'boolean' ? input.isActive : true,
      companyType: (companyType ?? undefined) as any,
      addressPrimary: (addressPrimary ?? undefined) as any,
      contacts: (contacts ?? undefined) as any,
      createdAt: serverTimestamp(),
      createdBy: user?.uid ?? null,
      createdByLabel: userLabel,
      updatedAt: serverTimestamp(),
      updatedBy: user?.uid ?? null,
      updatedByLabel: userLabel,
      createdByEmail: user?.email ?? null,
    };
    if (contactName) payload.mainContactName = contactName;
    if (contactEmail) payload.mainContactEmail = contactEmail;
    if (contactPhone) payload.mainContactPhone = contactPhone;
    if (notes) payload.notes = notes;

    const ref = await addDoc(this.col(), payload as any);
    return { ...payload, id: ref.id };
  }
}
