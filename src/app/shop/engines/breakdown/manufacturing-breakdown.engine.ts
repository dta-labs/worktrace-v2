import { Injectable } from '@angular/core';
import { FabricationPiece, ShopManufacturingBreakdown } from '../../models/shop.models';
import { PieceCalculationResult } from '../../models/engine.models';
import { round1 } from '../shared/shop-math';

@Injectable({ providedIn: 'root' })
export class ManufacturingBreakdownEngine {
  build(piece: FabricationPiece, calc: PieceCalculationResult): ShopManufacturingBreakdown {
    const qty = Number(piece.quantity || 1);
    const sheetMetalFt2 = calc.areaFt2;
    const developedAreaFt2 = calc.developedAreaFt2;
    const connection = calc.connection;

    let tdfLinearFt = 0;
    let tdcLinearFt = 0;
    let rawEdgeLinearFt = 0;
    let customLinearFt = 0;
    let slipPieces = 0;
    let drivePieces = 0;
    let corners = 0;
    let screws = 0;
    let cleats = 0;

    for (const end of connection?.ends ?? []) {
      const perimeterFt = Number(end.perimeterFt || 0) * qty;
      const type = String(end.type || '');

      if (type === 'TDF') {
        tdfLinearFt += perimeterFt;
        corners += 4 * qty;
        screws += this.screwsForPerimeter(perimeterFt);
      } else if (type === 'TDC') {
        tdcLinearFt += perimeterFt;
        corners += 4 * qty;
        screws += this.screwsForPerimeter(perimeterFt);
      } else if (type === 'S&D') {
        slipPieces += 2 * qty;
        drivePieces += 2 * qty;
        cleats += 2 * qty;
        screws += this.screwsForPerimeter(perimeterFt) / 2;
      } else if (type === 'Slip') {
        slipPieces += 2 * qty;
      } else if (type === 'Drive') {
        drivePieces += 2 * qty;
        cleats += 2 * qty;
      } else if (type === 'Raw Edge') {
        rawEdgeLinearFt += perimeterFt;
      } else {
        customLinearFt += perimeterFt;
      }
    }

    // Placeholder conversion for reporting only. Move to Shop Configuration before production use.
    const tdfMaterialFt2 = round1(tdfLinearFt * 0.08);

    return {
      sheetMetalFt2: round1(sheetMetalFt2),
      developedAreaFt2: round1(developedAreaFt2),
      connectionMaterial: {
        tdfLinearFt: round1(tdfLinearFt),
        tdfMaterialFt2,
        tdcLinearFt: round1(tdcLinearFt),
        slipPieces: Math.round(slipPieces),
        drivePieces: Math.round(drivePieces),
        rawEdgeLinearFt: round1(rawEdgeLinearFt),
        customLinearFt: round1(customLinearFt)
      },
      accessories: {
        corners: Math.round(corners),
        screws: Math.round(screws),
        cleats: Math.round(cleats),
        tieRods: 0,
        gClips: 0
      },
      weight: {
        sheetMetalLb: round1(calc.sheetWeightLb || 0),
        connectionsLb: round1(calc.connectionWeightLb || 0),
        reinforcementLb: round1(calc.reinforcementWeightLb || 0),
        accessoriesLb: 0,
        totalLb: round1(calc.weightLb || 0)
      },
      labor: {
        connectionMinutes: round1(connection?.totalLaborMinutes || 0),
        assemblyMinutes: 0,
        totalMinutes: round1(connection?.totalLaborMinutes || 0)
      },
      notes: [
        'Internal shop breakdown. Customer approval documents should not show screws, corners, cleats, labor, or cost by default.',
        'Accessory counts and TDF material conversion are configurable shop placeholders until SMT production standards are entered.'
      ]
    };
  }

  private screwsForPerimeter(perimeterFt: number): number {
    return Math.ceil(perimeterFt * 2);
  }
}
