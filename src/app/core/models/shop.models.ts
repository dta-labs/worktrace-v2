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
}

export interface FabricationOrder {
  id: string;
  projectName: string;
  customer: string;
  requestedBy: string;
  dateRequired: string;
  status: 'Draft' | 'Pending Approval' | 'Approved' | 'Rejected' | 'Released To Production';
  pieces: FabricationPiece[];
}
