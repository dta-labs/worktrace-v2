export interface SmacnaRuleRecord {
  id: string;
  edition: '4th';
  family: string;
  variant: string;
  description: string;
  referenceRequired: boolean;
  reference?: string;
}

// This file is intentionally a data shell. Real table values must be entered from
// the purchased SMACNA source before any rule can be marked compliant.
export const SMACNA_RULE_SHELL: SmacnaRuleRecord[] = [
  {
    id: 'rectangular-straight-construction-shell',
    edition: '4th',
    family: 'Straight Duct',
    variant: 'Rectangular',
    description: 'Rectangular straight duct construction validation placeholder.',
    referenceRequired: true
  }
];
