import { Injectable } from '@angular/core';
import { FabricationPiece } from '../models/shop.models';
import { PieceCalculationResult, PieceEngine } from '../models/engine.models';
import { StraightDuctEngine } from './pieces/straight-duct/straight-duct.engine';
import { FallbackPieceEngine } from './pieces/fallback/fallback-piece.engine';

@Injectable({ providedIn: 'root' })
export class PieceEngineRegistryService {
  private readonly engines: PieceEngine[];

  constructor(
    straightDuct: StraightDuctEngine,
    fallback: FallbackPieceEngine
  ) {
    this.engines = [straightDuct, fallback];
  }

  getEngine(piece: FabricationPiece): PieceEngine {
    return this.engines.find(engine => engine.canHandle(piece)) ?? this.engines[this.engines.length - 1];
  }

  calculate(piece: FabricationPiece): PieceCalculationResult {
    return this.getEngine(piece).calculate(piece);
  }
}
