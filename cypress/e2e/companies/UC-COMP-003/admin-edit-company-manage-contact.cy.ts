/// <reference types="cypress" />

describe('Admin Edit Companies workflows', () => {
  beforeEach(() => {
    cy.session('admin-session', () => cy.loginByRole('admin'));
    cy.visit('/dashboard/companies');
  });

  it.skip('should display the Companies page and tabs for admin', () => {
    cy.get('[data-cy="tab-create-company"]').should('be.visible');
    cy.get('[data-cy="tab-companies-list"]').should('be.visible');
    cy.get('[data-cy="app-create-company"]').should('be.visible');
  });

  it.skip('should edit an existing company and preserve the updated values', () => {
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

  it('should display all contact fields when editing company', () => {
    const companyName = `CyTest Contact Fields ${Date.now()}`;

    cy.get('[data-cy="input-company-name"]').type(companyName);
    cy.get('[data-cy="btn-add-contact"]').click();
    cy.get('[data-cy="btn-save-company"]').click();
    cy.contains('Company saved').should('be.visible');

    cy.get('[data-cy="tab-companies-list"]').click();
    cy.get('[data-cy="input-search-list"]').type(companyName);
    cy.get('[data-cy="btn-edit-company"]').click();

    cy.get('[data-cy="input-full-name"]').first().should('be.visible');
    cy.get('[data-cy="input-email"]').first().should('be.visible');
    cy.get('[data-cy="input-phone"]').first().should('be.visible');
    cy.get('[data-cy="btn-set-primary"]').first().should('be.visible');
    cy.get('[data-cy="btn-delete-contact"]').first().should('be.visible');
  });

  it.skip('should add a new contact to an existing company', () => {
    const companyName = `CyTest Add Contact Edit ${Date.now()}`;
    const contactName = `New Contact ${Date.now()}`;
    const contactEmail = 'newcontact@example.com';
    const contactPhone = '555-111-2222';

    cy.get('[data-cy="input-company-name"]').type(companyName);
    cy.get('[data-cy="btn-save-company"]').click();
    cy.contains('Company saved').should('be.visible');

    cy.get('[data-cy="tab-companies-list"]').click();
    cy.get('[data-cy="input-search-list"]').type(companyName);
    cy.get('[data-cy="btn-edit-company"]').click();

    cy.get('[data-cy="btn-add-contact"]').click();
    cy.get('[data-cy="input-full-name"]').last().type(contactName);
    cy.get('[data-cy="input-email"]').last().type(contactEmail);
    cy.get('[data-cy="input-phone"]').last().type(contactPhone);
    cy.get('[data-cy="btn-save-company"]').click();

    cy.contains('Company saved').should('be.visible');
    cy.get('[data-cy="tab-companies-list"]').click();
    cy.get('[data-cy="input-search-list"]').clear().type(companyName);
    cy.contains(contactName).should('be.visible');
  });

  it.skip('should set a contact as primary from edit view', () => {
    const companyName = `CyTest Primary Contact ${Date.now()}`;
    const contact1 = `Contact One ${Date.now()}`;
    const contact2 = `Contact Two ${Date.now()}`;

    cy.get('[data-cy="input-company-name"]').type(companyName);

    cy.get('[data-cy="btn-add-contact"]').click();
    cy.get('[data-cy="input-full-name"]').first().type(contact1);
    cy.get('[data-cy="input-email"]').first().type(`${contact1.toLowerCase().replace(' ', '.')}@example.com`);

    cy.get('[data-cy="btn-add-contact"]').click();
    cy.get('[data-cy="input-full-name"]').last().type(contact2);
    cy.get('[data-cy="input-email"]').last().type(`${contact2.toLowerCase().replace(' ', '.')}@example.com`);

    cy.get('[data-cy="btn-save-company"]').click();
    cy.contains('Company saved').should('be.visible');

    cy.get('[data-cy="tab-companies-list"]').click();
    cy.get('[data-cy="input-search-list"]').type(companyName);
    cy.get('[data-cy="btn-edit-company"]').click();

    cy.get('[data-cy="btn-set-primary"]').last().click();
    cy.get('[data-cy="btn-save-company"]').click();

    cy.contains('Company saved').should('be.visible');
  });

  it.skip('should delete a contact from edit view', () => {
    const companyName = `CyTest Delete Contact ${Date.now()}`;
    const contactToDelete = `To Delete ${Date.now()}`;
    const contactToKeep = `To Keep ${Date.now()}`;

    cy.get('[data-cy="input-company-name"]').type(companyName);

    cy.get('[data-cy="btn-add-contact"]').click();
    cy.get('[data-cy="input-full-name"]').first().type(contactToDelete);
    cy.get('[data-cy="input-email"]').first().type('delete@example.com');

    cy.get('[data-cy="btn-add-contact"]').click();
    cy.get('[data-cy="input-full-name"]').last().type(contactToKeep);
    cy.get('[data-cy="input-email"]').last().type('keep@example.com');
    cy.get('[data-cy="btn-set-primary"]').last().click();

    cy.get('[data-cy="btn-save-company"]').click();
    cy.contains('Company saved').should('be.visible');

    cy.get('[data-cy="tab-companies-list"]').click();
    cy.get('[data-cy="input-search-list"]').type(companyName);
    cy.get('[data-cy="btn-edit-company"]').click();

    cy.get('[data-cy="btn-delete-contact"]').first().click();
    cy.get('[data-cy="btn-save-company"]').click();

    cy.contains('Company saved').should('be.visible');
    cy.get('[data-cy="tab-companies-list"]').click();
    cy.get('[data-cy="input-search-list"]').clear().type(companyName);

    cy.contains(contactToKeep).should('be.visible');
    cy.contains(contactToDelete).should('not.exist');
  });

  it.skip('should update company address from edit view', () => {
    const companyName = `CyTest Update Address ${Date.now()}`;
    const address = {
      line1: '456 Updated Street',
      city: 'Orlando',
      state: 'FL',
      zip: '32801'
    };
    const location = `${address.city}, ${address.state}`;

    cy.get('[data-cy="input-company-name"]').type(companyName);
    cy.get('[data-cy="btn-save-company"]').click();
    cy.contains('Company saved').should('be.visible');

    cy.get('[data-cy="tab-companies-list"]').click();
    cy.get('[data-cy="input-search-list"]').type(companyName);
    cy.get('[data-cy="btn-edit-company"]').click();

    cy.get('[data-cy="input-addr-line1"]').type(address.line1);
    cy.get('[data-cy="input-city"]').type(address.city);
    cy.get('[data-cy="input-state"]').type(address.state);
    cy.get('[data-cy="input-zip"]').type(address.zip);
    cy.get('[data-cy="btn-save-company"]').click();

    cy.contains('Company saved').should('be.visible');
    cy.get('[data-cy="tab-companies-list"]').click();
    cy.get('[data-cy="input-search-list"]').clear().type(companyName);
    cy.contains(location).should('be.visible');
  });

  it.skip('should add multiple contacts in edit mode', () => {
    const companyName = `CyTest Multiple Contacts Edit ${Date.now()}`;
    const contact1 = { name: `First ${Date.now()}`, email: 'first@example.com', phone: '555-0001' };
    const contact2 = { name: `Second ${Date.now()}`, email: 'second@example.com', phone: '555-0002' };
    const contact3 = { name: `Third ${Date.now()}`, email: 'third@example.com', phone: '555-0003' };

    cy.get('[data-cy="input-company-name"]').type(companyName);
    cy.get('[data-cy="btn-save-company"]').click();
    cy.contains('Company saved').should('be.visible');

    cy.get('[data-cy="tab-companies-list"]').click();
    cy.get('[data-cy="input-search-list"]').type(companyName);
    cy.get('[data-cy="btn-edit-company"]').click();

    cy.get('[data-cy="btn-add-contact"]').click();
    cy.get('[data-cy="input-full-name"]').eq(0).type(contact1.name);
    cy.get('[data-cy="input-email"]').eq(0).type(contact1.email);
    cy.get('[data-cy="input-phone"]').eq(0).type(contact1.phone);

    cy.get('[data-cy="btn-add-contact"]').click();
    cy.get('[data-cy="input-full-name"]').eq(1).type(contact2.name);
    cy.get('[data-cy="input-email"]').eq(1).type(contact2.email);
    cy.get('[data-cy="input-phone"]').eq(1).type(contact2.phone);

    cy.get('[data-cy="btn-add-contact"]').click();
    cy.get('[data-cy="input-full-name"]').eq(2).type(contact3.name);
    cy.get('[data-cy="input-email"]').eq(2).type(contact3.email);
    cy.get('[data-cy="input-phone"]').eq(2).type(contact3.phone);

    cy.get('[data-cy="btn-set-primary"]').first().click();
    cy.get('[data-cy="btn-save-company"]').click();

    cy.contains('Company saved').should('be.visible');
    cy.get('[data-cy="tab-companies-list"]').click();
    cy.get('[data-cy="input-search-list"]').clear().type(companyName);

    cy.contains(contact1.name).should('be.visible');
    cy.contains(contact2.name).should('be.visible');
    cy.contains(contact3.name).should('be.visible');
  });

  it('should validate required fields when adding contact in edit mode', () => {
    const companyName = `CyTest Validate Contact ${Date.now()}`;

    cy.get('[data-cy="input-company-name"]').type(companyName);
    cy.get('[data-cy="btn-save-company"]').click();
    cy.contains('Company saved').should('be.visible');

    cy.get('[data-cy="tab-companies-list"]').click();
    cy.get('[data-cy="input-search-list"]').type(companyName);
    cy.get('[data-cy="btn-edit-company"]').click();

    cy.get('[data-cy="btn-add-contact"]').click();
    cy.get('[data-cy="input-full-name"]').last().type('Test Name');
    cy.get('[data-cy="btn-save-company"]').click();

    cy.get('mat-error').should('be.visible');
  });

  it('should cancel edit without saving changes', () => {
    const companyName = `CyTest Cancel Edit ${Date.now()}`;
    const initialNotes = 'Initial notes';
    const changedNotes = 'Changed but not saved';

    cy.get('[data-cy="input-company-name"]').type(companyName);
    cy.get('[data-cy="textarea-notes"]').type(initialNotes);
    cy.get('[data-cy="btn-save-company"]').click();
    cy.contains('Company saved').should('be.visible');

    cy.get('[data-cy="tab-companies-list"]').click();
    cy.get('[data-cy="input-search-list"]').type(companyName);
    cy.get('[data-cy="btn-edit-company"]').click();

    cy.get('[data-cy="textarea-notes"]').clear().type(changedNotes);
    cy.get('[data-cy="tab-companies-list"]').click();

    cy.get('[data-cy="input-search-list"]').clear().type(companyName);
    cy.get('[data-cy="btn-edit-company"]').click();
    cy.get('[data-cy="textarea-notes"]').should('have.value', initialNotes);
  });
});