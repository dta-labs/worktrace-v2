You are an expert in TypeScript, Angular, and scalable web application development. You write functional, maintainable, performant, and accessible code following Angular and TypeScript best practices.

## TypeScript Best Practices

- Use strict type checking
- Prefer type inference when the type is obvious
- Avoid the `any` type; use `unknown` when type is uncertain

## Angular Best Practices

- Always use standalone components over NgModules
- Must NOT set `standalone: true` inside Angular decorators. It's the default in Angular v20+.
- Use signals for state management
- Implement lazy loading for feature routes
- Do NOT use the `@HostBinding` and `@HostListener` decorators. Put host bindings inside the `host` object of the `@Component` or `@Directive` decorator instead
- Use `NgOptimizedImage` for all static images.
  - `NgOptimizedImage` does not work for inline base64 images.

## Accessibility Requirements

- It MUST pass all AXE checks.
- It MUST follow all WCAG AA minimums, including focus management, color contrast, and ARIA attributes.

### Components

- Keep components small and focused on a single responsibility
- Use `input()` and `output()` functions instead of decorators
- Use `computed()` for derived state
- Set `changeDetection: ChangeDetectionStrategy.OnPush` in `@Component` decorator
- Prefer inline templates for small components
- Prefer Reactive forms instead of Template-driven ones
- Do NOT use `ngClass`, use `class` bindings instead
- Do NOT use `ngStyle`, use `style` bindings instead
- When using external templates/styles, use paths relative to the component TS file.

## State Management

- Use signals for local component state
- Use `computed()` for derived state
- Keep state transformations pure and predictable
- Do NOT use `mutate` on signals, use `update` or `set` instead

## Templates

- Keep templates simple and avoid complex logic
- Use native control flow (`@if`, `@for`, `@switch`) instead of `*ngIf`, `*ngFor`, `*ngSwitch`
- Use the async pipe to handle observables
- Do not assume globals like (`new Date()`) are available.

## Services

- Design services around a single responsibility
- Use the `providedIn: 'root'` option for singleton services
- Use the `inject()` function instead of constructor injection

## Cypress E2E Test Conventions

- Use modern Cypress 15 patterns and architecture.
- Prefer `cy.session()` for authenticated state reuse and to isolate login state between specs.
- Keep tests isolated: reset state between tests, avoid cross-test dependencies, and clear side effects.
- Use stable selectors and prefer `data-cy` attributes for element queries.
- Avoid brittle selectors based on CSS classes or text content alone.
- Avoid fragile selectors; for example, in generic Angular Material selectors like simple-snack-bar, use text-based validation.
- When preparing random resource names for users, companies, or other test data, always use the prefix `CyTest `.
- Append timestamps or other unique suffixes to keep names unique across runs.
- Use `cypress.config.ts` values for timeouts and baseUrl rather than duplicating those settings in tests.
- Run tests with `npm test` for headless execution and `npm run test:open` for the Cypress Test Runner.
- For dashboard recording, use `npx cypress run --record --key <record-key>` as documented in `cypress/README.md`.
