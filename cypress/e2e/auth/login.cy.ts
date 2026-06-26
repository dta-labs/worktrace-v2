describe('Authentication', () => {
  beforeEach(() => cy.visit('/login'));

  it('should login successfully with valid credentials', () => {
    cy.fixture('users').then((users) => {
      cy.login(users.admin.email, users.admin.password);
      cy.url().should('include', '/dashboard');
      cy.get('[data-cy="welcome-message"]')
        .should('be.visible')
        .and('contain.text', users.admin.email);
    });
  });

  it('should show error with unregistered credentials', () => {
    cy.fixture('users').then((users) => {
      cy.login(users.unregistered.email, users.unregistered.password);
      cy.url().should('include', '/login');
      cy.get('[data-cy="login-error"]')
        .should('be.visible')
        .and('contain.text', 'Login failed. Please try again.');
    });
  });

  it('should validate required fields', () => {
    cy.get('[data-cy="login-submit"]').click();
    cy.get('[data-cy="login-email-required-error"]').should('be.visible');
    cy.get('[data-cy="login-password-required-error"]').should('be.visible');
  });

  it('should logout successfully', () => {
    cy.session('admin-session', () => cy.loginByRole('admin'));

    cy.visit('/dashboard');
    cy.url().should('include', '/dashboard');

    cy.get('[data-cy="logout-button"]').click();

    cy.url().should('include', '/login');
    cy.get('[data-cy="login-email"]').should('be.visible');
  });
});