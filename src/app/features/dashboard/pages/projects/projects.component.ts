
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTabsModule } from '@angular/material/tabs';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatListModule } from '@angular/material/list';
import { MatButtonModule } from '@angular/material/button';

import { CreateProjectComponent } from './create-project/create-project.component';

@Component({
  selector: 'app-projects-page',
  standalone: true,
  imports: [CommonModule, MatTabsModule, MatFormFieldModule, MatSelectModule, MatListModule, MatButtonModule, CreateProjectComponent],
  templateUrl: './projects.component.html',
  styleUrls: ['./projects.component.scss'],
})
export class ProjectsPageComponent {}
