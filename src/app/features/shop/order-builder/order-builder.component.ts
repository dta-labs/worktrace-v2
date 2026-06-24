import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FittingLibraryService } from '../../../core/services/fitting-library.service';
import { ConnectionType, FabricationOrder, FabricationPiece, FittingDefinition, HorizontalDirection, TransitionVariant, VerticalDirection } from '../../../core/models/shop.models';
import { GeneratedPreviewComponent } from '../../../shared/generated-preview/generated-preview.component';
import { WeightCalculationService } from '../../../core/services/weight-calculation.service';
import { ClientsService, ClientItem } from '../../dashboard/pages/construction/bids/clients.service';

@Component({
  selector: 'app-order-builder',
  standalone: true,
  imports: [CommonModule, FormsModule, GeneratedPreviewComponent],
  templateUrl: './order-builder.component.html',
  styleUrl: './order-builder.component.scss'
})
export class OrderBuilderComponent {
  categories = this.library.categories;
  category = 'All';
  query = '';
  selected: FittingDefinition = this.library.fittings[0];

  ductUses = ['Duct', 'Sleeve', 'Cut Piece'];
  selectedDuctUse = 'Duct';

  transitionVariants: TransitionVariant[] = [
    'Centered',
    'Flat Top',
    'Flat Bottom',
    'Flat Left',
    'Flat Right',
    'Offset Left',
    'Offset Right',
    'Offset Up',
    'Offset Down'
  ];

  gauges = ['26', '24', '22', '20', '18', '16'];
  materials = ['Galvanized', 'Stainless Steel', 'Aluminum', 'Black Iron'];
  connectionTypes: ConnectionType[] = ['TDF', 'TDC', 'S&D', 'Slip', 'Drive', 'Raw Edge', 'Custom'];

  dimensions: Record<string, string | number> = {};
  selectedVariant: TransitionVariant = 'Centered';
  horizontalDirection: HorizontalDirection = 'Right';
  verticalDirection: VerticalDirection = 'Up';
  gauge = '22';
  material = 'Galvanized';
  quantity = 1;
  inletConnection: ConnectionType = 'TDF';
  outletConnection: ConnectionType = 'S&D';
  connectionNote = '';
  notes = '';
  selectedPieceId = '';
  companies: ClientItem[] = [];
  txtImportMessage = '';


  order: FabricationOrder = {
    id: 'ORD-' + Date.now().toString().slice(-6),
    projectName: '',
    customer: '',
    requestedBy: '',
    dateRequired: '',
    status: 'Draft',
    pieces: []
  };

  constructor(
    public library: FittingLibraryService,
    private weightCalc: WeightCalculationService,
    private clientsService: ClientsService
  ) {
    this.selectFitting(this.selected);

    this.clientsService.clients$().subscribe(rows => {
      this.companies = (rows || []).filter(company => company.isActive !== false);
    });

    const saved = localStorage.getItem('shop-v12-current-order');
    if (saved) { this.order = JSON.parse(saved); this.recalculateWeights(false); }
  }

  get selectedCompany(): ClientItem | undefined {
    return this.companies.find(company => company.name === this.order.customer);
  }

  get requestedByContacts() {
    return this.selectedCompany?.contacts?.filter(contact => !!contact?.fullName?.trim()) ?? [];
  }

  onCustomerChange() {
    this.order.requestedBy = '';
    this.saveDraft();
  }

  get fittings() {
    return this.library.search(this.category, this.query);
  }

  selectFitting(f: FittingDefinition) {
    this.selected = f;
    this.dimensions = {};
    f.fields.forEach(field => this.dimensions[field.key] = field.defaultValue ?? '');
    if (f.builderKind === 'transition') {
      delete this.dimensions['offset'];
      this.dimensions['offsetX'] = 0;
      this.dimensions['offsetY'] = 0;
      this.horizontalDirection = 'Right';
      this.verticalDirection = 'Up';
    }
    this.selectedVariant = 'Centered';
    if (f.id === 'rectangular-duct') this.selectedDuctUse = 'Duct';
    this.selectedPieceId = '';
  }

  addPiece() {
    this.clampOffsets();

    const error = this.transitionValidationError();
    if (error) {
      alert(error);
      return;
    }

    const piece: FabricationPiece = {
      id: crypto.randomUUID(),
      fittingId: this.selected.id,
      fittingName: this.selected.name,
      spanishAlias: this.selected.spanishAlias,
      category: this.selected.category,
      image: this.selected.image,
      builderKind: this.selected.builderKind,
      variant: this.selected.builderKind === 'transition' ? this.selectedVariant : (this.selected.id === 'rectangular-duct' ? this.selectedDuctUse : undefined),
      horizontalDirection: this.selected.builderKind === 'transition' ? this.horizontalDirection : undefined,
      verticalDirection: this.selected.builderKind === 'transition' ? this.verticalDirection : undefined,
      dimensions: { ...this.dimensions },
      gauge: this.gauge,
      material: this.material,
      quantity: Number(this.quantity || 1),
      inletConnection: this.inletConnection,
      outletConnection: this.outletConnection,
      connectionNote: this.connectionNote,
      notes: this.notes
    };
    const totalCalc = this.weightCalc.calculate(piece);
    piece.estimatedAreaFt2 = totalCalc.areaFt2;
    piece.estimatedWeightLb = totalCalc.weightLb;

    this.order.pieces.push(piece);
    this.selectedPieceId = piece.id;
    this.saveDraft();
  }

  selectPiece(p: FabricationPiece) {
    this.selectedPieceId = p.id;
  }

  duplicatePiece(p: FabricationPiece) {
    const copy = { ...p, id: crypto.randomUUID(), dimensions: { ...p.dimensions } };
    this.order.pieces.push(copy);
    this.selectedPieceId = copy.id;
    this.saveDraft();
  }

  removePiece(id: string) {
    this.order.pieces = this.order.pieces.filter(p => p.id !== id);
    if (this.selectedPieceId === id) this.selectedPieceId = this.order.pieces[0]?.id ?? '';
    this.saveDraft();
  }

  get selectedPiece() {
    return this.order.pieces.find(p => p.id === this.selectedPieceId) ?? this.order.pieces[this.order.pieces.length - 1];
  }

  formatDimensions(p: FabricationPiece) {
    return Object.entries(p.dimensions).map(([k, v]) => `${this.labelize(k)}: ${v}"`).join(' | ');
  }

  labelize(k: string) {
    return k.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase());
  }


  get isTransition(): boolean {
    return this.selected.builderKind === 'transition';
  }

  get showHorizontalOffset(): boolean {
    return this.isTransition && (
      this.selectedVariant === 'Centered' ||
      this.selectedVariant === 'Flat Top' ||
      this.selectedVariant === 'Flat Bottom' ||
      this.selectedVariant === 'Offset Left' ||
      this.selectedVariant === 'Offset Right'
    );
  }

  get showVerticalOffset(): boolean {
    return this.isTransition && (
      this.selectedVariant === 'Centered' ||
      this.selectedVariant === 'Flat Left' ||
      this.selectedVariant === 'Flat Right' ||
      this.selectedVariant === 'Offset Up' ||
      this.selectedVariant === 'Offset Down'
    );
  }

  get horizontalOffsetLabel(): string {
    if (this.selectedVariant === 'Offset Left') return 'Horizontal Offset Left';
    if (this.selectedVariant === 'Offset Right') return 'Horizontal Offset Right';
    if (this.selectedVariant === 'Flat Top' || this.selectedVariant === 'Flat Bottom') return 'Horizontal Offset';
    return 'Horizontal Offset';
  }

  get verticalOffsetLabel(): string {
    if (this.selectedVariant === 'Offset Up') return 'Vertical Offset Up';
    if (this.selectedVariant === 'Offset Down') return 'Vertical Offset Down';
    if (this.selectedVariant === 'Flat Left' || this.selectedVariant === 'Flat Right') return 'Vertical Offset';
    return 'Vertical Offset';
  }

  onVariantChange() {
    if (this.selectedVariant === 'Offset Left') this.horizontalDirection = 'Left';
    if (this.selectedVariant === 'Offset Right') this.horizontalDirection = 'Right';
    if (this.selectedVariant === 'Offset Up') this.verticalDirection = 'Up';
    if (this.selectedVariant === 'Offset Down') this.verticalDirection = 'Down';

    if (!this.showHorizontalOffset) this.dimensions['offsetX'] = 0;
    if (!this.showVerticalOffset) this.dimensions['offsetY'] = 0;
    this.clampOffsets();
  }

  transitionRuleNote(): string {
    if (!this.isTransition) return '';
    if (this.selectedVariant === 'Flat Left' || this.selectedVariant === 'Flat Right') {
      return 'Horizontal offset is locked because the selected side is flat. Vertical offset is allowed when heights differ or when the outlet must move up/down.';
    }
    if (this.selectedVariant === 'Flat Top' || this.selectedVariant === 'Flat Bottom') {
      return 'Vertical offset is locked because the selected side is flat. Horizontal offset is allowed when widths differ or when the outlet must move left/right.';
    }
    if (this.selectedVariant.startsWith('Offset')) {
      return 'Offset distance applies only in the selected direction.';
    }
    return 'Centered transition is centered at 0 offset. If you enter offset, choose the direction so the preview shows where the outlet moves.';
  }



  num(key: string): number {
    return Number(this.dimensions[key] || 0);
  }

  absDiff(a: string, b: string): number {
    return Math.abs(this.num(a) - this.num(b));
  }

  get maxHorizontalOffset(): number {
    const diff = this.absDiff('widthA', 'widthB');

    if (this.selectedVariant === 'Flat Left' || this.selectedVariant === 'Flat Right') return 0;
    if (this.selectedVariant === 'Flat Top' || this.selectedVariant === 'Flat Bottom') return diff;
    if (this.selectedVariant === 'Offset Left' || this.selectedVariant === 'Offset Right') return diff;
    if (this.selectedVariant === 'Centered') return diff / 2;

    return 0;
  }

  get maxVerticalOffset(): number {
    const diff = this.absDiff('heightA', 'heightB');

    if (this.selectedVariant === 'Flat Top' || this.selectedVariant === 'Flat Bottom') return 0;
    if (this.selectedVariant === 'Flat Left' || this.selectedVariant === 'Flat Right') return diff;
    if (this.selectedVariant === 'Offset Up' || this.selectedVariant === 'Offset Down') return diff;
    if (this.selectedVariant === 'Centered') return diff / 2;

    return 0;
  }

  get horizontalOffsetLocked(): boolean {
    return this.isTransition && this.maxHorizontalOffset === 0;
  }

  get verticalOffsetLocked(): boolean {
    return this.isTransition && this.maxVerticalOffset === 0;
  }

  clampOffsets() {
    if (!this.isTransition) return;

    let x = Number(this.dimensions['offsetX'] || 0);
    let y = Number(this.dimensions['offsetY'] || 0);

    if (this.horizontalOffsetLocked) x = 0;
    if (this.verticalOffsetLocked) y = 0;

    if (x > this.maxHorizontalOffset) x = this.maxHorizontalOffset;
    if (y > this.maxVerticalOffset) y = this.maxVerticalOffset;

    if (x < 0) x = 0;
    if (y < 0) y = 0;

    this.dimensions['offsetX'] = x;
    this.dimensions['offsetY'] = y;
  }

  transitionValidationError(): string {
    if (!this.isTransition) return '';

    const x = Number(this.dimensions['offsetX'] || 0);
    const y = Number(this.dimensions['offsetY'] || 0);

    if (x < 0 || y < 0) return 'Offset cannot be negative.';
    if (x > this.maxHorizontalOffset) return `Invalid horizontal offset. Maximum allowed is ${this.maxHorizontalOffset}".`;
    if (y > this.maxVerticalOffset) return `Invalid vertical offset. Maximum allowed is ${this.maxVerticalOffset}".`;

    return '';
  }

  get hasTransitionError(): boolean {
    return !!this.transitionValidationError();
  }

  get horizontalLockMessage(): string {
    if (!this.horizontalOffsetLocked) return `Maximum allowed: ${this.maxHorizontalOffset}"`;
    if (this.selectedVariant === 'Flat Left') return 'Locked: left side is flat.';
    if (this.selectedVariant === 'Flat Right') return 'Locked: right side is flat.';
    if (this.selectedVariant === 'Offset Up' || this.selectedVariant === 'Offset Down') return 'Locked: this variant only uses vertical offset.';
    return 'Locked for this variant.';
  }

  get verticalLockMessage(): string {
    if (!this.verticalOffsetLocked) return `Maximum allowed: ${this.maxVerticalOffset}"`;
    if (this.selectedVariant === 'Flat Top') return 'Locked: top side is flat.';
    if (this.selectedVariant === 'Flat Bottom') return 'Locked: bottom side is flat.';
    if (this.selectedVariant === 'Offset Left' || this.selectedVariant === 'Offset Right') return 'Locked: this variant only uses horizontal offset.';
    return 'Locked for this variant.';
  }



  get centeredHorizontalLimitWarning(): string {
    if (!this.isTransition || this.selectedVariant !== 'Centered') return '';
    const x = Number(this.dimensions['offsetX'] || 0);
    if (x === this.maxHorizontalOffset && x > 0) {
      return `At ${x}" horizontal offset, this is effectively Flat ${this.horizontalDirection === 'Right' ? 'Right' : 'Left'}. Consider selecting Flat ${this.horizontalDirection === 'Right' ? 'Right' : 'Left'}.`;
    }
    return '';
  }

  get centeredVerticalLimitWarning(): string {
    if (!this.isTransition || this.selectedVariant !== 'Centered') return '';
    const y = Number(this.dimensions['offsetY'] || 0);
    if (y === this.maxVerticalOffset && y > 0) {
      return `At ${y}" vertical offset, this is effectively Flat ${this.verticalDirection === 'Up' ? 'Top' : 'Bottom'}. Consider selecting Flat ${this.verticalDirection === 'Up' ? 'Top' : 'Bottom'}.`;
    }
    return '';
  }

  get offsetWarning(): string {
    return [this.centeredHorizontalLimitWarning, this.centeredVerticalLimitWarning].filter(Boolean).join(' ');
  }



  singlePieceArea(piece: FabricationPiece): number {
    return this.weightCalc.calculateSinglePiece(piece).areaFt2;
  }

  singlePieceWeight(piece: FabricationPiece): number {
    return this.weightCalc.calculateSinglePiece(piece).weightLb;
  }

  get totalAreaFt2(): number {
    return Math.round(this.order.pieces.reduce((sum, p) => sum + (p.estimatedAreaFt2 || 0), 0) * 10) / 10;
  }

  get totalWeightLb(): number {
    return Math.round(this.order.pieces.reduce((sum, p) => sum + (p.estimatedWeightLb || 0), 0) * 10) / 10;
  }

  recalculateWeights(save = true) {
    this.order.pieces = this.order.pieces.map(piece => {
      const calc = this.weightCalc.calculate(piece);
      return { ...piece, estimatedAreaFt2: calc.areaFt2, estimatedWeightLb: calc.weightLb };
    });
    if (save) this.saveDraft();
  }


  importTxt(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result || '');
      const pieces = this.parseDuctText(text);

      if (!pieces.length) {
        alert('No valid duct pieces were found in the TXT. Use lines like: DUCT 30x12x59 26ga S&D qty 2');
        input.value = '';
        return;
      }

      this.order.pieces.push(...pieces);
      this.selectedPieceId = pieces[pieces.length - 1]?.id ?? this.selectedPieceId;
      this.recalculateWeights(false);
      this.saveDraft();
      this.txtImportMessage = `Imported ${pieces.length} piece(s) from TXT.`;
      input.value = '';
    };
    reader.readAsText(file);
  }

  exportTxt() {
    const lines = [
      `SHOP FABRICATION ORDER: ${this.order.id}`,
      `PROJECT: ${this.order.projectName || ''}`,
      `CUSTOMER: ${this.order.customer || ''}`,
      `REQUESTED BY: ${this.order.requestedBy || ''}`,
      `DATE REQUIRED: ${this.order.dateRequired || ''}`,
      '',
      'DUCT LIST',
      ...this.order.pieces.map((piece, index) => this.pieceToTxtLine(piece, index + 1))
    ];

    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${this.order.id || 'shop-order'}-duct-list.txt`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  private pieceToTxtLine(piece: FabricationPiece, index: number): string {
    const dims = piece.dimensions;
    const qty = `qty ${piece.quantity}`;
    const gauge = `${piece.gauge}ga`;
    const conn = `${piece.inletConnection}/${piece.outletConnection}`;

    if (piece.builderKind === 'transition') {
      return `${index}. TRANSITION ${dims['widthA']}x${dims['heightA']} TO ${dims['widthB']}x${dims['heightB']} L=${dims['length']} ${gauge} ${conn} ${qty}`;
    }

    if (piece.builderKind === 'elbow90' || piece.builderKind === 'elbow45') {
      return `${index}. ELBOW ${dims['angle'] || (piece.builderKind === 'elbow90' ? 90 : 45)} ${dims['width']}x${dims['height']} R=${dims['radius']} N1=${dims['inletNeck']} N2=${dims['outletNeck']} ${gauge} ${conn} ${qty}`;
    }

    if (piece.builderKind === 'offset') {
      return `${index}. OFFSET ${dims['width']}x${dims['height']}x${dims['length']} ${gauge} ${conn} ${qty}`;
    }

    return `${index}. DUCT ${dims['width']}x${dims['height']}x${dims['length']} ${gauge} ${conn} ${qty}`;
  }

  private parseDuctText(text: string): FabricationPiece[] {
    return text
      .split(/\r?\n/)
      .map(line => line.trim())
      .filter(line => !!line && !line.startsWith('#') && !line.startsWith('//'))
      .map(line => this.parseDuctLine(line))
      .filter((piece): piece is FabricationPiece => !!piece);
  }

  private parseDuctLine(line: string): FabricationPiece | null {
    const normalized = line.replace(/^\d+\s*[.)-]\s*/, '').trim();
    const lower = normalized.toLowerCase();

    if (lower.includes('project:') || lower.includes('customer:') || lower.includes('duct list')) return null;

    const gauge = this.parseGauge(normalized);
    const quantity = this.parseQuantity(normalized);
    const connection = this.parseConnection(normalized);
    const sizes = this.parseSizes(normalized);

    if (/\b(trans|transition|reducer|taper|reduccion|reducción)\b/.test(lower) || (lower.includes(' to ') && sizes.length >= 2)) {
      if (sizes.length < 2) return null;
      return this.createImportedPiece('transition', {
        widthA: sizes[0][0],
        heightA: sizes[0][1],
        widthB: sizes[1][0],
        heightB: sizes[1][1],
        length: this.parseNamedNumber(normalized, ['length', 'long', 'l', 'lg']) || this.parseLooseLength(normalized, sizes) || 36
      }, quantity, gauge, connection, normalized);
    }

    if (/\b(offset|ese)\b/.test(lower)) {
      const size = sizes[0];
      if (!size) return null;
      return this.createImportedPiece('offset', {
        width: size[0],
        height: size[1],
        length: size[2] || this.parseNamedNumber(normalized, ['length', 'long', 'l', 'lg']) || 36
      }, quantity, gauge, connection, normalized);
    }

    if (/\b(elbow|codo)\b/.test(lower) || /\b(90|45)\s*(?:°|deg|degree)?\b/.test(lower)) {
      const size = sizes[0];
      if (!size) return null;
      const angle = /\b45\b/.test(lower) ? 45 : 90;
      const fittingId = angle === 45 ? 'elbow-45' : 'elbow-90';
      return this.createImportedPiece(fittingId, {
        width: size[0],
        height: size[1],
        radius: this.parseNamedNumber(normalized, ['radius', 'radio', 'r']) || size[0],
        angle,
        inletNeck: this.parseNamedNumber(normalized, ['inletNeck', 'inlet', 'leg1', 'pata1', 'n1']) || 6,
        outletNeck: this.parseNamedNumber(normalized, ['outletNeck', 'outlet', 'leg2', 'pata2', 'n2']) || 6
      }, quantity, gauge, connection, normalized);
    }

    const size = sizes[0];
    if (!size) return null;
    return this.createImportedPiece('rectangular-duct', {
      width: size[0],
      height: size[1],
      length: size[2] || this.parseNamedNumber(normalized, ['length', 'long', 'l', 'lg']) || this.parseLooseLength(normalized, sizes) || 59
    }, quantity, gauge, connection, normalized);
  }

  private createImportedPiece(
    fittingId: string,
    dimensions: Record<string, string | number>,
    quantity: number,
    gauge: string,
    connection: ConnectionType,
    sourceLine: string
  ): FabricationPiece | null {
    const fitting = this.library.fittings.find(item => item.id === fittingId);
    if (!fitting) return null;

    const piece: FabricationPiece = {
      id: crypto.randomUUID(),
      fittingId: fitting.id,
      fittingName: fitting.name,
      spanishAlias: fitting.spanishAlias,
      category: fitting.category,
      image: fitting.image,
      builderKind: fitting.builderKind,
      variant: fitting.builderKind === 'transition' ? 'Centered' : (fitting.id === 'rectangular-duct' ? 'Duct' : undefined),
      horizontalDirection: fitting.builderKind === 'transition' ? 'Right' : undefined,
      verticalDirection: fitting.builderKind === 'transition' ? 'Up' : undefined,
      dimensions,
      gauge,
      material: 'Galvanized',
      quantity,
      inletConnection: connection,
      outletConnection: connection,
      connectionNote: 'Imported from TXT',
      notes: sourceLine
    };

    const calc = this.weightCalc.calculate(piece);
    piece.estimatedAreaFt2 = calc.areaFt2;
    piece.estimatedWeightLb = calc.weightLb;
    return piece;
  }

  private parseSizes(line: string): number[][] {
    const sizes: number[][] = [];
    const pattern = /(\d+(?:\.\d+)?)\s*(?:x|\*|×)\s*(\d+(?:\.\d+)?)(?:\s*(?:x|\*|×)\s*(\d+(?:\.\d+)?))?/gi;
    let match: RegExpExecArray | null;

    while ((match = pattern.exec(line)) !== null) {
      sizes.push([Number(match[1]), Number(match[2]), match[3] ? Number(match[3]) : 0]);
    }

    return sizes;
  }

  private parseGauge(line: string): string {
    const explicit = line.match(/\b(?:gauge|ga|g)\s*[:=]?\s*(16|18|20|22|24|26)\b/i);
    if (explicit) return explicit[1];

    const suffix = line.match(/\b(16|18|20|22|24|26)\s*(?:ga|gauge|g)\b/i);
    if (suffix) return suffix[1];

    const loose = line.match(/\b(16|18|20|22|24|26)\b/);
    return loose?.[1] ?? this.gauge;
  }

  private parseQuantity(line: string): number {
    const match = line.match(/\b(?:qty|quantity|cant|cantidad|pcs|pieces|pzs?|ea)\s*[:=]?\s*(\d+)\b/i);
    return match ? Math.max(1, Number(match[1])) : 1;
  }

  private parseConnection(line: string): ConnectionType {
    const upper = line.toUpperCase();
    if (upper.includes('TDF')) return 'TDF';
    if (upper.includes('TDC')) return 'TDC';
    if (upper.includes('S&D') || /\bSD\b/.test(upper) || upper.includes('S/D')) return 'S&D';
    if (upper.includes('SLIP')) return 'Slip';
    if (upper.includes('DRIVE')) return 'Drive';
    if (upper.includes('RAW')) return 'Raw Edge';
    return this.inletConnection;
  }

  private parseNamedNumber(line: string, names: string[]): number | null {
    for (const name of names) {
      const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const match = line.match(new RegExp(`\\b${escaped}\\b\\s*[:=]?\\s*(\\d+(?:\\.\\d+)?)`, 'i'));
      if (match) return Number(match[1]);
    }
    return null;
  }

  private parseLooseLength(line: string, sizes: number[][]): number | null {
    const withoutSizes = line.replace(/\d+(?:\.\d+)?\s*(?:x|\*|×)\s*\d+(?:\.\d+)?(?:\s*(?:x|\*|×)\s*\d+(?:\.\d+)?)?/gi, ' ');
    const numberMatches = Array.from(withoutSizes.matchAll(/\b\d+(?:\.\d+)?\b/g)).map(match => Number(match[0]));
    const filtered = numberMatches.filter(value => ![16, 18, 20, 22, 24, 26, 45, 90].includes(value));
    return filtered[0] ?? null;
  }


  saveDraft() {
    localStorage.setItem('shop-v12-current-order', JSON.stringify(this.order));
  }

  printApproval() {
    window.print();
  }

  clearOrder() {
    if (!confirm('Clear current order?')) return;
    localStorage.removeItem('shop-v12-current-order');
    location.reload();
  }
}
