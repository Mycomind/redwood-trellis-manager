import type { CalculationResult, CalculatorInput, LumberBatch } from "./types";

export function money(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(Number.isFinite(value) ? value : 0);
}

export function numberFormat(value: number, digits = 2) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  }).format(Number.isFinite(value) ? value : 0);
}

export function calculateTrellis(input: CalculatorInput): CalculationResult {
  const verticalFeet = input.heightFeet * input.verticalSlats;
  const horizontalFeet = input.widthFeet * input.horizontalSlats;
  const diagonalFeet =
    Math.sqrt(input.widthFeet ** 2 + input.heightFeet ** 2) * input.diagonalBraces;
  const totalLinearFeet = verticalFeet + horizontalFeet + diagonalFeet;

  const boardFeetUsed =
    (input.thicknessInches * input.slatWidthInches * totalLinearFeet) / 12;
  const wasteAdjustedBoardFeet =
    boardFeetUsed * (1 + input.wastePercentage / 100);
  const materialCost = wasteAdjustedBoardFeet * input.boardFootCost;
  const laborCost = (input.laborMinutes / 60) * input.hourlyLaborRate;
  const totalBuildCost = materialCost + input.hardwareCost + laborCost;
  const retailPrice = totalBuildCost * (1 + input.markupPercentage / 100);
  const wholesalePrice = retailPrice * (1 - input.wholesaleDiscountPercentage / 100);
  const profit = retailPrice - totalBuildCost;
  const marginPercentage = retailPrice > 0 ? (profit / retailPrice) * 100 : 0;

  return {
    totalLinearFeet,
    boardFeetUsed,
    wasteAdjustedBoardFeet,
    materialCost,
    hardwareCost: input.hardwareCost,
    laborCost,
    totalBuildCost,
    wholesalePrice,
    retailPrice,
    profit,
    marginPercentage,
  };
}

export function landedCost(batch: LumberBatch) {
  return batch.unitCost * batch.nominalBoardFeet + batch.fuelTravelCost;
}

export function usableBoardFeet(batch: LumberBatch) {
  return (
    batch.actualUsableBoardFeet ||
    batch.nominalBoardFeet * (batch.estimatedUsablePercentage / 100)
  );
}

export function effectiveBoardFootCost(batch: LumberBatch) {
  const usable = usableBoardFeet(batch);
  return usable > 0 ? landedCost(batch) / usable : 0;
}
