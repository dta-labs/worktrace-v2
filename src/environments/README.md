Strategy for environments:

- Files:
  - environment.ts -> default (development-like)
  - environment.development.ts -> development overrides (used by dev serve)
  - environment.production.ts -> production build (production: true)

- Build:
  - The Angular production build should replace `src/environments/environment.ts`
    with `src/environments/environment.production.ts` via `angular.json`.

- Secrets:
  - Prefer injecting runtime config via environment variables or a `/assets/config.json`
    for truly environment-specific secrets managed by CI/CD.