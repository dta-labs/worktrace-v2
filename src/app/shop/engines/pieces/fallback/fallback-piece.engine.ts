import { Injectable } from '@angular/core';
import { FabricationPiece, BuilderKind } from '../../../models/shop.models';
import { PieceCalculationResult, PieceEngine } from '../../../models/engine.models';
import { GAUGE_WEIGHT_TABLE } from '../../shared/gauge-weight.table';
import { inchesToFeet2, n, round1 } from '../../shared/shop-math';

@Injectable({ providedIn: 'root' })
export class FallbackPieceEngine implements PieceEngine {
  readonly engineId = 'fallback.legacy-area.v1';
  readonly family = 'Legacy Fallback';
  readonly variant = 'Legacy';

  canHandle(_piece: FabricationPiece): boolean {
    return true;
  }

  calculate(piece: FabricationPiece): PieceCalculationResult {
    const areaFt2 = this.calculateAreaFt2(piece.builderKind, piece.dimensions);
    const gaugeRecord = GAUGE_WEIGHT_TABLE[String(piece.gauge)] ?? GAUGE_WEIGHT_TABLE['26'];
    const weightLb = areaFt2 * gaugeRecord.lbFt2;

    return {
      areaFt2: round1(areaFt2),
      developedAreaFt2: round1(areaFt2),
      weightLb: round1(weightLb),
      materialLbFt2: gaugeRecord.lbFt2,
      wasteFactor: 1,
      smacna: {
        status: 'unverified',
        source: 'SHOP_PLACEHOLDER',
        message: 'This piece is using the legacy fallback calculator until its dedicated engine is created.',
        ruleReference: 'Dedicated engine pending',
        selectedValue: `${piece.gauge}ga`,
        overrideRequired: false
      },
      notes: ['Legacy fallback calculation. Replace with a dedicated piece engine before production validation.']
    };
  }

  private calculateAreaFt2(kind: BuilderKind, d: Record<string, string | number>): number {
    if (kind === 'transition') return this.transition(d);
    if (kind === 'elbow90' || kind === 'elbow45') return this.elbow(d);
    if (kind === 'offset') return this.offset(d);
    return this.genericBox(d);
  }

  private transition(d: Record<string, string | number>): number {
    const A1 = n(d, 'widthA');
    const B1 = n(d, 'heightA');
    const A2 = n(d, 'widthB');
    const B2 = n(d, 'heightB');
    const L = n(d, 'length');
    const offsetX = n(d, 'offsetX');
    const offsetY = n(d, 'offsetY');

    const topSlant = Math.sqrt(L * L + Math.pow(Math.abs(A1 - A2) / 2 + offsetX, 2));
    const sideSlant = Math.sqrt(L * L + Math.pow(Math.abs(B1 - B2) / 2 + offsetY, 2));

    const topArea = ((A1 + A2) / 2) * topSlant;
    const bottomArea = topArea;
    const sideArea1 = ((B1 + B2) / 2) * sideSlant;
    const sideArea2 = sideArea1;

    return inchesToFeet2(topArea + bottomArea + sideArea1 + sideArea2);
  }

  private elbow(d: Record<string, string | number>): number {
    const A = n(d, 'width');
    const B = n(d, 'height');
    const R = Math.max(n(d, 'radius'), 1);
    const angle = n(d, 'angle') || 90;
    const inletNeck = n(d, 'inletNeck') || 6;
    const outletNeck = n(d, 'outletNeck') || 6;

    const perimeter = 2 * (A + B);
    const arc = 2 * Math.PI * R * (angle / 360);
    const bodyAreaIn2 = perimeter * arc;
    const neckAreaIn2 = perimeter * inletNeck + perimeter * outletNeck;
    return inchesToFeet2(bodyAreaIn2 + neckAreaIn2);
  }

  private offset(d: Record<string, string | number>): number {
    const A = n(d, 'width');
    const B = n(d, 'height');
    const L = n(d, 'length');
    const O = n(d, 'offset') || n(d, 'offsetX') || n(d, 'offsetY');
    const slant = Math.sqrt(L * L + O * O);
    return inchesToFeet2(2 * (A * slant) + 2 * (B * slant));
  }

  private genericBox(d: Record<string, string | number>): number {
    const A = n(d, 'width') || n(d, 'mainWidth') || 24;
    const B = n(d, 'height') || n(d, 'mainHeight') || 12;
    const L = n(d, 'length') || n(d, 'depth') || 24;
    return inchesToFeet2(2 * (A * L) + 2 * (B * L));
  }
}
