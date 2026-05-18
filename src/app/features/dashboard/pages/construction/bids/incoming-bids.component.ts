
import { Component } from '@angular/core';

@Component({
  selector: 'app-incoming-bids',
  templateUrl: './incoming-bids.component.html',
  styleUrls: ['./incoming-bids.component.scss']
})
export class IncomingBidsComponent {

  displayedColumns: string[] = [];

  isOverdue(bidDueDate: Date | null): boolean {
    if (!bidDueDate) return false;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const due = new Date(bidDueDate);
    due.setHours(0, 0, 0, 0);

    return due < today;
  }
}
