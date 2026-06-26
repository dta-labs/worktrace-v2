import { Component, inject } from '@angular/core';

import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
  AbstractControl,
  ValidationErrors,
  ValidatorFn
} from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatCardModule } from '@angular/material/card';

import { firstValueFrom } from 'rxjs';
import { ProjectService } from '../../../../../services/project.service';
import { Project, ProjectStatus } from '../../../../../models/project.model';
import { BidsSettingsService } from '../../../../../core/services/bids-settings.service';
import { DriveFunctionsService } from '../../../../../core/services/drive-functions.service';

const activeRequiresStart: ValidatorFn = (group: AbstractControl): ValidationErrors | null => {
  const status = group.get('status')?.value;
  if (status === 'active') {
    const startDate = group.get('startDate')?.value;
    const startTime = group.get('startTime')?.value;
    const errors: any = {};
    if (!startDate) errors.startDateRequiredWhenActive = true;
    if (!startTime || String(startTime).trim() === '') errors.startTimeRequiredWhenActive = true;
    return Object.keys(errors).length ? errors : null;
  }
  return null;
};

@Component({
    selector: 'app-create-project',
    imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatCardModule
],
    templateUrl: './create-project.component.html',
    styleUrls: ['./create-project.component.scss']
})
export class CreateProjectComponent {
  private fb = inject(FormBuilder);
  private projectService = inject(ProjectService);
  private bidsSettings = inject(BidsSettingsService);
  private driveFns = inject(DriveFunctionsService);

  statuses: ProjectStatus[] = ['planned','active','on_hold','completed','cancelled'] as const;

  form = this.fb.group({
    poNumber: ['', Validators.required],
    projectName: ['', Validators.required],
    description: [''],
    status: ['planned', Validators.required],
    startDate: [null],
    endDate: [null],
    startTime: [''],
    teamSize: [null, [Validators.required, Validators.min(1)]],
    budget: [null, [Validators.required, Validators.min(1)]],
    street: ['', Validators.required],
    city: [''],
    state: [''],
    zip: [''],
    responsiblePerson: [''],
    responsiblePhone: [''],
    responsibleEmail: [''],
    company: [''],
  }, {
    // default is 'change' -> valid/invalid actualiza en vivo
    validators: [activeRequiresStart]
  });

  get c() { return this.form.controls; }

  private toEpoch(d?: any): number | undefined {
    return d ? new Date(d).getTime() : undefined;
  }

  async submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const f: any = this.form.value;
    const payload: Omit<Project, 'id' | 'createdAt' | 'createdByUid' | 'createdByEmail'> = {
      projectNumber: String(f.poNumber ?? '').trim(),
      name: String(f.projectName ?? '').trim(),
      description: f.description || undefined,
      status: (f.status ?? 'planned') as ProjectStatus,
      startDate: this.toEpoch(f.startDate),
      dueDateEstimate: this.toEpoch(f.endDate),
      workerCount: Number(f.teamSize),
      address: [f.street, f.city, f.state, f.zip].filter(Boolean).join(', '),
      responsible: {
        name: String(f.responsiblePerson ?? '').trim(),
        phone: String(f.responsiblePhone ?? '').trim(),
        email: String(f.responsibleEmail ?? '').trim(),
      },
      company: f.company ? String(f.company).trim() : undefined,
      startTime: f.startTime ? String(f.startTime).trim() : undefined,
      budget: Number(f.budget)
    };

    try {
      const bidsSettings = await firstValueFrom(this.bidsSettings.watch$());
      const driveEnabled = bidsSettings?.enabled !== false;
      const rootFolderId = String(bidsSettings?.rootFolderId ?? '').trim();
      const template = Array.isArray(bidsSettings?.subfolderTemplate)
        ? bidsSettings.subfolderTemplate.filter((item) => String(item || '').trim())
        : [];
      const companyName = String(payload.company ?? '').trim() || null;
      const projectYear = new Date().getFullYear().toString();

      console.log('[CreateProject] settings snapshot', {
        driveEnabled,
        rootFolderId: rootFolderId || null,
        rootFolderSource: 'settings/bids',
        companyName,
        projectYear,
        template,
      });

      const ref = await this.projectService.addProject({
        ...payload,
        drive: {
          enabled: driveEnabled,
          rootFolderId: rootFolderId || null,
          templateUsed: template,
          createdAt: Date.now(),
          error: !driveEnabled
            ? 'Drive disabled in settings/bids.'
            : !rootFolderId
              ? 'Missing rootFolderId in settings/bids.'
              : null,
        },
      });

      console.log('[CreateProject] project created in Firestore', {
        projectId: ref.id,
        projectNumber: payload.projectNumber,
        projectName: payload.name,
      });

      let driveWarning = '';

      if (!driveEnabled) {
        driveWarning = 'Drive is disabled in Bids Configuration.';
      } else if (!rootFolderId) {
        driveWarning = 'Drive root folder is empty in Bids Configuration.';
      } else {
        try {
          console.log('[CreateProject] calling createProjectFolder', {
            projectId: ref.id,
            rootFolderId,
            rootFolderSource: 'settings/bids',
            projectYear,
            company: companyName,
            projectNumber: payload.projectNumber,
            projectName: payload.name,
            template,
          });

          const driveRes = await this.driveFns.createProjectFolder({
            rootFolderId,
            projectNumber: payload.projectNumber,
            projectName: payload.name,
            company: companyName ?? undefined,
            template,
          });

          console.log('[CreateProject] createProjectFolder response', driveRes);

          if (driveRes?.success && driveRes.projectFolderId) {
            await this.projectService.updateProject(ref.id, {
              drive: {
                enabled: true,
                rootFolderId: driveRes.rootFolderId ?? rootFolderId,
                projectFolderId: driveRes.projectFolderId,
                projectFolderName: driveRes.projectFolderName ?? null,
                projectFolderUrl: driveRes.projectFolderUrl ?? null,
                templateUsed: driveRes.templateUsed ?? template,
                path: driveRes.path ?? null,
                createdAt: Date.now(),
                error: null,
              },
            });
          } else {
            driveWarning = driveRes?.message || 'Drive folder was not created.';
            await this.projectService.updateProject(ref.id, {
              drive: {
                enabled: true,
                rootFolderId: rootFolderId || null,
                templateUsed: template,
                createdAt: Date.now(),
                error: driveWarning,
              },
            });
          }
        } catch (driveErr: any) {
          driveWarning =
            driveErr?.details?.message ||
            driveErr?.message ||
            'Drive folder creation failed.';
          console.error('[CreateProject] createProjectFolder failed', driveErr);
          await this.projectService.updateProject(ref.id, {
            drive: {
              enabled: true,
              rootFolderId: rootFolderId || null,
              templateUsed: template,
              createdAt: Date.now(),
              error: driveWarning,
            },
          });
        }
      }

      alert(
        driveWarning
          ? `⚠️ Project created: ${ref.id}
Drive warning: ${driveWarning}`
          : '✅ Project created: ' + ref.id
      );
      this.form.reset({ status: 'planned' });
    } catch (err: any) {
      console.error('[CreateProject] error saving project', err?.code, err?.message, err);
      alert('❌ Error: ' + (err?.code || 'unknown'));
    }
  }
}
