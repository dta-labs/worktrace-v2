import { CommonModule } from '@angular/common';
import { Component, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Subject, combineLatest, map, takeUntil } from 'rxjs';
import { FabricationOrder, FabricationOrderStatus } from '../../models/shop.models';
import { OrderStoreService } from '../../services/order-store.service';

@Component({
  selector: 'app-shop-orders-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './orders-list.component.html',
  styleUrl: './orders-list.component.scss'
})
export class OrdersListComponent implements OnDestroy {
  private readonly destroy$ = new Subject<void>();

  statuses: Array<FabricationOrderStatus | 'All'> = [
    'All',
    'Draft',
    'Pending Approval',
    'Approved',
    'In Production',
    'Completed',
    'Cancelled'
  ];

  orders: FabricationOrder[] = [];
  filteredOrders: FabricationOrder[] = [];
  selectedStatus: FabricationOrderStatus | 'All' = 'All';
  query = '';
  isLoading = true;
  error = '';

  constructor(
    private readonly orderStore: OrderStoreService,
    private readonly route: ActivatedRoute
  ) {
    combineLatest([this.orderStore.list(), this.route.queryParamMap]).pipe(
      map(([orders, params]) => {
        const status = params.get('status') as FabricationOrderStatus | null;
        if (status && this.statuses.includes(status)) this.selectedStatus = status;
        return orders;
      }),
      takeUntil(this.destroy$)
    ).subscribe({
      next: orders => {
        this.orders = orders;
        this.applyFilters();
        this.isLoading = false;
      },
      error: err => {
        console.error('[SHOP] Orders list failed', err);
        this.error = 'Could not load fabrication orders. Check Firestore permissions or connection.';
        this.isLoading = false;
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  applyFilters(): void {
    const term = this.query.trim().toLowerCase();
    this.filteredOrders = this.orders.filter(order => {
      const statusMatch = this.selectedStatus === 'All' || order.status === this.selectedStatus;
      const text = [
        order.orderNumber,
        order.customerName,
        order.projectName,
        order.requestedBy,
        order.status
      ].join(' ').toLowerCase();
      return statusMatch && (!term || text.includes(term));
    });
  }

  statusClass(status: FabricationOrderStatus): string {
    return status.toLowerCase().replace(/\s+/g, '-');
  }

  formatDate(value?: string): string {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString();
  }
}
