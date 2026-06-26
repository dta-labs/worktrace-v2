import { Injectable } from '@angular/core';
import { FabricationPiece } from '../models/shop.models';
import { PieceEngineRegistryService } from '../engines/piece-engine-registry.service';
import { PieceCalculationResult } from '../models/engine.models';
import { ManufacturingBreakdownEngine } from '../engines/breakdown/manufacturing-breakdown.engine';

export interface WeightResult extends PieceCalculationResult {}

@Injectable({ providedIn: 'root' })
export class WeightCalculationService {
  constructor(private registry: PieceEngineRegistryService, private breakdownEngine: ManufacturingBreakdownEngine) {}

  calculate(piece: FabricationPiece): WeightResult {
    const single = this.calculateSinglePiece(piece);
    const qty = Number(piece.quantity || 1);
    return {
      ...single,
      areaFt2: this.round(single.areaFt2 * qty),
      developedAreaFt2: this.round(single.developedAreaFt2 * qty),
      weightLb: this.round(single.weightLb * qty),
      laborMinutes: single.laborMinutes === undefined ? undefined : this.round(single.laborMinutes * qty),
      materialCost: single.materialCost === undefined ? undefined : this.round(single.materialCost * qty),
      laborCost: single.laborCost === undefined ? undefined : this.round(single.laborCost * qty),
      totalCost: single.totalCost === undefined ? undefined : this.round(single.totalCost * qty)
    };
  }

  calculateSinglePiece(piece: FabricationPiece): WeightResult {
    return this.registry.calculate(piece);
  }

  applyCalculation(piece: FabricationPiece): FabricationPiece {
    const calc = this.calculate(piece);
    const engine = this.registry.getEngine(piece);
    return {
      ...piece,
      estimatedAreaFt2: calc.areaFt2,
      estimatedWeightLb: calc.weightLb,
      developedAreaFt2: calc.developedAreaFt2,
      materialLbFt2: calc.materialLbFt2,
      laborMinutes: calc.laborMinutes,
      materialCost: calc.materialCost,
      laborCost: calc.laborCost,
      totalCost: calc.totalCost,
      smacnaStatus: calc.smacna.status,
      smacnaMessage: calc.smacna.message,
      smacnaRuleReference: calc.smacna.ruleReference,
      sheetWeightLb: calc.sheetWeightLb,
      connectionWeightLb: calc.connectionWeightLb,
      reinforcementWeightLb: calc.reinforcementWeightLb,
      connectionSummary: calc.connection?.ends?.map(end => `${end.end} ${end.type}: +${end.addedWeightLb} lb`).join(' | '),
      manufacturingBreakdown: this.breakdownEngine.build(piece, calc),
      engineId: engine.engineId
    };
  }

  private round(value: number): number {
    return Math.round(value * 10) / 10;
  }
}
