import { BuilderKind, DimensionField, FittingCategory } from '../../models/shop.models';

export interface ShopFamilyDefinition {
  id: string;
  name: string;
  category: FittingCategory;
  builderKind: BuilderKind;
  description: string;
  status: 'Draft' | 'Engineering' | 'Testing' | 'Certified' | 'Production Ready';
  variants: Array<{ id: string; name: string; fields: DimensionField[] }>;
}

export const SHOP_FAMILY_LIBRARY: ShopFamilyDefinition[] = [
  {
    id: 'straight-duct',
    name: 'Straight Duct',
    category: 'Ducts',
    builderKind: 'straight',
    status: 'Engineering',
    description: 'Rectangular straight duct family. First certified SHOP V1 family.',
    variants: [
      {
        id: 'rectangular',
        name: 'Rectangular',
        fields: [
          { key: 'width', label: 'Width A', unit: 'in', defaultValue: 30 },
          { key: 'height', label: 'Height B', unit: 'in', defaultValue: 12 },
          { key: 'length', label: 'Length L', unit: 'in', defaultValue: 59 }
        ]
      }
    ]
  }
];
