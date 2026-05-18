# WorkTrace Visual System Foundation

This folder defines the visual foundation for future UI unification without forcing immediate adoption.

## Included layers

- `_tokens.scss`: design tokens, spacing, radius, colors, density, layout widths
- `_themes.scss`: theme presets (dark, light, steel, midnight, contrast) and density presets
- `_primitives.scss`: page, card, title, action primitives
- `_components.scss`: buttons, fields, chips, grids, tables, tabs
- `_utilities.scss`: optional utility classes

## Important

- All classes are **opt-in** and prefixed with `wtv-`
- No runtime logic was added
- No current screens were migrated
- Themes activate only if some future code sets `body[data-theme="..."]`
- Density activates only if some future code sets `body[data-density="..."]`

## Recommended future rollout

1. Map existing screens to `page / form / table / dashboard`
2. Adopt `wtv-card`, `wtv-grid`, `wtv-table-shell`, `wtv-btn`
3. Then add user-level appearance preferences
