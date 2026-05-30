import type { Job, LumberBatch, Product, Quote } from "./types";

function product(
  id: string,
  stockType: "3/4\"" | "1 1/8\"",
  widthFeet: number,
  heightFeet: number,
  retailPrice: number,
): Product {
  const premium = stockType === "1 1/8\"";
  const thicknessInches = premium ? 1.125 : 0.75;
  const slatWidthInches = premium ? 1.5 : 1.25;
  const verticalSlatCount = Math.max(3, widthFeet + 1);
  const horizontalSlatCount = Math.max(3, heightFeet + 2);
  const estimatedLaborMinutes = Math.round(18 + widthFeet * heightFeet * (premium ? 3.4 : 2.6));

  return {
    id,
    name: `${premium ? "Premium 1 1/8 in" : "Standard 3/4 in"} Redwood Trellis ${widthFeet}' x ${heightFeet}'`,
    dimensions: `${widthFeet}' x ${heightFeet}'`,
    stockType,
    thicknessInches,
    slatWidthInches,
    widthFeet,
    heightFeet,
    verticalSlatCount,
    horizontalSlatCount,
    diagonalBraceCount: premium ? 2 : 1,
    estimatedLaborMinutes,
    retailPrice,
    wholesalePrice: Math.round(retailPrice * 0.72),
    active: true,
  };
}

export const products: Product[] = [
  product("og-2x2", "3/4\"", 2, 2, 32),
  product("og-3x2", "3/4\"", 3, 2, 38),
  product("og-4x2", "3/4\"", 4, 2, 48),
  product("og-5x2", "3/4\"", 5, 2, 58),
  product("og-6x2", "3/4\"", 6, 2, 68),
  product("og-4x3", "3/4\"", 4, 3, 78),
  product("og-5x3", "3/4\"", 5, 3, 92),
  product("og-4x4", "3/4\"", 4, 4, 110),
  product("og-5x4", "3/4\"", 5, 4, 128),
  product("og-6x4", "3/4\"", 6, 4, 168),
  product("pr-4x2", "1 1/8\"", 4, 2, 68),
  product("pr-5x2", "1 1/8\"", 5, 2, 78),
  product("pr-6x2", "1 1/8\"", 6, 2, 92),
  product("pr-4x3", "1 1/8\"", 4, 3, 118),
  product("pr-5x3", "1 1/8\"", 5, 3, 138),
  product("pr-6x3", "1 1/8\"", 6, 3, 158),
  product("pr-4x4", "1 1/8\"", 4, 4, 188),
  product("pr-5x4", "1 1/8\"", 5, 4, 218),
  product("pr-6x4", "1 1/8\"", 6, 4, 278),
];

export const lumberBatches: LumberBatch[] = [];

export const quotes: Quote[] = [];

export const jobs: Job[] = [];
