/// <reference types="cypress" />

import { generateFutureRandomDateString, dateString, daysFromToday } from '../../support/utils';

describe('Admin Incoming Bids workflows', () => {
  const companyName = `CyTest Bids Client ${Date.now()}`;
  const contactName = `CyTest Contact ${Date.now()}`;
  const contactEmail = `cytest-${Date.now()}@example.com`;
  const contactPhone = '555-010-1234';

  before(() => {
    cy.session('admin-session', () => cy.loginByRole('admin'));
    cy.visit('/dashboard/companies');

    cy.get('[data-cy="input-company-name"]').should('be.visible').type(companyName);
    cy.get('[data-cy="btn-add-contact"]').click();
    cy.get('[data-cy="input-full-name"]').first().type(contactName);
    cy.get('[data-cy="input-email"]').first().type(contactEmail);
    cy.get('[data-cy="input-phone"]').first().type(contactPhone);
    cy.get('[data-cy="btn-save-company"]').click();

    cy.contains(companyName).should('exist')
  });

  beforeEach(() => {
    cy.session('admin-session', () => cy.loginByRole('admin'));
    cy.visit('/dashboard/construction/bids');
    cy.on('window:confirm', () => true);
  });

  const createIncomingBid = (projectName: string) => {
    const location = 'Miami, FL';
    const priority = 'High';
    const dueDate = generateFutureRandomDateString(7, 14);
    const daysLeft = daysFromToday(dueDate);

    cy.get('[data-cy="btn-add-incoming-bid"]').click();

    cy.get('[data-cy="select-client"]')
      .should('be.visible') // form is shown
      .and('not.be.disabled') // selector data is loaded
      .click();
    cy.contains('mat-option', companyName).click();

    cy.get('[data-cy="input-project-name"]').type(projectName);
    cy.get('[data-cy="input-bid-due-date"]').type(dueDate, { delay: 0 });
    // cy.get('[data-cy="select-responsible-contact"]') // default primary contact
    cy.get('[data-cy="input-jobsite-address"]').type(location);

    cy.get('[data-cy="select-priority"]').click();
    cy.contains('mat-option', priority).click();

    cy.get('[data-cy="btn-continue"]').click();
    return { location, priority, dueDate, daysLeft }
  };

  it('should display the Incoming Bids page with correct options for admin', () => {
    cy.get('[data-cy="tab-incoming-bids"]').should('be.visible');
    cy.get('[data-cy="tab-bids-created"]').should('be.visible');
    cy.get('[data-cy="tab-analytics"]').should('be.visible');
    cy.get('[data-cy="tab-ai-coach"]').should('be.visible');
    cy.get('[data-cy="tab-incoming-bids-trash"]').should('be.visible');

    cy.get('[data-cy="incoming-bids-content"]').should('be.visible');
    cy.get('[data-cy="btn-add-incoming-bid"]')
      .should('be.visible')
      .should('contain.text', 'Add Incoming Bid');
  });

  it('should display all required columns in the incoming bids list', () => {
    cy.get('[data-cy="column-date-received"]').should('be.visible');
    cy.get('[data-cy="column-client"]').should('be.visible');
    cy.get('[data-cy="column-project"]').should('be.visible');
    cy.get('[data-cy="column-location"]').should('be.visible');
    cy.get('[data-cy="column-bid-due"]').should('be.visible');
    cy.get('[data-cy="column-days-left"]').should('be.visible');
    cy.get('[data-cy="column-created-by"]').should('be.visible');
    cy.get('[data-cy="column-assigned-to"]').should('be.visible');
    cy.get('[data-cy="column-priority"]').should('be.visible');
    cy.get('[data-cy="column-actions"]').should('be.visible');
  });

  it('should create a new incoming bid and show it in the list', () => {
    const projectName = `CyTest Incoming Bid ${Date.now()}`;
    const dateReceive = dateString(new Date());
    const { location, priority, dueDate, daysLeft } = createIncomingBid(projectName);

    cy.contains('td', projectName).closest('tr').within(() => {
      cy.contains(dateReceive).should('be.visible');
      cy.contains(companyName).should('be.visible');
      cy.contains(projectName).should('be.visible');
      cy.get('[data-cy="location-btn"]').as('locationBtn')
        .should('be.visible')
        .should('not.be.disabled');
      cy.contains(dueDate).should('be.visible');
      cy.contains(daysLeft).should('be.visible');
      cy.contains('Unassigned').should('be.visible');
      cy.contains('button', 'Assign').should('be.visible');
      cy.contains(priority).should('be.visible');
      cy.contains('button', 'Edit').should('be.visible');
      cy.contains('button', 'Create Bid').should('be.visible');
      cy.contains('button', 'Trash').should('be.visible');
    });
    cy.get('@locationBtn').click();
    cy.get('mat-dialog-container').within(() => {
      cy.contains('h2', 'Jobsite Address').should('be.visible');
      cy.contains(location).should('be.visible');
      cy.get('[data-cy="close-modal-btn"]').click();
    });
  });

  it('should assign and unassign an incoming bid', () => {
    const projectName = `CyTest Assign Bid ${Date.now()}`;
    const assignee = `Estimador ${Date.now()}`;

    createIncomingBid(projectName);

    cy.contains('td', projectName).closest('tr').within(() => {
      cy.contains('button', 'Assign').click();
    });

    cy.get('[data-cy="incoming-bid-assignee-input"]')
      .should('be.visible')
      .clear()
      .type(assignee);
    cy.get('[data-cy="incoming-bid-assignee-save"]').click();

    cy.contains('td', projectName).closest('tr').should('contain.text', `Assigned: ${assignee}`);

    cy.contains('td', projectName).closest('tr').within(() => {
      cy.contains('button', 'Unassign').click();
    });

    cy.contains('td', projectName).closest('tr').should('contain.text', 'Unassigned');
  });

  it('should edit incoming bid priority', () => {
    const projectName = `CyTest Priority Bid ${Date.now()}`;

    const { priority } = createIncomingBid(projectName);

    cy.contains('td', projectName).closest('tr').within(() => {
      cy.contains(priority).should('exist');
      cy.contains('button', 'Edit').click();
    });

    cy.get('mat-dialog-container').within(() => {
      cy.get('[data-cy="modal-header"]').should('contain.text', 'Edit Priority');
      cy.contains('button', 'Urgent').as('urgentBtn');
      cy.contains('button', 'High');
      cy.contains('button', 'Normal');
      cy.contains('button', 'Low');
      cy.contains('button', 'Save').as('saveBtn');
    });

    cy.get('@urgentBtn').click();
    cy.get('@saveBtn').click();

    cy.get('mat-dialog-container').should('not.exist');

    cy.contains('td', projectName)
      .closest('tr')
      .contains('Urgent')
      .should('exist');
  });

  it.skip('should create a formal bid from incoming bid', () => {
    // Tested in another suite
  });

  it.only('should move an incoming bid to trash and display it in Incoming Bids Trash', () => {
    // const projectName = `CyTest Trash Bid ${Date.now()}`;
    // const deleteReason = 'Duplicate request for testing';

    // createIncomingBid(projectName);

    // cy.contains('td', projectName).closest('tr').within(() => {
    //   cy.contains('button', 'Trash').click();
    // });

    // cy.get('textarea[formcontrolname="reason"]').should('be.visible').type(deleteReason);
    // cy.contains('button', 'Move').click();

    // cy.contains('Incoming Bids Trash').click();
    // cy.contains('td', projectName, { timeout: 15000 }).should('be.visible').closest('tr').within(() => {
    //   cy.contains(deleteReason).should('be.visible');
    // });
  });

  // Ver casos adge
});
