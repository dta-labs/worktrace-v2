import './commands';

// Oculta peticiones XHR/fetch del log de comandos
// const app = window.top;
// if (!app?.document.head.querySelector('[data-hide-command-log-request]')) {
//     const style = app.document.createElement('style');
//     style.setAttribute('data-hide-command-log-request', '');
//     style.innerHTML = '.command-name-request, .command-name-xhr { display: none }';
//     app?.document.head.appendChild(style);
// }

declare global {
  namespace Cypress {
    interface Chainable {
      login(email: string, password: string): Chainable<void>;
      logout(): Chainable<void>;
      loginByRole(role: string): Chainable<void>;
      clearIndexedDB(): Chainable<void>;
      createProject(projectData: any): Chainable<any>;
      createCompany(companyData: any): Chainable<any>;
      createCandidate(candidateData: any): Chainable<any>;
    }
  }
};