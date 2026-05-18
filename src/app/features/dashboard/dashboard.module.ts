import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTabsModule } from '@angular/material/tabs';

import { ProjectsComponent } from './pages/projects/projects.component';
import { OverviewComponent } from './pages/overview/overview.component';
import { WorkersComponent } from './pages/workers/workers.component';

@NgModule({
  declarations: [
    ProjectsComponent,
    OverviewComponent,
    WorkersComponent
  ],
  imports: [
    CommonModule,
    MatTabsModule
  ]
})
export class DashboardModule {}
