import { ConnectionType } from '../../models/shop.models';

export interface ConnectionDefinitionRecord {
  id: ConnectionType;
  name: string;
  includesCorners: boolean;
  includesSlipDrive: boolean;
  customerVisible: boolean;
  shopReportVisible: boolean;
  configurable: boolean;
}

export const SHOP_CONNECTION_LIBRARY: ConnectionDefinitionRecord[] = [
  { id: 'TDF', name: 'TDF / Flange', includesCorners: true, includesSlipDrive: false, customerVisible: true, shopReportVisible: true, configurable: true },
  { id: 'TDC', name: 'TDC / Flange', includesCorners: true, includesSlipDrive: false, customerVisible: true, shopReportVisible: true, configurable: true },
  { id: 'S&D', name: 'Slip & Drive', includesCorners: false, includesSlipDrive: true, customerVisible: true, shopReportVisible: true, configurable: true },
  { id: 'Slip', name: 'Slip', includesCorners: false, includesSlipDrive: true, customerVisible: true, shopReportVisible: true, configurable: true },
  { id: 'Drive', name: 'Drive', includesCorners: false, includesSlipDrive: true, customerVisible: true, shopReportVisible: true, configurable: true },
  { id: 'Raw Edge', name: 'Raw Edge', includesCorners: false, includesSlipDrive: false, customerVisible: true, shopReportVisible: true, configurable: true },
  { id: 'Custom', name: 'Custom', includesCorners: false, includesSlipDrive: false, customerVisible: true, shopReportVisible: true, configurable: true }
];
