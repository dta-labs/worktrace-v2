/// <reference types="cypress" />

/**
 * UC-COMP-001 - Permisos de creación de compañía por rol
 * 
 * Según la especificación de WorkTrace:
 * - Admin, Project Manager y Bidder pueden crear compañías.
 * - Accounting (por ahora) no tiene permiso.
 * 
 * Esta suite solo prueba el acceso básico y una creación mínima,
 * sin repetir todas las validaciones funcionales (ya cubiertas por create-company.cy.ts).
 */

describe('UC-COMP-001 - Creation Permissions by Role', () => {
  const roles = [
    { role: 'admin', shouldSucceed: true, description: 'Administrator' },
    // { role: 'president', shouldSucceed: true, description: 'President' },
    // { role: 'pm', shouldSucceed: true, description: 'Project Manager' },
    // { role: 'bidder', shouldSucceed: true, description: 'Bidder / Estimator' },
    // { role: 'accounting', shouldSucceed: false, description: 'Accounting' }
  ];

  roles.forEach(({ role, shouldSucceed, description }) => {
    it(`${description} ${shouldSucceed ? 'should' : 'should not'} create a company`, () => {
      cy.session(`${role}-session`, () => cy.loginByRole(role));
      cy.visit('/dashboard/companies');

      if (shouldSucceed) {
        cy.get('[data-cy="tab-create-company"]').should('be.visible').click();

        const companyName = `CyTest Company ${Date.now()}`;
        cy.get('[data-cy="input-company-name"]').type(companyName);
        cy.get('[data-cy="btn-save-company"]').click();

        cy.get('[data-cy="tab-companies-list"]').click();
        cy.contains(companyName).should('be.visible');
      } else {
        cy.get('[data-cy="tab-create-company"]').should('not.exist');
      }
    });
  });

  it('An unauthenticated user should not access companies module', () => {
    cy.logout();
    cy.visit('/dashboard/companies', { failOnStatusCode: false });
    cy.url().should('include', '/login');
  });
});