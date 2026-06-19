import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FittingLibraryService } from '../../core/services/fitting-library.service';
import { FittingImageComponent } from '../../shared/components/fitting-image/fitting-image.component';

@Component({
  selector: 'app-catalog', standalone: true, imports: [CommonModule, FormsModule, FittingImageComponent],
  template: `
  <section class="panel">
    <header><h1>Fitting Catalog</h1><input [(ngModel)]="search" placeholder="Search by English or Spanish name..." /></header>
    <div class="layout">
      <nav><button *ngFor="let c of lib.categories" [class.active]="category===c" (click)="category=c">{{c}}</button></nav>
      <div class="grid">
        <article class="card" *ngFor="let f of filtered()">
          <div class="img"><app-fitting-image [src]="f.image" [alt]="f.name"></app-fitting-image></div>
          <b>{{f.name}}</b><small>{{f.spanishAlias}} · {{f.category}}</small>
          <p>{{f.description}}</p>
        </article>
      </div>
    </div>
  </section>`,
  styles: [`
    .panel{background:white;border:1px solid #d7dfec;border-radius:14px;padding:16px}
    header{display:flex;justify-content:space-between;align-items:center;margin-bottom:16px} h1{margin:0;font-size:22px}
    input{width:360px;border:1px solid #cbd5e1;border-radius:8px;padding:10px}
    .layout{display:grid;grid-template-columns:180px 1fr;gap:16px}
    nav{border-right:1px solid #e5e7eb;padding-right:10px} nav button{display:block;width:100%;border:0;background:transparent;text-align:left;padding:10px;border-radius:8px;cursor:pointer}.active{background:#dbeafe!important;color:#1d4ed8;font-weight:700}
    .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:12px}.card{border:1px solid #d7dfec;border-radius:12px;padding:12px;text-align:center;background:#fff}.img{height:110px}.card b{display:block}.card small{color:#64748b}.card p{font-size:12px;color:#475569}
  `]
})
export class CatalogComponent{
  category='All'; search=''; constructor(public lib:FittingLibraryService){}
  filtered(){ const q=this.search.toLowerCase().trim(); return this.lib.fittings.filter(f=>(this.category==='All'||f.category===this.category)&&(!q||f.name.toLowerCase().includes(q)||(f.spanishAlias||'').toLowerCase().includes(q)||f.category.toLowerCase().includes(q))); }
}
