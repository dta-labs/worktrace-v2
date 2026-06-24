import { Injectable } from '@angular/core';
import { FabricationOrder } from '../models/shop.models';

@Injectable({ providedIn: 'root' })
export class OrderStoreService {
  private key = 'shop-v6-orders';
  list(): FabricationOrder[] { return JSON.parse(localStorage.getItem(this.key) || '[]'); }
  save(order: FabricationOrder): void {
    const orders = this.list();
    const index = orders.findIndex(o => o.id === order.id);
    order.updatedAt = new Date().toISOString();
    if (index >= 0) orders[index] = order; else orders.unshift(order);
    localStorage.setItem(this.key, JSON.stringify(orders));
  }
  get(id: string): FabricationOrder | undefined { return this.list().find(o => o.id === id); }
}
