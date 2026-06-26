import { ConnectionType } from '../../models/shop.models';

export interface ConnectionWeightRecord {
  lbPerLinearFt: number;
  laborMinutesPerLinearFt: number;
  materialCostPerLinearFt: number;
  source: 'SMT_INTERNAL' | 'SHOP_PLACEHOLDER';
  note: string;
}

export const CONNECTION_WEIGHT_TABLE: Record<ConnectionType, ConnectionWeightRecord> = {
  'TDF': {
    lbPerLinearFt: 0.18,
    laborMinutesPerLinearFt: 0.45,
    materialCostPerLinearFt: 0,
    source: 'SHOP_PLACEHOLDER',
    note: 'TDF adds flange/profile material. Placeholder value until SMT/SMACNA-backed connection data is entered.'
  },
  'TDC': {
    lbPerLinearFt: 0.20,
    laborMinutesPerLinearFt: 0.50,
    materialCostPerLinearFt: 0,
    source: 'SHOP_PLACEHOLDER',
    note: 'TDC adds flange/profile material. Placeholder value until SMT/SMACNA-backed connection data is entered.'
  },
  'S&D': {
    lbPerLinearFt: 0.05,
    laborMinutesPerLinearFt: 0.18,
    materialCostPerLinearFt: 0,
    source: 'SHOP_PLACEHOLDER',
    note: 'Slip & Drive uses less added connection material than flanged connections. Placeholder value until SMT data is entered.'
  },
  'Slip': {
    lbPerLinearFt: 0.03,
    laborMinutesPerLinearFt: 0.12,
    materialCostPerLinearFt: 0,
    source: 'SHOP_PLACEHOLDER',
    note: 'Slip connection added material placeholder.'
  },
  'Drive': {
    lbPerLinearFt: 0.03,
    laborMinutesPerLinearFt: 0.12,
    materialCostPerLinearFt: 0,
    source: 'SHOP_PLACEHOLDER',
    note: 'Drive connection added material placeholder.'
  },
  'Raw Edge': {
    lbPerLinearFt: 0,
    laborMinutesPerLinearFt: 0,
    materialCostPerLinearFt: 0,
    source: 'SHOP_PLACEHOLDER',
    note: 'Raw edge has no added connection weight in this placeholder model.'
  },
  'Custom': {
    lbPerLinearFt: 0,
    laborMinutesPerLinearFt: 0,
    materialCostPerLinearFt: 0,
    source: 'SHOP_PLACEHOLDER',
    note: 'Custom connection requires manual configuration.'
  }
};
