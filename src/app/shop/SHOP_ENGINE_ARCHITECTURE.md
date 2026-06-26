# WorkTrace SHOP Engine Architecture v1

This module is built around piece engines, not Angular components.

## V1 scope

- Manual Fabrication Order creation.
- Manual Piece Builder.
- Import/Export TXT remains supported.
- First real piece engine: Rectangular Straight Duct.
- Other pieces continue using the legacy fallback calculator until each dedicated engine is created.

## Rule

No engineering calculation should live in Angular pages/components.

The UI calls services. Services call engines. Engines calculate, validate and return structured results.

## Folder intent

```text
src/app/shop/
  engines/
    pieces/
      straight-duct/
      fallback/
    shared/
  standards/
    smacna/
  models/
  library/
  pages/
  components/
  services/
```

## Piece engine lifecycle

```text
FabricationPiece
  -> PieceEngineRegistry
  -> Dedicated PieceEngine
  -> Geometry / Area / Weight / SMACNA status
  -> UI / PDF / Production
```

## SMACNA implementation rule

A rule can only be marked compliant/non-compliant after the official SMACNA table/reference is entered into the Knowledge Layer. Until then, the engine must return `unverified` instead of pretending compliance.

## Connection Engine

Connection weight, labor and cost are calculated independently from the base sheet metal geometry.

Total weight is structured as:

`sheetWeight + connectionWeight + reinforcementWeight + accessoriesWeight`

The current v8 Connection Engine supports TDF, TDC, S&D, Slip, Drive, Raw Edge and Custom. Values are intentionally marked as `SHOP_PLACEHOLDER` until Sheet Metal Technology enters validated shop data and/or SMACNA-referenced construction data. This keeps the architecture correct without pretending that placeholder values are official.
