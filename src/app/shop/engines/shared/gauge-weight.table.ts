export interface GaugeWeightRecord {
  gauge: string;
  lbFt2: number;
  source: 'SMT_CALIBRATION' | 'PLACEHOLDER';
  note: string;
}

export const GAUGE_WEIGHT_TABLE: Record<string, GaugeWeightRecord> = {
  // 26ga = 1.00 lb/ft² is the shop calibration value provided by SMT.
  '26': { gauge: '26', lbFt2: 1.00, source: 'SMT_CALIBRATION', note: 'SMT calibrated base value.' },
  '24': { gauge: '24', lbFt2: 1.25, source: 'PLACEHOLDER', note: 'Temporary value until SMACNA/material table is loaded.' },
  '22': { gauge: '22', lbFt2: 1.56, source: 'PLACEHOLDER', note: 'Temporary value until SMACNA/material table is loaded.' },
  '20': { gauge: '20', lbFt2: 2.00, source: 'PLACEHOLDER', note: 'Temporary value until SMACNA/material table is loaded.' },
  '18': { gauge: '18', lbFt2: 2.50, source: 'PLACEHOLDER', note: 'Temporary value until SMACNA/material table is loaded.' },
  '16': { gauge: '16', lbFt2: 3.13, source: 'PLACEHOLDER', note: 'Temporary value until SMACNA/material table is loaded.' }
};
