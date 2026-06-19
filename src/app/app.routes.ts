import { Routes } from '@angular/router';
import { dashboardChildRoutes } from './features/dashboard/dashboard.routes';
import { authGuard } from './core/auth/auth.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/home/home.component').then(m => m.HomeComponent)
  },
  {
    path: 'login',
    loadComponent: () => import('./auth/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'reset-password',
    loadComponent: () => import('./features/reset-password/reset-password.component').then(m => m.ResetPasswordComponent)
  },
  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent),
    children: dashboardChildRoutes
  },
  {
    path: 'shop',
    loadChildren: () => import('./shop/shop.routes').then(m => m.routes)
  },
  {
    path: '**',
    redirectTo: ''
  }
];
