/// <reference types="cypress" />

/**
 * UC-COMP-001 - Crear compañía
 * 
 * Objetivo: Registrar clientes, contratistas, proveedores o companias relacionadas
 * que luego se usaran en Incoming Bids, Bids y Projects.
 * 
 * Flujo principal:
 * - El usuario abre Companies.
 * - Selecciona Create Company.
 * - Completa Company Name y Company Type.
 * - Agrega contactos si ya los conoce.
 * - Completa direccion si aplica.
 * - Guarda la compania.
 * - La compania queda disponible para seleccionarse desde Add Incoming Bid.
 */
/**
 * TODO:
 * - Agrega un test de nombre duplicado (regla de negocio).
 * - Reforzar selectores – cambia simple-snack-bar por un data-cy o texto específico.
 * - Agregar limpieza (opcional pero recomendado).
 */

describe('UC-COMP-001 - Create company', () => {
  beforeEach(() => {
    cy.session('admin-session', () => cy.loginByRole('admin'));
    cy.visit('/dashboard/companies');
    cy.get('[data-cy="tab-create-company"]').should('be.visible');
  });

  it('should display the Create Company form', () => {
    cy.get('[data-cy="input-company-name"]').should('be.visible');
    cy.get('[data-cy="select-company-type"]').should('be.visible');
    cy.get('[data-cy="textarea-notes"]').should('be.visible');
    cy.get('[data-cy="btn-add-contact"]').should('be.visible');
    cy.get('[data-cy="btn-save-company"]').should('be.visible');
  });

  // it('should show validation error when Company Name is empty', () => {
  //   cy.get('[data-cy="btn-save-company"]').click();
  //   cy.get('mat-error').should('contain.text', 'Required');
  // });

  // it('should create a company with only required fields (Company Name)', () => {
  //   const companyName = `Test Company ${Date.now()}`;

  //   cy.get('[data-cy="input-company-name"]').type(companyName);
  //   cy.get('[data-cy="btn-save-company"]').click();
  //   cy.get('simple-snack-bar', { timeout: 5000 }).should('be.visible');

  //   cy.get('[data-cy="tab-companies-list"]').click();
  //   cy.contains(companyName).should('be.visible');
  // });

  // it('should not allow duplicate company names', () => {
  //   const companyName = `Duplicate Test ${Date.now()}`;
  //   // Company 1
  //   cy.get('[data-cy="input-company-name"]').type(companyName);
  //   cy.get('[data-cy="btn-save-company"]').click();
  //   cy.get('simple-snack-bar').should('be.visible');
  //   cy.get('[data-cy="tab-create-company"]').click(); // volver al formulario

  //   // Company 2 (same name)
  //   cy.get('[data-cy="input-company-name"]').type(companyName);
  //   cy.get('[data-cy="btn-save-company"]').click();
  //   cy.contains('Company name already used').should('be.visible');
  // });

  // it('should create a company with Company Name and Company Type', () => {
  //   const companyName = `GC Company ${Date.now()}`;

  //   cy.get('[data-cy="input-company-name"]').type(companyName);
  //   cy.get('[data-cy="select-company-type"]').click();
  //   cy.get('mat-option').contains('General Contractor').click();
  //   cy.get('[data-cy="btn-save-company"]').click();
  //   cy.get('simple-snack-bar', { timeout: 5000 }).should('be.visible');

  //   cy.get('[data-cy="tab-companies-list"]').click();
  //   cy.contains(companyName).should('be.visible');
  // });

  // it('should create a company with Notes', () => {
  //   const companyName = `Noted Company ${Date.now()}`;
  //   const notes = 'This is a test company with notes';

  //   cy.get('[data-cy="input-company-name"]').type(companyName);
  //   cy.get('[data-cy="textarea-notes"]').type(notes);
  //   cy.get('[data-cy="btn-save-company"]').click();
  //   cy.get('simple-snack-bar', { timeout: 5000 }).should('be.visible');

  //   cy.get('[data-cy="tab-companies-list"]').click();
  //   cy.contains(companyName).should('be.visible');
  // });

  // it('should add a contact to the company', () => {
  //   const companyName = `Company with Contact ${Date.now()}`;
  //   const contact = { name: 'John Doe', email: 'john@example.com' };

  //   cy.get('[data-cy="input-company-name"]').type(companyName);
  //   cy.get('[data-cy="btn-add-contact"]').click();

  //   cy.get('[data-cy="input-full-name"]')
  //     .first()
  //     .should('be.visible')
  //     .type(contact.name);
  //   cy.get('[data-cy="input-email"]')
  //     .first()
  //     .type(contact.email);

  //   cy.get('[data-cy="btn-save-company"]').click();
  //   cy.get('simple-snack-bar', { timeout: 5000 }).should('be.visible');

  //   cy.get('[data-cy="tab-companies-list"]').click();
  //   cy.contains(companyName).should('be.visible');
  // });

  // it('should add multiple contacts to a company', () => {
  //   const companyName = `Company with Multiple Contacts ${Date.now()}`;
  //   const contact1 = { name: 'Alice Smith', email: 'alice@example.com', phone: '555-1234' };
  //   const contact2 = { name: 'Bob Johnson', email: 'bob@example.com', phone: '555-5678' };

  //   cy.get('[data-cy="input-company-name"]').type(companyName);

  //   cy.get('[data-cy="btn-add-contact"]').click();
  //   cy.get('[data-cy="input-full-name"]').first().type(contact1.name);
  //   cy.get('[data-cy="input-email"]').first().type(contact1.email);
  //   cy.get('[data-cy="input-phone"]').first().type(contact1.phone);

  //   cy.get('[data-cy="btn-add-contact"]').click();
  //   cy.get('[data-cy="input-full-name"]').last().type(contact2.name);
  //   cy.get('[data-cy="input-email"]').last().type(contact2.email);
  //   cy.get('[data-cy="input-phone"]').last().type(contact2.phone);

  //   cy.get('[data-cy="btn-save-company"]').click();
  //   cy.get('simple-snack-bar', { timeout: 5000 }).should('be.visible');

  //   cy.get('[data-cy="tab-companies-list"]').click();
  //   cy.contains(companyName).should('be.visible');
  // });

  // it('should set a contact as primary', () => {
  //   const companyName = `Company with Primary Contact ${Date.now()}`;
  //   const contactName = 'Primary Contact';

  //   cy.get('[data-cy="input-company-name"]').type(companyName);

  //   cy.get('[data-cy="btn-add-contact"]').click();
  //   cy.get('[data-cy="input-full-name"]').first().type(contactName);

  //   cy.get('[data-cy="btn-set-primary"]').first().click();
  //   cy.get('[data-cy="btn-save-company"]').click();
  //   cy.get('simple-snack-bar', { timeout: 5000 }).should('be.visible');
  // });

  // it('should delete a contact from the company', () => {
  //   const companyName = `Company with Deleted Contact ${Date.now()}`;
  //   const contact1 = 'Contact To Keep';
  //   const contact2 = 'Contact To Delete';

  //   cy.get('[data-cy="input-company-name"]').type(companyName);

  //   cy.get('[data-cy="btn-add-contact"]').click();
  //   cy.get('[data-cy="input-full-name"]').first().type(contact1);

  //   cy.get('[data-cy="btn-add-contact"]').click();
  //   cy.get('[data-cy="input-full-name"]').last().type(contact2);

  //   // Delete last
  //   cy.get('[data-cy="btn-delete-contact"]').last().click();

  //   cy.get('[data-cy="input-full-name"]').should('have.length', 1);
  //   cy.get('[data-cy="input-full-name"]').first().should('have.value', contact1);

  //   cy.get('[data-cy="btn-save-company"]').click();
  //   cy.get('simple-snack-bar', { timeout: 5000 }).should('be.visible');
  // });

  // it('should add company address information', () => {
  //   const companyName = `Company with Address ${Date.now()}`;
  //   const address = {
  //     line1: '123 Main Street',
  //     line2: 'Suite 100',
  //     city: 'San Francisco',
  //     state: 'CA',
  //     zip: '94105'
  //   };

  //   cy.get('[data-cy="input-company-name"]').type(companyName);

  //   cy.get('[data-cy="input-addr-line1"]').type(address.line1);
  //   cy.get('[data-cy="input-addr-line2"]').type(address.line2);
  //   cy.get('[data-cy="input-city"]').type(address.city);
  //   cy.get('[data-cy="input-state"]').type(address.state);
  //   cy.get('[data-cy="input-zip"]').type(address.zip);

  //   cy.get('[data-cy="btn-save-company"]').click();
  //   cy.get('simple-snack-bar', { timeout: 5000 }).should('be.visible');

  //   cy.get('[data-cy="tab-companies-list"]').click();
  //   cy.contains(companyName).should('be.visible');
  // });

  // it('should create complete company with all fields', () => {
  //   const companyName = `Complete Company ${Date.now()}`;
  //   const notes = 'Complete test company';
  //   const contact = {
  //     name: 'Manager',
  //     email: 'manager@example.com',
  //     phone: '555-9999',
  //     role: 'Project Manager'
  //   };
  //   const address = {
  //     line1: '456 Oak Avenue',
  //     city: 'Los Angeles',
  //     state: 'CA',
  //     zip: '90001'
  //   };

  //   // Company
  //   cy.get('[data-cy="input-company-name"]').type(companyName);
  //   cy.get('[data-cy="select-company-type"]').click();
  //   cy.get('mat-option').contains('Mechanical Contractor').click();
  //   cy.get('[data-cy="textarea-notes"]').type(notes);

  //   // Contact
  //   cy.get('[data-cy="btn-add-contact"]').click();
  //   cy.get('[data-cy="input-full-name"]').first().type(contact.name);
  //   cy.get('[data-cy="input-email"]').first().type(contact.email);
  //   cy.get('[data-cy="input-phone"]').first().type(contact.phone);
  //   cy.get('[data-cy="input-role"]').first().type(contact.role);

  //   // Address
  //   cy.get('[data-cy="input-addr-line1"]').type(address.line1);
  //   cy.get('[data-cy="input-city"]').type(address.city);
  //   cy.get('[data-cy="input-state"]').type(address.state);
  //   cy.get('[data-cy="input-zip"]').type(address.zip);

  //   cy.get('[data-cy="btn-save-company"]').click();
  //   cy.get('simple-snack-bar', { timeout: 5000 }).should('be.visible');

  //   cy.get('[data-cy="tab-companies-list"]').click();
  //   cy.contains(companyName).should('be.visible');
  // });

  // it('should switch between Create and List tabs', () => {
  //   // Create tab active
  //   cy.get('[data-cy="tab-create-company"]').should('have.class', 'active');

  //   // Switch List tab
  //   cy.get('[data-cy="tab-companies-list"]').click();
  //   cy.get('[data-cy="tab-companies-list"]').should('have.class', 'active');

  //   // Switch Create tab
  //   cy.get('[data-cy="tab-create-company"]').click();
  //   cy.get('[data-cy="tab-create-company"]').should('have.class', 'active');
  // });

  // it('should handle contact with all fields', () => {
  //   const companyName = `Company with Full Contact ${Date.now()}`;
  //   const contact = {
  //     name: 'Technical Lead',
  //     email: 'tech@example.com',
  //     phone: '555-0000',
  //     role: 'CTO'
  //   };

  //   // Company
  //   cy.get('[data-cy="input-company-name"]').type(companyName);

  //   // Contacto with all fields
  //   cy.get('[data-cy="btn-add-contact"]').click();
  //   cy.get('[data-cy="input-full-name"]').first().type(contact.name);
  //   cy.get('[data-cy="input-email"]').first().type(contact.email);
  //   cy.get('[data-cy="input-phone"]').first().type(contact.phone);
  //   cy.get('[data-cy="input-role"]').first().type(contact.role);

  //   cy.get('[data-cy="btn-save-company"]').click();
  //   cy.get('simple-snack-bar', { timeout: 5000 }).should('be.visible');
  // });
});
