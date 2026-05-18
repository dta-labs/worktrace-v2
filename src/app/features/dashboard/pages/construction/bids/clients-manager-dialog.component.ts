import { CommonModule } from '@angular/common';
import { Component, DestroyRef, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { ClientsService, ClientItem } from './clients.service';
import { ClientDialogComponent } from './client-dialog.component';

@Component({
  selector: 'app-clients-manager-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule],
  template: `
    <div class="wt-modal" role="dialog" aria-modal="true">
      <div class="wt-modal-head">
        <div>
          <div class="wt-modal-title">Clients</div>
          <div class="muted">Select, add, and maintain client companies used in Bid Inbox.</div>
        </div>
        <button type="button" class="wt-icon-btn" (click)="close()">✕</button>
      </div>

      <div class="toolbar">
        <input class="search" type="text" [(ngModel)]="q" placeholder="Search clients..." />
        <button type="button" class="btn btn-primary" (click)="addClient()">+ Add Client</button>
      </div>

      <div class="list" *ngIf="filtered.length; else empty">
        <div class="row head">
          <div>Name</div>
          <div>Main Contact</div>
          <div>Email</div>
          <div>Phone</div>
          <div class="right">Active</div>
        </div>

        <button class="row" type="button" *ngFor="let c of filtered" (click)="editClient(c)">
          <div class="name">{{ c.name }}</div>
          <div>{{ c.mainContactName || '—' }}</div>
          <div>{{ c.mainContactEmail || '—' }}</div>
          <div>{{ c.mainContactPhone || '—' }}</div>
          <div class="right">
            <span class="badge" [class.badge--off]="c.isActive === false">{{ c.isActive === false ? 'No' : 'Yes' }}</span>
          </div>
        </button>
      </div>

      <ng-template #empty>
        <div class="empty">No clients yet. Click <b>+ Add Client</b> to create your first client.</div>
      </ng-template>

      <div class="wt-modal-actions">
        <button type="button" class="btn" (click)="close()">Close</button>
      </div>
    </div>
  `,
  styles: [
    `
      .wt-modal{box-sizing:border-box;width:min(980px,92vw);max-height:82vh;overflow-y:auto;overflow-x:hidden;background:#0f1115;border:1px solid rgba(255,255,255,.08);border-radius:16px;padding:14px}
      .wt-modal-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding:6px 6px 12px}
      .wt-modal-title{font-size:18px;font-weight:800}
      .muted{opacity:.75;font-size:12px;margin-top:4px}
      .wt-icon-btn{background:transparent;border:0;color:#fff;font-size:18px;cursor:pointer}

      .toolbar{display:flex;gap:10px;align-items:center;padding:0 6px 12px}
      .search{flex:1;box-sizing:border-box;width:100%;background:#12151b;border:1px solid rgba(255,255,255,.10);border-radius:12px;color:#fff;padding:10px 12px}
      .btn{border:1px solid rgba(255,255,255,.16);background:rgba(255,255,255,.04);color:#fff;border-radius:12px;padding:10px 14px;cursor:pointer;font-weight:700}
      .btn:hover{background:rgba(255,255,255,.08)}
      .btn-primary{border-color:rgba(106,163,255,.55);background:rgba(106,163,255,.18)}
      .btn-primary:hover{background:rgba(106,163,255,.26)}

      .list{padding:0 6px}
      .row{display:grid;grid-template-columns:2fr 1.2fr 1.6fr 1fr .6fr;gap:10px;align-items:center;padding:10px 12px;border:1px solid rgba(255,255,255,.08);border-radius:12px;background:rgba(255,255,255,.02);margin-bottom:10px}
      .row.head{background:transparent;border:0;opacity:.75;font-size:12px;padding:0 12px;margin:0 0 8px}
      button.row{width:100%;text-align:left}
      button.row:hover{background:rgba(106,163,255,.06);border-color:rgba(106,163,255,.22)}
      .name{font-weight:700}
      .right{text-align:right}
      .badge{display:inline-block;padding:4px 10px;border-radius:999px;border:1px solid rgba(106,163,255,.40);background:rgba(106,163,255,.14);font-size:12px}
      .badge--off{border-color:rgba(255,255,255,.22);background:rgba(255,255,255,.06)}
      .empty{padding:16px 6px;opacity:.78}
      .wt-modal-actions{display:flex;justify-content:flex-end;gap:10px;padding:10px 6px 0}

      @media (max-width: 900px){
        .row{grid-template-columns:1fr}
        .row.head{display:none}
        .right{text-align:left}
      }
    `,
  ],
})
export class ClientsManagerDialogComponent {
  private clientsSvc = inject(ClientsService);
  private dialog = inject(MatDialog);
  private ref = inject(MatDialogRef<ClientsManagerDialogComponent>);
  private destroyRef = inject(DestroyRef);

  q = '';
  clients: ClientItem[] = [];

  get filtered(): ClientItem[] {
    const s = (this.q ?? '').toString().trim().toLowerCase();
    if (!s) return this.clients;
    return this.clients.filter((c) => (c.name ?? '').toLowerCase().includes(s));
  }

  constructor() {
    this.clientsSvc
      .clients$()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((rows) => (this.clients = rows ?? []));
  }

  close() {
    this.ref.close();
  }

  addClient() {
    this.dialog.open(ClientDialogComponent, {
      width: '760px',
      maxWidth: '96vw',
      panelClass: 'wt-dialog-panel',
      data: {},
    });
  }

  editClient(c: ClientItem) {
    this.dialog.open(ClientDialogComponent, {
      width: '760px',
      maxWidth: '96vw',
      panelClass: 'wt-dialog-panel',
      data: {
        name: c.name,
        mainContactName: c.mainContactName,
        mainContactEmail: c.mainContactEmail,
        mainContactPhone: c.mainContactPhone,
        notes: c.notes,
      },
    });
  }
}
