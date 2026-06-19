import { Injectable } from '@angular/core';
import { FittingDefinition } from '../models/shop.models';

@Injectable({ providedIn: 'root' })
export class FittingLibraryService {
  readonly fittings: FittingDefinition[] = [
  {
    "id": "rectangular-duct",
    "name": "Rectangular Duct",
    "spanishAlias": "Ducto / Sleeve / Cut Piece",
    "category": "Ducts",
    "image": "assets/fittings/rectangular-duct.png",
    "builderKind": "straight",
    "description": "Single rectangular duct family. Use Piece Use to define Duct, Sleeve, or Cut Piece.",
    "buildStatus": "Generated Preview",
    "fields": [
      {
        "key": "width",
        "label": "Width A",
        "unit": "in",
        "defaultValue": 30
      },
      {
        "key": "height",
        "label": "Height B",
        "unit": "in",
        "defaultValue": 12
      },
      {
        "key": "length",
        "label": "Length L",
        "unit": "in",
        "defaultValue": 59
      }
    ]
  },
  {
    "id": "elbow-90",
    "name": "90° Elbow",
    "spanishAlias": "Codo 90°",
    "category": "Elbows",
    "image": "assets/fittings/elbow-90.png",
    "builderKind": "elbow90",
    "description": "90 degree rectangular elbow with editable inlet/outlet necks.",
    "buildStatus": "Generated Preview",
    "fields": [
      {
        "key": "width",
        "label": "Width A",
        "unit": "in",
        "defaultValue": 24
      },
      {
        "key": "height",
        "label": "Height B",
        "unit": "in",
        "defaultValue": 12
      },
      {
        "key": "radius",
        "label": "Inside Radius R",
        "unit": "in",
        "defaultValue": 12
      },
      {
        "key": "angle",
        "label": "Angle",
        "unit": "deg",
        "defaultValue": 90
      },
      {
        "key": "inletNeck",
        "label": "Inlet Neck N1",
        "unit": "in",
        "defaultValue": 6
      },
      {
        "key": "outletNeck",
        "label": "Outlet Neck N2",
        "unit": "in",
        "defaultValue": 6
      }
    ]
  },
  {
    "id": "elbow-45",
    "name": "45° Elbow",
    "spanishAlias": "Codo 45°",
    "category": "Elbows",
    "image": "assets/fittings/elbow-45.png",
    "builderKind": "elbow45",
    "description": "45 degree rectangular elbow with editable inlet/outlet necks.",
    "buildStatus": "Generated Preview",
    "fields": [
      {
        "key": "width",
        "label": "Width A",
        "unit": "in",
        "defaultValue": 24
      },
      {
        "key": "height",
        "label": "Height B",
        "unit": "in",
        "defaultValue": 12
      },
      {
        "key": "radius",
        "label": "Inside Radius R",
        "unit": "in",
        "defaultValue": 12
      },
      {
        "key": "angle",
        "label": "Angle",
        "unit": "deg",
        "defaultValue": 45
      },
      {
        "key": "inletNeck",
        "label": "Inlet Neck N1",
        "unit": "in",
        "defaultValue": 6
      },
      {
        "key": "outletNeck",
        "label": "Outlet Neck N2",
        "unit": "in",
        "defaultValue": 6
      }
    ]
  },
  {
    "id": "transition",
    "name": "Transition",
    "spanishAlias": "Transformación",
    "category": "Transitions",
    "image": "assets/fittings/transition.png",
    "builderKind": "transition",
    "description": "Transition with Centered, Flat, and Offset variants.",
    "buildStatus": "Generated Preview",
    "fields": [
      {
        "key": "widthA",
        "label": "Inlet Width A1",
        "unit": "in",
        "defaultValue": 30
      },
      {
        "key": "heightA",
        "label": "Inlet Height B1",
        "unit": "in",
        "defaultValue": 12
      },
      {
        "key": "widthB",
        "label": "Outlet Width A2",
        "unit": "in",
        "defaultValue": 20
      },
      {
        "key": "heightB",
        "label": "Outlet Height B2",
        "unit": "in",
        "defaultValue": 10
      },
      {
        "key": "length",
        "label": "Length L",
        "unit": "in",
        "defaultValue": 36
      }
    ]
  },
  {
    "id": "taper",
    "name": "Taper / Reducer",
    "spanishAlias": "Reducción",
    "category": "Reducers",
    "image": "assets/fittings/taper.png",
    "builderKind": "transition",
    "description": "Taper/reducer transition.",
    "buildStatus": "Generated Preview",
    "fields": [
      {
        "key": "widthA",
        "label": "Large Width A1",
        "unit": "in",
        "defaultValue": 30
      },
      {
        "key": "heightA",
        "label": "Large Height B1",
        "unit": "in",
        "defaultValue": 12
      },
      {
        "key": "widthB",
        "label": "Small Width A2",
        "unit": "in",
        "defaultValue": 20
      },
      {
        "key": "heightB",
        "label": "Small Height B2",
        "unit": "in",
        "defaultValue": 10
      },
      {
        "key": "length",
        "label": "Length L",
        "unit": "in",
        "defaultValue": 24
      }
    ]
  },
  {
    "id": "offset",
    "name": "Offset",
    "spanishAlias": "Ese",
    "category": "Offsets",
    "image": "assets/fittings/offset.png",
    "builderKind": "offset",
    "description": "Offset fitting.",
    "buildStatus": "Generated Preview",
    "fields": [
      {
        "key": "width",
        "label": "Width A",
        "unit": "in",
        "defaultValue": 24
      },
      {
        "key": "height",
        "label": "Height B",
        "unit": "in",
        "defaultValue": 12
      },
      {
        "key": "length",
        "label": "Length L",
        "unit": "in",
        "defaultValue": 36
      }
    ]
  },
  {
    "id": "canvas-connector",
    "name": "Canvas Connector",
    "spanishAlias": "Lona",
    "category": "Accessories",
    "image": "assets/fittings/canvas-connector.png",
    "builderKind": "generic",
    "description": "Catalog selector image. Geometry builder will be added later.",
    "buildStatus": "Catalog Preview Only",
    "fields": [
      {
        "key": "width",
        "label": "Width A",
        "unit": "in",
        "defaultValue": 24
      },
      {
        "key": "height",
        "label": "Height B",
        "unit": "in",
        "defaultValue": 12
      },
      {
        "key": "length",
        "label": "Length L",
        "unit": "in",
        "defaultValue": 24
      }
    ]
  },
  {
    "id": "square-elbow",
    "name": "Square Elbow",
    "spanishAlias": "Codo cuadrado",
    "category": "Elbows",
    "image": "assets/fittings/square-elbow.png",
    "builderKind": "generic",
    "description": "Catalog selector image. Geometry builder will be added later.",
    "buildStatus": "Catalog Preview Only",
    "fields": [
      {
        "key": "width",
        "label": "Width A",
        "unit": "in",
        "defaultValue": 24
      },
      {
        "key": "height",
        "label": "Height B",
        "unit": "in",
        "defaultValue": 12
      },
      {
        "key": "length",
        "label": "Length L",
        "unit": "in",
        "defaultValue": 24
      },
      {
        "key": "inletNeck",
        "label": "Inlet Neck N1",
        "unit": "in",
        "defaultValue": 6
      },
      {
        "key": "outletNeck",
        "label": "Outlet Neck N2",
        "unit": "in",
        "defaultValue": 6
      }
    ]
  },
  {
    "id": "radius-bend",
    "name": "Radius Bend",
    "spanishAlias": "Codo radio",
    "category": "Elbows",
    "image": "assets/fittings/radius-bend.png",
    "builderKind": "generic",
    "description": "Catalog selector image. Geometry builder will be added later.",
    "buildStatus": "Catalog Preview Only",
    "fields": [
      {
        "key": "width",
        "label": "Width A",
        "unit": "in",
        "defaultValue": 24
      },
      {
        "key": "height",
        "label": "Height B",
        "unit": "in",
        "defaultValue": 12
      },
      {
        "key": "length",
        "label": "Length L",
        "unit": "in",
        "defaultValue": 24
      },
      {
        "key": "inletNeck",
        "label": "Inlet Neck N1",
        "unit": "in",
        "defaultValue": 6
      },
      {
        "key": "outletNeck",
        "label": "Outlet Neck N2",
        "unit": "in",
        "defaultValue": 6
      }
    ]
  },
  {
    "id": "radius-offset",
    "name": "Radius Offset",
    "spanishAlias": "Offset radio",
    "category": "Offsets",
    "image": "assets/fittings/radius-offset.png",
    "builderKind": "generic",
    "description": "Catalog selector image. Geometry builder will be added later.",
    "buildStatus": "Catalog Preview Only",
    "fields": [
      {
        "key": "width",
        "label": "Width A",
        "unit": "in",
        "defaultValue": 24
      },
      {
        "key": "height",
        "label": "Height B",
        "unit": "in",
        "defaultValue": 12
      },
      {
        "key": "length",
        "label": "Length L",
        "unit": "in",
        "defaultValue": 24
      }
    ]
  },
  {
    "id": "radius-taper",
    "name": "Radius Taper",
    "spanishAlias": "Codo reducción radio",
    "category": "Reducers",
    "image": "assets/fittings/radius-taper.png",
    "builderKind": "generic",
    "description": "Catalog selector image. Geometry builder will be added later.",
    "buildStatus": "Catalog Preview Only",
    "fields": [
      {
        "key": "width",
        "label": "Width A",
        "unit": "in",
        "defaultValue": 24
      },
      {
        "key": "height",
        "label": "Height B",
        "unit": "in",
        "defaultValue": 12
      },
      {
        "key": "length",
        "label": "Length L",
        "unit": "in",
        "defaultValue": 24
      }
    ]
  },
  {
    "id": "segment-bend",
    "name": "Segment Bend",
    "spanishAlias": "Codo segmentos",
    "category": "Elbows",
    "image": "assets/fittings/segment-bend.png",
    "builderKind": "generic",
    "description": "Catalog selector image. Geometry builder will be added later.",
    "buildStatus": "Catalog Preview Only",
    "fields": [
      {
        "key": "width",
        "label": "Width A",
        "unit": "in",
        "defaultValue": 24
      },
      {
        "key": "height",
        "label": "Height B",
        "unit": "in",
        "defaultValue": 12
      },
      {
        "key": "length",
        "label": "Length L",
        "unit": "in",
        "defaultValue": 24
      }
    ]
  },
  {
    "id": "offset-transition",
    "name": "Offset Transition",
    "spanishAlias": "Transformación con desvío",
    "category": "Transitions",
    "image": "assets/fittings/offset-transition.png",
    "builderKind": "generic",
    "description": "Catalog selector image. Geometry builder will be added later.",
    "buildStatus": "Catalog Preview Only",
    "fields": [
      {
        "key": "width",
        "label": "Width A",
        "unit": "in",
        "defaultValue": 24
      },
      {
        "key": "height",
        "label": "Height B",
        "unit": "in",
        "defaultValue": 12
      },
      {
        "key": "length",
        "label": "Length L",
        "unit": "in",
        "defaultValue": 24
      }
    ]
  },
  {
    "id": "transformed-offset",
    "name": "Transformed Offset",
    "spanishAlias": "Ese transformada",
    "category": "Offsets",
    "image": "assets/fittings/transformed-offset.png",
    "builderKind": "generic",
    "description": "Catalog selector image. Geometry builder will be added later.",
    "buildStatus": "Catalog Preview Only",
    "fields": [
      {
        "key": "width",
        "label": "Width A",
        "unit": "in",
        "defaultValue": 24
      },
      {
        "key": "height",
        "label": "Height B",
        "unit": "in",
        "defaultValue": 12
      },
      {
        "key": "length",
        "label": "Length L",
        "unit": "in",
        "defaultValue": 24
      }
    ]
  },
  {
    "id": "pyramid",
    "name": "Pyramid",
    "spanishAlias": "Pirámide",
    "category": "Transitions",
    "image": "assets/fittings/pyramid.png",
    "builderKind": "generic",
    "description": "Catalog selector image. Geometry builder will be added later.",
    "buildStatus": "Catalog Preview Only",
    "fields": [
      {
        "key": "width",
        "label": "Width A",
        "unit": "in",
        "defaultValue": 24
      },
      {
        "key": "height",
        "label": "Height B",
        "unit": "in",
        "defaultValue": 12
      },
      {
        "key": "length",
        "label": "Length L",
        "unit": "in",
        "defaultValue": 24
      }
    ]
  },
  {
    "id": "square-to-round",
    "name": "Square to Round",
    "spanishAlias": "Redondo cuadrado",
    "category": "Transitions",
    "image": "assets/fittings/square-to-round.png",
    "builderKind": "generic",
    "description": "Catalog selector image. Geometry builder will be added later.",
    "buildStatus": "Catalog Preview Only",
    "fields": [
      {
        "key": "width",
        "label": "Width A",
        "unit": "in",
        "defaultValue": 24
      },
      {
        "key": "height",
        "label": "Height B",
        "unit": "in",
        "defaultValue": 12
      },
      {
        "key": "length",
        "label": "Length L",
        "unit": "in",
        "defaultValue": 24
      }
    ]
  },
  {
    "id": "square-to-round-boot",
    "name": "Square to Round Boot",
    "spanishAlias": "Cuadrado a redondo boot",
    "category": "Boots",
    "image": "assets/fittings/square-to-round-boot.png",
    "builderKind": "generic",
    "description": "Catalog selector image. Geometry builder will be added later.",
    "buildStatus": "Catalog Preview Only",
    "fields": [
      {
        "key": "width",
        "label": "Width A",
        "unit": "in",
        "defaultValue": 24
      },
      {
        "key": "height",
        "label": "Height B",
        "unit": "in",
        "defaultValue": 12
      },
      {
        "key": "length",
        "label": "Length L",
        "unit": "in",
        "defaultValue": 24
      }
    ]
  },
  {
    "id": "square-to-round-offset",
    "name": "Square to Round Offset",
    "spanishAlias": "Cuadrado redondo offset",
    "category": "Transitions",
    "image": "assets/fittings/square-to-round-offset.png",
    "builderKind": "generic",
    "description": "Catalog selector image. Geometry builder will be added later.",
    "buildStatus": "Catalog Preview Only",
    "fields": [
      {
        "key": "width",
        "label": "Width A",
        "unit": "in",
        "defaultValue": 24
      },
      {
        "key": "height",
        "label": "Height B",
        "unit": "in",
        "defaultValue": 12
      },
      {
        "key": "length",
        "label": "Length L",
        "unit": "in",
        "defaultValue": 24
      }
    ]
  },
  {
    "id": "round-to-rectangular-transition",
    "name": "Round to Rectangular Transition",
    "spanishAlias": "Redondo a rectangular",
    "category": "Transitions",
    "image": "assets/fittings/round-to-rectangular-transition.png",
    "builderKind": "generic",
    "description": "Catalog selector image. Geometry builder will be added later.",
    "buildStatus": "Catalog Preview Only",
    "fields": [
      {
        "key": "width",
        "label": "Width A",
        "unit": "in",
        "defaultValue": 24
      },
      {
        "key": "height",
        "label": "Height B",
        "unit": "in",
        "defaultValue": 12
      },
      {
        "key": "length",
        "label": "Length L",
        "unit": "in",
        "defaultValue": 24
      }
    ]
  },
  {
    "id": "round-offset",
    "name": "Round Offset",
    "spanishAlias": "Offset redondo",
    "category": "Offsets",
    "image": "assets/fittings/round-offset.png",
    "builderKind": "generic",
    "description": "Catalog selector image. Geometry builder will be added later.",
    "buildStatus": "Catalog Preview Only",
    "fields": [
      {
        "key": "width",
        "label": "Width A",
        "unit": "in",
        "defaultValue": 24
      },
      {
        "key": "height",
        "label": "Height B",
        "unit": "in",
        "defaultValue": 12
      },
      {
        "key": "length",
        "label": "Length L",
        "unit": "in",
        "defaultValue": 24
      }
    ]
  },
  {
    "id": "reducer-offset",
    "name": "Reducer Offset",
    "spanishAlias": "Reducción offset",
    "category": "Reducers",
    "image": "assets/fittings/reducer-offset.png",
    "builderKind": "generic",
    "description": "Catalog selector image. Geometry builder will be added later.",
    "buildStatus": "Catalog Preview Only",
    "fields": [
      {
        "key": "width",
        "label": "Width A",
        "unit": "in",
        "defaultValue": 24
      },
      {
        "key": "height",
        "label": "Height B",
        "unit": "in",
        "defaultValue": 12
      },
      {
        "key": "length",
        "label": "Length L",
        "unit": "in",
        "defaultValue": 24
      }
    ]
  },
  {
    "id": "tee-branch",
    "name": "Tee Branch",
    "spanishAlias": "Paloma T",
    "category": "Branches",
    "image": "assets/fittings/tee-branch.png",
    "builderKind": "generic",
    "description": "Catalog selector image. Geometry builder will be added later.",
    "buildStatus": "Catalog Preview Only",
    "fields": [
      {
        "key": "width",
        "label": "Width A",
        "unit": "in",
        "defaultValue": 24
      },
      {
        "key": "height",
        "label": "Height B",
        "unit": "in",
        "defaultValue": 12
      },
      {
        "key": "length",
        "label": "Length L",
        "unit": "in",
        "defaultValue": 24
      }
    ]
  },
  {
    "id": "wye-branch",
    "name": "Wye Branch",
    "spanishAlias": "Paloma",
    "category": "Branches",
    "image": "assets/fittings/wye-branch.png",
    "builderKind": "generic",
    "description": "Catalog selector image. Geometry builder will be added later.",
    "buildStatus": "Catalog Preview Only",
    "fields": [
      {
        "key": "width",
        "label": "Width A",
        "unit": "in",
        "defaultValue": 24
      },
      {
        "key": "height",
        "label": "Height B",
        "unit": "in",
        "defaultValue": 12
      },
      {
        "key": "length",
        "label": "Length L",
        "unit": "in",
        "defaultValue": 24
      }
    ]
  },
  {
    "id": "duct-wye",
    "name": "Duct Wye",
    "spanishAlias": "Paloma ducto",
    "category": "Branches",
    "image": "assets/fittings/duct-wye.png",
    "builderKind": "generic",
    "description": "Catalog selector image. Geometry builder will be added later.",
    "buildStatus": "Catalog Preview Only",
    "fields": [
      {
        "key": "width",
        "label": "Width A",
        "unit": "in",
        "defaultValue": 24
      },
      {
        "key": "height",
        "label": "Height B",
        "unit": "in",
        "defaultValue": 12
      },
      {
        "key": "length",
        "label": "Length L",
        "unit": "in",
        "defaultValue": 24
      }
    ]
  },
  {
    "id": "transformed-wye",
    "name": "Transformed Wye",
    "spanishAlias": "Paloma transformada",
    "category": "Branches",
    "image": "assets/fittings/transformed-wye.png",
    "builderKind": "generic",
    "description": "Catalog selector image. Geometry builder will be added later.",
    "buildStatus": "Catalog Preview Only",
    "fields": [
      {
        "key": "width",
        "label": "Width A",
        "unit": "in",
        "defaultValue": 24
      },
      {
        "key": "height",
        "label": "Height B",
        "unit": "in",
        "defaultValue": 12
      },
      {
        "key": "length",
        "label": "Length L",
        "unit": "in",
        "defaultValue": 24
      }
    ]
  },
  {
    "id": "different-radius-wye",
    "name": "Different Radius Wye",
    "spanishAlias": "Paloma diferente radio",
    "category": "Branches",
    "image": "assets/fittings/different-radius-wye.png",
    "builderKind": "generic",
    "description": "Catalog selector image. Geometry builder will be added later.",
    "buildStatus": "Catalog Preview Only",
    "fields": [
      {
        "key": "width",
        "label": "Width A",
        "unit": "in",
        "defaultValue": 24
      },
      {
        "key": "height",
        "label": "Height B",
        "unit": "in",
        "defaultValue": 12
      },
      {
        "key": "length",
        "label": "Length L",
        "unit": "in",
        "defaultValue": 24
      }
    ]
  },
  {
    "id": "triple-branch",
    "name": "Triple Branch",
    "spanishAlias": "Triple",
    "category": "Branches",
    "image": "assets/fittings/triple-branch.png",
    "builderKind": "generic",
    "description": "Catalog selector image. Geometry builder will be added later.",
    "buildStatus": "Catalog Preview Only",
    "fields": [
      {
        "key": "width",
        "label": "Width A",
        "unit": "in",
        "defaultValue": 24
      },
      {
        "key": "height",
        "label": "Height B",
        "unit": "in",
        "defaultValue": 12
      },
      {
        "key": "length",
        "label": "Length L",
        "unit": "in",
        "defaultValue": 24
      }
    ]
  },
  {
    "id": "side-branch",
    "name": "Side Branch",
    "spanishAlias": "Side branch",
    "category": "Branches",
    "image": "assets/fittings/side-branch.png",
    "builderKind": "generic",
    "description": "Catalog selector image. Geometry builder will be added later.",
    "buildStatus": "Catalog Preview Only",
    "fields": [
      {
        "key": "width",
        "label": "Width A",
        "unit": "in",
        "defaultValue": 24
      },
      {
        "key": "height",
        "label": "Height B",
        "unit": "in",
        "defaultValue": 12
      },
      {
        "key": "length",
        "label": "Length L",
        "unit": "in",
        "defaultValue": 24
      }
    ]
  },
  {
    "id": "breeches-piece",
    "name": "Breeches Piece",
    "spanishAlias": "Breeches / paloma",
    "category": "Branches",
    "image": "assets/fittings/breeches-piece.png",
    "builderKind": "generic",
    "description": "Catalog selector image. Geometry builder will be added later.",
    "buildStatus": "Catalog Preview Only",
    "fields": [
      {
        "key": "width",
        "label": "Width A",
        "unit": "in",
        "defaultValue": 24
      },
      {
        "key": "height",
        "label": "Height B",
        "unit": "in",
        "defaultValue": 12
      },
      {
        "key": "length",
        "label": "Length L",
        "unit": "in",
        "defaultValue": 24
      }
    ]
  },
  {
    "id": "shoe-tap",
    "name": "Shoe Tap",
    "spanishAlias": "Zapata / Flat Tap",
    "category": "Branches",
    "image": "assets/fittings/shoe-tap.png",
    "builderKind": "generic",
    "description": "Catalog selector image. Geometry builder will be added later.",
    "buildStatus": "Catalog Preview Only",
    "fields": [
      {
        "key": "width",
        "label": "Width A",
        "unit": "in",
        "defaultValue": 24
      },
      {
        "key": "height",
        "label": "Height B",
        "unit": "in",
        "defaultValue": 12
      },
      {
        "key": "length",
        "label": "Length L",
        "unit": "in",
        "defaultValue": 24
      }
    ]
  },
  {
    "id": "shoe-on-flat",
    "name": "Shoe on Flat",
    "spanishAlias": "Zapata en plano",
    "category": "Branches",
    "image": "assets/fittings/shoe-on-flat.png",
    "builderKind": "generic",
    "description": "Catalog selector image. Geometry builder will be added later.",
    "buildStatus": "Catalog Preview Only",
    "fields": [
      {
        "key": "width",
        "label": "Width A",
        "unit": "in",
        "defaultValue": 24
      },
      {
        "key": "height",
        "label": "Height B",
        "unit": "in",
        "defaultValue": 12
      },
      {
        "key": "length",
        "label": "Length L",
        "unit": "in",
        "defaultValue": 24
      }
    ]
  },
  {
    "id": "tee-saddle-45",
    "name": "45 Tee Saddle",
    "spanishAlias": "Tee saddle 45",
    "category": "Branches",
    "image": "assets/fittings/tee-saddle-45.png",
    "builderKind": "generic",
    "description": "Catalog selector image. Geometry builder will be added later.",
    "buildStatus": "Catalog Preview Only",
    "fields": [
      {
        "key": "width",
        "label": "Width A",
        "unit": "in",
        "defaultValue": 24
      },
      {
        "key": "height",
        "label": "Height B",
        "unit": "in",
        "defaultValue": 12
      },
      {
        "key": "length",
        "label": "Length L",
        "unit": "in",
        "defaultValue": 24
      }
    ]
  },
  {
    "id": "end-cap",
    "name": "End Cap",
    "spanishAlias": "Tapa",
    "category": "Caps",
    "image": "assets/fittings/end-cap.png",
    "builderKind": "generic",
    "description": "Catalog selector image. Geometry builder will be added later.",
    "buildStatus": "Catalog Preview Only",
    "fields": [
      {
        "key": "width",
        "label": "Width A",
        "unit": "in",
        "defaultValue": 24
      },
      {
        "key": "height",
        "label": "Height B",
        "unit": "in",
        "defaultValue": 12
      },
      {
        "key": "length",
        "label": "Length L",
        "unit": "in",
        "defaultValue": 24
      }
    ]
  },
  {
    "id": "grille-box-multiple",
    "name": "Grille Box Multiple Entry",
    "spanishAlias": "Caja difusor múltiple",
    "category": "Boxes",
    "image": "assets/fittings/grille-box-multiple.png",
    "builderKind": "generic",
    "description": "Catalog selector image. Geometry builder will be added later.",
    "buildStatus": "Catalog Preview Only",
    "fields": [
      {
        "key": "width",
        "label": "Width A",
        "unit": "in",
        "defaultValue": 24
      },
      {
        "key": "height",
        "label": "Height B",
        "unit": "in",
        "defaultValue": 12
      },
      {
        "key": "length",
        "label": "Length L",
        "unit": "in",
        "defaultValue": 24
      }
    ]
  },
  {
    "id": "grille-box-top",
    "name": "Grille Box Top Entry",
    "spanishAlias": "Caja difusor collarín",
    "category": "Boxes",
    "image": "assets/fittings/grille-box-top.png",
    "builderKind": "generic",
    "description": "Catalog selector image. Geometry builder will be added later.",
    "buildStatus": "Catalog Preview Only",
    "fields": [
      {
        "key": "width",
        "label": "Width A",
        "unit": "in",
        "defaultValue": 24
      },
      {
        "key": "height",
        "label": "Height B",
        "unit": "in",
        "defaultValue": 12
      },
      {
        "key": "length",
        "label": "Length L",
        "unit": "in",
        "defaultValue": 24
      }
    ]
  },
  {
    "id": "grille-box-variable",
    "name": "Grille Box Variable Hole",
    "spanishAlias": "Caja difusor hueco variable",
    "category": "Boxes",
    "image": "assets/fittings/grille-box-variable.png",
    "builderKind": "generic",
    "description": "Catalog selector image. Geometry builder will be added later.",
    "buildStatus": "Catalog Preview Only",
    "fields": [
      {
        "key": "width",
        "label": "Width A",
        "unit": "in",
        "defaultValue": 24
      },
      {
        "key": "height",
        "label": "Height B",
        "unit": "in",
        "defaultValue": 12
      },
      {
        "key": "length",
        "label": "Length L",
        "unit": "in",
        "defaultValue": 24
      }
    ]
  },
  {
    "id": "floor-pan",
    "name": "Floor Pan",
    "spanishAlias": "Bandeja de piso",
    "category": "Accessories",
    "image": "assets/fittings/floor-pan.png",
    "builderKind": "generic",
    "description": "Catalog selector image. Geometry builder will be added later.",
    "buildStatus": "Catalog Preview Only",
    "fields": [
      {
        "key": "width",
        "label": "Width A",
        "unit": "in",
        "defaultValue": 24
      },
      {
        "key": "height",
        "label": "Height B",
        "unit": "in",
        "defaultValue": 12
      },
      {
        "key": "length",
        "label": "Length L",
        "unit": "in",
        "defaultValue": 24
      }
    ]
  }
] as FittingDefinition[];

  categories = ['All', 'Ducts', 'Elbows', 'Transitions', 'Offsets', 'Reducers', 'Branches', 'Caps', 'Boxes', 'Boots', 'Accessories'];

  search(category: string, query: string): FittingDefinition[] {
    const q = query.trim().toLowerCase();
    return this.fittings.filter(f =>
      (category === 'All' || f.category === category) &&
      (!q || `${f.name} ${f.category} ${f.spanishAlias}`.toLowerCase().includes(q))
    );
  }
}
