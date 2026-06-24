import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { BuilderKind, ConnectionType, HorizontalDirection, TransitionVariant, VerticalDirection } from '../../core/models/shop.models';

@Component({
  selector: 'app-generated-preview',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './generated-preview.component.html',
  styleUrl: './generated-preview.component.scss'
})
export class GeneratedPreviewComponent {
  @Input() kind: BuilderKind = 'generic';
  @Input() image = '';
  @Input() dimensions: Record<string, string | number> = {};
  @Input() variant: TransitionVariant | string = 'Centered';
  @Input() inletConnection: ConnectionType = 'TDF';
  @Input() outletConnection: ConnectionType = 'S&D';
  @Input() horizontalDirection: HorizontalDirection = 'Right';
  @Input() verticalDirection: VerticalDirection = 'Up';

  d(k: string, f: string | number = '') {
    return this.dimensions?.[k] ?? f;
  }


  get offsetX() {
    return Number(this.d('offsetX', 0) || 0);
  }

  get offsetY() {
    return Number(this.d('offsetY', 0) || 0);
  }

  get offsetDescription() {
    const parts: string[] = [];
    if (this.offsetX) parts.push(`X=${this.offsetX}"`);
    if (this.offsetY) parts.push(`Y=${this.offsetY}"`);
    return parts.length ? parts.join(' / ') : 'None';
  }



  get dx() {
    const x = this.offsetX;
    if (this.horizontalDirection === 'Left') return -x * 3;
    return x * 3;
  }

  get dy() {
    const y = this.offsetY;
    if (this.verticalDirection === 'Up') return -y * 6;
    return y * 6;
  }

  get directionDescription() {
    const parts: string[] = [];
    if (this.offsetX) parts.push(`${this.offsetX}" ${this.horizontalDirection}`);
    if (this.offsetY) parts.push(`${this.offsetY}" ${this.verticalDirection}`);
    return parts.length ? parts.join(' / ') : 'None';
  }


  get transitionShape() {
    return {
      centered: this.variant === 'Centered',
      flatTop: this.variant === 'Flat Top',
      flatBottom: this.variant === 'Flat Bottom',
      flatLeft: this.variant === 'Flat Left',
      flatRight: this.variant === 'Flat Right',
      offsetLeft: this.variant === 'Offset Left',
      offsetRight: this.variant === 'Offset Right',
      offsetUp: this.variant === 'Offset Up',
      offsetDown: this.variant === 'Offset Down'
    };
  }

  get frontSmallY() {
    if (this.variant === 'Flat Top') return 85;
    if (this.variant === 'Flat Bottom') return 155;
    if (this.variant === 'Offset Up') return 75;
    if (this.variant === 'Offset Down') return 165;
    return 120;
  }

  get topSmallX() {
    if (this.variant === 'Flat Left') return 185;
    if (this.variant === 'Flat Right') return 265;
    if (this.variant === 'Offset Left') return 165;
    if (this.variant === 'Offset Right') return 285;
    return 225;
  }
}
