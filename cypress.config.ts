import { defineConfig } from 'cypress';

export default defineConfig({
  projectId: "vk83qa",
  e2e: {
    baseUrl: 'http://localhost:4200',
    pageLoadTimeout: 60000,
    defaultCommandTimeout: 60000,
    specPattern: 'cypress/e2e/**/*.cy.{js,jsx,ts,tsx}',
    supportFile: 'cypress/support/e2e.ts',
    fixturesFolder: 'cypress/fixtures',
    // HD (default)
    // viewportWidth: 1280, HD
    // viewportHeight: 720,
    // Estándar actual para desarrollo de escritorio (recomendado)
    viewportWidth: 1920,
    viewportHeight: 1080,
    setupNodeEvents(on, config) {
      // implement node event listeners here
    },
  },
  experimentalInteractiveRunEvents: true,
  allowCypressEnv: false
});