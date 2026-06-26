
import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-location-view-dialog',
  imports: [MatDialogModule, MatButtonModule],
  template: `
    <h2 mat-dialog-title>Jobsite Address</h2>
    <div mat-dialog-content>
      <div class="addr">{{ address }}</div>

      <div class="meta">
        <div class="row">
          <span class="k">Office</span>
          <span class="v">{{ officeAddress }}</span>
        </div>
        <div class="row">
          <span class="k">Distance</span>
          <span class="v">Open the route in Maps to see miles & drive time.</span>
        </div>
        <div class="row">
          <span class="k">Per diem</span>
          <span class="v">Likely if round trip &gt; 60 mi. Hotel may be needed if &gt; 100 mi.</span>
        </div>
      </div>

      <div class="hint">This is the physical jobsite address saved on the Incoming Bid.</div>
    </div>

    <div mat-dialog-actions align="end">
      <button mat-stroked-button (click)="copy()">Copy</button>
      <button mat-stroked-button (click)="openMaps()">Open Maps</button>
      <button mat-stroked-button (click)="openRoute()">Open Route</button>
      <button mat-flat-button color="primary" (click)="close()" data-cy="close-modal-btn">Close</button>
    </div>
  `,
  styles: [
    `
      .addr{white-space:pre-wrap;line-height:1.5;font-size:14px;padding:10px 12px;border-radius:12px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.04)}
      .meta{margin-top:12px;padding:10px 12px;border-radius:12px;border:1px solid rgba(255,255,255,.10);background:rgba(255,255,255,.02)}
      .row{display:flex;gap:10px;align-items:flex-start;margin:6px 0}
      .k{min-width:72px;opacity:.85;font-size:12px}
      .v{flex:1;font-size:12px;opacity:.92;line-height:1.4}
      .hint{opacity:.75;font-size:12px;margin-top:10px}
    `,
  ]
})
export class LocationViewDialogComponent {
  private ref = inject(MatDialogRef<LocationViewDialogComponent>);
  private data = inject(MAT_DIALOG_DATA) as { address?: string };

  // Fixed office location (used for quick route checks in Google Maps)
  officeAddress = '6525 Old Winter Garden Rd, Orlando, FL';

  get address(): string {
    return (this.data?.address ?? '').toString().trim() || '—';
  }

  close() {
    this.ref.close();
  }

  async copy() {
    const text = this.address;
    if (!text || text === '—') return;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // ignore (clipboard permission)
    }
  }

  openMaps() {
    const q = encodeURIComponent(this.address);
    if (!q || q === '%E2%80%94') return;
    window.open(`https://www.google.com/maps/search/?api=1&query=${q}`, '_blank');
  }

  openRoute() {
    const origin = encodeURIComponent(this.officeAddress);
    const dest = encodeURIComponent(this.address);
    if (!dest || dest === '%E2%80%94') return;
    window.open(`https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${dest}&travelmode=driving`, '_blank');
  }
}
