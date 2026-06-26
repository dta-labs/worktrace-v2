import { Injectable, inject } from '@angular/core';
import { Auth } from '@angular/fire/auth';
import {
  Firestore,
  collection,
  collectionData,
  deleteDoc,
  doc,
  docData,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc
} from '@angular/fire/firestore';
import { Observable, map } from 'rxjs';
import { FabricationOrder, FabricationOrderStatus } from '../models/shop.models';

@Injectable({ providedIn: 'root' })
export class OrderStoreService {
  private readonly firestore = inject(Firestore);
  private readonly auth = inject(Auth);
  private readonly collectionName = 'shopOrders';

  list(): Observable<FabricationOrder[]> {
    const ref = collection(this.firestore, this.collectionName);
    const q = query(ref, orderBy('updatedAt', 'desc'));
    return collectionData(q, { idField: 'id' }).pipe(
      map(rows => rows.map(row => this.normalizeOrder(row as Partial<FabricationOrder>)))
    );
  }

  get(id: string): Observable<FabricationOrder | undefined> {
    const ref = doc(this.firestore, this.collectionName, id);
    return docData(ref, { idField: 'id' }).pipe(
      map(row => row ? this.normalizeOrder(row as Partial<FabricationOrder>) : undefined)
    );
  }

  async saveDraft(order: FabricationOrder): Promise<void> {
    const normalized = this.prepareOrder(order, 'Draft');
    await setDoc(doc(this.firestore, this.collectionName, normalized.id), {
      ...normalized,
      status: 'Draft',
      updatedAt: serverTimestamp(),
      updatedBy: this.currentUserEmail()
    }, { merge: true });
  }

  async save(order: FabricationOrder): Promise<void> {
    const normalized = this.prepareOrder(order, order.status);
    await setDoc(doc(this.firestore, this.collectionName, normalized.id), {
      ...normalized,
      updatedAt: serverTimestamp(),
      updatedBy: this.currentUserEmail()
    }, { merge: true });
  }

  async updateStatus(order: FabricationOrder, status: FabricationOrderStatus): Promise<void> {
    const ref = doc(this.firestore, this.collectionName, order.id);
    const extra: Record<string, unknown> = {};

    if (status === 'Pending Approval') extra['submittedAt'] = serverTimestamp();
    if (status === 'Approved') {
      extra['approvedAt'] = serverTimestamp();
      extra['approvedBy'] = this.currentUserEmail();
    }
    if (status === 'In Production') extra['productionAt'] = serverTimestamp();
    if (status === 'Completed') extra['completedAt'] = serverTimestamp();

    await updateDoc(ref, {
      status,
      updatedAt: serverTimestamp(),
      updatedBy: this.currentUserEmail(),
      ...extra
    });
  }

  async delete(orderId: string): Promise<void> {
    await deleteDoc(doc(this.firestore, this.collectionName, orderId));
  }

  newOrder(): FabricationOrder {
    const id = this.newId();
    return {
      id,
      orderNumber: id,
      orderType: 'Fabrication Only',
      revision: 0,
      isLocked: false,
      projectName: '',
      customerId: '',
      customerName: '',
      requestedBy: '',
      dateRequired: '',
      status: 'Draft',
      totalAreaFt2: 0,
      totalWeightLb: 0,
      totalPieces: 0,
      createdAt: new Date().toISOString(),
      createdBy: this.currentUserEmail(),
      pieces: []
    };
  }

  private prepareOrder(order: FabricationOrder, status: FabricationOrderStatus): FabricationOrder {
    const id = order.id || this.newId();
    const pieces = order.pieces || [];
    return {
      ...order,
      id,
      orderNumber: order.orderNumber || id,
      orderType: order.orderType || 'Fabrication Only',
      revision: order.revision ?? 0,
      isLocked: order.isLocked ?? false,
      customerId: order.customerId || '',
      customerName: order.customerName || '',
      projectName: order.projectName || '',
      requestedBy: order.requestedBy || '',
      dateRequired: order.dateRequired || '',
      status,
      pieces,
      totalAreaFt2: this.round(pieces.reduce((sum, p) => sum + (p.estimatedAreaFt2 || 0), 0)),
      totalWeightLb: this.round(pieces.reduce((sum, p) => sum + (p.estimatedWeightLb || 0), 0)),
      totalPieces: pieces.reduce((sum, p) => sum + Number(p.quantity || 1), 0),
      createdAt: order.createdAt || new Date().toISOString(),
      createdBy: order.createdBy || this.currentUserEmail()
    };
  }

  private normalizeOrder(order: Partial<FabricationOrder>): FabricationOrder {
    return {
      id: order.id || this.newId(),
      orderNumber: order.orderNumber || order.id || this.newId(),
      projectName: order.projectName || '',
      orderType: order.orderType || 'Fabrication Only',
      revision: order.revision ?? 0,
      isLocked: order.isLocked ?? false,
      customerId: order.customerId || '',
      customerName: order.customerName || '',
      requestedBy: order.requestedBy || '',
      dateRequired: order.dateRequired || '',
      status: order.status || 'Draft',
      totalAreaFt2: order.totalAreaFt2 || 0,
      totalWeightLb: order.totalWeightLb || 0,
      totalPieces: order.totalPieces || (order.pieces?.length ?? 0),
      finalFabricationPrice: order.finalFabricationPrice || 0,
      manufacturingCost: order.manufacturingCost || 0,
      createdAt: this.dateToString(order.createdAt),
      createdBy: order.createdBy || '',
      updatedAt: this.dateToString(order.updatedAt),
      updatedBy: order.updatedBy || '',
      submittedAt: this.dateToString(order.submittedAt),
      approvedAt: this.dateToString(order.approvedAt),
      approvedBy: order.approvedBy || '',
      productionAt: this.dateToString(order.productionAt),
      completedAt: this.dateToString(order.completedAt),
      pieces: order.pieces || []
    };
  }

  private dateToString(value: unknown): string {
    if (!value) return '';
    if (typeof value === 'string') return value;
    if (value instanceof Date) return value.toISOString();
    if (typeof value === 'object' && 'toDate' in value && typeof (value as { toDate: () => Date }).toDate === 'function') {
      return (value as { toDate: () => Date }).toDate().toISOString();
    }
    return String(value);
  }

  private currentUserEmail(): string {
    return this.auth.currentUser?.email || 'system';
  }

  private newId(): string {
    const date = new Date();
    const y = String(date.getFullYear()).slice(-2);
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    const time = String(date.getTime()).slice(-5);
    return `FAB-${y}${m}${d}-${time}`;
  }

  private round(value: number): number {
    return Math.round(value * 10) / 10;
  }
}
