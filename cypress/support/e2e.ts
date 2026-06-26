import './commands';
import { slowCypressDown } from 'cypress-slow-down';

slowCypressDown(500);

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