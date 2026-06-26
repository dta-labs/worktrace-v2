import { Injectable } from '@angular/core';
import { FabricationPiece } from '../../models/shop.models';
import { ShopPriceSnapshot } from '../../models/domain.models';
import { DEFAULT_SHOP_PRICE_SNAPSHOT } from '../../libraries/pricing/default-shop-pricing';

export interface FabricationCostSummary {
  sheetMaterialCost: number;
  connectionMaterialCost: number;
  accessoryCost: number;
  laborCost: number;
  machineCost: number;
  manufacturingCost: number;
  wasteCost: number;
  subtotalWithWaste: number;
  overheadCost: number;
  profitCost: number;
  taxCost: number;
  finalFabricationPrice: number;
  currency: string;
  snapshot: ShopPriceSnapshot;
}

@Injectable({ providedIn: 'root' })
export class FabricationCostEngine {
  summarize(pieces: FabricationPiece[], snapshot: ShopPriceSnapshot = DEFAULT_SHOP_PRICE_SNAPSHOT): FabricationCostSummary {
    let sheetMaterialCost = 0;
    let connectionMaterialCost = 0;
    let accessoryCost = 0;
    let laborCost = 0;
    let machineCost = 0;

    for (const piece of pieces) {
      const b = piece.manufacturingBreakdown;
      if (!b) continue;

      const materialKey = `${piece.material}:${piece.gauge}`;
      const materialUnitPrice = snapshot.materialPrices[materialKey] ?? 0;
      sheetMaterialCost += (b.weight.sheetMetalLb || 0) * materialUnitPrice;

      connectionMaterialCost += (b.connectionMaterial.tdfLinearFt || 0) * (snapshot.connectionPrices['TDF'] ?? 0);
      connectionMaterialCost += (b.connectionMaterial.tdcLinearFt || 0) * (snapshot.connectionPrices['TDC'] ?? 0);
      connectionMaterialCost += (b.connectionMaterial.slipPieces || 0) * (snapshot.connectionPrices['Slip'] ?? 0);
      connectionMaterialCost += (b.connectionMaterial.drivePieces || 0) * (snapshot.connectionPrices['Drive'] ?? 0);

      accessoryCost += (b.accessories.corners || 0) * (snapshot.accessoryPrices['corner'] ?? 0);
      accessoryCost += (b.accessories.screws || 0) * (snapshot.accessoryPrices['screw'] ?? 0);
      accessoryCost += (b.accessories.cleats || 0) * (snapshot.accessoryPrices['cleat'] ?? 0);
      accessoryCost += (b.accessories.tieRods || 0) * (snapshot.accessoryPrices['tieRod'] ?? 0);
      accessoryCost += (b.accessories.gClips || 0) * (snapshot.accessoryPrices['gClip'] ?? 0);

      laborCost += ((b.labor.totalMinutes || 0) / 60) * (snapshot.laborRates['fabrication'] ?? 0);
    }

    const manufacturingCost = sheetMaterialCost + connectionMaterialCost + accessoryCost + laborCost + machineCost;
    const wasteCost = manufacturingCost * (snapshot.wastePercent / 100);
    const subtotalWithWaste = manufacturingCost + wasteCost;
    const overheadCost = subtotalWithWaste * (snapshot.overheadPercent / 100);
    const afterOverhead = subtotalWithWaste + overheadCost;
    const profitCost = afterOverhead * (snapshot.profitPercent / 100);
    const afterProfit = afterOverhead + profitCost;
    const taxCost = afterProfit * (snapshot.taxPercent / 100);
    const finalFabricationPrice = afterProfit + taxCost;

    return {
      sheetMaterialCost: this.money(sheetMaterialCost),
      connectionMaterialCost: this.money(connectionMaterialCost),
      accessoryCost: this.money(accessoryCost),
      laborCost: this.money(laborCost),
      machineCost: this.money(machineCost),
      manufacturingCost: this.money(manufacturingCost),
      wasteCost: this.money(wasteCost),
      subtotalWithWaste: this.money(subtotalWithWaste),
      overheadCost: this.money(overheadCost),
      profitCost: this.money(profitCost),
      taxCost: this.money(taxCost),
      finalFabricationPrice: this.money(finalFabricationPrice),
      currency: snapshot.currency,
      snapshot
    };
  }

  private money(value: number): number {
    return Math.round(value * 100) / 100;
  }
}
