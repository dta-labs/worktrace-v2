import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { Firestore, collection, collectionData, orderBy, query, where } from '@angular/fire/firestore';
import { Observable, map } from 'rxjs';

import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';

import { BidInboxItem } from './bid-inbox.service';

@Component({
  selector: 'app-incoming-bids-trash-page',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatTableModule],
  styles: [`
    .table-wrap, .list-scroll { min-height: 0; }
    table.wt-table, .wt-table.mat-mdc-table, .wt-table .mdc-data-table__table, .wt-table .mdc-data-table__content, .wt-table tbody { width: 100%; background: transparent !important; }
    .wt-table { --mat-table-background-color: transparent !important; }
    .wt-table .mat-mdc-header-row, .wt-table tr.mat-mdc-header-row, .wt-table .mdc-data-table__header-row { background: rgba(8, 10, 16, 0.98) !important; }
    .wt-table .mat-mdc-row, .wt-table tr.mat-mdc-row, .wt-table .mdc-data-table__row, .wt-table tbody > tr { background: rgba(12, 12, 16, 0.96) !important; }
    .wt-table .mat-mdc-header-cell, .wt-table th.mat-mdc-header-cell, .wt-table .mdc-data-table__header-cell, .wt-table thead th { background: rgba(8, 10, 16, 0.98) !important; color: rgba(255,255,255,.78) !important; border-bottom-color: rgba(255,255,255,.10) !important; }
    .wt-table .mat-mdc-cell, .wt-table td.mat-mdc-cell, .wt-table .mdc-data-table__cell, .wt-table tbody td { background: rgba(12, 12, 16, 0.96) !important; color: rgba(255,255,255,.92) !important; border-bottom-color: rgba(255,255,255,.08) !important; }
    .wt-table .mat-mdc-row:hover .mat-mdc-cell, .wt-table tbody > tr:hover > td { background: rgba(255,255,255,.03) !important; }
  `],
  template: `
    <div class="tab-content">
      <mat-card class="page">
        <div class="page__header">
          <div>
            <h1>Incoming Bids Trash</h1>
            <p class="muted">Soft-deleted incoming requests (with reason + audit).</p>
          </div>
        </div>

        <div class="table-wrap" *ngIf="trash$ | async as rows">
          <div class="list-scroll">
            <div class="empty" *ngIf="!rows.length">
              <p>No trashed incoming bids.</p>
            </div>

            <table mat-table [dataSource]="rows" class="wt-table" *ngIf="rows.length">

              <ng-container matColumnDef="deletedAt">
                <th mat-header-cell *matHeaderCellDef>Deleted At</th>
                <td mat-cell *matCellDef="let r">{{ r.deletedAtJs | date:'MM/dd/yyyy h:mm a' }}</td>
              </ng-container>

              <ng-container matColumnDef="client">
                <th mat-header-cell *matHeaderCellDef>Client</th>
                <td mat-cell *matCellDef="let r">{{ r.client }}</td>
              </ng-container>

              <ng-container matColumnDef="projectName">
                <th mat-header-cell *matHeaderCellDef>Project</th>
                <td mat-cell *matCellDef="let r">{{ r.projectName }}</td>
              </ng-container>

              <ng-container matColumnDef="deletedBy">
                <th mat-header-cell *matHeaderCellDef>Deleted By</th>
                <td mat-cell *matCellDef="let r">{{ r.deletedByEmail || '—' }}</td>
              </ng-container>

              <ng-container matColumnDef="reason">
                <th mat-header-cell *matHeaderCellDef>Reason</th>
                <td mat-cell *matCellDef="let r">{{ r.deleteReason || '—' }}</td>
              </ng-container>

              <tr mat-header-row *matHeaderRowDef="columns"></tr>
              <tr mat-row *matRowDef="let row; columns: columns"></tr>
            </table>
          </div>
        </div>
      </mat-card>
    </div>
  `,
})
export class IncomingBidsTrashPageComponent {
  private fs = inject(Firestore);

  columns: string[] = ['deletedAt', 'client', 'projectName', 'deletedBy', 'reason'];

  trash$: Observable<(BidInboxItem & { deletedAtJs: Date | null })[]> = (
    collectionData(
      query(
        collection(this.fs, 'bidInbox'),
        where('deleted', '==', true),
        orderBy('deletedAt', 'desc')
      ),
      { idField: 'id' }
    ) as Observable<BidInboxItem[]>
  ).pipe(
    map((rows) =>
      (rows ?? []).map((r: any) => {
        const v = (r as any)?.deletedAt;
        const deletedAtJs = typeof v?.toDate === 'function' ? v.toDate() : (v instanceof Date ? v : null);
        return {
          ...r,
          client: (r as any)?.client ?? '',
          projectName: (r as any)?.projectName ?? '',
          deletedAtJs,
        };
      })
    )
  );
}
