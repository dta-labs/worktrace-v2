import { ShopPriceSnapshot } from '../../models/domain.models';

// V1 placeholder configuration. These values must move to Shop Configuration UI before production use.
export const DEFAULT_SHOP_PRICE_SNAPSHOT: ShopPriceSnapshot = {
  materialPrices: {
    'Galvanized:26': 1.10,
    'Galvanized:24': 1.25,
    'Galvanized:22': 1.45,
    'Galvanized:20': 1.70,
    'Galvanized:18': 2.15,
    'Galvanized:16': 2.65
  },
  connectionPrices: {
    TDF: 0.85,
    TDC: 0.90,
    'S&D': 0.40,
    Slip: 0.20,
    Drive: 0.20,
    'Raw Edge': 0,
    Custom: 0
  },
  accessoryPrices: {
    corner: 0.28,
    screw: 0.015,
    cleat: 0.18,
    tieRod: 1.25,
    gClip: 0.35
  },
  laborRates: {
    fabrication: 38
  },
  machineRates: {
    general: 0
  },
  wastePercent: 5,
  overheadPercent: 15,
  profitPercent: 20,
  taxPercent: 0,
  currency: 'USD',
  effectiveDate: 'CONFIGURATION_PLACEHOLDER',
  source: 'Shop Configuration'
};
