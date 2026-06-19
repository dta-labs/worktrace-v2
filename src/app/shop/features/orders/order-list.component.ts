import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { OrderStoreService } from '../../core/services/order-store.service';

@Component({selector:'app-order-list',standalone:true,imports:[CommonModule,RouterLink],template:`
<div class="panel"><header><h1>Fabrication Orders</h1><a routerLink="/orders/new">+ New Order</a></header>
<table><thead><tr><th>Order</th><th>Project</th><th>Customer</th><th>Status</th><th>Pieces</th><th>Required</th></tr></thead>
<tbody><tr *ngFor="let o of store.list()"><td>{{o.orderNo}}</td><td>{{o.projectName}}</td><td>{{o.customer}}</td><td><span>{{o.status}}</span></td><td>{{o.pieces.length}}</td><td>{{o.dateRequired}}</td></tr></tbody></table></div>`,styles:[`.panel{background:white;border:1px solid #d7dfec;border-radius:14px;padding:16px} header{display:flex;justify-content:space-between} a{background:#2563eb;color:white;text-decoration:none;padding:10px;border-radius:8px} table{width:100%;border-collapse:collapse} th,td{border-bottom:1px solid #e5e7eb;padding:12px;text-align:left} span{background:#dbeafe;color:#1d4ed8;padding:5px 8px;border-radius:8px}`]})
export class OrderListComponent{constructor(public store:OrderStoreService){}}
