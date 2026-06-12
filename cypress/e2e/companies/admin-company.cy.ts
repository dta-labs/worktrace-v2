/// <reference types="cypress" />

/**
 * Admin company workflows.
 * 
 */

describe('Admin Company workflows', () => {
  beforeEach(() => {
    cy.session('admin-session', () => cy.loginByRole('admin'));
    cy.visit('/dashboard/companies');
  });

  it('should display the Companies page and tabs for admin', () => {
    cy.get('[data-cy="tab-create-company"]').should('be.visible');
    cy.get('[data-cy="tab-companies-list"]').should('be.visible');
    cy.get('[data-cy="app-create-company"]').should('be.visible');
  });

  //
  // UC-COMP-001 Create Company

  it('should display the Create Company form', () => {
    cy.get('[data-cy="input-company-name"]').should('be.visible');
    cy.get('[data-cy="select-company-type"]').should('be.visible');
    cy.get('[data-cy="textarea-notes"]').should('be.visible');
    cy.get('[data-cy="btn-add-contact"]').should('be.visible');
    cy.get('[data-cy="btn-save-company"]').should('be.visible');
  });

  it('should show validation error when Company Name is empty', () => {
    cy.get('[data-cy="btn-save-company"]').click();
    cy.get('mat-error').should('be.visible').and('contain.text', 'Required');
  });

  it('should create a company with only required fields (Company Name)', () => {
    const companyName = `CyTest Company ${Date.now()}`;

    cy.get('[data-cy="input-company-name"]').type(companyName);
    cy.get('[data-cy="btn-save-company"]').click();

    cy.contains('Company saved').should('be.visible');

    cy.get('[data-cy="tab-companies-list"]').click();
    cy.contains(companyName).should('be.visible');
  });

  it('should not allow duplicate company names', () => {
    const companyName = `CyTest Company ${Date.now()}`;

    cy.get('[data-cy="input-company-name"]').type(companyName);
    cy.get('[data-cy="btn-save-company"]').click();

    cy.contains('Company saved').should('be.visible');

    cy.get('[data-cy="tab-create-company"]').click();

    cy.get('[data-cy="input-company-name"]').type(companyName);
    cy.get('[data-cy="btn-save-company"]').click();

    cy.contains('Company name already used').should('be.visible');
  });

  it('should create a company with Company Type and Notes', () => {
    const companyName = `CyTest Company ${Date.now()}`;
    const notes = 'This is a test company with notes';

    cy.get('[data-cy="input-company-name"]').type(companyName);
    cy.get('[data-cy="select-company-type"]').click();
    cy.get('mat-option').contains('Mechanical Contractor').click();
    cy.get('[data-cy="textarea-notes"]').type(notes);

    cy.get('[data-cy="btn-save-company"]').click();
    cy.get('[data-cy="tab-companies-list"]').click();
    cy.contains(companyName).should('be.visible');
  });

  it('should add a contact to the company', () => {
    const companyName = `CyTest Company ${Date.now()}`;
    const contact = { name: `John ${Date.now()}`, email: 'john@example.com', phone: '555-123-4567' };

    cy.get('[data-cy="input-company-name"]').type(companyName);
    cy.get('[data-cy="btn-add-contact"]').click();

    cy.get('[data-cy="input-full-name"]')
      .first()
      .should('be.visible')
      .type(contact.name);
    cy.get('[data-cy="input-email"]')
      .first()
      .type(contact.email);
    cy.get('[data-cy="input-phone"]')
      .first()
      .type(contact.phone);

    cy.get('[data-cy="btn-save-company"]').click();

    cy.get('[data-cy="tab-companies-list"]').click();
    cy.contains(companyName).should('be.visible');
    cy.contains(contact.name).should('be.visible');
  });

  it('should add multiple contacts to a company', () => {
    const companyName = `CyTest Company ${Date.now()}`;
    const contact1 = { name: `Alice ${Date.now()}`, email: 'alice@example.com', phone: '555-1234' };
    const contact2 = { name: 'Bob Johnson', email: 'bob@example.com', phone: '555-5678' };

    cy.get('[data-cy="input-company-name"]').type(companyName);

    cy.get('[data-cy="btn-add-contact"]').click();
    cy.get('[data-cy="input-full-name"]').first().type(contact1.name);
    cy.get('[data-cy="input-email"]').first().type(contact1.email);
    cy.get('[data-cy="input-phone"]').first().type(contact1.phone);

    cy.get('[data-cy="btn-add-contact"]').click();
    cy.get('[data-cy="input-full-name"]').last().type(contact2.name);
    cy.get('[data-cy="input-email"]').last().type(contact2.email);
    cy.get('[data-cy="input-phone"]').last().type(contact2.phone);

    cy.get('[data-cy="btn-save-company"]').click();

    cy.get('[data-cy="tab-companies-list"]').click();
    cy.contains(companyName).should('be.visible');
    cy.contains(contact1.name).should('be.visible');
  });

  it('should set a contact as primary', () => {
    const companyName = `CyTest Company ${Date.now()}`;
    const contact1 = { name: 'Alice Smith', email: 'alice@example.com', phone: '555-1234' };
    const contact2 = { name: `Bob ${Date.now()}`, email: 'bob@example.com', phone: '555-5678' };

    cy.get('[data-cy="input-company-name"]').type(companyName);

    cy.get('[data-cy="btn-add-contact"]').click();
    cy.get('[data-cy="input-full-name"]').first().type(contact1.name);
    cy.get('[data-cy="input-email"]').first().type(contact1.email);
    cy.get('[data-cy="input-phone"]').first().type(contact1.phone);

    cy.get('[data-cy="btn-add-contact"]').click();
    cy.get('[data-cy="input-full-name"]').last().type(contact2.name);
    cy.get('[data-cy="input-email"]').last().type(contact2.email);
    cy.get('[data-cy="input-phone"]').last().type(contact2.phone);
    cy.get('[data-cy="btn-set-primary"]').last().click();

    cy.get('[data-cy="btn-save-company"]').click();

    cy.get('[data-cy="tab-companies-list"]').click();
    cy.contains(companyName).should('be.visible');
    cy.contains(contact2.name).should('be.visible');
  });

  it('should delete a contact from the company', () => {
    const companyName = `CyTest Company ${Date.now()}`;
    const contact1 = { name: `Alice ${Date.now()}`, email: 'alice@example.com', phone: '555-1234' };
    const contact2 = { name: `Bob ${Date.now()}`, email: 'bob@example.com', phone: '555-5678' };

    cy.get('[data-cy="input-company-name"]').type(companyName);

    cy.get('[data-cy="btn-add-contact"]').click();
    cy.get('[data-cy="input-full-name"]').first().type(contact1.name);
    cy.get('[data-cy="input-email"]').first().type(contact1.email);
    cy.get('[data-cy="input-phone"]').first().type(contact1.phone);

    cy.get('[data-cy="btn-add-contact"]').click();
    cy.get('[data-cy="input-full-name"]').last().type(contact2.name);
    cy.get('[data-cy="input-email"]').last().type(contact2.email);
    cy.get('[data-cy="input-phone"]').last().type(contact2.phone);
    cy.get('[data-cy="btn-set-primary"]').last().click();

    cy.get('[data-cy="btn-save-company"]').click();

    cy.get('[data-cy="tab-companies-list"]').click();
    cy.contains(companyName).should('be.visible');
    cy.contains(contact2.name).should('be.visible');

    cy.get('[data-cy="input-search-list"]').type(companyName);
    cy.get('[data-cy="btn-edit-company"]').click();

    cy.get('[data-cy="btn-delete-contact"]').last().click();
    cy.get('[data-cy="btn-save-company"]').click();

    cy.get('[data-cy="tab-companies-list"]').click();
    cy.get('[data-cy="input-search-list"]').type(companyName);
    cy.contains(companyName).should('be.visible');
    cy.contains(contact1.name).should('be.visible');
  });

  it('should add company address information', () => {
    const companyName = `CyTest Company ${Date.now()}`;
    const address = {
      line1: '123 Main Street',
      line2: 'Suite 100',
      city: 'San Francisco',
      state: 'CA',
      zip: '94105'
    };
    const location = `${address.city}, ${address.state}`;

    cy.get('[data-cy="input-company-name"]').type(companyName);

    cy.get('[data-cy="input-addr-line1"]').type(address.line1);
    cy.get('[data-cy="input-addr-line2"]').type(address.line2);
    cy.get('[data-cy="input-city"]').type(address.city);
    cy.get('[data-cy="input-state"]').type(address.state);
    cy.get('[data-cy="input-zip"]').type(address.zip);

    cy.get('[data-cy="btn-save-company"]').click();

    cy.get('[data-cy="tab-companies-list"]').click();
    cy.get('[data-cy="input-search-list"]').type(companyName);
    cy.contains(location).should('be.visible');
  });

  //
  // UC-COMP-002 Search and List Companies

  it('should search companies by name from the list view', () => {
    const companyName = `CyTest Admin Search ${Date.now()}`;

    cy.get('[data-cy="input-company-name"]').type(companyName);
    cy.get('[data-cy="btn-save-company"]').click();

    cy.contains('Company saved').should('be.visible');
    cy.get('[data-cy="tab-companies-list"]').click();

    cy.get('[data-cy="input-search-list"]').type(companyName);
    cy.contains(companyName).should('be.visible');
  });

  //
  // UC-COMP-003 - Edit Company and Manage Contacts

  it('should edit an existing company and preserve the updated values', () => {
    const companyName = `CyTest Admin Edit ${Date.now()}`;
    const updatedNotes = 'Updated notes by admin';

    cy.get('[data-cy="input-company-name"]').type(companyName);
    cy.get('[data-cy="btn-save-company"]').click();
    cy.contains('Company saved').should('be.visible');

    cy.get('[data-cy="tab-companies-list"]').click();
    cy.get('[data-cy="input-search-list"]').type(companyName);
    cy.contains(companyName).should('be.visible');
    cy.get('[data-cy="btn-edit-company"]').click();

    cy.get('[data-cy="textarea-notes"]').clear().type(updatedNotes);
    cy.get('[data-cy="btn-save-company"]').click();
    cy.contains('Company saved').should('be.visible');

    cy.get('[data-cy="tab-companies-list"]').click();
    cy.get('[data-cy="input-search-list"]').clear().type(companyName);
    cy.contains(companyName).should('be.visible');

    cy.get('[data-cy="btn-edit-company"]').click();
    cy.get('[data-cy="textarea-notes"]').should('have.value', updatedNotes);
  });
});
