import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

import { CreateCompanyComponent } from './create-company/create-company.component';
import { CompaniesListComponent } from './companies-list/companies-list.component';
import { ClientItem } from '../construction/bids/clients.service';

@Component({
  selector: 'app-companies-page',
  standalone: true,
  imports: [CommonModule, CreateCompanyComponent, CompaniesListComponent],
  templateUrl: './companies.component.html',
  styleUrls: ['./companies.component.css'],
})
export class CompaniesPageComponent {
  activeTab: 'create' | 'companies' = 'create';

  // When user clicks "Edit" on the list, we load the company into the form.
  selectedForEdit: ClientItem | null = null;

  setTab(tab: 'create' | 'companies') {
    this.activeTab = tab;
  }

  onEditFromList(row: ClientItem): void {
    this.selectedForEdit = row;
    this.activeTab = 'create';
    // scroll to top for better UX
    try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch {}
  }

  // Keep consistency with other pages that close menus on click.
  // No-op for now.
  closeMenus() {}
}
