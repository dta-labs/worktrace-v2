Cypress.Commands.add('login', (email: string, password: string) => {
  cy.get('[data-cy="login-email"]').type(email);
  cy.get('[data-cy="login-password"]').type(password);
  cy.get('[data-cy="login-submit"]').click();
});

Cypress.Commands.add('loginByRole', (role: string) => {
  cy.fixture('users').then((users) => {
    const user = users[role];
    if (!user) throw new Error(`Role ${role} not found in users fixture`);

    cy.visit('/login');
    cy.login(user.email, user.password);
    cy.url().should('include', '/dashboard');
    // cy.get('[data-cy="logout-button"]', { timeout: 10000 }).should('be.visible');
  });
});

Cypress.Commands.add('logout', () => {
  cy.clearCookies();
  cy.clearAllLocalStorage();
  cy.clearAllSessionStorage();
  cy.clearIndexedDB();
  if (Cypress.session && typeof Cypress.session.clearAllSavedSessions === 'function') {
    Cypress.session.clearAllSavedSessions();
  }
});

Cypress.Commands.add('clearIndexedDB', () => {
  cy.window().then((win) => {
    return win.indexedDB.databases().then((dbs) => {
      dbs.forEach((db) => {
        if (db.name) win.indexedDB.deleteDatabase(db.name);
      });
    });
  });
});