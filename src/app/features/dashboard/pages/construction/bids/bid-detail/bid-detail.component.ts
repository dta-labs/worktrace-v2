import { Component, computed, inject, signal, Input, OnInit, OnChanges, SimpleChanges, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';

import { BidService } from '../../../../../../services/bid.service';
import { Bid, BidPriority, BidStatus } from '../../../../../../models/bid.model';
import { ReasonDialogComponent } from './reason-dialog.component';

@Component({
  selector: 'app-bid-detail-page',
  standalone: true,
  imports: [
    CommonModule, RouterModule, ReactiveFormsModule,
    MatCardModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatButtonModule,
    MatDatepickerModule, MatNativeDateModule, MatDialogModule,
  ],
  templateUrl: './bid-detail.component.html',
  styleUrls: ['./bid-detail.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BidDetailPageComponent implements OnInit, OnChanges {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private bidsSvc = inject<BidService>(BidService);
  private dialog = inject(MatDialog);

  @Input() bidId?: string;
  @Input() embedded: boolean = false;

  id = signal<string>('');
  loading = signal(true);
  bid = signal<Bid | null>(null);

  statuses: { label: string; value: BidStatus }[] = [
    { label: 'Pending', value: 'Pending' },
    { label: 'Sent', value: 'Sent' },
    { label: 'Won', value: 'Won' },
    { label: 'Lost', value: 'Lost' },
    { label: 'No Response', value: 'No Response' },
    { label: 'Cancelled', value: 'Cancelled' },
  ];

  priorities: { label: string; value: BidPriority }[] = [
    { label: 'Low', value: 'Low' },
    { label: 'Medium', value: 'Medium' },
    { label: 'High', value: 'High' },
    { label: 'Urgent', value: 'Urgent' },
  ];

  form = this.fb.group({
    bidNumber: ['', Validators.required],
    client: [''],
    projectName: ['', Validators.required],
    contactName: [''],
    contactPhone: [''],

    dateReceived: [null as Date | null],
    dueDate: [null as Date | null],
    dateSent: [null as Date | null],

    status: ['Pending' as BidStatus, Validators.required],
    priority: ['Medium' as BidPriority, Validators.required],

    // costs
    laborAmount: [0],
    laborHours: [0],
    equipmentAmount: [0],
    materialsAmount: [0],
    subsistenceAmount: [0],
    rentalsAmount: [0],
    subcontractorAmount: [0],

    notes: [''],
  });

  total = computed(() => {
    const v = this.form.getRawValue();
    const nums = [
      v.laborAmount, v.equipmentAmount, v.materialsAmount, v.subsistenceAmount, v.rentalsAmount, v.subcontractorAmount,
    ].map(x => Number(x ?? 0));
    return nums.reduce((a, b) => a + b, 0);
  });

  constructor() { }

  ngOnInit(): void {
    this.initLoad();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['bidId'] && !changes['bidId'].firstChange) {
      this.initLoad();
    }
  }

  private initLoad() {
    const id = (this.bidId ?? this.route.snapshot.paramMap.get('id') ?? '') as string;
    this.id.set(id);

    if (!id) {
      this.bid.set(null);
      this.loading.set(false);
      return;
    }

    // load from bids$ stream (v1)
    this.loading.set(true);
    this.bidsSvc.bids$().subscribe((rows: Bid[]) => {
      const found = rows.find((r: Bid) => r.id === id) ?? null;
      this.bid.set(found);
      if (found) this.patchForm(found);
      this.loading.set(false);
    });
  }

  private patchForm
    (b: Bid) {
    this.form.patchValue({
      bidNumber: b.bidNumber,
      client: b.client ?? '',
      projectName: b.projectName,
      contactName: b.contactName ?? '',
      contactPhone: b.contactPhone ?? '',
      dateReceived: b.dateReceived ? new Date(b.dateReceived) : null,
      dueDate: b.dueDate ? new Date(b.dueDate) : null,
      dateSent: b.dateSent ? new Date(b.dateSent) : null,
      status: b.status,
      priority: b.priority,
      laborAmount: b.costs?.laborAmount ?? 0,
      laborHours: b.costs?.laborHours ?? 0,
      equipmentAmount: b.costs?.equipmentAmount ?? 0,
      materialsAmount: b.costs?.materialsAmount ?? 0,
      subsistenceAmount: b.costs?.subsistenceAmount ?? 0,
      rentalsAmount: b.costs?.rentalsAmount ?? 0,
      subcontractorAmount: b.costs?.subcontractorAmount ?? 0,
      notes: b.notes ?? '',
    });
  }

  async save() {
    const before = this.bid();
    if (!before) return;

    const reason = await this.openReasonDialog();
    if (!reason) return;

    const v = this.form.getRawValue();
    const patch: Partial<Bid> = {
      bidNumber: v.bidNumber!,
      client: v.client ?? '',
      projectName: v.projectName!,
      contactName: v.contactName ?? '',
      contactPhone: v.contactPhone ?? '',
      dateReceived: v.dateReceived ? v.dateReceived.getTime() : undefined,
      dueDate: v.dueDate ? v.dueDate.getTime() : undefined,
      dateSent: v.dateSent ? v.dateSent.getTime() : undefined,
      status: v.status!,
      priority: v.priority!,
      totalAmount: this.total(),
      costs: {
        laborAmount: Number(v.laborAmount ?? 0),
        laborHours: Number(v.laborHours ?? 0),
        equipmentAmount: Number(v.equipmentAmount ?? 0),
        materialsAmount: Number(v.materialsAmount ?? 0),
        subsistenceAmount: Number(v.subsistenceAmount ?? 0),
        rentalsAmount: Number(v.rentalsAmount ?? 0),
        subcontractorAmount: Number(v.subcontractorAmount ?? 0),
      },
      notes: v.notes ?? '',
    };

    await this.bidsSvc.updateBid(this.id(), patch, reason, before);
  }

  back() {
    this.router.navigate(['../'], { relativeTo: this.route });
  }

  private async openReasonDialog(): Promise<string | null> {
    const ref = this.dialog.open(ReasonDialogComponent, { width: '520px' });
    const result = await ref.afterClosed().toPromise();
    return (result && String(result).trim()) ? String(result).trim() : null;
  }
}
