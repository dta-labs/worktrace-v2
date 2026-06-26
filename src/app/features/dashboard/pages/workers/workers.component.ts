
import { Component } from '@angular/core';

@Component({
    selector: 'app-workers-page',
    imports: [],
    templateUrl: './workers.component.html',
    styleUrl: './workers.component.scss'
})
export class WorkersPageComponent {
  activeTab:
    | 'info'
    | 'certifications'
    | 'evaluations'
    | 'work-history'
    | 'pay'
    | 'hours'
    | 'current-job' = 'info';

  setTab(tab: WorkersPageComponent['activeTab']) {
    this.activeTab = tab;
  }

  closeMenus() {}
}
