import { inject, Injectable } from '@angular/core';
import { Firestore, doc, docData, serverTimestamp, setDoc } from '@angular/fire/firestore';
import { Observable } from 'rxjs';

export interface DriveSettingsDoc {
  enabled?: boolean;
  rootFolderId?: string;
  rootFolderName?: string;
  rootFolderUrl?: string;
  locationType?: 'myDrive' | 'sharedDrive';
  supportsAllDrives?: boolean;
  subfolderTemplate?: string[];
  humanResourcesFolderName?: string;
  workersFolderName?: string;
  workerFolderNamingMode?: 'last_first' | 'first_last' | 'last_only' | 'first_only';
  workerSubfolderTemplate?: string[];
  configuredByUid?: string;
  configuredByEmail?: string;
  configuredAt?: any;
  updatedAt?: any;
}

/**
 * Drive Settings (single-tenant for now)
 *
 * Current storage: settings/drive
 * Future multi-tenant storage: companies/{companyId}/settings/drive
 */
@Injectable({ providedIn: 'root' })
export class DriveSettingsService {
  private fs = inject(Firestore);

  private ref() {
    return doc(this.fs, 'settings', 'drive');
  }

  watch$(): Observable<DriveSettingsDoc> {
    return docData(this.ref()) as Observable<DriveSettingsDoc>;
  }

  async save(partial: DriveSettingsDoc) {
    // Firestore rejects `undefined` values. Omit undefined keys (including nested ones)
    // so UI can pass optional fields without crashing setDoc.
    const clean = (value: any): any => {
      if (value === undefined) return undefined;
      if (value === null) return null;
      if (Array.isArray(value)) {
        return value.map(v => clean(v)).filter(v => v !== undefined);
      }
      if (typeof value === 'object') {
        const out: any = {};
        for (const k of Object.keys(value)) {
          const v = clean((value as any)[k]);
          if (v !== undefined) out[k] = v;
        }
        return out;
      }
      return value;
    };

    const payload = clean({
      ...partial,
      updatedAt: serverTimestamp(),
    });

    await setDoc(this.ref(), payload, { merge: true });
  }
}
