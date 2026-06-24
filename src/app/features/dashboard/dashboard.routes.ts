import { Routes } from '@angular/router';
import { screenAccessGuard } from '../../core/guards/screen-access.guard';

export const DASHBOARD_ROUTES: Routes = [
  { path: 'projects', pathMatch: 'full', redirectTo: 'construction/projects' },
{
    path: 'overview',
    canActivate: [screenAccessGuard],
    data: { screen: 'overview' },
    loadComponent: () => import('./pages/overview/overview.component')
      .then(m => m.OverviewPageComponent),
  },
{
  path: 'construction',
  canActivate: [screenAccessGuard],
  data: { screen: 'construction' },
  loadComponent: () => import('./pages/construction/construction.component')
    .then(m => m.ConstructionPageComponent),
  children: [
    { path: 'bids', loadComponent: () => import('./pages/construction/bids/bids.component').then(m => m.BidsPageComponent) },
    { path: 'incoming-bids-trash', pathMatch: 'full', redirectTo: 'bids' },
    { path: 'bids/:id', loadComponent: () => import('./pages/construction/bids/bid-detail/bid-detail.component').then(m => m.BidDetailPageComponent) },
    { path: 'projects', loadComponent: () => import('./pages/projects/projects.component').then(m => m.ProjectsPageComponent) },
    { path: '', pathMatch: 'full', redirectTo: 'bids' },
  ],
},

  {
    path: 'workers',
    canActivate: [screenAccessGuard],
    data: { screen: 'workers' },
    loadComponent: () => import('./pages/workers/workers.component')
      .then(m => m.WorkersPageComponent),
  },
  {
    path: 'hr',
    canActivate: [screenAccessGuard],
    data: { screen: 'humanResources' },
    loadComponent: () => import('./pages/hr/hr.component')
      .then(m => m.HrPageComponent),
  },
  {
    path: 'companies',
    canActivate: [screenAccessGuard],
    data: { screen: 'companies' },
    loadComponent: () => import('./pages/companies/companies.component')
      .then(m => m.CompaniesPageComponent),
  },
  {
    path: 'shop',
    canActivate: [screenAccessGuard],
    data: { screen: 'shop' },
    loadComponent: () => import('../shop/order-builder/order-builder.component')
      .then(m => m.OrderBuilderComponent),
  },
  {
    path: 'settings',
    canActivate: [screenAccessGuard],
    data: { screen: 'settings' },
    loadComponent: () => import('./pages/settings/settings.component')
      .then(m => m.SettingsPageComponent),
  },
  { path: '', pathMatch: 'full', redirectTo: 'construction' },
];

export const dashboardChildRoutes = DASHBOARD_ROUTES;
