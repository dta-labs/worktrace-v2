// Cypress support file for E2E tests
// Import commands.js using ES2015 syntax:
// import './commands'

// Alternatively you can use CommonJS syntax:
// require('./commands')

// Hide fetch/XHR requests in the command log
const app = window.top;

if (!app.document.head.querySelector('[data-hide-command-log-request]')) {
    const style = app.document.createElement('style');
    style.setAttribute('data-hide-command-log-request', '');
    style.innerHTML =
        '.command-name-request, .command-name-xhr { display: none }';
    app.document.head.appendChild(style);
}
