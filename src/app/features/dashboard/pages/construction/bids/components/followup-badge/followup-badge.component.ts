
import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

@Component({
    selector: 'app-followup-badge',
    imports: [CommonModule],
    templateUrl: './followup-badge.component.html',
    styleUrls: ['./followup-badge.component.scss']
})
export class FollowupBadgeComponent {
  @Input() bid: any;

  getStatus() {
    const count = this.bid?.followUpCount || 0;
    const next = this.bid?.nextFollowUpAt?.toDate?.();
    const last = this.bid?.lastFollowUpAt?.toDate?.();

    const now = new Date();
    const start = new Date(now); start.setHours(0,0,0,0);
    const end = new Date(now); end.setHours(23,59,59,999);

    if (count === 0) {
      return { label: 'NO FOLLOW-UP', color: 'yellow' };
    }

    if (next) {
      if (next < start) {
        const days = Math.floor((start.getTime() - next.getTime()) / 86400000);
        return { label: `OVERDUE • ${days}d`, color: 'red' };
      }

      if (next >= start && next <= end) {
        return { label: 'TODAY', color: 'orange' };
      }

      const days = Math.ceil((next.getTime() - end.getTime()) / 86400000);
      return { label: `IN ${days}d`, color: 'green' };
    }

    return { label: 'NO NEXT DATE', color: 'purple' };
  }
}
