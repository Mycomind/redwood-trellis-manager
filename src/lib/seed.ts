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
    name: `${stockType} ${premium ? "Premium" : "Open Grid"} Trellis ${widthFeet}' x ${heightFeet}'`,
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

export const lumberBatches: LumberBatch[] = [
  {
    id: "batch-rough-redwood-1",
    supplierName: "Humboldt Salvage Yard",
    woodType: "Rough redwood",
    unitCost: 4.85,
    nominalBoardFeet: 180,
    fuelTravelCost: 64,
    estimatedUsablePercentage: 72,
    actualUsableBoardFeet: 132,
    notes: "Good color, several bowed boards culled.",
  },
  {
    id: "batch-clear-redwood-1",
    supplierName: "Local Mill",
    woodType: "Clear redwood offcuts",
    unitCost: 6.25,
    nominalBoardFeet: 96,
    fuelTravelCost: 22,
    estimatedUsablePercentage: 86,
    actualUsableBoardFeet: 84,
    notes: "Best stock for premium trellises.",
  },
];

export const quotes: Quote[] = [
  {
    id: "quote-1001",
    customerName: "Maria Lopez",
    phone: "(707) 555-0132",
    email: "maria@example.com",
    productId: "og-5x3",
    quantity: 3,
    customDimensions: "",
    calculatedCost: 162,
    quotedPrice: 276,
    depositAmount: 100,
    notes: "Pickup next week if accepted.",
    validUntil: "2026-06-15",
    status: "sent",
  },
  {
    id: "quote-1002",
    customerName: "Green Acres Nursery",
    phone: "(707) 555-0198",
    email: "orders@greenacres.example",
    productId: "pr-6x4",
    quantity: 4,
    customDimensions: "",
    calculatedCost: 584,
    quotedPrice: 1112,
    depositAmount: 300,
    notes: "Wholesale repeat customer.",
    validUntil: "2026-06-20",
    status: "accepted",
  },
];

export const jobs: Job[] = [
  {
    id: "job-2001",
    customerName: "Green Acres Nursery",
    productId: "pr-6x4",
    quoteId: "quote-1002",
    status: "deposit paid",
    dueDate: "2026-06-12",
    balanceOwed: 812,
    notes: "Mill premium slats first.",
  },
  {
    id: "job-2002",
    customerName: "Maria Lopez",
    productId: "og-5x3",
    quoteId: "quote-1001",
    status: "quoted",
    dueDate: "2026-06-18",
    balanceOwed: 276,
    notes: "Waiting for confirmation.",
  },
];
