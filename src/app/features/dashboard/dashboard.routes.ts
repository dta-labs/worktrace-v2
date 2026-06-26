import { Routes } from '@angular/router';
import { screenAccessGuard } from '../../core/guards/screen-access.guard';

export const DASHBOARD_ROUTES: Routes = [
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
      { path: 'bids', pathMatch: 'full', loadComponent: () => import('./pages/construction/bids/bids.component').then(m => m.BidsPageComponent) },
      {
        path: 'incoming-bids-trash',
        pathMatch: 'full',
        loadComponent: () => import('./pages/construction/bids/incoming-bids-trash.component')
          .then(m => m.IncomingBidsTrashPageComponent),
      },
      { path: 'bids/:id', loadComponent: () => import('./pages/construction/bids/bid-detail/bid-detail.component').then(m => m.BidDetailPageComponent) },
      { path: 'projects', pathMatch: 'full', loadComponent: () => import('./pages/projects/projects.component').then(m => m.ProjectsPageComponent) },
      { path: '', pathMatch: 'full', redirectTo: 'bids' },
    ],
  },


  {
    path: 'shop',
    canActivate: [screenAccessGuard],
    data: { screen: 'shop' },
    children: [
      {
        path: '',
        pathMatch: 'full',
        loadComponent: () => import('../../shop/pages/order-builder/order-builder.component')
          .then(m => m.OrderBuilderComponent),
      },
      {
        path: 'orders',
        pathMatch: 'full',
        loadComponent: () => import('../../shop/pages/orders-list/orders-list.component')
          .then(m => m.OrdersListComponent),
      },
      {
        path: 'orders/:id',
        loadComponent: () => import('../../shop/pages/order-builder/order-builder.component')
          .then(m => m.OrderBuilderComponent),
      },
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
    path: 'settings',
    canActivate: [screenAccessGuard],
    data: { screen: 'settings' },
    loadComponent: () => import('./pages/settings/settings.component')
      .then(m => m.SettingsPageComponent),
  },
  { path: '', pathMatch: 'full', redirectTo: 'construction' },
];

export const dashboardChildRoutes = DASHBOARD_ROUTES;
