import { Injectable } from '@angular/core';
import { FabricationPiece } from '../../../models/shop.models';
import { PieceCalculationResult, PieceDrawingResult, PieceEngine } from '../../../models/engine.models';
import { GAUGE_WEIGHT_TABLE } from '../../shared/gauge-weight.table';
import { ConnectionEngineService } from '../../connection/connection-engine.service';
import { inchesToFeet2, n, round1 } from '../../shared/shop-math';

@Injectable({ providedIn: 'root' })
export class StraightDuctEngine implements PieceEngine {
  constructor(private connectionEngine: ConnectionEngineService) {}

  readonly engineId = 'straight-duct.rectangular.v1';
  readonly family = 'Straight Duct';
  readonly variant = 'Rectangular';

  canHandle(piece: FabricationPiece): boolean {
    return piece.fittingId === 'rectangular-duct' || piece.builderKind === 'straight';
  }

  calculate(piece: FabricationPiece): PieceCalculationResult {
    const width = n(piece.dimensions, 'width');
    const height = n(piece.dimensions, 'height');
    const length = n(piece.dimensions, 'length');

    const developedAreaIn2 = 2 * (width * length) + 2 * (height * length);
    const developedAreaFt2 = inchesToFeet2(developedAreaIn2);
    const gaugeRecord = GAUGE_WEIGHT_TABLE[String(piece.gauge)] ?? GAUGE_WEIGHT_TABLE['26'];
    const wasteFactor = 1.00;
    const sheetWeightLb = developedAreaFt2 * gaugeRecord.lbFt2 * wasteFactor;
    const connection = this.connectionEngine.calculate(piece);
    const connectionWeightLb = connection.totalAddedWeightLb;
    const weightLb = sheetWeightLb + connectionWeightLb;

    return {
      areaFt2: round1(developedAreaFt2),
      developedAreaFt2: round1(developedAreaFt2),
      weightLb: round1(weightLb),
      materialLbFt2: gaugeRecord.lbFt2,
      sheetWeightLb: round1(sheetWeightLb),
      connectionWeightLb: round1(connectionWeightLb),
      reinforcementWeightLb: 0,
      connection,
      wasteFactor,
      smacna: {
        status: 'unverified',
        source: gaugeRecord.source === 'SMT_CALIBRATION' ? 'SMT_INTERNAL' : 'SHOP_PLACEHOLDER',
        message: 'Geometry and weight calculated. SMACNA construction validation is pending until the official table data is entered.',
        ruleReference: 'SMACNA 4th Edition table reference pending',
        selectedValue: `${piece.gauge}ga`,
        overrideRequired: false
      },
      notes: [
        'Straight rectangular duct developed area = 2(width × length) + 2(height × length).',
        `Sheet weight: ${round1(sheetWeightLb)} lb. Connection weight: ${round1(connectionWeightLb)} lb.`,
        gaugeRecord.note,
        ...connection.notes
      ]
    };
  }

  draw(piece: FabricationPiece): PieceDrawingResult {
    const width = n(piece.dimensions, 'width');
    const height = n(piece.dimensions, 'height');
    const length = n(piece.dimensions, 'length');

    return {
      viewBox: '0 0 360 180',
      svgPath: 'M40 45 H260 L320 85 V135 H100 L40 95 Z M40 45 L100 85 M260 45 L320 85 M100 85 H320 M100 85 V135',
      labels: [
        { x: 145, y: 35, text: `L ${length}"` },
        { x: 22, y: 76, text: `W ${width}"` },
        { x: 210, y: 160, text: `H ${height}"` }
      ]
    };
  }
}
