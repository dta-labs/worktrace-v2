import { inject, Injectable } from '@angular/core';
import { Firestore, doc, docData, serverTimestamp, setDoc } from '@angular/fire/firestore';
import { Observable } from 'rxjs';

export interface BidsSettingsDoc {
  enabled?: boolean;
  rootFolderId?: string;
  rootFolderName?: string;
  rootFolderUrl?: string;
  locationType?: 'myDrive' | 'sharedDrive';
  supportsAllDrives?: boolean;
  subfolderTemplate?: string[];
  configuredByUid?: string;
  configuredByEmail?: string;
  configuredAt?: any;
  updatedAt?: any;
}

@Injectable({ providedIn: 'root' })
export class BidsSettingsService {
  private fs = inject(Firestore);

  private ref() {
    return doc(this.fs, 'settings', 'bids');
  }

  watch$(): Observable<BidsSettingsDoc> {
    return docData(this.ref()) as Observable<BidsSettingsDoc>;
  }

  async save(partial: BidsSettingsDoc) {
    const clean = (value: any): any => {
      if (value === undefined) return undefined;
      if (value === null) return null;
      if (Array.isArray(value)) return value.map(v => clean(v)).filter(v => v !== undefined);
      if (typeof value === 'object') {
        const out: any = {};
        for (const k of Object.keys(value)) {
          const v = clean(value[k]);
          if (v !== undefined) out[k] = v;
        }
        return out;
      }
      return value;
    };

    const payload = clean({ ...partial, updatedAt: serverTimestamp() });
    await setDoc(this.ref(), payload, { merge: true });
  }
}
