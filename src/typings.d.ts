// Auto-added to prevent TS2307 when optional PDF deps are not installed.
// If you install the packages, these declarations are harmless.
// Install: npm i jspdf jspdf-autotable

declare module 'jspdf' {
  export class jsPDF {
    constructor(options?: any);
    setFontSize(size: number): this;
    text(text: string, x: number, y: number, options?: any): this;
    save(filename: string): void;
  }
}

declare module 'jspdf-autotable' {
  const autoTable: any;
  export default autoTable;
}
