import { Injectable } from '@angular/core';
import { ConnectionType, FabricationPiece } from '../../models/shop.models';
import { CONNECTION_WEIGHT_TABLE, ConnectionWeightRecord } from '../shared/connection-weight.table';
import { round1 } from '../shared/shop-math';

export interface ConnectionEndBreakdown {
  end: 'inlet' | 'outlet';
  type: ConnectionType;
  perimeterIn: number;
  perimeterFt: number;
  addedWeightLb: number;
  laborMinutes: number;
  materialCost: number;
  source: ConnectionWeightRecord['source'];
  note: string;
}

export interface ConnectionCalculationResult {
  totalAddedWeightLb: number;
  totalLaborMinutes: number;
  totalMaterialCost: number;
  ends: ConnectionEndBreakdown[];
  notes: string[];
}

@Injectable({ providedIn: 'root' })
export class ConnectionEngineService {
  calculate(piece: FabricationPiece): ConnectionCalculationResult {
    const perimeterIn = this.getConnectionPerimeterIn(piece);
    const inlet = this.calculateEnd('inlet', piece.inletConnection, perimeterIn);
    const outlet = this.calculateEnd('outlet', piece.outletConnection, perimeterIn);
    const ends = [inlet, outlet];

    return {
      totalAddedWeightLb: round1(ends.reduce((sum, end) => sum + end.addedWeightLb, 0)),
      totalLaborMinutes: round1(ends.reduce((sum, end) => sum + end.laborMinutes, 0)),
      totalMaterialCost: round1(ends.reduce((sum, end) => sum + end.materialCost, 0)),
      ends,
      notes: ends.map(end => `${end.end} ${end.type}: +${end.addedWeightLb} lb connection weight. ${end.note}`)
    };
  }

  private calculateEnd(end: 'inlet' | 'outlet', type: ConnectionType, perimeterIn: number): ConnectionEndBreakdown {
    const record = CONNECTION_WEIGHT_TABLE[type] ?? CONNECTION_WEIGHT_TABLE['Custom'];
    const perimeterFt = perimeterIn / 12;

    return {
      end,
      type,
      perimeterIn: round1(perimeterIn),
      perimeterFt: round1(perimeterFt),
      addedWeightLb: round1(perimeterFt * record.lbPerLinearFt),
      laborMinutes: round1(perimeterFt * record.laborMinutesPerLinearFt),
      materialCost: round1(perimeterFt * record.materialCostPerLinearFt),
      source: record.source,
      note: record.note
    };
  }

  private getConnectionPerimeterIn(piece: FabricationPiece): number {
    const d = piece.dimensions;
    const width = Number(d['width'] || d['widthA'] || d['inletWidth'] || 0);
    const height = Number(d['height'] || d['heightA'] || d['inletHeight'] || 0);
    return 2 * (width + height);
  }
}
