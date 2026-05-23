import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';

const OPTIONS: Array<{ key: string; label: string; cls: string }> = [
  { key: 'urgent', label: 'Urgent', cls: 'p-urgent' },
  { key: 'high', label: 'High', cls: 'p-high' },
  { key: 'normal', label: 'Normal', cls: 'p-normal' },
  { key: 'low', label: 'Low', cls: 'p-low' },
];

@Component({
    selector: 'app-edit-priority-dialog',
    imports: [CommonModule, ReactiveFormsModule, MatDialogModule],
    template: `
    <div class="wt-modal" role="dialog" aria-modal="true">
      <div class="wt-modal-head">
        <div>
          <div class="wt-modal-title">Edit Priority</div>
          <div class="tiny">This controls the color in the Incoming Bids list.</div>
        </div>
        <button type="button" class="wt-icon-btn" (click)="close()">✕</button>
      </div>

      <div class="wt-modal-body">
        <form [formGroup]="form" autocomplete="off">
          <div class="chips">
            <button
              type="button"
              class="chip"
              *ngFor="let o of options"
              [class.active]="form.controls.priority.value === o.key"
              [ngClass]="o.cls"
              (click)="set(o.key)"
            >
              {{ o.label }}
            </button>
          </div>

          <div class="tiny mt8">
            Tip: use <b>Urgent</b> only when the due date is very close or overdue.
          </div>
        </form>
      </div>

      <div class="wt-modal-actions">
        <button type="button" class="btn" (click)="close()">Cancel</button>
        <button type="button" class="btn btn-primary" (click)="save()">Save</button>
      </div>
    </div>
  `,
    styles: [
        `
      :host {
        --ep-text: #e8eef8;
        --ep-muted: rgba(230, 236, 245, 0.78);
        --ep-bg: #0f1115;
        --ep-border: rgba(255, 255, 255, 0.08);
        --ep-btn-border: rgba(255, 255, 255, 0.16);
        --ep-btn-bg: rgba(255, 255, 255, 0.04);
        --ep-btn-hover-bg: rgba(255, 255, 255, 0.08);
        --ep-primary-border: rgba(106, 163, 255, 0.55);
        --ep-primary-bg: rgba(106, 163, 255, 0.18);
        --ep-primary-hover-bg: rgba(106, 163, 255, 0.26);
        --ep-chip-border: rgba(255, 255, 255, 0.12);
        --ep-chip-bg: rgba(255, 255, 255, 0.04);
        --ep-chip-text: #ffffff;
        --ep-chip-active-ring: rgba(106, 163, 255, 0.14);
        --ep-chip-active-border: rgba(106, 163, 255, 0.55);
      }

      :host-context([data-theme='midnight']) {
        --ep-text: #dbe5f1;
        --ep-muted: #9fb1c8;
        --ep-bg: #081525;
        --ep-border: rgba(148, 163, 184, 0.2);
        --ep-btn-border: rgba(148, 163, 184, 0.34);
        --ep-btn-bg: rgba(148, 163, 184, 0.08);
        --ep-btn-hover-bg: rgba(148, 163, 184, 0.15);
        --ep-primary-border: rgba(96, 165, 250, 0.58);
        --ep-primary-bg: rgba(59, 130, 246, 0.24);
        --ep-primary-hover-bg: rgba(37, 99, 235, 0.3);
        --ep-chip-border: rgba(148, 163, 184, 0.3);
        --ep-chip-bg: rgba(148, 163, 184, 0.08);
        --ep-chip-text: #e2e8f0;
        --ep-chip-active-ring: rgba(96, 165, 250, 0.2);
        --ep-chip-active-border: rgba(96, 165, 250, 0.62);
      }

      :host-context([data-theme='light']) {
        --ep-text: #0f172a;
        --ep-muted: #475569;
        --ep-bg: #ffffff;
        --ep-border: rgba(15, 23, 42, 0.12);
        --ep-btn-border: rgba(15, 23, 42, 0.2);
        --ep-btn-bg: #ffffff;
        --ep-btn-hover-bg: rgba(15, 23, 42, 0.05);
        --ep-primary-border: rgba(37, 99, 235, 0.4);
        --ep-primary-bg: rgba(37, 99, 235, 0.12);
        --ep-primary-hover-bg: rgba(37, 99, 235, 0.2);
        --ep-chip-border: rgba(15, 23, 42, 0.16);
        --ep-chip-bg: #f8fafc;
        --ep-chip-text: #1e293b;
        --ep-chip-active-ring: rgba(37, 99, 235, 0.12);
        --ep-chip-active-border: rgba(37, 99, 235, 0.5);
      }

      :host-context([data-theme='aurora']) {
        --ep-text: #0f172a;
        --ep-muted: #475569;
        --ep-bg: linear-gradient(180deg, #f8fbff 0%, #eef6ff 100%);
        --ep-border: rgba(37, 99, 235, 0.18);
        --ep-btn-border: rgba(37, 99, 235, 0.28);
        --ep-btn-bg: rgba(255, 255, 255, 0.92);
        --ep-btn-hover-bg: rgba(37, 99, 235, 0.08);
        --ep-primary-border: rgba(37, 99, 235, 0.44);
        --ep-primary-bg: rgba(37, 99, 235, 0.16);
        --ep-primary-hover-bg: rgba(37, 99, 235, 0.24);
        --ep-chip-border: rgba(37, 99, 235, 0.22);
        --ep-chip-bg: rgba(255, 255, 255, 0.94);
        --ep-chip-text: #1e293b;
        --ep-chip-active-ring: rgba(37, 99, 235, 0.14);
        --ep-chip-active-border: rgba(37, 99, 235, 0.52);
      }

      .wt-modal{box-sizing:border-box;width:min(560px,92vw);max-height:78vh;overflow:auto;background:var(--ep-bg);border:1px solid var(--ep-border);border-radius:16px;padding:14px;color:var(--ep-text)}
      .wt-modal-head{display:flex;align-items:flex-start;justify-content:space-between;gap:14px;padding:6px 6px 10px}
      .wt-modal-title{font-size:18px;font-weight:800;letter-spacing:.2px;color:var(--ep-text)}
      .wt-icon-btn{background:transparent;border:0;color:var(--ep-text);font-size:18px;cursor:pointer;opacity:.9}
      .wt-modal-body{padding:0 6px 10px}
      .wt-modal-actions{display:flex;justify-content:flex-end;gap:10px;padding:10px 6px 0}
      .btn{border:1px solid var(--ep-btn-border);background:var(--ep-btn-bg);color:var(--ep-text);border-radius:12px;padding:10px 14px;cursor:pointer;font-weight:800}
      .btn:hover{background:var(--ep-btn-hover-bg)}
      .btn-primary{border-color:var(--ep-primary-border);background:var(--ep-primary-bg)}
      .btn-primary:hover{background:var(--ep-primary-hover-bg)}
      .tiny{color:var(--ep-muted);font-size:12px;line-height:1.35;margin-top:4px}
      .mt8{margin-top:8px}

      .chips{display:flex;flex-wrap:wrap;gap:10px;margin-top:8px}
      .chip{
        border:1px solid var(--ep-chip-border);
        background:var(--ep-chip-bg);
        color:var(--ep-chip-text);
        border-radius:999px;
        padding:10px 14px;
        cursor:pointer;
        font-weight:800;
        letter-spacing:.2px;
      }
      .chip.active{box-shadow:0 0 0 3px var(--ep-chip-active-ring);border-color:var(--ep-chip-active-border)}
      .p-urgent{background:rgba(255,77,79,.16);border-color:rgba(255,77,79,.45);color:#991b1b}
      .p-high{background:rgba(255,159,67,.16);border-color:rgba(255,159,67,.45);color:#9a3412}
      .p-normal{background:rgba(106,163,255,.16);border-color:rgba(106,163,255,.45);color:#1d4ed8}
      .p-low{background:rgba(76,209,55,.12);border-color:rgba(76,209,55,.35);color:#166534}
    `,
    ]
})
export class EditPriorityDialogComponent {
  private fb = inject(FormBuilder);
  private ref = inject(MatDialogRef<EditPriorityDialogComponent>);
  data = inject(MAT_DIALOG_DATA) as { priority?: string };

  options = OPTIONS;

  form = this.fb.group({
    priority: [this.data?.priority ?? 'normal', [Validators.required]],
  });

  set(v: string) {
    this.form.controls.priority.setValue(v);
  }

  close() {
    this.ref.close(null);
  }

  save() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.ref.close(this.form.getRawValue().priority);
  }
}
