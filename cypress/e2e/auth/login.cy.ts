describe('Authentication', () => {
  beforeEach(() => cy.visit('/login'));

  it('should login successfully with valid credentials', () => {
    cy.fixture('users').then((users) => {
      cy.login(users.admin.email, users.admin.password);
      cy.url().should('include', '/dashboard');
      cy.get('[data-cy="welcome-message"]')
        .should('be.visible')
        .and('contain', users.admin.email);
    });
  });

  it('should show error with invalid credentials', () => {
    cy.fixture('users').then((users) => {
      cy.login(users.invalid.email, users.invalid.password);
      cy.url().should('include', '/login');
      cy.get('[data-cy="login-error"]').should('be.visible');
    });
  });

  it('should validate required fields', () => {
    cy.get('[data-cy="login-submit"]').click();
    cy.get('[data-cy="login-email-required-error"]').should('be.visible');
    cy.get('[data-cy="login-password-required-error"]').should('be.visible');
  });

  it('should logout successfully', () => {
    cy.fixture('users').then((users) => {
      cy.login(users.admin.email, users.admin.password);
    });
    cy.url().should('include', '/dashboard');

    cy.logout();
    cy.url().should('include', '/login'); // Redirige a login
    cy.get('[data-cy="login-email"]').should('be.visible'); // Verifica que el formulario esté visible
  });
});