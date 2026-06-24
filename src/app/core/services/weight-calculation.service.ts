import { Injectable } from '@angular/core';
import { BuilderKind, FabricationPiece } from '../models/shop.models';

export interface WeightResult {
  areaFt2: number;
  weightLb: number;
}

@Injectable({ providedIn: 'root' })
export class WeightCalculationService {
  private readonly gaugeWeightLbFt2: Record<string, number> = {
    // SHOP calibrated weights in lb/ft².
    // 26ga = 1.00 lb/ft² by shop calibration.
    '26': 1.00,
    '24': 1.25,
    '22': 1.56,
    '20': 2.00,
    '18': 2.50,
    '16': 3.13
  };

  calculate(piece: FabricationPiece): WeightResult {
    const single = this.calculateSinglePiece(piece);
    const qty = Number(piece.quantity || 1);
    return {
      areaFt2: this.round(single.areaFt2 * qty),
      weightLb: this.round(single.weightLb * qty)
    };
  }

  calculateSinglePiece(piece: FabricationPiece): WeightResult {
    const areaFt2 = this.calculateAreaFt2(piece.builderKind, piece.dimensions);
    const gaugeFactor = this.gaugeWeightLbFt2[String(piece.gauge)] ?? 1;
    const wasteFactor = 1.00;
    return {
      areaFt2: this.round(areaFt2),
      weightLb: this.round(areaFt2 * gaugeFactor * wasteFactor)
    };
  }

  private calculateAreaFt2(kind: BuilderKind, d: Record<string, string | number>): number {
    if (kind === 'straight') return this.straightDuct(d);
    if (kind === 'transition') return this.transition(d);
    if (kind === 'elbow90' || kind === 'elbow45') return this.elbow(d);
    if (kind === 'offset') return this.offset(d);
    return this.genericBox(d);
  }

  private straightDuct(d: Record<string, string | number>): number {
    const A = this.n(d, 'width');
    const B = this.n(d, 'height');
    const L = this.n(d, 'length');
    return (2 * (A * L) + 2 * (B * L)) / 144;
  }

  private transition(d: Record<string, string | number>): number {
    const A1 = this.n(d, 'widthA');
    const B1 = this.n(d, 'heightA');
    const A2 = this.n(d, 'widthB');
    const B2 = this.n(d, 'heightB');
    const L = this.n(d, 'length');
    const offsetX = this.n(d, 'offsetX');
    const offsetY = this.n(d, 'offsetY');

    const topSlant = Math.sqrt(L * L + Math.pow(Math.abs(A1 - A2) / 2 + offsetX, 2));
    const sideSlant = Math.sqrt(L * L + Math.pow(Math.abs(B1 - B2) / 2 + offsetY, 2));

    const topArea = ((A1 + A2) / 2) * topSlant;
    const bottomArea = topArea;
    const sideArea1 = ((B1 + B2) / 2) * sideSlant;
    const sideArea2 = sideArea1;

    return (topArea + bottomArea + sideArea1 + sideArea2) / 144;
  }

  private elbow(d: Record<string, string | number>): number {
    const A = this.n(d, 'width');
    const B = this.n(d, 'height');
    const R = Math.max(this.n(d, 'radius'), 1);
    const angle = this.n(d, 'angle') || 90;
    const inletNeck = this.n(d, 'inletNeck') || 6;
    const outletNeck = this.n(d, 'outletNeck') || 6;

    const perimeter = 2 * (A + B);
    const arc = 2 * Math.PI * R * (angle / 360);

    const bodyAreaIn2 = perimeter * arc;
    const neckAreaIn2 = perimeter * inletNeck + perimeter * outletNeck;

    return (bodyAreaIn2 + neckAreaIn2) / 144;
  }

  private offset(d: Record<string, string | number>): number {
    const A = this.n(d, 'width');
    const B = this.n(d, 'height');
    const L = this.n(d, 'length');
    const O = this.n(d, 'offset') || this.n(d, 'offsetX') || this.n(d, 'offsetY');
    const slant = Math.sqrt(L * L + O * O);
    return (2 * (A * slant) + 2 * (B * slant)) / 144;
  }

  private genericBox(d: Record<string, string | number>): number {
    const A = this.n(d, 'width') || this.n(d, 'mainWidth') || 24;
    const B = this.n(d, 'height') || this.n(d, 'mainHeight') || 12;
    const L = this.n(d, 'length') || this.n(d, 'depth') || 24;
    return (2 * (A * L) + 2 * (B * L)) / 144;
  }

  private n(d: Record<string, string | number>, key: string): number {
    return Number(d?.[key] || 0);
  }

  private round(value: number): number {
    return Math.round(value * 10) / 10;
  }
}
