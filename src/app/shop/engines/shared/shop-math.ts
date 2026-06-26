export function inchesToFeet2(squareInches: number): number {
  return squareInches / 144;
}

export function n(dimensions: Record<string, string | number>, key: string): number {
  return Number(dimensions?.[key] || 0);
}

export function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

export function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
