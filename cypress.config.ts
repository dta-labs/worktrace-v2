import { defineConfig } from 'cypress';

export default defineConfig({
    e2e: {
        baseUrl: 'http://localhost:4200',
        pageLoadTimeout: 120000,
        defaultCommandTimeout: 120000,
        specPattern: 'cypress/e2e/**/*.cy.{js,jsx,ts,tsx}',
        supportFile: 'cypress/support/e2e.ts',
        fixturesFolder: 'cypress/fixtures',
        setupNodeEvents(on, config) {
            // implement node event listeners here
        },
    },
});