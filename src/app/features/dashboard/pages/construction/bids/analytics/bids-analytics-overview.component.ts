import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { BidsAnalyticsService } from './bids-analytics.service';

type KPI = { totalEstimated: number; delivered: number; average: number; active: number };

@Component({
  selector: 'app-bids-analytics-overview',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatTableModule],
  templateUrl: './bids-analytics-overview.component.html',
  styleUrls: ['./bids-analytics-overview.component.scss']
})
export class BidsAnalyticsOverviewComponent implements OnInit {

  errorMsg: string | null = null;


  year = new Date().getFullYear();

  kpi: KPI = { totalEstimated: 0, delivered: 0, average: 0, active: 0 };

  monthly = { months: [] as any[], maxAmount: 1 };
  ranking = { rows: [] as any[], maxAmount: 1 };

  recentRows: any[] = [];
  displayedColumns: string[] = ['project', 'client', 'createdBy', 'total', 'date'];

  constructor(private analytics: BidsAnalyticsService) {}

  ngOnInit() {
    this.analytics.lastError$.subscribe((msg: string | null) => this.errorMsg = msg);

    this.analytics.getYearKPIs().subscribe(data => this.kpi = data);
    this.analytics.getMonthlyTotals(this.year).subscribe(d => this.monthly = d);
    this.analytics.getEstimatorRanking(this.year).subscribe(d => this.ranking = d);
    this.analytics.getRecentBids(this.year).subscribe(rows => this.recentRows = rows);
  }

  formatMoney(v: number) {
    return v.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
  }

  monthLabel(i: number) {
    return ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][i] || '';
  }

  barWidth(value: number, max: number) {
    const pct = max ? (value / max) * 100 : 0;
    return Math.max(0, Math.min(100, pct));
  }
}
