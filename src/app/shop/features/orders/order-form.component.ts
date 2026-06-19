import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FittingLibraryService } from '../../core/services/fitting-library.service';
import { OrderStoreService } from '../../core/services/order-store.service';
import { FabricationOrder, FabricationPiece, FittingDefinition } from '../../core/models/shop.models';
import { FittingImageComponent } from '../../shared/components/fitting-image/fitting-image.component';

@Component({
  selector: 'app-order-form', standalone: true, imports: [CommonModule, FormsModule, FittingImageComponent],
  template: `
  <div class="topbar">
    <div><h1>New Fabrication Order</h1><p>Select a real HVAC fitting, enter dimensions, and create an approval list.</p></div>
    <div><button class="outline" (click)="printApproval()">Approval Sheet / PDF</button><button (click)="saveDraft()">Save Draft</button></div>
  </div>

  <section class="order-info">
    <label>Project<input [(ngModel)]="order.projectName" placeholder="Project name"></label>
    <label>Customer<input [(ngModel)]="order.customer" placeholder="Customer / company"></label>
    <label>Requested By<input [(ngModel)]="order.requestedBy" placeholder="Person requesting approval"></label>
    <label>Date Required<input type="date" [(ngModel)]="order.dateRequired"></label>
  </section>

  <section class="workspace">
    <div class="library panel">
      <header><h2>1. Select HVAC Fitting</h2><input [(ngModel)]="search" placeholder="Search fitting..." /></header>
      <div class="lib-layout">
        <nav><button *ngFor="let c of lib.categories" [class.active]="category===c" (click)="category=c">{{c}}</button></nav>
        <div class="cards">
          <article class="fitting-card" *ngFor="let f of filtered()" [class.selected]="selected?.id===f.id" (click)="select(f)">
            <div class="thumb"><app-fitting-image [src]="f.image" [alt]="f.name"></app-fitting-image></div>
            <b>{{f.name}}</b><small>{{f.spanishAlias}}</small>
          </article>
        </div>
      </div>
    </div>

    <aside class="panel dimensions" *ngIf="selected">
      <h2>2. Dimensions</h2>
      <div class="selected-preview"><app-fitting-image [src]="selected.image" [alt]="selected.name"></app-fitting-image></div>
      <h3>{{selected.name}}</h3><p>{{selected.description}}</p>
      <label *ngFor="let field of selected.fields">{{field.label}}
        <div class="input-row"><input [type]="field.unit==='text' ? 'text' : 'number'" [(ngModel)]="dims[field.key]"><span>{{field.unit==='qty'||field.unit==='text' ? '' : field.unit}}</span></div>
      </label>
      <label>Notes<textarea [(ngModel)]="notes"></textarea></label>
      <button class="full" (click)="addPiece()">Add To Order</button>
    </aside>
  </section>

  <section class="panel list">
    <header><h2>3. Fabrication List</h2><b>Total pieces: {{totalQty()}}</b></header>
    <table>
      <thead><tr><th>#</th><th>Fitting</th><th>Dimensions</th><th>Gauge</th><th>Material</th><th>Qty</th><th>Image</th><th></th></tr></thead>
      <tbody><tr *ngFor="let p of order.pieces; let i = index">
        <td>{{i+1}}</td><td><b>{{p.fittingName}}</b><small>{{p.category}}</small></td><td>{{dimensionText(p)}}</td><td>{{p.gauge}}</td><td>{{p.material}}</td><td>{{p.quantity}}</td><td><div class="mini"><app-fitting-image [src]="p.fittingImage" [alt]="p.fittingName"></app-fitting-image></div></td><td><button class="danger" (click)="remove(p.id)">Delete</button></td>
      </tr></tbody>
    </table>
  </section>

  <section class="approval panel" id="approval-sheet">
    <header class="approval-head"><div><h1>SHOP</h1><p>HVAC Fabrication Approval</p></div><div><b>{{order.orderNo}}</b><p>Revision {{order.revision}}</p></div></header>
    <div class="meta"><span>Project: <b>{{order.projectName}}</b></span><span>Customer: <b>{{order.customer}}</b></span><span>Required: <b>{{order.dateRequired}}</b></span></div>
    <table><thead><tr><th>#</th><th>Fitting</th><th>Dimensions</th><th>Gauge</th><th>Material</th><th>Qty</th><th>Drawing</th></tr></thead><tbody><tr *ngFor="let p of order.pieces; let i=index"><td>{{i+1}}</td><td>{{p.fittingName}}</td><td>{{dimensionText(p)}}</td><td>{{p.gauge}}</td><td>{{p.material}}</td><td>{{p.quantity}}</td><td><div class="approval-img"><app-fitting-image [src]="p.fittingImage" [alt]="p.fittingName"></app-fitting-image></div></td></tr></tbody></table>
    <div class="sign"><span>Approved by: __________________________</span><span>Date: ____ / ____ / ______</span></div>
  </section>
  `,
  styles: [`
    .topbar{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:14px}h1{margin:0;font-size:24px}p{color:#64748b;margin:4px 0}.topbar button, .full, .order-info button{background:#2563eb;color:white;border:0;border-radius:8px;padding:10px 14px;margin-left:8px;cursor:pointer}.outline{background:white!important;color:#2563eb!important;border:1px solid #2563eb!important}
    .panel{background:white;border:1px solid #d7dfec;border-radius:14px;padding:14px}.order-info{background:white;border:1px solid #d7dfec;border-radius:14px;padding:14px;display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:14px}label{display:block;font-size:12px;font-weight:700;color:#111827}input,select,textarea{width:100%;border:1px solid #cbd5e1;border-radius:8px;padding:9px;margin-top:5px}textarea{min-height:70px}
    .workspace{display:grid;grid-template-columns:1fr 310px;gap:14px}.library header{display:flex;justify-content:space-between;align-items:center}.library header input{width:310px}.lib-layout{display:grid;grid-template-columns:170px 1fr;gap:14px}nav{border-right:1px solid #e5e7eb;padding-right:10px}nav button{display:block;width:100%;text-align:left;border:0;background:transparent;padding:10px;border-radius:8px;cursor:pointer}.active{background:#dbeafe!important;color:#1d4ed8;font-weight:800}.cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:10px;max-height:520px;overflow:auto}.fitting-card{border:1px solid #d7dfec;border-radius:12px;padding:10px;text-align:center;cursor:pointer;background:white}.fitting-card:hover,.selected{border-color:#2563eb;box-shadow:0 0 0 2px #dbeafe}.thumb{height:105px}.fitting-card b{display:block;font-size:13px}.fitting-card small{color:#64748b}
    .selected-preview{height:150px}.dimensions h3{margin-bottom:0}.input-row{display:flex}.input-row input{border-radius:8px 0 0 8px}.input-row span{margin-top:5px;border:1px solid #cbd5e1;border-left:0;border-radius:0 8px 8px 0;padding:9px;background:#f8fafc;min-width:38px;text-align:center}.full{width:100%;margin:10px 0 0}.list{margin-top:14px}.list header{display:flex;justify-content:space-between}table{width:100%;border-collapse:collapse}th,td{border-bottom:1px solid #e5e7eb;padding:9px;text-align:left;vertical-align:middle}td small{display:block;color:#64748b}.mini{width:80px;height:55px}.danger{border:0;background:#fee2e2;color:#b91c1c;border-radius:8px;padding:7px 9px}
    .approval{margin-top:14px}.approval-head,.meta,.sign{display:flex;justify-content:space-between;gap:20px}.approval-head h1{color:#2563eb}.approval-img{width:100px;height:70px}.sign{padding:28px 0 10px}
    @media print{.sidebar,.topbar,.order-info,.workspace,.list{display:none!important}.content{padding:0}.approval{border:0}.app-shell{display:block}}
  `]
})
export class OrderFormComponent{
  category='All'; search=''; selected?:FittingDefinition; dims:Record<string,number|string>={}; notes='';
  order:FabricationOrder={id:crypto.randomUUID(),orderNo:'ORD-'+Date.now().toString().slice(-6),projectName:'',customer:'',requestedBy:'',dateRequired:'',status:'Draft',revision:'A',pieces:[],createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};
  constructor(public lib:FittingLibraryService, private store:OrderStoreService){ this.select(this.lib.fittings[0]); }
  filtered(){const q=this.search.toLowerCase().trim();return this.lib.fittings.filter(f=>(this.category==='All'||f.category===this.category)&&(!q||f.name.toLowerCase().includes(q)||(f.spanishAlias||'').toLowerCase().includes(q)||f.category.toLowerCase().includes(q)));}
  select(f:FittingDefinition){this.selected=f;this.dims={};f.fields.forEach(field=>this.dims[field.key]=field.defaultValue ?? '');}
  addPiece(){if(!this.selected)return;const d={...this.dims};const p:FabricationPiece={id:crypto.randomUUID(),fittingId:this.selected.id,fittingName:this.selected.name,fittingImage:this.selected.image,category:this.selected.category,dimensions:d,gauge:String(d['gauge']||''),material:String(d['material']||''),quantity:Number(d['quantity']||1),notes:this.notes};this.order.pieces.push(p);this.notes='';this.saveDraft();}
  remove(id:string){this.order.pieces=this.order.pieces.filter((p:FabricationPiece)=>p.id!==id);this.saveDraft();}
  saveDraft(){this.store.save(this.order);}
  totalQty(){return this.order.pieces.reduce((s,p)=>s+Number(p.quantity||0),0);}
  dimensionText(p:FabricationPiece){return Object.entries(p.dimensions).filter(([k])=>!['gauge','material','quantity'].includes(k)).map(([k,v])=>`${this.label(k)}: ${v}${typeof v==='number'?'"':''}`).join(' | ');}
  label(k:string){return k.replace(/([A-Z])/g,' $1').replace(/^./,c=>c.toUpperCase());}
  printApproval(){this.saveDraft();setTimeout(()=>window.print(),100);}
}
