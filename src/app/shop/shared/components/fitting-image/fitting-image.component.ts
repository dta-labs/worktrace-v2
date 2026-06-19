import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-fitting-image',
  standalone: true,
  imports: [CommonModule],
  template: `<img class="fitting-image" [src]="src" [alt]="alt" />`,
  styles: [`.fitting-image{width:100%;height:100%;object-fit:contain;display:block;background:white;}`]
})
export class FittingImageComponent {
  @Input() src = '';
  @Input() alt = '';
}
