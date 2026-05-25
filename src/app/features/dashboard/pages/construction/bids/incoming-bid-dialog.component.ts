import { CommonModule } from '@angular/common';
import { Component, DestroyRef, inject, AfterViewInit, ElementRef, ViewChild } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatNativeDateModule, ErrorStateMatcher, MAT_DATE_LOCALE, MAT_DATE_FORMATS } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { FormBuilder, ReactiveFormsModule, Validators, FormControl, FormGroupDirective, NgForm } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { firstValueFrom } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { ClientsService, ClientItem } from './clients.service';

declare const google: any;

export interface IncomingBidDialogResult {
  client: string;
  projectName: string;
  dateReceived: Date | null;
  bidDueDate: Date | null;
  /** Selected contact index within the chosen company (contacts are stored as an array on the client doc). */
  contactId: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  priority: string;
  /** Physical jobsite address (not the Drive folder path). */
  jobsiteAddress: string;
  /** Optional geo data captured from Google Places. */
  jobsiteLat?: number | null;
  jobsiteLng?: number | null;
  jobsitePlaceId?: string | null;
}

type ClientContact = {
  id: string; // index-based id (string) for stable select values
  fullName: string;
  email?: string;
  phone?: string;
  role?: string;
  isPrimary?: boolean;
};
class SubmitOnlyErrorStateMatcher implements ErrorStateMatcher {
  constructor(private readonly isSubmitted: () => boolean) {}
  isErrorState(control: FormControl | null, form: FormGroupDirective | NgForm | null): boolean {
    const submitted = this.isSubmitted() || !!form?.submitted;
    return !!(control && control.invalid && (control.touched || submitted));
  }
}

@Component({
    selector: 'app-incoming-bid-dialog',
    providers: [
        { provide: MAT_DATE_LOCALE, useValue: 'en-US' },
        {
            provide: MAT_DATE_FORMATS,
            useValue: {
                parse: { dateInput: 'MM/dd/yyyy' },
                display: {
                    dateInput: 'MM/dd/yyyy',
                    monthYearLabel: 'MMM yyyy',
                    dateA11yLabel: 'MM/dd/yyyy',
                    monthYearA11yLabel: 'MMMM yyyy',
                },
            },
        },
    ],
    imports: [CommonModule, ReactiveFormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatDatepickerModule, MatNativeDateModule, MatIconModule, MatButtonModule, MatSelectModule],
    template: `
    <div class="wt-modal" role="dialog" aria-modal="true">
      <div class="wt-modal-head">
        <div class="wt-modal-title">Add Incoming Bid</div>
        <button type="button" class="wt-icon-btn" (click)="close()">✕</button>
      </div>
    
      <div class="wt-modal-body">
        <form [formGroup]="form" autocomplete="off">
          <div class="wt-grid wt-grid">
            <div class="wt-field">
              <label>Client *</label>
              <mat-form-field appearance="outline" class="wt-full wt-select wt-mf">
                <mat-select
                  formControlName="client"
                  panelClass="wt-select-panel"
                  placeholder="Select existing (manage Companies in the Companies tab)"
                  [errorStateMatcher]="submitMatcher">
                  @for (c of clients; track c) {
                    <mat-option [value]="c.name">{{ c.name }}</mat-option>
                  }
                </mat-select>
    
                <!-- <mat-select formControlName="client"
                placeholder="Select existing (manage Companies in the Companies tab)" [errorStateMatcher]="submitMatcher">
                <mat-option *ngFor="let c of clients" [value]="c.name">{{ c.name }}</mat-option>
              </mat-select> -->
            </mat-form-field>
            <div class="wt-help">To add a new Company/Client, go to <b>Companies</b> → <b>Create Company</b>.</div>
          </div>
    
          <div class="wt-field">
            <label>Project *</label>
            <mat-form-field appearance="outline" class="wt-full wt-select wt-mf">
              <input
                matInput
                type="text"
                formControlName="projectName"
                placeholder="Project name"
                [errorStateMatcher]="submitMatcher" />
              </mat-form-field>
            </div>
    
            <div class="wt-field">
              <label>Date Received</label>
              <mat-form-field appearance="outline" class="wt-full wt-date-mf">
                <input matInput [value]="(form.get('dateReceived')?.value | date:'MM/dd/yyyy')" readonly />
                <!-- visual-only calendar icon to match Bid Due Date -->
                <mat-icon matSuffix class="wt-calendar-ghost" aria-hidden="true">calendar_today</mat-icon>
              </mat-form-field>
              <div class="wt-help">Auto-set to the day you archive this request.</div>
            </div>
            <div class="wt-field">
              <label>Bid Due Date</label>
              <mat-form-field appearance="outline" class="wt-full wt-date-mf">
                <input matInput [matDatepicker]="duePicker" formControlName="bidDueAt">
                <button type="button" matSuffix class="white-calendar-btn" (click)="duePicker.open()" aria-label="Open calendar">
                  <mat-icon>calendar_today</mat-icon>
                </button>
                <mat-datepicker #duePicker></mat-datepicker>
              </mat-form-field>
            </div>
    
            <div class="wt-field wt-full">
              <label>Responsible / Contact</label>
              <mat-form-field appearance="outline" class="wt-full wt-select">
                <mat-select formControlName="contactId" [disabled]="!contactOptions.length" panelClass="wt-select-panel" placeholder="Select a contact (from this Company)" [errorStateMatcher]="submitMatcher">
                  <mat-option value="">Select a contact (from this Company)</mat-option>
                  @for (ct of contactOptions; track ct) {
                    <mat-option [value]="ct.id">
                      {{ ct.fullName }}{{ ct.role ? ' — ' + ct.role : '' }}{{ ct.isPrimary ? ' (Primary)' : '' }}
                    </mat-option>
                  }
                </mat-select>
    
                <!-- <mat-select formControlName="contactId" [disabled]="!contactOptions.length"
                placeholder="Select a contact (from this Company)" [errorStateMatcher]="submitMatcher">
                <mat-option value="">Select a contact (from this Company)</mat-option>
                <mat-option *ngFor="let ct of contactOptions" [value]="ct.id">
                  {{ ct.fullName }}{{ ct.role ? ' — ' + ct.role : '' }}{{ ct.isPrimary ? ' (Primary)' : '' }}
                </mat-option>
              </mat-select> -->
            </mat-form-field>
            @if (!contactOptions.length) {
              <div class="wt-help">
                No contacts found for this Company. Add one in <b>Companies</b> → <b>Edit</b> → <b>Contacts</b>.
              </div>
            }
          </div>
    
          <div class="wt-field">
            <label>Contact Email</label>
            <input type="email" formControlName="contactEmail" />
          </div>
    
          <div class="wt-field">
            <label>Contact Phone</label>
            <input type="text" formControlName="contactPhone" />
          </div>
    
          <div class="wt-field">
            <label>Jobsite Address</label>
            <div class="wt-input-wrap">
              <input type="text" formControlName="jobsiteAddress" #jobsiteAddressInput placeholder="123 Main St, Orlando, FL 32801" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" />
              <span class="wt-input-suffix" aria-hidden="true" title="Jobsite location">📍</span>
            </div>
            <div class="wt-help">Physical jobsite address (optional). This will show as a “Location loaded” button in the list.</div>
          </div>
    
          <div class="wt-field">
            <label>Priority</label>
            <select formControlName="priority">
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="normal">Normal</option>
              <option value="low">Low</option>
            </select>
            <div class="wt-help">Used to color-code the Incoming Bids list.</div>
          </div>
        </div>
      </form>
    </div>
    
    <div class="wt-modal-actions">
      <button type="button" class="btn" (click)="close()">Cancel</button>
      <button type="button" class="btn btn-primary" (click)="save()">Continue</button>
    </div>
    </div>
    `,
    styles: [`

:host-context([data-theme='midnight']) {
  --modal-bg: linear-gradient(180deg, #08192f 0%, #071325 100%);
  --modal-border: rgba(148, 163, 184, 0.2);
  --modal-text: #dbe5f1;
  --modal-muted: #9fb1c8;
  --modal-label: #c8d6ea;
  --modal-field-bg: rgba(96, 165, 250, 0.06);
  --modal-field-border: rgba(148, 163, 184, 0.24);
  --modal-field-border-hover: rgba(96, 165, 250, 0.52);
  --modal-field-border-focus: rgba(96, 165, 250, 0.8);
  --modal-placeholder: rgba(203, 213, 225, 0.65);
  --modal-hint: rgba(191, 204, 220, 0.76);
  --modal-btn-cancel-text: #dbe5f1;
  --modal-btn-cancel-border: rgba(148, 163, 184, 0.32);
  --modal-btn-cancel-bg: rgba(148, 163, 184, 0.08);
  --modal-btn-cancel-hover-bg: rgba(148, 163, 184, 0.15);
  --modal-btn-primary-bg: #3b82f6;
  --modal-btn-primary-hover-bg: #2563eb;
  --modal-select-panel-bg: #071325;
  --modal-select-option-hover: rgba(148, 163, 184, 0.12);
  --modal-select-option-selected-bg: rgba(59, 130, 246, 0.18);
}

:host-context([data-theme='light']) {
  --modal-bg: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
  --modal-border: rgba(15, 23, 42, 0.12);
  --modal-text: #0f172a;
  --modal-muted: #475569;
  --modal-label: #1e293b;
  --modal-field-bg: #ffffff;
  --modal-field-border: rgba(15, 23, 42, 0.2);
  --modal-field-border-hover: rgba(37, 99, 235, 0.38);
  --modal-field-border-focus: rgba(37, 99, 235, 0.72);
  --modal-placeholder: #64748b;
  --modal-hint: #64748b;
  --modal-btn-cancel-text: #334155;
  --modal-btn-cancel-border: rgba(15, 23, 42, 0.2);
  --modal-btn-cancel-bg: #ffffff;
  --modal-btn-cancel-hover-bg: rgba(15, 23, 42, 0.05);
  --modal-btn-primary-bg: #2563eb;
  --modal-btn-primary-hover-bg: #1d4ed8;
  --modal-select-panel-bg: #ffffff;
  --modal-select-option-hover: rgba(15, 23, 42, 0.05);
  --modal-select-option-selected-bg: rgba(37, 99, 235, 0.08);
}

:host-context([data-theme='aurora']) {
  --modal-bg: linear-gradient(180deg, #f8fbff 0%, #eef6ff 100%);
  --modal-border: rgba(37, 99, 235, 0.18);
  --modal-text: #0f172a;
  --modal-muted: #475569;
  --modal-label: #1e293b;
  --modal-field-bg: #ffffff;
  --modal-field-border: rgba(37, 99, 235, 0.24);
  --modal-field-border-hover: rgba(37, 99, 235, 0.46);
  --modal-field-border-focus: rgba(37, 99, 235, 0.78);
  --modal-placeholder: #64748b;
  --modal-hint: #64748b;
  --modal-btn-cancel-text: #334155;
  --modal-btn-cancel-border: rgba(37, 99, 235, 0.28);
  --modal-btn-cancel-bg: rgba(255, 255, 255, 0.92);
  --modal-btn-cancel-hover-bg: rgba(37, 99, 235, 0.08);
  --modal-btn-primary-bg: #2563eb;
  --modal-btn-primary-hover-bg: #1d4ed8;
  --modal-select-panel-bg: #ffffff;
  --modal-select-option-hover: rgba(37, 99, 235, 0.06);
  --modal-select-option-selected-bg: rgba(37, 99, 235, 0.12);
}

/* Default dark theme variables */
:host {
  --modal-bg: linear-gradient(180deg, #0f1115 0%, #0a0d12 100%);
  --modal-border: rgba(255, 255, 255, 0.08);
  --modal-text: #e8eef8;
  --modal-muted: rgba(230, 236, 245, 0.82);
  --modal-label: rgba(255, 255, 255, 0.65);
  --modal-field-bg: rgba(255, 255, 255, 0.03);
  --modal-field-border: rgba(255, 255, 255, 0.10);
  --modal-field-border-hover: rgba(79, 160, 255, 0.45);
  --modal-field-border-focus: rgba(79, 160, 255, 0.75);
  --modal-placeholder: rgba(255, 255, 255, 0.45);
  --modal-hint: rgba(255, 255, 255, 0.55);
  --modal-btn-cancel-text: #e8eef8;
  --modal-btn-cancel-border: rgba(255, 255, 255, 0.16);
  --modal-btn-cancel-bg: rgba(255, 255, 255, 0.04);
  --modal-btn-cancel-hover-bg: rgba(255, 255, 255, 0.08);
  --modal-btn-primary-bg: #2563eb;
  --modal-btn-primary-hover-bg: #1d4ed8;
  --modal-select-panel-bg: #0f141c;
  --modal-select-option-hover: rgba(255, 255, 255, 0.06);
  --modal-select-option-selected-bg: rgba(59, 130, 246, 0.18);
}

/* Force input text to match theme */
.wt-mf .mat-mdc-input-element,
.wt-date-mf .mat-mdc-input-element {
  color: var(--modal-text) !important;
}
.wt-mf .mat-mdc-input-element::placeholder,
.wt-date-mf .mat-mdc-input-element::placeholder {
  color: var(--modal-placeholder) !important;
}

/* Read-only pill (for fixed values like Date Received) */
.wt-pill {
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  padding: 0 14px;
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.10);
  color: rgba(255,255,255,0.90);
  font-size: 14px;
  line-height: 20px;
}
.wt-pill.is-empty {
  color: rgba(255,255,255,0.45);
}

/* Make helper text feel intentional (less "stacky") */
.wt-field .wt-help {
  max-width: 560px;
  opacity: 0.95;
}

/* Priority: align chevron and reduce vertical noise */
.wt-field select {
  padding-right: 42px;
}

/* Subtle divider spacing between clusters */
.wt-spacer-row {
  grid-column: 1 / -1;
  height: 6px;
}


/* Dialog: remove internal scrollbar (use dialog sizing instead) */
:host ::ng-deep .mat-mdc-dialog-content {
  max-height: none !important;
  overflow: hidden !important;
}

/* Typography consistency across native inputs and matInput */
.wt-field input,
.wt-field select {
  font-size: 14px;
  line-height: 20px;
}

::ng-deep .wt-date-mf input.mat-mdc-input-element {
  font-size: 16px !important;
  font-weight: 600 !important;
  line-height: 22px !important;
}
::ng-deep .wt-date-mf .mat-mdc-form-field-infix {
  font-size: 16px !important;
  line-height: 22px !important;
}

/* Make Bid Due Date align visually with other fields */
::ng-deep .wt-date-mf .mat-mdc-text-field-wrapper {
  background: rgba(255,255,255,0.03);
  border-radius: 12px;
}
::ng-deep .wt-date-mf .mdc-notched-outline__leading,
::ng-deep .wt-date-mf .mdc-notched-outline__notch,
::ng-deep .wt-date-mf .mdc-notched-outline__trailing {
  border-color: rgba(255,255,255,0.10) !important;
}

/* Slightly tighter gaps so the dialog fits without scrolling */
.wt-grid { gap: 14px 22px; }
.wt-field label { margin-bottom: 6px; }
.wt-field .wt-help, .wt-field .tiny { margin-top: 6px; }


/* Layout polish: consistent alignment, spacing, and field heights */
.wt-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 18px 24px;
  align-items: start;
  width: 100%;
}

.wt-field {
  display: flex;
  flex-direction: column;
  min-width: 0;
  width: 100%;
}

.wt-field label {
  display: block;
  margin: 0 0 8px 2px;
  font-size: 12px;
  letter-spacing: 0.2px;
  color: var(--modal-label);
}

.wt-field .wt-help {
  margin-top: 6px;
  font-size: 11.5px;
  line-height: 1.35;
  color: var(--modal-hint);
}

/* Make all inputs visually consistent */
.wt-field input,
.wt-field select,
.wt-field .mat-mdc-form-field {
  width: 100%;
  box-sizing: border-box;
}

/* Mat form-field density + consistent height */
::ng-deep .wt-field .mat-mdc-form-field {
  width: 100%;
  display: block;
}
::ng-deep .wt-field .mat-mdc-text-field-wrapper {
  min-height: 44px;
  width: 100%;
  background: var(--modal-field-bg);
  border-radius: 12px;
  padding-left: 12px;
  padding-right: 12px;
}
::ng-deep .wt-field .mat-mdc-form-field-infix {
  padding-top: 10px;
  padding-bottom: 10px;
  min-height: 44px;
  width: auto;
}
::ng-deep .wt-field .mat-mdc-floating-label {
  top: 22px;
}

/* Asegura que el select de Client y el input de Project tengan el mismo alto */
::ng-deep .wt-field .mdc-text-field--outlined {
  height: 56px;
}

::ng-deep .wt-field .mat-mdc-form-field-flex {
  height: 56px;
  align-items: center;
}

::ng-deep .wt-field .mat-mdc-input-element,
::ng-deep .wt-field .mat-mdc-select-value {
  font-size: 14px;
  line-height: 20px;
}

::ng-deep .wt-field .mat-mdc-form-field-infix {
  padding-top: 8px;
  padding-bottom: 8px;
  min-height: 40px;
}

/* Suffix icon alignment */
::ng-deep .wt-field .mat-mdc-form-field-icon-suffix {
  align-self: center;
  margin-right: 6px;
}

/* Full-width rows (spanning both columns) */
.wt-span-2 {
  grid-column: 1 / -1;
}

/* Responsive: single column on small screens */
@media (max-width: 900px) {
  .wt-grid {
    grid-template-columns: 1fr;
    gap: 14px;
  }
  .wt-span-2 {
    grid-column: auto;
  }
}


/* Reduce/remove bright blue focus ring on the due date field (keep subtle outline) */
.wt-date-mf {
  /* MDC outlined text field tokens */
  --mdc-outlined-text-field-focus-outline-color: var(--modal-field-border-focus);
  --mdc-outlined-text-field-outline-color: var(--modal-field-border);
  --mdc-outlined-text-field-hover-outline-color: var(--modal-field-border-hover);
  --mdc-outlined-text-field-focus-outline-width: 1px;
}

::ng-deep .wt-date-mf.mat-focused .mdc-notched-outline {
  box-shadow: none !important;
}


/* Single calendar icon - no button background (dark mode) */
.white-calendar-btn {
  background: transparent !important;
  border: none !important;
  box-shadow: none !important;
  padding: 4px;
  margin: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0.9;
}
.white-calendar-btn:hover { opacity: 1; }
.white-calendar-btn .mat-icon,
.white-calendar-btn mat-icon {
  color: var(--modal-text) !important;
}

::ng-deep .mat-mdc-form-field-icon-suffix button {
  background: transparent !important;
}



/* Custom white calendar button for Bid Due Date */
.wt-hidden-toggle {
  display: none !important;
}

.wt-calendar-btn {
  background: transparent;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  padding: 4px;
  opacity: 0.85;
}

.wt-calendar-btn:hover {
  opacity: 1;
}

.wt-calendar-btn svg {
  width: 18px;
  height: 18px;
  fill: var(--modal-text);
}

  /* Force Angular Material MDC datepicker icon color (dark mode) */
  ::ng-deep .mat-datepicker-toggle .mat-mdc-icon-button svg {
    fill: var(--modal-text) !important;
  }

  ::ng-deep .mat-datepicker-toggle .mat-mdc-icon-button {
    color: var(--modal-text) !important;
  }


/* Calendar icon button for native date inputs (consistent in dark mode) */
.wt-date-field {
  position: relative;
}
.wt-date-field input[type="date"] {
  padding-right: 44px !important;
}
.wt-date-icon {
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  display: grid;
  place-items: center;
  cursor: pointer;
  opacity: 0.85;
}
.wt-date-icon:hover { opacity: 1; }
.wt-date-icon svg {
  width: 18px;
  height: 18px;
  fill: var(--modal-text);
}
.mat-datepicker-toggle-default-icon {
    color: var(--modal-text) !important;
    fill: var(--modal-text) !important;
  }

  .mat-datepicker-toggle {
    color: var(--modal-text) !important;
  }

  mat-form-field .mat-icon {
    color: var(--modal-text) !important;
  }

      /* Match the Overview > Projects modal look */
      /* Prevent horizontal scrolling (no bottom bar). Keep vertical scrolling for small screens. */
      .wt-modal {
        box-sizing: border-box;
        width: min(920px, 92vw);
        max-height: 82vh;
        overflow-y: auto;
        overflow-x: hidden;
        background: var(--modal-bg);
        border: 1px solid var(--modal-border);
        border-radius: 16px;
        padding: 14px;
      }
      .wt-modal-head{display:flex;align-items:center;justify-content:space-between;padding:6px 6px 10px}
      .wt-modal-title{font-size:18px;font-weight:700;color: var(--modal-text)}
      .wt-icon-btn{background:transparent;border:0;color: var(--modal-text);font-size:18px;cursor:pointer}
      .wt-modal-body{
        padding:0 6px 10px;
        width: 100%;
        box-sizing: border-box;
      }
      .wt-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
      .wt-field{display:flex;flex-direction:column;gap:6px}
      .wt-full{grid-column:1 / -1}
      .wt-field label{color: var(--modal-label);font-size:12px}
      .wt-field input,.wt-field select{box-sizing:border-box;width:100%;background: var(--modal-field-bg);border:1px solid var(--modal-field-border);border-radius:10px;color: var(--modal-text);padding:10px}
/* Jobsite address input with suffix icon */
      .wt-input-wrap{position:relative;display:block;}
      .wt-input-wrap input{padding-right:40px;}
      .wt-input-suffix{position:absolute;right:12px;top:50%;transform:translateY(-50%);opacity:.55;pointer-events:none;color: var(--modal-text)}

      /* Make native datepicker icon visible on dark background */
      .wt-field input[type='date']::-webkit-calendar-picker-indicator{filter:invert(1) opacity(.85)}
      .wt-field input[type='date']{color-scheme:dark}

      /* Custom select chevron (hide native UI and draw our own) */
      .wt-field select{
        appearance:none;
        -webkit-appearance:none;
        -moz-appearance:none;
        padding-right:40px;
        background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24'%3E%3Cpath d='M6 9l6 6 6-6' fill='none' stroke='%23888fa3' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
        background-repeat:no-repeat;
        background-position:right 12px center;
        background-size:16px 16px;
      }
      .wt-field select::-ms-expand{display:none;}
      .wt-field select:disabled, .wt-field input:disabled{opacity:.75}
      .wt-modal-actions{display:flex;justify-content:flex-end;gap:10px;padding:10px 6px 0}
      .btn{border:1px solid var(--modal-btn-cancel-border);background: var(--modal-btn-cancel-bg);color: var(--modal-btn-cancel-text);border-radius:12px;padding:10px 14px;cursor:pointer;font-weight:700}
      .btn:hover{background: var(--modal-btn-cancel-hover-bg)}
      .btn-primary{border-color:rgba(106,163,255,.55);background: var(--modal-btn-primary-bg);color:#ffffff}
      .btn-primary:hover{background: var(--modal-btn-primary-hover-bg)}

      .hint{opacity:.82;font-size:12px;line-height:1.45}
      .tiny{opacity:.75;font-size:12px;margin-top:4px;line-height:1.35}

      @media (max-width: 900px){
        .wt-grid{grid-template-columns:1fr}
      }
    

    .wt-input-with-btn{position:relative;display:flex;align-items:center;gap:10px;}
    .wt-input-with-btn input{flex:1;padding-right:110px;}
    .wt-inline-btn{
      position:absolute;right:10px;top:50%;transform:translateY(-50%);
      height:34px;padding:0 12px;border-radius:10px;
      border:1px solid rgba(255,255,255,.14);
      background:rgba(255,255,255,.06);
      color:rgba(255,255,255,.9);
      cursor:pointer;font-size:12px;letter-spacing:.2px;
    }
    .wt-inline-btn:hover{background:rgba(255,255,255,.10);}


/* Equal Date Fields (Date Received + Bid Due Date) */
.wt-date .mat-mdc-input-element{
  font-size: 16px;
  font-weight: 600;
}

.wt-date .mat-mdc-text-field-wrapper{
  height: 52px;
  align-items: center;
}

/* Force both date fields to match Material outline control height */
.wt-date .mat-mdc-text-field-wrapper{
  height: 56px;
  align-items: center;
}

/* Ensure the outline input area uses the full height */
.wt-date .mdc-text-field{
  height: 56px;
}

/* Match suffix area sizing to the datepicker toggle */
.wt-date-icon{
  width: 48px;
  height: 48px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  opacity: 0.7;
  pointer-events: none;
}

/* Date fields: force identical Material outline sizing for Date Received + Bid Due Date */
.wt-date .mat-mdc-text-field-wrapper{
  height: 56px;
  align-items: center;
}

.wt-date .mdc-text-field{
  height: 56px;
}

.wt-date .mat-mdc-form-field-infix{
  padding-top: 16px;  /* Material default-ish */
  padding-bottom: 16px;
}

.wt-date .mat-mdc-input-element{
  font-size: 16px;
  font-weight: 600;
}

/* Visual suffix to match datepicker toggle */
.wt-date-icon{
  width: 48px;
  height: 48px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  opacity: 0.7;
  pointer-events: none;
}


/* visual-only calendar icon used to align Date Received with Bid Due Date */
.wt-calendar-ghost{
  width: 48px;
  height: 48px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  opacity: 0.7;
  pointer-events: none;
}

/* mat-select overlays render in cdk-overlay-container; define dedicated tokens for panel theming */
::ng-deep .wt-select-panel.mat-mdc-select-panel {
  --wt-select-panel-bg: #0f141c;
  --wt-select-panel-text: #e8eef8;
  --wt-select-panel-border: rgba(255, 255, 255, 0.12);
  --wt-select-panel-hover: rgba(255, 255, 255, 0.08);
  --wt-select-panel-selected: rgba(59, 130, 246, 0.18);
  --wt-select-scroll-thumb: rgba(255, 255, 255, 0.2);
  --wt-select-scroll-thumb-hover: rgba(79, 160, 255, 0.4);

  background: var(--wt-select-panel-bg);
  color: var(--wt-select-panel-text);
  border: 1px solid var(--wt-select-panel-border);
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 18px 44px rgba(0, 0, 0, 0.55);
  max-height: 360px !important;
  overflow-y: auto !important;
}

::ng-deep [data-theme='midnight'] .wt-select-panel.mat-mdc-select-panel {
  --wt-select-panel-bg: #071325;
  --wt-select-panel-text: #dbe5f1;
  --wt-select-panel-border: rgba(148, 163, 184, 0.24);
  --wt-select-panel-hover: rgba(148, 163, 184, 0.12);
  --wt-select-panel-selected: rgba(59, 130, 246, 0.2);
  --wt-select-scroll-thumb: rgba(148, 163, 184, 0.34);
  --wt-select-scroll-thumb-hover: rgba(96, 165, 250, 0.52);
}

::ng-deep [data-theme='light'] .wt-select-panel.mat-mdc-select-panel {
  --wt-select-panel-bg: #ffffff;
  --wt-select-panel-text: #0f172a;
  --wt-select-panel-border: rgba(15, 23, 42, 0.12);
  --wt-select-panel-hover: rgba(15, 23, 42, 0.05);
  --wt-select-panel-selected: rgba(37, 99, 235, 0.1);
  --wt-select-scroll-thumb: rgba(15, 23, 42, 0.22);
  --wt-select-scroll-thumb-hover: rgba(37, 99, 235, 0.38);
}

::ng-deep [data-theme='aurora'] .wt-select-panel.mat-mdc-select-panel {
  --wt-select-panel-bg: #ffffff;
  --wt-select-panel-text: #0f172a;
  --wt-select-panel-border: rgba(37, 99, 235, 0.2);
  --wt-select-panel-hover: rgba(37, 99, 235, 0.07);
  --wt-select-panel-selected: rgba(37, 99, 235, 0.14);
  --wt-select-scroll-thumb: rgba(37, 99, 235, 0.28);
  --wt-select-scroll-thumb-hover: rgba(37, 99, 235, 0.45);
}

::ng-deep .wt-select-panel .mat-mdc-option,
::ng-deep .wt-select-panel .mat-mdc-option .mdc-list-item__primary-text {
  color: var(--wt-select-panel-text);
}

::ng-deep .wt-select-panel .mat-mdc-option:hover:not(.mdc-list-item--disabled) {
  background: var(--wt-select-panel-hover);
}

::ng-deep .wt-select-panel .mat-mdc-option.mdc-list-item--selected:not(.mdc-list-item--disabled) {
  background: var(--wt-select-panel-selected);
}

::ng-deep .wt-select-panel.mat-mdc-select-panel .mat-pseudo-checkbox {
  color: var(--wt-select-panel-text);
}

/* Select text visibility fixes (empty state in dark theme) */
:host ::ng-deep .mat-mdc-select-placeholder{
  color: var(--modal-placeholder) !important;
}

:host ::ng-deep .mat-mdc-select-value-text{
  color: var(--modal-text) !important;
}

/* When mat-select is invalid, keep text readable (only border should go red) */
:host ::ng-deep .mat-mdc-form-field.mat-form-field-invalid .mat-mdc-select-placeholder,
:host ::ng-deep .mat-mdc-form-field.mat-form-field-invalid .mat-mdc-select-value-text{
  color: var(--modal-text) !important;
}

/* Disabled state */
:host ::ng-deep .mat-mdc-form-field-disabled .mat-mdc-select-placeholder,
:host ::ng-deep .mat-mdc-form-field-disabled .mat-mdc-select-value-text{
  color: var(--modal-muted) !important;
}

/* Optional: subtle scrollbar for visibility (Chromium/WebKit) */
::ng-deep .wt-select-panel.mat-mdc-select-panel::-webkit-scrollbar{
  width: 10px;
}
::ng-deep .wt-select-panel.mat-mdc-select-panel::-webkit-scrollbar-thumb{
  background: var(--wt-select-scroll-thumb);
  border-radius: 999px;
}
::ng-deep .wt-select-panel.mat-mdc-select-panel::-webkit-scrollbar-thumb:hover{
  background: var(--wt-select-scroll-thumb-hover);
}

/* Match "Contact Email" input border style for Material fields (Client / Project / Responsible) */
:host ::ng-deep .wt-mf .mdc-text-field--outlined {
  background: var(--modal-field-bg) !important;
  border-radius: 12px !important;
}
:host ::ng-deep .wt-mf .mdc-notched-outline__leading,
:host ::ng-deep .wt-mf .mdc-notched-outline__notch,
:host ::ng-deep .wt-mf .mdc-notched-outline__trailing {
  border-color: var(--modal-field-border) !important;
}
:host ::ng-deep .wt-mf.mat-focused .mdc-notched-outline__leading,
:host ::ng-deep .wt-mf.mat-focused .mdc-notched-outline__notch,
:host ::ng-deep .wt-mf.mat-focused .mdc-notched-outline__trailing {
  border-color: var(--modal-field-border-focus) !important;
}
:host ::ng-deep .wt-mf.mat-form-field-invalid .mdc-notched-outline__leading,
:host ::ng-deep .wt-mf.mat-form-field-invalid .mdc-notched-outline__notch,
:host ::ng-deep .wt-mf.mat-form-field-invalid .mdc-notched-outline__trailing {
  border-color: rgba(255,90,90,0.85) !important;
}

/* Make both top fields strictly equal width */
.wt-grid { align-items: start; }
.wt-grid > .wt-field { min-width: 0; }
.wt-grid > .wt-field > .mat-mdc-form-field { width: 100%; }

/* Asegura que todos los campos Material tengan el mismo ancho */
::ng-deep .wt-field .mat-mdc-form-field {
  width: 100%;
}

/* Corrige la alineación de los campos en la cuadrícula */
.wt-field {
  width: 100%;
}
`,
    ]
})
export class IncomingBidDialogComponent implements AfterViewInit {
  submitted = false;
  submitMatcher = new SubmitOnlyErrorStateMatcher(() => this.submitted);

  private fb = inject(FormBuilder);
  private ref = inject(MatDialogRef<IncomingBidDialogComponent, IncomingBidDialogResult | null>);
  private data = inject(MAT_DIALOG_DATA, { optional: true }) as Partial<IncomingBidDialogResult> | null;
  private clientsSvc = inject(ClientsService);
  private destroyRef = inject(DestroyRef);

  clients: ClientItem[] = [];
  selectedClient: ClientItem | null = null;
  contactOptions: ClientContact[] = [];

  form = this.fb.group({
    client: [this.data?.client ?? '', Validators.required],
    projectName: [this.data?.projectName ?? '', Validators.required],
    // Date received is the archive date (auto-set). Keep readonly to avoid manipulation.
    dateReceived: [{ value: new Date(), disabled: true }],
    bidDueAt: [this.data?.bidDueDate ?? null],
    contactId: [''],
    contactName: [{ value: this.data?.contactName ?? '', disabled: true }],
    // Auto-filled from the Responsible/Contact selector, but editable if needed.
    contactEmail: [this.data?.contactEmail ?? ''],
    contactPhone: [this.data?.contactPhone ?? ''],
    jobsiteAddress: [(this.data as any)?.jobsiteAddress ?? ''],
    jobsiteLat: [null],
    jobsiteLng: [null],
    jobsitePlaceId: [null],
    priority: [(this.data as any)?.priority ?? 'normal'],
  });

  

@ViewChild('jobsiteAddressInput', { static: false }) jobsiteAddressInput?: ElementRef<HTMLInputElement>;

ngAfterViewInit(): void {
  // Google Places Autocomplete for Jobsite Address (optional enhancement)
  try {
    const inputEl = this.jobsiteAddressInput?.nativeElement;
    if (!inputEl) return;
    if (!google?.maps?.places?.Autocomplete) return;

    const ac = new google.maps.places.Autocomplete(inputEl, {
      types: ['address'],
      fields: ['formatted_address', 'geometry', 'place_id'],
    });

    ac.addListener('place_changed', () => {
      const place = ac.getPlace();
      const formatted = place?.formatted_address || inputEl.value || '';
      const lat = place?.geometry?.location?.lat?.() ?? null;
      const lng = place?.geometry?.location?.lng?.() ?? null;
      const placeId = place?.place_id ?? null;

      this.form.patchValue(
        { jobsiteAddress: formatted, jobsiteLat: lat, jobsiteLng: lng, jobsitePlaceId: placeId },
        { emitEvent: true }
      );
    });
  } catch {
    // no-op
  }
}
constructor() {
    // Load companies/clients for selection.
    firstValueFrom(this.clientsSvc.clients$())
      .then((rows) => (this.clients = rows ?? []))
      .catch(() => (this.clients = []));

    // When a company is selected, populate the Contact dropdown with that company's existing contacts.
    // The bidder MUST pick from existing contacts; if none exist, they must add one in the Companies module.
    this.form
      .get('client')
      ?.valueChanges.pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((val) => {
        const name = (val ?? '').toString().trim();
        if (!name) {
          this.selectedClient = null;
          this.contactOptions = [];
          this.form.patchValue({ contactId: '', contactName: '', contactEmail: '', contactPhone: '' }, { emitEvent: false });
          return;
        }

        const match = this.clients.find((c) => (c.name ?? '').toLowerCase() === name.toLowerCase()) ?? null;
        this.selectedClient = match;

        const contacts = this.buildContactOptions(match);
        this.contactOptions = contacts;

        // Keep selection only if it exists in the new list; otherwise reset.
        const current = (this.form.get('contactId')?.value ?? '').toString();
        const hasCurrent = !!current && contacts.some((c) => c.id === current);
        if (!hasCurrent) {
          // Prefer primary if present; otherwise pick first.
          const preferred = contacts.find((c) => c.isPrimary) ?? contacts[0] ?? null;
          this.form.patchValue({ contactId: preferred?.id ?? '' }, { emitEvent: true });
        }

        // If no contacts exist, clear contact fields.
        if (contacts.length === 0) {
          this.form.patchValue({ contactName: '', contactEmail: '', contactPhone: '' }, { emitEvent: false });
        }
      });

    this.form
      .get('contactId')
      ?.valueChanges.pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((id) => {
        const pick = (id ?? '').toString();
        const ct = this.contactOptions.find((c) => c.id === pick) ?? null;
        this.form.patchValue(
          {
            contactName: this.cleanContactName(ct?.fullName ?? ''),
            contactEmail: ct?.email ?? '',
            contactPhone: ct?.phone ?? '',
          },
          { emitEvent: false }
        );
      });

  }



private cleanContactName(raw: string): string {
  const s = (raw ?? '').toString().trim();
  if (!s) return '';

  // Defensive: some legacy/test data may have been stored as "Name • email" or "Name · email".
  const beforeSep = s.split('•')[0].split('·')[0].trim();

  // Remove any embedded email address remnants if present.
  const withoutEmail = beforeSep.replace(/[\s<\(\[]*[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}[\s>\)\]]*/gi, ' ').replace(/\s{2,}/g, ' ').trim();

  return withoutEmail;
}

  private buildContactOptions(client: ClientItem | null): ClientContact[] {
    if (!client) return [];

    const arr = (client.contacts ?? [])
      .filter((c) => !!(c?.fullName ?? '').toString().trim())
      .map((c, idx) => ({
        id: String(idx),
        fullName: this.cleanContactName((c.fullName ?? '').toString().trim()),
        email: (c.email ?? '').toString().trim() || undefined,
        phone: (c.phone ?? '').toString().trim() || undefined,
        role: (c.role ?? '').toString().trim() || undefined,
        isPrimary: !!c.isPrimary,
      }));

    // Back-compat: if legacy mainContact exists but no contacts array, show it as a single selectable item.
    if (arr.length === 0) {
      const legacyName = (client.mainContactName ?? '').toString().trim();
      if (legacyName) {
        return [
          {
            id: 'legacy-0',
            fullName: legacyName,
            email: (client.mainContactEmail ?? '').toString().trim() || undefined,
            phone: (client.mainContactPhone ?? '').toString().trim() || undefined,
            isPrimary: true,
          },
        ];
      }
    }

    // Primary first, then alphabetical.
    return arr.sort((a, b) => {
      if (a.isPrimary && !b.isPrimary) return -1;
      if (!a.isPrimary && b.isPrimary) return 1;
      return a.fullName.localeCompare(b.fullName);
    });
  }

  close() {
    this.ref.close(null);
  }

  async save() {
    this.submitted = true;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const raw = this.form.getRawValue() as any;
    const clientName = (raw.client ?? '').toString().trim();
    const jobsiteAddress = (raw.jobsiteAddress ?? '').toString().trim();

    
const result: IncomingBidDialogResult = {
  client: clientName,
  projectName: (raw.projectName ?? '').toString().trim(),
  // Always set to "today" (archive date). Prevents manual manipulation.
  dateReceived: new Date(),
  bidDueDate: (raw.bidDueAt ?? null),
  contactId: (raw.contactId ?? '').toString(),
  contactName: (raw.contactName ?? '').toString().trim(),
  contactEmail: (raw.contactEmail ?? '').toString().trim(),
  contactPhone: (raw.contactPhone ?? '').toString().trim(),
  jobsiteAddress,
  jobsiteLat: raw.jobsiteLat ?? null,
  jobsiteLng: raw.jobsiteLng ?? null,
  jobsitePlaceId: raw.jobsitePlaceId ?? null,
  priority: (raw.priority ?? 'normal').toString(),
};
    this.ref.close(result);
  }

  
}
