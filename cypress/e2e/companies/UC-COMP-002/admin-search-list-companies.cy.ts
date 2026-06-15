/// <reference types="cypress" />

describe('Admin Search Companies workflows', () => {
  beforeEach(() => {
    cy.session('admin-session', () => cy.loginByRole('admin'));
    cy.visit('/dashboard/companies');
  });

  it('should display the Companies page and tabs for admin', () => {
    cy.get('[data-cy="tab-create-company"]').should('be.visible');
    cy.get('[data-cy="tab-companies-list"]').should('be.visible');
    cy.get('[data-cy="app-create-company"]').should('be.visible');
  });

  it('should display all required columns in the companies list', () => {
    const companyName = `CyTest List Columns ${Date.now()}`;
    const companyType = 'General Contractor';
    const contactName = `Contact ${Date.now()}`;
    const contactEmail = `${contactName.toLowerCase().replace(' ', '.')}@example.com`;
    const contactPhone = '555-999-8888';
    const city = 'Miami';
    const state = 'FL';

    cy.get('[data-cy="input-company-name"]').type(companyName);
    cy.get('[data-cy="select-company-type"]').click();
    cy.get('mat-option').contains(companyType).click();

    cy.get('[data-cy="btn-add-contact"]').click();
    cy.get('[data-cy="input-full-name"]').first().type(contactName);
    cy.get('[data-cy="input-email"]').first().type(contactEmail);
    cy.get('[data-cy="input-phone"]').first().type(contactPhone);
    cy.get('[data-cy="btn-set-primary"]').first().click();

    cy.get('[data-cy="input-city"]').type(city);
    cy.get('[data-cy="input-state"]').type(state);

    cy.get('[data-cy="btn-save-company"]').click();
    cy.contains('Company saved').should('be.visible');

    cy.get('[data-cy="tab-companies-list"]').click();

    cy.get('[data-cy="input-search-list"]').type(companyName);

    cy.contains(companyName).should('be.visible');
    cy.contains(companyType).should('be.visible');
    cy.contains(contactName).should('be.visible');
    cy.contains(contactPhone).should('be.visible');
    cy.contains(`${city}, ${state}`).should('be.visible');
    cy.contains('Active').should('be.visible');
    cy.get('[data-cy="btn-edit-company"]').should('be.visible');
  });

  it('should filter companies by type', () => {
    const companyName1 = `CyTest Filter Type GC ${Date.now()}`;
    const companyName2 = `CyTest Filter Type MC ${Date.now()}`;

    cy.get('[data-cy="input-company-name"]').type(companyName1);
    cy.get('[data-cy="select-company-type"]').click();
    cy.get('mat-option').contains('General Contractor').click();
    cy.get('[data-cy="btn-save-company"]').click();
    cy.contains('Company saved').should('be.visible');

    cy.get('[data-cy="tab-create-company"]').click();
    cy.get('[data-cy="input-company-name"]').type(companyName2);
    cy.get('[data-cy="select-company-type"]').click();
    cy.get('mat-option').contains('Mechanical Contractor').click();
    cy.get('[data-cy="btn-save-company"]').click();
    cy.contains('Company saved').should('be.visible');

    cy.get('[data-cy="tab-companies-list"]').click();

    cy.get('[data-cy="select-type-filter"]').should('be.visible').click();
    cy.get('mat-option').contains('General Contractor').click();

    cy.contains(companyName1).should('be.visible');
    cy.contains(companyName2).should('not.exist');

    cy.get('[data-cy="select-type-filter"]').click();
    cy.get('mat-option').contains('Mechanical Contractor').click();

    cy.contains(companyName2).should('be.visible');
    cy.contains(companyName1).should('not.exist');

    cy.get('[data-cy="select-type-filter"]').click();
    cy.get('mat-option').contains('All').click();

    cy.contains(companyName1).should('be.visible');
    cy.contains(companyName2).should('be.visible');
  });

  it('should filter companies by status (active/inactive)', () => {
    const companyName = `CyTest Filter Status ${Date.now()}`;

    cy.get('[data-cy="input-company-name"]').type(companyName);
    cy.get('[data-cy="btn-save-company"]').click();
    cy.contains('Company saved').should('be.visible');

    cy.get('[data-cy="tab-companies-list"]').click();

    cy.get('[data-cy="select-status-filter"]').should('be.visible').click();
    cy.get('mat-option').contains('Active').click();

    cy.contains(companyName).should('be.visible');

    cy.get('[data-cy="select-status-filter"]').click();
    cy.get('mat-option').contains('Inactive').click();

    cy.contains(companyName).should('not.exist');

    cy.get('[data-cy="select-status-filter"]').click();
    cy.get('mat-option').contains('All').click();

    cy.contains(companyName).should('be.visible');
  });

  it('should search companies by primary contact name', () => {
    const companyName = `CyTest Search Contact ${Date.now()}`;
    const contactName = `UniqueContact${Date.now()}`;
    const contactEmail = `${contactName.toLowerCase()}@example.com`;

    cy.get('[data-cy="input-company-name"]').type(companyName);
    cy.get('[data-cy="btn-add-contact"]').click();
    cy.get('[data-cy="input-full-name"]').first().type(contactName);
    cy.get('[data-cy="input-email"]').first().type(contactEmail);
    cy.get('[data-cy="btn-set-primary"]').first().click();
    cy.get('[data-cy="btn-save-company"]').click();
    cy.contains('Company saved').should('be.visible');

    cy.get('[data-cy="tab-companies-list"]').click();

    cy.get('[data-cy="input-search-list"]').type(contactName);

    cy.contains(companyName).should('be.visible');
    cy.contains(contactName).should('be.visible');
  });

  it('should search companies by partial name match', () => {
    const companyName = `CyTest Partial Match ABC ${Date.now()}`;

    cy.get('[data-cy="input-company-name"]').type(companyName);
    cy.get('[data-cy="btn-save-company"]').click();
    cy.contains('Company saved').should('be.visible');

    cy.get('[data-cy="tab-companies-list"]').click();

    cy.get('[data-cy="input-search-list"]').type('Partial Match');

    cy.contains(companyName).should('be.visible');

    cy.get('[data-cy="input-search-list"]').clear().type('XYZ NonExistent');

    cy.contains(companyName).should('not.exist');
  });

  it('should clear search and show all companies again', () => {
    const companyName1 = `CyTest Clear Search 1 ${Date.now()}`;
    const companyName2 = `CyTest Clear Search 2 ${Date.now()}`;

    cy.get('[data-cy="input-company-name"]').type(companyName1);
    cy.get('[data-cy="btn-save-company"]').click();
    cy.contains('Company saved').should('be.visible');

    cy.get('[data-cy="tab-create-company"]').click();
    cy.get('[data-cy="input-company-name"]').type(companyName2);
    cy.get('[data-cy="btn-save-company"]').click();
    cy.contains('Company saved').should('be.visible');

    cy.get('[data-cy="tab-companies-list"]').click();

    cy.get('[data-cy="input-search-list"]').type(companyName1);
    cy.contains(companyName1).should('be.visible');
    cy.contains(companyName2).should('not.exist');

    cy.get('[data-cy="input-search-list"]').clear();

    cy.contains(companyName1).should('be.visible');
    cy.contains(companyName2).should('be.visible');
  });

  it('should open edit company from the list view', () => {
    const companyName = `CyTest Edit From List ${Date.now()}`;
    const initialNotes = 'Initial notes';

    cy.get('[data-cy="input-company-name"]').type(companyName);
    cy.get('[data-cy="textarea-notes"]').type(initialNotes);
    cy.get('[data-cy="btn-save-company"]').click();
    cy.contains('Company saved').should('be.visible');

    cy.get('[data-cy="tab-companies-list"]').click();
    cy.get('[data-cy="input-search-list"]').type(companyName);

    cy.get('[data-cy="btn-edit-company"]').should('be.visible').click();

    cy.get('[data-cy="input-company-name"]').should('have.value', companyName);
    cy.get('[data-cy="textarea-notes"]').should('have.value', initialNotes);
  });

  it('should handle empty search results gracefully', () => {
    const emptyListByFilterMessagge = 'No companies match your filters.';

    cy.get('[data-cy="tab-companies-list"]').click();

    cy.get('[data-cy="input-search-list"]').type('ZZZ_NoResults_ThisShouldNotExist');

    cy.get('table').should('exist');
    cy.get('tbody tr').should('have.length', 0);
    cy.contains(emptyListByFilterMessagge).should('be.visible');
  });
});