import { FabricationPiece } from './shop.models';

export type ShopStandardSource = 'SMACNA_4TH' | 'SMT_INTERNAL' | 'SHOP_PLACEHOLDER';

export type SmacnaValidationStatus =
  | 'compliant'
  | 'warning'
  | 'nonCompliant'
  | 'unverified';

export interface SmacnaValidationResult {
  status: SmacnaValidationStatus;
  source: ShopStandardSource;
  message: string;
  ruleReference?: string;
  requiredValue?: string;
  selectedValue?: string;
  overrideRequired?: boolean;
}

export interface ConnectionCalculationBreakdown {
  totalAddedWeightLb: number;
  totalLaborMinutes: number;
  totalMaterialCost: number;
  ends: Array<{
    end: 'inlet' | 'outlet';
    type: string;
    perimeterFt: number;
    addedWeightLb: number;
    laborMinutes: number;
    source: ShopStandardSource;
    note: string;
  }>;
}

export interface PieceCalculationResult {
  areaFt2: number;
  weightLb: number;
  developedAreaFt2: number;
  materialLbFt2: number;
  sheetWeightLb?: number;
  connectionWeightLb?: number;
  reinforcementWeightLb?: number;
  connection?: ConnectionCalculationBreakdown;
  wasteFactor: number;
  laborMinutes?: number;
  materialCost?: number;
  laborCost?: number;
  totalCost?: number;
  smacna: SmacnaValidationResult;
  notes: string[];
}

export interface PieceDrawingResult {
  viewBox: string;
  svgPath?: string;
  labels: Array<{ x: number; y: number; text: string }>;
}

export interface PieceEngine {
  readonly engineId: string;
  readonly family: string;
  readonly variant: string;
  canHandle(piece: FabricationPiece): boolean;
  calculate(piece: FabricationPiece): PieceCalculationResult;
  draw?(piece: FabricationPiece): PieceDrawingResult;
}
