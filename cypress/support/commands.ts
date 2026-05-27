Cypress.Commands.add('login', (email: string, password: string) => {
  cy.get('[data-cy="login-email"]').type(email);
  cy.get('[data-cy="login-password"]').type(password);
  cy.get('[data-cy="login-submit"]').click();
});

Cypress.Commands.add('logout', () => {
  cy.get('[data-cy="logout-button"]').click();
});