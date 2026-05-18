import { Routes } from '@angular/router';
import { dashboardChildRoutes } from './features/dashboard/dashboard.routes';

export const routes: Routes = [
  { path: '', loadComponent: () => import('./pages/home/home.component').then(m => m.HomeComponent) },
  { path: 'login', loadComponent: () => import('./auth/login/login.component').then(m => m.LoginComponent) },
  {
    path: 'dashboard',
    loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent),
    children: dashboardChildRoutes
  },
  { path: '**', redirectTo: '' }
];
