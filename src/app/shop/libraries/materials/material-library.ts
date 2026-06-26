import { ShopMaterialType } from '../../models/domain.models';

export interface MaterialGaugeRecord {
  gauge: string;
  thicknessIn: number;
  lbFt2: number;
  source: 'SMACNA_PENDING' | 'TECHNICAL_REFERENCE' | 'SMT_CALIBRATION';
  note: string;
}

export interface MaterialDefinition {
  id: string;
  name: ShopMaterialType;
  densityLbFt3: number;
  gauges: MaterialGaugeRecord[];
  isActive: boolean;
}

export const SHOP_MATERIAL_LIBRARY: MaterialDefinition[] = [
  {
    id: 'galvanized',
    name: 'Galvanized',
    densityLbFt3: 490,
    isActive: true,
    gauges: [
      { gauge: '26', thicknessIn: 0.0187, lbFt2: 0.906, source: 'TECHNICAL_REFERENCE', note: 'Theoretical galvanized sheet weight. SMT may override with calibrated shop factor.' },
      { gauge: '24', thicknessIn: 0.0250, lbFt2: 1.156, source: 'TECHNICAL_REFERENCE', note: 'Theoretical galvanized sheet weight.' },
      { gauge: '22', thicknessIn: 0.0312, lbFt2: 1.406, source: 'TECHNICAL_REFERENCE', note: 'Theoretical galvanized sheet weight.' },
      { gauge: '20', thicknessIn: 0.0375, lbFt2: 1.656, source: 'TECHNICAL_REFERENCE', note: 'Theoretical galvanized sheet weight.' },
      { gauge: '18', thicknessIn: 0.0500, lbFt2: 2.156, source: 'TECHNICAL_REFERENCE', note: 'Theoretical galvanized sheet weight.' },
      { gauge: '16', thicknessIn: 0.0625, lbFt2: 2.656, source: 'TECHNICAL_REFERENCE', note: 'Theoretical galvanized sheet weight.' }
    ]
  },
  { id: 'stainless-steel', name: 'Stainless Steel', densityLbFt3: 500, isActive: true, gauges: [] },
  { id: 'aluminum', name: 'Aluminum', densityLbFt3: 169, isActive: true, gauges: [] },
  { id: 'black-iron', name: 'Black Iron', densityLbFt3: 490, isActive: true, gauges: [] }
];
