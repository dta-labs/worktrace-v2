import { BuilderKind, ConnectionType, FabricationOrderStatus, HorizontalDirection, TransitionVariant, VerticalDirection } from './shop.models';

export type ShopOrderType = 'Fabrication Only' | 'Internal Project' | 'From Bid';
export type ShopRevisionStatus = 'Draft' | 'Waiting Approval' | 'Approved' | 'Released' | 'Superseded';
export type ShopMaterialType = 'Galvanized' | 'Stainless Steel' | 'Aluminum' | 'Black Iron';
export type ShopPriceUnit = 'lb' | 'ft2' | 'linearFt' | 'each' | 'hour' | 'minute';

export interface ShopAuditInfo {
  createdAt?: string;
  createdBy?: string;
  updatedAt?: string;
  updatedBy?: string;
}

export interface ShopPriceSnapshot {
  materialPrices: Record<string, number>;
  connectionPrices: Record<string, number>;
  accessoryPrices: Record<string, number>;
  laborRates: Record<string, number>;
  machineRates: Record<string, number>;
  wastePercent: number;
  overheadPercent: number;
  profitPercent: number;
  taxPercent: number;
  currency: string;
  effectiveDate: string;
  source: 'Shop Configuration' | 'Manual Override';
}

export interface ShopFabricationOrderCore extends ShopAuditInfo {
  id: string;
  orderNumber: string;
  orderType: ShopOrderType;
  customerId?: string;
  customerName: string;
  projectName: string;
  requestedBy: string;
  dateRequired: string;
  status: FabricationOrderStatus;
  revision: number;
  isLocked: boolean;
  priceSnapshot?: ShopPriceSnapshot;
}

export interface ShopPieceIdentity {
  id: string;
  lineNumber: number;
  revision: number;
  status: 'Draft' | 'Approved' | 'Released' | 'In Production' | 'Completed' | 'Cancelled';
}

export interface ShopPieceClassification {
  familyId: string;
  familyName: string;
  variantId: string;
  variantName: string;
  builderKind: BuilderKind;
  transitionVariant?: TransitionVariant;
}

export interface ShopPieceGeometry {
  dimensions: Record<string, string | number>;
  horizontalDirection?: HorizontalDirection;
  verticalDirection?: VerticalDirection;
}

export interface ShopPieceMaterialSelection {
  material: ShopMaterialType | string;
  gauge: string;
  thicknessIn?: number;
  densityLbFt3?: number;
  lbFt2?: number;
}

export interface ShopPieceConnectionSelection {
  inletConnection: ConnectionType;
  outletConnection: ConnectionType;
  notes?: string;
}
