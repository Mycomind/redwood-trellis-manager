import { getSupabaseClient } from "./supabase";
import type { Job, LumberBatch, Product, Quote, ShopSettings } from "./types";

type ProductRow = {
  id: string;
  name: string;
  dimensions: string;
  stock_type: Product["stockType"];
  thickness_inches: number;
  slat_width_inches: number;
  width_feet: number;
  height_feet: number;
  vertical_slat_count: number;
  horizontal_slat_count: number;
  diagonal_brace_count: number;
  estimated_labor_minutes: number;
  retail_price: number;
  wholesale_price: number;
  active: boolean;
};

type LumberBatchRow = {
  id: string;
  supplier_name: string;
  wood_type: string;
  unit_cost: number;
  nominal_board_feet: number;
  fuel_travel_cost: number;
  estimated_usable_percentage: number;
  actual_usable_board_feet: number | null;
  notes: string;
};

type QuoteRow = {
  id: string;
  customer_name: string;
  phone: string;
  email: string;
  product_id: string;
  quantity: number;
  custom_dimensions: string;
  calculated_cost: number;
  quoted_price: number;
  deposit_amount: number;
  notes: string;
  valid_until: string;
  status: Quote["status"];
};

type JobRow = {
  id: string;
  customer_name: string;
  product_id: string;
  quote_id: string | null;
  status: Job["status"];
  due_date: string;
  balance_owed: number;
  notes: string;
};

type ShopSettingsRow = {
  id: string;
  default_board_foot_cost: number;
  default_waste_percentage: number;
  default_hardware_cost: number;
  default_hourly_labor_rate: number;
  default_markup_percentage: number;
  default_wholesale_discount_percentage: number;
};

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function productFromRow(row: ProductRow): Product {
  return {
    id: row.id,
    name: row.name,
    dimensions: row.dimensions,
    stockType: row.stock_type,
    thicknessInches: row.thickness_inches,
    slatWidthInches: row.slat_width_inches,
    widthFeet: row.width_feet,
    heightFeet: row.height_feet,
    verticalSlatCount: row.vertical_slat_count,
    horizontalSlatCount: row.horizontal_slat_count,
    diagonalBraceCount: row.diagonal_brace_count,
    estimatedLaborMinutes: row.estimated_labor_minutes,
    retailPrice: row.retail_price,
    wholesalePrice: row.wholesale_price,
    active: row.active,
  };
}

function productToRow(product: Product): ProductRow {
  return {
    id: product.id,
    name: product.name,
    dimensions: product.dimensions,
    stock_type: product.stockType,
    thickness_inches: product.thicknessInches,
    slat_width_inches: product.slatWidthInches,
    width_feet: product.widthFeet,
    height_feet: product.heightFeet,
    vertical_slat_count: product.verticalSlatCount,
    horizontal_slat_count: product.horizontalSlatCount,
    diagonal_brace_count: product.diagonalBraceCount,
    estimated_labor_minutes: product.estimatedLaborMinutes,
    retail_price: product.retailPrice,
    wholesale_price: product.wholesalePrice,
    active: product.active,
  };
}

function lumberFromRow(row: LumberBatchRow): LumberBatch {
  return {
    id: row.id,
    supplierName: row.supplier_name,
    woodType: row.wood_type,
    unitCost: row.unit_cost,
    nominalBoardFeet: row.nominal_board_feet,
    fuelTravelCost: row.fuel_travel_cost,
    estimatedUsablePercentage: row.estimated_usable_percentage,
    actualUsableBoardFeet: row.actual_usable_board_feet ?? 0,
    notes: row.notes,
  };
}

function lumberToRow(batch: LumberBatch, includeId = false) {
  const row = {
    id: batch.id,
    supplier_name: batch.supplierName,
    wood_type: batch.woodType,
    unit_cost: batch.unitCost,
    nominal_board_feet: batch.nominalBoardFeet,
    fuel_travel_cost: batch.fuelTravelCost,
    estimated_usable_percentage: batch.estimatedUsablePercentage,
    actual_usable_board_feet: batch.actualUsableBoardFeet || null,
    notes: batch.notes,
  };

  if (includeId) {
    return row;
  }

  const insertRow: Omit<typeof row, "id"> & { id?: string } = { ...row };
  delete insertRow.id;
  return insertRow;
}

function quoteFromRow(row: QuoteRow): Quote {
  return {
    id: row.id,
    customerName: row.customer_name,
    phone: row.phone,
    email: row.email,
    productId: row.product_id,
    quantity: row.quantity,
    customDimensions: row.custom_dimensions,
    calculatedCost: row.calculated_cost,
    quotedPrice: row.quoted_price,
    depositAmount: row.deposit_amount,
    notes: row.notes,
    validUntil: row.valid_until,
    status: row.status,
  };
}

function quoteToRow(quote: Quote) {
  return {
    customer_name: quote.customerName,
    phone: quote.phone,
    email: quote.email,
    product_id: quote.productId,
    quantity: quote.quantity,
    custom_dimensions: quote.customDimensions,
    calculated_cost: quote.calculatedCost,
    quoted_price: quote.quotedPrice,
    deposit_amount: quote.depositAmount,
    notes: quote.notes,
    valid_until: quote.validUntil,
    status: quote.status,
  };
}

function jobFromRow(row: JobRow): Job {
  return {
    id: row.id,
    customerName: row.customer_name,
    productId: row.product_id,
    quoteId: row.quote_id ?? "",
    status: row.status,
    dueDate: row.due_date,
    balanceOwed: row.balance_owed,
    notes: row.notes,
  };
}

function jobToRow(job: Job) {
  return {
    customer_name: job.customerName,
    product_id: job.productId,
    quote_id: isUuid(job.quoteId) ? job.quoteId : null,
    status: job.status,
    due_date: job.dueDate,
    balance_owed: job.balanceOwed,
    notes: job.notes,
  };
}

function settingsFromRow(row: ShopSettingsRow): ShopSettings {
  return {
    defaultBoardFootCost: row.default_board_foot_cost,
    defaultWastePercentage: row.default_waste_percentage,
    defaultHardwareCost: row.default_hardware_cost,
    defaultHourlyLaborRate: row.default_hourly_labor_rate,
    defaultMarkupPercentage: row.default_markup_percentage,
    defaultWholesaleDiscountPercentage: row.default_wholesale_discount_percentage,
  };
}

function settingsToRow(settings: ShopSettings): ShopSettingsRow {
  return {
    id: "default",
    default_board_foot_cost: settings.defaultBoardFootCost,
    default_waste_percentage: settings.defaultWastePercentage,
    default_hardware_cost: settings.defaultHardwareCost,
    default_hourly_labor_rate: settings.defaultHourlyLaborRate,
    default_markup_percentage: settings.defaultMarkupPercentage,
    default_wholesale_discount_percentage: settings.defaultWholesaleDiscountPercentage,
  };
}

export function hasSupabaseConfig() {
  return Boolean(getSupabaseClient());
}

export async function loadSupabaseData() {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return null;
  }

  const [productResult, lumberResult, quoteResult, jobResult, settingsResult] = await Promise.all([
    supabase.from("products").select("*").order("stock_type").order("width_feet").order("height_feet"),
    supabase.from("lumber_batches").select("*").order("created_at", { ascending: false }),
    supabase.from("quotes").select("*").order("created_at", { ascending: false }),
    supabase.from("jobs").select("*").order("created_at", { ascending: false }),
    supabase.from("shop_settings").select("*").eq("id", "default").maybeSingle(),
  ]);

  if (productResult.error || lumberResult.error || quoteResult.error || jobResult.error || settingsResult.error) {
    throw new Error(
      productResult.error?.message ||
        lumberResult.error?.message ||
        quoteResult.error?.message ||
        jobResult.error?.message ||
        settingsResult.error?.message ||
        "Unable to load Supabase data.",
    );
  }

  return {
    products: (productResult.data as ProductRow[]).map(productFromRow),
    lumberBatches: (lumberResult.data as LumberBatchRow[]).map(lumberFromRow),
    quotes: (quoteResult.data as QuoteRow[]).map(quoteFromRow),
    jobs: (jobResult.data as JobRow[]).map(jobFromRow),
    settings: settingsResult.data ? settingsFromRow(settingsResult.data as ShopSettingsRow) : null,
  };
}

export async function saveShopSettings(settings: ShopSettings) {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return settings;
  }

  const { data, error } = await supabase
    .from("shop_settings")
    .upsert(settingsToRow(settings))
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return settingsFromRow(data as ShopSettingsRow);
}

export async function upsertProduct(product: Product) {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return product;
  }

  const { data, error } = await supabase
    .from("products")
    .upsert(productToRow(product))
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return productFromRow(data as ProductRow);
}

export async function saveLumberBatch(batch: LumberBatch) {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return batch;
  }

  const { data, error } = await supabase
    .from("lumber_batches")
    .insert(lumberToRow(batch))
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return lumberFromRow(data as LumberBatchRow);
}

export async function upsertLumberBatch(batch: LumberBatch) {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return batch;
  }

  const { data, error } = await supabase
    .from("lumber_batches")
    .upsert(lumberToRow(batch, isUuid(batch.id)))
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return lumberFromRow(data as LumberBatchRow);
}

export async function deleteLumberBatch(id: string) {
  const supabase = getSupabaseClient();

  if (!supabase || !isUuid(id)) {
    return;
  }

  const { error } = await supabase.from("lumber_batches").delete().eq("id", id);

  if (error) {
    throw new Error(error.message);
  }
}

export async function saveQuote(quote: Quote) {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return quote;
  }

  const { data, error } = await supabase
    .from("quotes")
    .insert(quoteToRow(quote))
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return quoteFromRow(data as QuoteRow);
}

export async function upsertQuote(quote: Quote) {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return quote;
  }

  const { data, error } = await supabase
    .from("quotes")
    .upsert(isUuid(quote.id) ? { id: quote.id, ...quoteToRow(quote) } : quoteToRow(quote))
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return quoteFromRow(data as QuoteRow);
}

export async function saveJob(job: Job) {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return job;
  }

  const { data, error } = await supabase
    .from("jobs")
    .insert(jobToRow(job))
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return jobFromRow(data as JobRow);
}

export async function upsertJob(job: Job) {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return job;
  }

  const { data, error } = await supabase
    .from("jobs")
    .upsert(isUuid(job.id) ? { id: job.id, ...jobToRow(job) } : jobToRow(job))
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return jobFromRow(data as JobRow);
}

export async function deleteQuote(id: string) {
  const supabase = getSupabaseClient();

  if (!supabase || !isUuid(id)) {
    return;
  }

  const { error } = await supabase.from("quotes").delete().eq("id", id);

  if (error) {
    throw new Error(error.message);
  }
}

export async function deleteJob(id: string) {
  const supabase = getSupabaseClient();

  if (!supabase || !isUuid(id)) {
    return;
  }

  const { error } = await supabase.from("jobs").delete().eq("id", id);

  if (error) {
    throw new Error(error.message);
  }
}

export async function updateJobStatus(id: string, status: Job["status"]) {
  const supabase = getSupabaseClient();

  if (!supabase || !isUuid(id)) {
    return;
  }

  const { error } = await supabase.from("jobs").update({ status }).eq("id", id);

  if (error) {
    throw new Error(error.message);
  }
}
