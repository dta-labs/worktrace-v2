import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home.component';
// Ajusta estas rutas a tu estructura real
// import { LoginComponent } from './auth/login/login.component';

const routes: Routes = [
  { path: '', component: HomeComponent, pathMatch: 'full' },
  // { path: 'login', component: LoginComponent },
  { path: '**', redirectTo: '' },
];

@NgModule({
  imports: [RouterModule.forRoot(routes, { scrollPositionRestoration: 'top' })],
  exports: [RouterModule],
})
export class AppRoutingModule {}
