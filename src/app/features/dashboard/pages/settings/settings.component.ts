import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { DriveSettingsService } from '../../../../core/services/drive-settings.service';
import { BidsSettingsService } from '../../../../core/services/bids-settings.service';
import { DriveFunctionsService } from '../../../../core/services/drive-functions.service';

import {ThemeService} from "src/app/core/theme/theme.service";

type SettingsTab = 'general' | 'appearance' | 'user-permissions' | 'bids-configuration' | 'hr-configuration';
type ThemeId = 'dark' | 'midnight' | 'light' | 'aurora';
type DensityId = 'compact' | 'comfortable' | 'spacious';
type WorkerFolderNamingMode = 'last_first' | 'first_last' | 'last_only' | 'first_only';

@Component({
  selector: 'app-settings-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.scss',
})
export class SettingsPageComponent implements OnInit, OnDestroy {
  activeTab: SettingsTab = 'general';

  themeService = inject(ThemeService)

  //selectedTheme: ThemeId = 'dark';
  selectedTheme: ThemeId = this.themeService.current();
  selectedDensity: DensityId = 'comfortable';

  readonly themeOptions = [
    { id: 'dark', label: 'Dark', description: 'Balanced dark interface with blue accents.', family: 'dark' },
    { id: 'midnight', label: 'Midnight', description: 'Elegant deep-blue dashboard style.', family: 'dark' },
    { id: 'light', label: 'Light', description: 'Bright workspace for office and estimating tasks.', family: 'light' },
    { id: 'aurora', label: 'Aurora', description: 'Light theme with modern color accents.', family: 'light' },
  ] as const;

  readonly densityOptions = [
    { id: 'compact', label: 'Compact', description: 'More information visible on screen.' },
    { id: 'comfortable', label: 'Comfortable', description: 'Balanced spacing for daily use.' },
    { id: 'spacious', label: 'Spacious', description: 'Larger spacing for a calmer layout.' },
  ] as const;

  readonly workerNamingOptions: { id: WorkerFolderNamingMode; label: string; description: string }[] = [
    { id: 'last_first', label: 'Last name + first name', description: 'Example: GONZALEZ YOANNY' },
    { id: 'first_last', label: 'First name + last name', description: 'Example: YOANNY GONZALEZ' },
    { id: 'last_only', label: 'Last name only', description: 'Example: GONZALEZ' },
    { id: 'first_only', label: 'First name only', description: 'Example: YOANNY' },
  ];

  readonly darkThemeOptions = this.themeOptions.filter((option) => option.family === 'dark');
  readonly lightThemeOptions = this.themeOptions.filter((option) => option.family === 'light');

  private driveSettings = inject(DriveSettingsService);
  private bidsSettings = inject(BidsSettingsService);
  private driveFns = inject(DriveFunctionsService);
  private hrSub?: Subscription;
  private bidsSub?: Subscription;

  bidsLoading = true;
  bidsSaving = false;
  bidsError = '';
  bidsSavedMsg = '';
  bidsInfoMsg = '';
  bidsValidating = false;
  bidsValidateMsg = '';

  bidsEnabled = true;
  bidsRootFolderId = '';
  bidsRootFolderName = '';
  bidsRootFolderUrl = '';
  bidsLocationType: 'myDrive' | 'sharedDrive' = 'myDrive';
  bidsSupportsAllDrives = false;

  driveLoading = true;
  driveSaving = false;
  driveError = '';
  driveSavedMsg = '';
  driveValidating = false;
  driveValidateMsg = '';

  driveEnabled = true;
  driveRootFolderId = '';
  driveRootFolderName = '';
  driveRootFolderUrl = '';
  driveLocationType: 'myDrive' | 'sharedDrive' = 'myDrive';
  driveSupportsAllDrives = false;
  driveHumanResourcesFolderName = '07-HUMAN RESOURCES';
  driveWorkersFolderName = 'WORKERS';
  workerFolderNamingMode: WorkerFolderNamingMode = 'last_first';

  bidFolderTemplate: string[] = this.defaultBidTemplate();
  workerSubfolderTemplate: string[] = this.defaultWorkerTemplate();

  ngOnInit(): void {
    this.bidsSub = this.bidsSettings.watch$().subscribe({
      next: (doc) => {
        this.bidsLoading = false;
        this.bidsError = '';

        this.bidsEnabled = doc?.enabled ?? true;
        // Bids configuration must read only from settings/bids.
        // Do not fallback to HR / settings/drive here.
        this.bidsRootFolderId = doc?.rootFolderId ?? '';
        this.bidsRootFolderName = doc?.rootFolderName ?? '';
        this.bidsRootFolderUrl = doc?.rootFolderUrl ?? '';
        this.bidsLocationType = doc?.locationType ?? 'myDrive';
        this.bidsSupportsAllDrives = doc?.supportsAllDrives ?? (this.bidsLocationType === 'sharedDrive');

        const bidTemplate = Array.isArray(doc?.subfolderTemplate) ? doc.subfolderTemplate : null;
        this.bidFolderTemplate = (bidTemplate && bidTemplate.length ? bidTemplate : this.defaultBidTemplate()).slice();
        this.bidsInfoMsg = this.bidsRootFolderId
          ? ''
          : 'Bids root folder is not configured yet. Paste the BID root folder ID and save.';
      },
      error: (err) => {
        this.bidsLoading = false;
        this.bidsError = err?.message || 'Failed to load bid settings.';
      },
    });

    this.hrSub = this.driveSettings.watch$().subscribe({
      next: (doc) => {
        this.driveLoading = false;
        this.driveError = '';

        this.driveEnabled = doc?.enabled ?? true;
        this.driveRootFolderId = doc?.rootFolderId ?? '';
        this.driveRootFolderName = doc?.rootFolderName ?? '';
        this.driveRootFolderUrl = doc?.rootFolderUrl ?? '';
        this.driveLocationType = doc?.locationType ?? 'myDrive';
        this.driveSupportsAllDrives = doc?.supportsAllDrives ?? (this.driveLocationType === 'sharedDrive');
        this.driveHumanResourcesFolderName = (doc?.humanResourcesFolderName ?? '07-HUMAN RESOURCES').toString().trim() || '07-HUMAN RESOURCES';
        this.driveWorkersFolderName = (doc?.workersFolderName ?? 'WORKERS').toString().trim() || 'WORKERS';
        this.workerFolderNamingMode = doc?.workerFolderNamingMode ?? 'last_first';

        const workerTemplate = Array.isArray(doc?.workerSubfolderTemplate) ? doc.workerSubfolderTemplate : null;
        this.workerSubfolderTemplate = this.normalizeWorkerTemplate(workerTemplate && workerTemplate.length ? workerTemplate : this.defaultWorkerTemplate());

        const legacyBidTemplate = Array.isArray(doc?.subfolderTemplate) ? doc.subfolderTemplate : null;
        const usingDefaultBidTemplate = JSON.stringify(this.bidFolderTemplate) === JSON.stringify(this.defaultBidTemplate());
        if (!this.bidsRootFolderId && usingDefaultBidTemplate && legacyBidTemplate?.length) {
          this.bidFolderTemplate = this.dedupeTemplate(legacyBidTemplate, this.defaultBidTemplate());
        }
      },
      error: (err) => {
        this.driveLoading = false;
        this.driveError = err?.message || 'Failed to load Drive settings.';
      },
    });
  }

  ngOnDestroy(): void {
    this.hrSub?.unsubscribe();
    this.bidsSub?.unsubscribe();
  }

  setTab(tab: SettingsTab) {
    this.activeTab = tab;
  }

  closeMenus() {}

  resetAppearanceDraft() {
    this.selectedTheme = 'dark';
    this.selectedDensity = 'comfortable';
  }

  addBidTemplateRow() {
    this.bidFolderTemplate = [...this.bidFolderTemplate, ''];
  }

  removeBidTemplateRow(i: number) {
    if (this.bidFolderTemplate.length <= 1) return;
    this.bidFolderTemplate = this.bidFolderTemplate.filter((_, idx) => idx !== i);
  }

  resetBidTemplate() {
    this.bidFolderTemplate = this.defaultBidTemplate();
  }

  addWorkerTemplateRow() {
    this.workerSubfolderTemplate = [...this.workerSubfolderTemplate, ''];
  }

  removeWorkerTemplateRow(i: number) {
    if (this.workerSubfolderTemplate.length <= 1) return;
    this.workerSubfolderTemplate = this.workerSubfolderTemplate.filter((_, idx) => idx !== i);
  }

  resetWorkerTemplate() {
    this.workerSubfolderTemplate = this.defaultWorkerTemplate();
  }

  async validateBidRootFolder() {
    this.bidsValidateMsg = '';
    this.bidsError = '';
    const id = (this.bidsRootFolderId || '').trim();
    if (!id) {
      this.bidsValidateMsg = 'Paste the Google Drive Folder ID first.';
      return;
    }

    this.bidsValidating = true;
    try {
      const res = await this.driveFns.validateDriveFolder(id);
      if (!res?.success) {
        this.bidsValidateMsg = res?.message || 'Folder not accessible. Make sure the Service Account is shared as Editor.';
        return;
      }
      this.bidsRootFolderName = res.name || this.bidsRootFolderName || '';
      this.bidsRootFolderUrl = res.url || this.bidsRootFolderUrl || '';
      this.bidsValidateMsg = `OK: ${this.bidsRootFolderName || 'Folder validated'}`;
      setTimeout(() => (this.bidsValidateMsg = ''), 2500);
    } catch (e: any) {
      this.bidsValidateMsg = e?.message || 'Validation failed. Check Drive API + permissions.';
    } finally {
      this.bidsValidating = false;
    }
  }

  async validateHrRootFolder() {
    this.driveValidateMsg = '';
    this.driveError = '';
    const id = (this.driveRootFolderId || '').trim();
    if (!id) {
      this.driveValidateMsg = 'Paste the Google Drive Folder ID first.';
      return;
    }

    this.driveValidating = true;
    try {
      const res = await this.driveFns.validateDriveFolder(id);
      if (!res?.success) {
        this.driveValidateMsg = res?.message || 'Folder not accessible. Make sure the Service Account is shared as Editor.';
        return;
      }
      this.driveRootFolderName = res.name || this.driveRootFolderName || '';
      this.driveRootFolderUrl = res.url || this.driveRootFolderUrl || '';
      this.driveValidateMsg = `OK: ${this.driveRootFolderName || 'Folder validated'}`;
      setTimeout(() => (this.driveValidateMsg = ''), 2500);
    } catch (e: any) {
      this.driveValidateMsg = e?.message || 'Validation failed. Check Drive API + permissions.';
    } finally {
      this.driveValidating = false;
    }
  }

  async saveBidSettings() {
    this.bidsSaving = true;
    this.bidsError = '';
    this.bidsSavedMsg = '';

    try {
      const payload: any = {
        enabled: this.bidsEnabled,
        locationType: this.bidsLocationType,
        supportsAllDrives: this.bidsLocationType === 'sharedDrive',
        rootFolderId: (this.bidsRootFolderId || '').trim(),
        rootFolderName: (this.bidsRootFolderName || '').trim(),
        rootFolderUrl: (this.bidsRootFolderUrl || '').trim(),
        subfolderTemplate: this.dedupeTemplate(this.bidFolderTemplate, this.defaultBidTemplate()),
      };

      await this.bidsSettings.save(payload);
      this.bidsInfoMsg = payload.rootFolderId
        ? ''
        : 'Bids configuration was saved without a root folder. Paste the BID root folder ID when ready.';
      this.bidsSavedMsg = 'Bid configuration saved.';
      setTimeout(() => (this.bidsSavedMsg = ''), 2000);
    } catch (e: any) {
      this.bidsError = e?.message || 'Failed to save bid settings.';
    } finally {
      this.bidsSaving = false;
    }
  }

  async saveDriveSettings() {
    this.driveSaving = true;
    this.driveError = '';
    this.driveSavedMsg = '';

    try {
      const payload: any = {
        enabled: this.driveEnabled,
        locationType: this.driveLocationType,
        supportsAllDrives: this.driveLocationType === 'sharedDrive',
        humanResourcesFolderName: (this.driveHumanResourcesFolderName || '07-HUMAN RESOURCES').trim() || '07-HUMAN RESOURCES',
        workersFolderName: (this.driveWorkersFolderName || 'WORKERS').trim() || 'WORKERS',
        workerFolderNamingMode: this.workerFolderNamingMode,
        workerSubfolderTemplate: this.normalizeWorkerTemplate(this.workerSubfolderTemplate),
      };

      if ((this.driveRootFolderId || '').trim()) payload.rootFolderId = this.driveRootFolderId.trim();
      if ((this.driveRootFolderName || '').trim()) payload.rootFolderName = this.driveRootFolderName.trim();
      if ((this.driveRootFolderUrl || '').trim()) payload.rootFolderUrl = this.driveRootFolderUrl.trim();

      await this.driveSettings.save(payload);

      this.driveSavedMsg = 'HR configuration saved.';
      setTimeout(() => (this.driveSavedMsg = ''), 2000);
    } catch (e: any) {
      this.driveError = e?.message || 'Failed to save Drive settings.';
    } finally {
      this.driveSaving = false;
    }
  }

  workerFolderPreview(firstName = 'YOANNY', lastName = 'GONZALEZ'): string {
    const first = (firstName || '').trim().toUpperCase();
    const last = (lastName || '').trim().toUpperCase();

    switch (this.workerFolderNamingMode) {
      case 'first_last':
        return [first, last].filter(Boolean).join(' ');
      case 'last_only':
        return last || 'LASTNAME';
      case 'first_only':
        return first || 'FIRSTNAME';
      case 'last_first':
      default:
        return [last, first].filter(Boolean).join(' ');
    }
  }

  private dedupeTemplate(list: string[], fallback: string[]): string[] {
    const cleaned = list.map((s) => (s ?? '').trim()).filter((s) => !!s);
    const deduped: string[] = [];
    const seen = new Set<string>();

    for (const name of cleaned) {
      const key = name.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        deduped.push(name);
      }
    }

    return deduped.length ? deduped : fallback;
  }

  private defaultBidTemplate(): string[] {
    return [
      '01-BLUEPRINTS',
      '02-BID',
      '03-CONTRACTS',
      '04-VENDOR',
      '05-RFI',
      '06-TIME SHEET',
      '07-TOOLS AND RESOURCES',
      '08-INVOICE',
      '09-Budgets T&M',
      '10-SOFTWARE',
    ];
  }

  private normalizeWorkerTemplate(list?: string[] | null): string[] {
    const fallback = this.defaultWorkerTemplate();
    const cleaned = this.dedupeTemplate(list ?? fallback, fallback);

    const preferred = ['01-FOTO', '02-DOCUMENTOS'];
    const lower = new Set(cleaned.map((name) => name.toLowerCase()));
    const head = preferred.filter((name) => lower.has(name.toLowerCase()));
    for (const required of preferred) {
      if (!head.find((name) => name.toLowerCase() === required.toLowerCase())) head.push(required);
    }

    const tail = cleaned.filter((name) => !preferred.some((required) => required.toLowerCase() === name.toLowerCase()));
    return [...head, ...tail];
  }

  private defaultWorkerTemplate(): string[] {
    return [
      '01-FOTO',
      '02-DOCUMENTOS',
      '03-CERTIFICATIONS',
      '04-PAYROLL',
      '05-INCIDENTS',
      '06-OTHER',
    ];
  }

  changeTheme(){

    this.themeService.apply(this.selectedTheme);
  }
}

