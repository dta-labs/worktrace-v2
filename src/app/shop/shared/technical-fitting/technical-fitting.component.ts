import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { ConnectionSide, ConnectionType, FittingKind } from '../../core/models/shop.models';

@Component({
  selector: 'app-technical-fitting',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './technical-fitting.component.html',
  styleUrl: './technical-fitting.component.scss'
})
export class TechnicalFittingComponent {
  @Input() kind: FittingKind = 'straight';
  @Input() dimensions: Record<string, string | number> = {};
  @Input() connectionType: ConnectionType = 'TDF';
  @Input() connectionSide: ConnectionSide = 'Both Ends';
  @Input() compact = false;

  d(key: string, fallback: string | number = ''): string | number {
    return this.dimensions?.[key] ?? fallback;
  }

  connectionLabel(side: 'inlet' | 'outlet'): string {
    if (this.connectionSide === 'None') return 'No Conn.';
    if (this.connectionSide === 'Both Ends') return this.connectionType;
    if (this.connectionSide === 'Inlet Only') return side === 'inlet' ? this.connectionType : 'Raw';
    if (this.connectionSide === 'Outlet Only') return side === 'outlet' ? this.connectionType : 'Raw';
    return this.connectionType;
  }
}
