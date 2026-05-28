export type TrellisStyle = "Open Grid" | "Fan" | "Custom";
export type StockType = "3/4\"" | "1 1/8\"";
export type QuoteStatus = "draft" | "sent" | "accepted" | "declined";
export type JobStatus =
  | "new"
  | "quoted"
  | "deposit paid"
  | "building"
  | "ready"
  | "delivered"
  | "paid";

export type CalculatorInput = {
  style: TrellisStyle;
  stockType: StockType;
  thicknessInches: number;
  slatWidthInches: number;
  widthFeet: number;
  heightFeet: number;
  verticalSlats: number;
  horizontalSlats: number;
  diagonalBraces: number;
  boardFootCost: number;
  wastePercentage: number;
  hardwareCost: number;
  laborMinutes: number;
  hourlyLaborRate: number;
  markupPercentage: number;
  wholesaleDiscountPercentage: number;
};

export type CalculationResult = {
  totalLinearFeet: number;
  boardFeetUsed: number;
  wasteAdjustedBoardFeet: number;
  materialCost: number;
  hardwareCost: number;
  laborCost: number;
  totalBuildCost: number;
  wholesalePrice: number;
  retailPrice: number;
  profit: number;
  marginPercentage: number;
};

export type Product = {
  id: string;
  name: string;
  dimensions: string;
  stockType: StockType;
  thicknessInches: number;
  slatWidthInches: number;
  widthFeet: number;
  heightFeet: number;
  verticalSlatCount: number;
  horizontalSlatCount: number;
  diagonalBraceCount: number;
  estimatedLaborMinutes: number;
  retailPrice: number;
  wholesalePrice: number;
  active: boolean;
};

export type LumberBatch = {
  id: string;
  supplierName: string;
  woodType: string;
  unitCost: number;
  nominalBoardFeet: number;
  fuelTravelCost: number;
  estimatedUsablePercentage: number;
  actualUsableBoardFeet: number;
  notes: string;
};

export type Quote = {
  id: string;
  customerName: string;
  phone: string;
  email: string;
  productId: string;
  quantity: number;
  customDimensions: string;
  calculatedCost: number;
  quotedPrice: number;
  depositAmount: number;
  notes: string;
  validUntil: string;
  status: QuoteStatus;
};

export type Job = {
  id: string;
  customerName: string;
  productId: string;
  quoteId: string;
  status: JobStatus;
  dueDate: string;
  balanceOwed: number;
  notes: string;
};

export type ShopSettings = {
  defaultBoardFootCost: number;
  defaultWastePercentage: number;
  defaultHardwareCost: number;
  defaultHourlyLaborRate: number;
  defaultMarkupPercentage: number;
  defaultWholesaleDiscountPercentage: number;
};
