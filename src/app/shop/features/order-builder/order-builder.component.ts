import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FittingLibraryService } from '../../core/services/fitting-library.service';
import { ConnectionType, FabricationOrder, FabricationPiece, FittingDefinition, HorizontalDirection, TransitionVariant, VerticalDirection } from '../../core/models/shop.models';
import { GeneratedPreviewComponent } from '../../shared/generated-preview/generated-preview.component';
import { WeightCalculationService } from '../../core/services/weight-calculation.service';

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

  order: FabricationOrder = {
    id: 'ORD-' + Date.now().toString().slice(-6),
    projectName: '',
    customer: '',
    requestedBy: '',
    dateRequired: '',
    status: 'Draft',
    pieces: []
  };

  constructor(public library: FittingLibraryService, private weightCalc: WeightCalculationService) {
    this.selectFitting(this.selected);
    const saved = localStorage.getItem('shop-v12-current-order');
    if (saved) { this.order = JSON.parse(saved); this.recalculateWeights(false); }
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
