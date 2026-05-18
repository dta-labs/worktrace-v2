import { Injectable, inject } from '@angular/core';
import { Firestore, collection, getCountFromServer, getDocs, limit, orderBy, query, startAfter } from '@angular/fire/firestore';
import { Storage, getDownloadURL, ref } from '@angular/fire/storage';
import type { DocumentData, QueryDocumentSnapshot } from 'firebase/firestore';
import { CandidateService } from './candidate.service';

export interface CandidateRecord {
  id: string;
  data: Record<string, unknown>;
  snapshot: QueryDocumentSnapshot<DocumentData>;
}

export interface CandidatePageResult {
  records: CandidateRecord[];
  lastVisible: QueryDocumentSnapshot<DocumentData> | null;
}

export interface CandidateSearchDocument {
  type: string;
  label: string;
  fileName: string;
  storagePath: string;
  fileUrl: string;
  mimeType: string;
}

export interface CandidateSearchResult {
  id: string;
  candidateId: string;
  displayName: string;
  firstName: string;
  middleName: string;
  lastName: string;
  email: string;
  phone: string;
  alternatePhone: string;
  candidateStatus: string;
  stage: string;
  source: string;
  subRole: string;
  supervisor: string;
  employmentType: string;
  areaType: string;
  companyName: string;
  ein: string;
  eVerifyCaseNumber: string;
  preferredLanguage: string;
  dateOfBirth: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  zip: string;
  ssnFull: string;
  workAuthorizationStatus: string;
  workAuthorizationExpiration: string;
  hireDate: string;
  rehireDate: string;
  payType: string;
  paymentMethod: string;
  bankName: string;
  accountType: string;
  accountHolderName: string;
  routingNumber: string;
  accountNumber: string;
  workersCompPolicyNumber: string;
  workersCompExpiration: string;
  exemptionType: string;
  exemptionExpiration: string;
  liabilityPolicyNumber: string;
  liabilityExpiration: string;
  emergencyContactName: string;
  emergencyContactRelationship: string;
  emergencyContactPhone: string;
  notes: string;
  documents: CandidateSearchDocument[];
}

@Injectable({ providedIn: 'root' })
export class CandidateSearchService {
  private readonly firestore = inject(Firestore);
  private readonly storage = inject(Storage);
  private readonly candidateService = inject(CandidateService);
  private readonly maxResults = 5;

  // Returns the total number of candidate documents in Firestore.
  async countCandidates(): Promise<number> {
    const snapshot = await getCountFromServer(collection(this.firestore, 'candidates'));
    return snapshot.data().count;
  }

  // Loads one paginated candidate slice ordered by display name.
  async loadCandidatePage(pageSize: number, after?: QueryDocumentSnapshot<DocumentData> | null): Promise<CandidatePageResult> {
    const candidatesCollection = collection(this.firestore, 'candidates');
    const pageQuery = after
      ? query(candidatesCollection, orderBy('displayName'), startAfter(after), limit(pageSize))
      : query(candidatesCollection, orderBy('displayName'), limit(pageSize));
    const snapshot = await getDocs(pageQuery);

    return {
      records: snapshot.docs.map((documentSnapshot) => ({
        id: documentSnapshot.id,
        data: documentSnapshot.data() as Record<string, unknown>,
        snapshot: documentSnapshot,
      })),
      lastVisible: snapshot.docs.at(-1) ?? null,
    };
  }

  // Returns the top search matches and enriches each candidate with documents.
  async searchCandidates(term: string): Promise<CandidateSearchResult[]> {
    const matchingCandidates = (await this.candidateService.loadFilterPage(term, this.maxResults)).records
      .map((record) => this.mapCandidate(record.id, record.data))
      .sort((left, right) => left.displayName.localeCompare(right.displayName))
      .slice(0, this.maxResults);

    return await Promise.all(
      matchingCandidates.map(async (candidate) => ({
        ...candidate,
        documents: await this.loadCandidateDocuments(candidate.id),
      }))
    );
  }

  // Loads document metadata stored under a candidate subcollection.
  async loadCandidateDocuments(candidateId: string): Promise<CandidateSearchDocument[]> {
    const documentsSnapshot = await getDocs(collection(this.firestore, 'candidates', candidateId, 'documents'));

    return documentsSnapshot.docs.map((snapshot) => {
      const data = this.readRecord(snapshot.data());

      return {
        type: this.readString(data['type']),
        label: this.readString(data['label']),
        fileName: this.readString(data['fileName']),
        storagePath: this.readString(data['storagePath']),
        fileUrl: this.readString(data['fileUrl']),
        mimeType: this.readString(data['mimeType']),
      };
    });
  }

  // Resolves and downloads a candidate document as a browser File object.
  async loadCandidateDocumentFile(document: CandidateSearchDocument): Promise<File | null> {
    const downloadUrl = await this.resolveCandidateDocumentDownloadUrl(document);
    if (!downloadUrl) {
      return null;
    }

    const response = await fetch(downloadUrl);
    if (!response.ok) {
      throw new Error(`Could not load candidate document: ${document.fileName || document.label || document.type}.`);
    }

    const blob = await response.blob();
    const fileName = document.fileName || document.label || document.type || 'candidate-document';

    return new File([blob], fileName, {
      type: blob.type || document.mimeType || 'application/octet-stream',
    });
  }

  // Maps raw Firestore candidate data into the service search DTO shape.
  private mapCandidate(id: string, data: Record<string, unknown>): CandidateSearchResult {
    const firstName = this.readString(data['firstName']);
    const middleName = this.readString(data['middleName']);
    const lastName = this.readString(data['lastName']);
    const displayName = this.readString(data['displayName']) || [firstName, middleName, lastName].filter(Boolean).join(' ') || id;
    const address = this.readRecord(data['address']);
    const workAuthorization = this.readRecord(data['workAuthorization']);
    const pay = this.readRecord(data['pay']);
    const bankInfo = this.readRecord(pay['bankInfo']);
    const employment = this.readRecord(data['employment']);
    const contractor1099 = this.readRecord(employment['contractor1099']);
    const w2 = this.readRecord(employment['w2']);
    const emergencyContact = this.readRecord(data['emergencyContact']);

    return {
      id,
      candidateId: this.readString(data['candidateId']) || id,
      displayName,
      firstName,
      middleName,
      lastName,
      email: this.readString(data['email']).toLowerCase(),
      phone: this.readString(data['phone']),
      alternatePhone: this.readString(data['alternatePhone']),
      candidateStatus: this.readString(data['candidateStatus']),
      stage: this.readString(data['stage']),
      source: this.readString(data['source']),
      subRole: this.readString(data['subRole']),
      supervisor: this.readString(data['supervisor']),
      employmentType: this.readString(data['employmentType']),
      areaType: this.readString(data['areaType']),
      companyName: this.readString(contractor1099['companyName']),
      ein: this.readString(contractor1099['ein']),
      eVerifyCaseNumber: this.readString(w2['eVerifyCaseNumber']),
      preferredLanguage: this.readString(data['preferredLanguage']),
      dateOfBirth: this.readString(data['dateOfBirth']),
      addressLine1: this.readString(address['line1']),
      addressLine2: this.readString(address['line2']),
      city: this.readString(address['city']),
      state: this.readString(address['state']),
      zip: this.readString(address['zip']),
      ssnFull: this.readString(data['ssnFull']),
      workAuthorizationStatus: this.readString(workAuthorization['status']),
      workAuthorizationExpiration: this.readString(workAuthorization['expirationDate']),
      hireDate: this.readString(data['hireDate']),
      rehireDate: this.readString(data['rehireDate']),
      payType: this.readString(pay['payType']),
      paymentMethod: this.readString(pay['paymentMethod']),
      bankName: this.readString(bankInfo['bankName']),
      accountType: this.readString(bankInfo['accountType']),
      accountHolderName: this.readString(bankInfo['accountHolderName']),
      routingNumber: this.readString(bankInfo['routingNumber']),
      accountNumber: this.readString(bankInfo['accountNumber']),
      workersCompPolicyNumber: this.readString(contractor1099['workersCompPolicyNumber']),
      workersCompExpiration: this.readString(contractor1099['workersCompExpiration']),
      exemptionType: this.readString(contractor1099['exemptionType']),
      exemptionExpiration: this.readString(contractor1099['exemptionExpiration']),
      liabilityPolicyNumber: this.readString(contractor1099['liabilityPolicyNumber']),
      liabilityExpiration: this.readString(contractor1099['liabilityExpiration']),
      emergencyContactName: this.readString(emergencyContact['name']),
      emergencyContactRelationship: this.readString(emergencyContact['relationship']),
      emergencyContactPhone: this.readString(emergencyContact['phone']),
      notes: this.readString(data['notes']),
      documents: [],
    };
  }


  // Safely converts unknown data into an object record.
  private readRecord(value: unknown): Record<string, unknown> {
    return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  }

  // Resolves the best download URL from storagePath first, then fileUrl.
  private async resolveCandidateDocumentDownloadUrl(document: CandidateSearchDocument): Promise<string> {
    const storagePath = this.readString(document.storagePath);
    if (storagePath) {
      return await getDownloadURL(ref(this.storage, storagePath));
    }

    return this.readString(document.fileUrl);
  }

  // Safely reads and trims a string value from unknown input.
  private readString(value: unknown): string {
    return typeof value === 'string' ? value.trim() : '';
  }
}