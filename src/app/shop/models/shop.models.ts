export type FittingCategory =
  | 'All'
  | 'Ducts'
  | 'Elbows'
  | 'Transitions'
  | 'Offsets'
  | 'Reducers'
  | 'Branches'
  | 'Caps'
  | 'Boxes'
  | 'Boots'
  | 'Accessories';

export type BuilderKind =
  | 'straight'
  | 'elbow90'
  | 'elbow45'
  | 'transition'
  | 'offset'
  | 'generic';

export type TransitionVariant =
  | 'Centered'
  | 'Flat Top'
  | 'Flat Bottom'
  | 'Flat Left'
  | 'Flat Right'
  | 'Offset Left'
  | 'Offset Right'
  | 'Offset Up'
  | 'Offset Down';

export type ConnectionType = 'TDF' | 'TDC' | 'S&D' | 'Slip' | 'Drive' | 'Raw Edge' | 'Custom';
export type FabricationOrderType = 'Fabrication Only' | 'Internal Project' | 'From Bid';
export type HorizontalDirection = 'Left' | 'Right';
export type VerticalDirection = 'Up' | 'Down';

export interface DimensionField {
  key: string;
  label: string;
  unit: 'in' | 'deg' | 'qty' | 'text';
  defaultValue?: string | number;
}

export interface FittingDefinition {
  id: string;
  name: string;
  spanishAlias: string;
  category: FittingCategory;
  image: string;
  builderKind: BuilderKind;
  description: string;
  fields: DimensionField[];
  buildStatus: 'Generated Preview' | 'Catalog Preview Only';
}


export interface ShopConnectionMaterialBreakdown {
  tdfLinearFt?: number;
  tdfMaterialFt2?: number;
  tdcLinearFt?: number;
  slipPieces?: number;
  drivePieces?: number;
  rawEdgeLinearFt?: number;
  customLinearFt?: number;
}

export interface ShopAccessoryBreakdown {
  corners?: number;
  screws?: number;
  cleats?: number;
  tieRods?: number;
  gClips?: number;
}

export interface ShopWeightBreakdown {
  sheetMetalLb: number;
  connectionsLb: number;
  reinforcementLb: number;
  accessoriesLb: number;
  totalLb: number;
}

export interface ShopLaborBreakdown {
  connectionMinutes: number;
  assemblyMinutes: number;
  totalMinutes: number;
}

export interface ShopManufacturingBreakdown {
  sheetMetalFt2: number;
  developedAreaFt2: number;
  connectionMaterial: ShopConnectionMaterialBreakdown;
  accessories: ShopAccessoryBreakdown;
  weight: ShopWeightBreakdown;
  labor: ShopLaborBreakdown;
  notes: string[];
}

export interface FabricationPiece {
  id: string;
  fittingId: string;
  fittingName: string;
  spanishAlias: string;
  category: string;
  image: string;
  builderKind: BuilderKind;
  variant?: string;
  horizontalDirection?: HorizontalDirection;
  verticalDirection?: VerticalDirection;
  dimensions: Record<string, string | number>;
  gauge: string;
  material: string;
  quantity: number;
  inletConnection: ConnectionType;
  outletConnection: ConnectionType;
  connectionNote?: string;
  notes?: string;
  estimatedAreaFt2?: number;
  estimatedWeightLb?: number;
  developedAreaFt2?: number;
  materialLbFt2?: number;
  sheetWeightLb?: number;
  connectionWeightLb?: number;
  reinforcementWeightLb?: number;
  laborMinutes?: number;
  materialCost?: number;
  laborCost?: number;
  totalCost?: number;
  smacnaStatus?: 'compliant' | 'warning' | 'nonCompliant' | 'unverified';
  smacnaMessage?: string;
  smacnaRuleReference?: string;
  connectionSummary?: string;
  manufacturingBreakdown?: ShopManufacturingBreakdown;
  engineId?: string;
}

export type FabricationOrderStatus =
  | 'Draft'
  | 'Pending Approval'
  | 'Approved'
  | 'In Production'
  | 'Completed'
  | 'Cancelled';

export interface FabricationOrder {
  id: string;
  orderNumber: string;
  orderType?: FabricationOrderType;
  revision?: number;
  isLocked?: boolean;
  projectName: string;
  customerId?: string;
  customerName: string;
  requestedBy: string;
  dateRequired: string;
  status: FabricationOrderStatus;
  totalAreaFt2?: number;
  totalWeightLb?: number;
  totalPieces?: number;
  finalFabricationPrice?: number;
  manufacturingCost?: number;
  createdAt?: string;
  createdBy?: string;
  updatedAt?: string;
  updatedBy?: string;
  submittedAt?: string;
  approvedAt?: string;
  approvedBy?: string;
  productionAt?: string;
  completedAt?: string;
  pieces: FabricationPiece[];
}
