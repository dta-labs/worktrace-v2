import { inject, Injectable } from '@angular/core';
import { Firestore, addDoc, collection, serverTimestamp } from '@angular/fire/firestore';

@Injectable({ providedIn: 'root' })
export class BidsService {
  private fs = inject(Firestore);

  async createBid(data: any) {
    const ref = collection(this.fs, 'bids');
    return addDoc(ref, {
      ...data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }
}
