import { Routes } from '@angular/router';
import { OrderBuilderComponent } from './features/order-builder/order-builder.component';

export const routes: Routes = [
  { path: '', redirectTo: 'orders/new', pathMatch: 'full' },
  { path: 'orders/new', component: OrderBuilderComponent },
  { path: '**', redirectTo: 'orders/new' }
];
