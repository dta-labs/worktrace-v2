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
    cy.url().should('include', '/dashboard'); // wait for post-login redirection
  });
});

Cypress.Commands.add('logout', () => {
  cy.get('[data-cy="logout-button"]').click();
});

Cypress.Commands.add('clearAllStorage', () => {
  cy.clearCookies();
  cy.clearAllSessionStorage();
  cy.clearAllLocalStorage();

  // Limpiar IndexedDB (Crucial para Firebase Auth)
  cy.window().then((win) => {
    return win.indexedDB.databases().then((dbs) => {
      dbs.forEach((db) => {
        win.indexedDB.deleteDatabase(db.name);
      });
    });
  });
});