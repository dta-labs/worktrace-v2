import {
  AsyncPipe,
  DatePipe
} from '@angular/common';
import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatTabsModule } from '@angular/material/tabs';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { BidFlowService, PartidaLine } from './bid-flow.service';
import { PartidasDialogComponent } from './partidas-dialog.component';

@Component({
  selector: 'app-bid-workspace-dialog',
  standalone: true,
  imports: [
    MatDialogModule,
    MatTabsModule,
    MatButtonModule,
    MatSelectModule,
    MatFormFieldModule,
    MatIconModule,
    MatTableModule,
    PartidasDialogComponent,
    AsyncPipe,
    DatePipe
  ],
  templateUrl: './bid-workspace-dialog.component.html',
  styleUrls: ['./bid-workspace-dialog.component.scss'],
})
export class BidWorkspaceDialogComponent {
  private dialogRef = inject(MatDialogRef<BidWorkspaceDialogComponent>);
  private data = inject(MAT_DIALOG_DATA) as { bidId: string; incomingId?: string; title?: string };

  private bidFlow = inject(BidFlowService);

  bidId = this.data?.bidId ?? '';
  incomingId: string | null = (this.data?.incomingId as any) ?? null;

  headerTitle = this.data?.title || 'Open Bid';

  bid$ = this.bidFlow.bid$(this.bidId);

  /** Current active version number (separate from audit revCounter). */
  currentVersion$: Observable<number> = this.bid$.pipe(
    map((b: any) => Number(b?.currentVersion ?? b?.versionCounter ?? b?.revCounter ?? 1))
  );

  /** Version snapshots list (newest first). */
  versions$ = this.bidFlow.versions$(this.bidId);

  /** Selected version (defaults to current). */
  selectedVersion: number | null = null;

  // Snapshot table columns
  snapshotCols: string[] = ['category', 'description', 'hours', 'amount'];

  ngOnInit(): void {
    if (!this.bidId) {
      throw new Error('BidWorkspaceDialogComponent: bidId is required');
    }

    // Default selected version = current
    this.currentVersion$.subscribe((v) => {
      if (this.selectedVersion === null) this.selectedVersion = v;
    });
  }

  close(): void {
    this.dialogRef.close();
  }

  get isViewingCurrent(): boolean {
    // Safe default: if not resolved yet, allow current view UI
    return true;
  }

  isCurrentSelected(current: number | null): boolean {
    if (current == null || this.selectedVersion == null) return true;
    return Number(this.selectedVersion) === Number(current);
  }

  snapshotPartidas$(versionNumber: number | null): Observable<PartidaLine[]> {
    if (!versionNumber) return this.bidFlow.partidasForVersion$(this.bidId, 0); // returns empty (no doc)
    return this.bidFlow.partidasForVersion$(this.bidId, Number(versionNumber));
  }

  async newRevision(): Promise<void> {
    const reason = window.prompt('Reason for new revision (e.g. Client changes, Pricing update):', '');
    if (!reason) return;

    try {
      const next = await this.bidFlow.createVersionSnapshot(this.bidId, reason.trim());
      this.selectedVersion = next;
    } catch (e: any) {
      console.error(e);
      alert(e?.message || 'Failed to create revision');
    }
  }
}
