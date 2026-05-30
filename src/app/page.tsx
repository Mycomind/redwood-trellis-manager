"use client";

import {
  Calculator,
  CalendarDays,
  ClipboardList,
  Copy,
  Database,
  Download,
  Pencil,
  Save,
  Trash2,
  Hammer,
  LayoutDashboard,
  Printer,
  Ruler,
  Scissors,
  Settings,
  Trees,
  Upload,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { Dispatch, ElementType, SetStateAction } from "react";
import { EmptyState } from "@/components/EmptyState";
import { Field, SelectInput, TextInput } from "@/components/Field";
import { MetricCard } from "@/components/MetricCard";
import { Section } from "@/components/Section";
import {
  calculateTrellis,
  effectiveBoardFootCost,
  landedCost,
  money,
  numberFormat,
  usableBoardFeet,
} from "@/lib/calculations";
import { loadLocalData, saveLocalData } from "@/lib/local-storage";
import {
  jobs as seedJobs,
  lumberBatches as seedLumberBatches,
  products as seedProducts,
  quotes as seedQuotes,
} from "@/lib/seed";
import {
  hasSupabaseConfig,
  loadSupabaseData,
  deleteLumberBatch,
  saveJob,
  saveLumberBatch,
  saveQuote,
  saveShopSettings,
  deleteJob,
  deleteQuote,
  upsertLumberBatch,
  upsertJob,
  upsertProduct,
  upsertQuote,
} from "@/lib/store";
import type { CalculatorInput, Job, LumberBatch, Product, Quote, ShopSettings } from "@/lib/types";

type Tab = "dashboard" | "calculator" | "products" | "lumber" | "quotes" | "jobs" | "settings";

const tabs: { id: Tab; label: string; icon: ElementType }[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "calculator", label: "Calculator", icon: Calculator },
  { id: "products", label: "Products", icon: Database },
  { id: "lumber", label: "Lumber", icon: Trees },
  { id: "quotes", label: "Quotes", icon: ClipboardList },
  { id: "jobs", label: "Jobs", icon: Hammer },
  { id: "settings", label: "Settings", icon: Settings },
];

const defaultCalculator: CalculatorInput = {
  style: "Open Grid",
  stockType: "3/4\"",
  thicknessInches: 0.75,
  slatWidthInches: 1.25,
  widthFeet: 5,
  heightFeet: 3,
  verticalSlats: 6,
  horizontalSlats: 5,
  diagonalBraces: 1,
  boardFootCost: 7.1,
  wastePercentage: 18,
  hardwareCost: 3.5,
  laborMinutes: 58,
  hourlyLaborRate: 38,
  markupPercentage: 85,
  wholesaleDiscountPercentage: 28,
};

const defaultQuote: Quote = {
  id: "new",
  customerName: "Customer Name",
  phone: "(707) 555-0100",
  email: "customer@example.com",
  productId: "og-5x3",
  quantity: 1,
  customDimensions: "",
  calculatedCost: 54,
  quotedPrice: 92,
  depositAmount: 40,
  notes: "Handcrafted redwood trellis. Pickup or delivery can be arranged.",
  validUntil: "2026-06-30",
  status: "draft",
};

const defaultSettings: ShopSettings = {
  defaultBoardFootCost: defaultCalculator.boardFootCost,
  defaultWastePercentage: defaultCalculator.wastePercentage,
  defaultHardwareCost: defaultCalculator.hardwareCost,
  defaultHourlyLaborRate: defaultCalculator.hourlyLaborRate,
  defaultMarkupPercentage: defaultCalculator.markupPercentage,
  defaultWholesaleDiscountPercentage: defaultCalculator.wholesaleDiscountPercentage,
};

function numericValue(value: string) {
  return Number(value) || 0;
}

function quoteFinancials(quote: Quote) {
  const revenue = Math.max(0, quote.quotedPrice);
  const cost = Math.max(0, quote.calculatedCost);
  const deposit = Math.max(0, Math.min(quote.depositAmount, revenue));
  const balance = Math.max(0, revenue - deposit);
  const profit = revenue - cost;
  const marginPercentage = revenue > 0 ? (profit / revenue) * 100 : 0;
  const depositPercentage = revenue > 0 ? (deposit / revenue) * 100 : 0;

  return { revenue, cost, deposit, balance, profit, marginPercentage, depositPercentage };
}

function suggestedDeposit(price: number) {
  return Math.round(Math.max(0, price) * 0.5);
}

function quoteTone(marginPercentage: number) {
  if (marginPercentage >= 45) {
    return { label: "Strong margin", className: "bg-moss/15 text-moss" };
  }

  if (marginPercentage >= 30) {
    return { label: "Usable margin", className: "bg-clay/15 text-clay" };
  }

  return { label: "Profit warning", className: "bg-redwood/15 text-redwood" };
}

function quoteStatusClass(status: Quote["status"]) {
  if (status === "accepted") {
    return "bg-moss/15 text-moss";
  }

  if (status === "sent") {
    return "bg-clay/15 text-clay";
  }

  if (status === "declined") {
    return "bg-redwood/15 text-redwood";
  }

  return "bg-white text-bark";
}

function buildQuoteMessage(quote: Quote, product: Product) {
  const financials = quoteFinancials(quote);
  const dimensionText = quote.customDimensions ? ` Custom dimensions: ${quote.customDimensions}.` : "";
  const noteText = quote.notes ? ` Notes: ${quote.notes}` : "";

  return `Hi ${quote.customerName}, your redwood trellis quote is ${money(financials.revenue)} for ${quote.quantity} × ${product.name}.${dimensionText} Deposit to start: ${money(financials.deposit)}. Balance on completion: ${money(financials.balance)}. Quote valid until ${quote.validUntil}.${noteText}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validateBackup(value: unknown): {
  products: Product[];
  lumberBatches: LumberBatch[];
  quotes: Quote[];
  jobs: Job[];
  settings?: ShopSettings;
} {
  if (!isRecord(value)) {
    throw new Error("Backup file is not a valid JSON object.");
  }

  if (
    !Array.isArray(value.products) ||
    !Array.isArray(value.lumberBatches) ||
    !Array.isArray(value.quotes) ||
    !Array.isArray(value.jobs)
  ) {
    throw new Error("Backup file is missing products, lumber batches, quotes, or jobs.");
  }

  return {
    products: value.products as Product[],
    lumberBatches: value.lumberBatches as LumberBatch[],
    quotes: value.quotes as Quote[],
    jobs: value.jobs as Job[],
    settings: isRecord(value.settings) ? (value.settings as ShopSettings) : undefined,
  };
}

function isOpenJob(job: Job) {
  return job.status !== "paid" && job.status !== "delivered";
}

const jobStatuses: Job["status"][] = ["new", "quoted", "deposit paid", "building", "ready", "delivered", "paid"];

function jobStatusClass(status: Job["status"]) {
  if (status === "paid") return "bg-moss/15 text-moss";
  if (status === "delivered" || status === "ready") return "bg-clay/15 text-clay";
  if (status === "building" || status === "deposit paid") return "bg-bark/10 text-bark";
  return "bg-redwood/15 text-redwood";
}

function jobProgress(status: Job["status"]) {
  const index = Math.max(0, jobStatuses.indexOf(status));
  return Math.round(((index + 1) / jobStatuses.length) * 100);
}

function nextJobStatus(status: Job["status"]) {
  const index = jobStatuses.indexOf(status);
  return jobStatuses[Math.min(jobStatuses.length - 1, index + 1)] ?? status;
}

function buildJobMessage(job: Job, product: Product) {
  return `Job update for ${job.customerName}: your ${product.name} is currently marked "${job.status}". Target due date: ${job.dueDate}. Current balance owed: ${money(job.balanceOwed)}. Notes: ${job.notes || "No extra notes."}`;
}

function productCalculatorInput(product: Product, boardFootCost: number): CalculatorInput {
  return {
    ...defaultCalculator,
    style: product.stockType === "3/4\"" ? "Open Grid" : "Custom",
    stockType: product.stockType,
    thicknessInches: product.thicknessInches,
    slatWidthInches: product.slatWidthInches,
    widthFeet: product.widthFeet,
    heightFeet: product.heightFeet,
    verticalSlats: product.verticalSlatCount,
    horizontalSlats: product.horizontalSlatCount,
    diagonalBraces: product.diagonalBraceCount,
    laborMinutes: product.estimatedLaborMinutes,
    boardFootCost,
    markupPercentage: 0,
  };
}

function daysUntil(dateString: string) {
  if (!dateString) {
    return null;
  }

  const due = new Date(`${dateString}T12:00:00`);
  if (Number.isNaN(due.getTime())) {
    return null;
  }

  const today = new Date();
  today.setHours(12, 0, 0, 0);
  return Math.ceil((due.getTime() - today.getTime()) / 86_400_000);
}

function dueSignal(dateString: string) {
  const days = daysUntil(dateString);

  if (days === null) {
    return { label: "No due date", tone: "neutral" as const };
  }
  if (days < 0) {
    return { label: `${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"} overdue`, tone: "bad" as const };
  }
  if (days === 0) {
    return { label: "Due today", tone: "bad" as const };
  }
  if (days <= 3) {
    return { label: `Due in ${days} day${days === 1 ? "" : "s"}`, tone: "warn" as const };
  }

  return { label: `Due in ${days} days`, tone: "good" as const };
}

function dueBadgeClass(tone: ReturnType<typeof dueSignal>["tone"]) {
  if (tone === "bad") {
    return "bg-redwood text-white";
  }
  if (tone === "warn") {
    return "bg-clay text-white";
  }
  if (tone === "good") {
    return "bg-moss text-white";
  }

  return "bg-shop text-bark";
}

function cutRows(input: CalculatorInput) {
  return [
    { label: "Vertical slats", count: input.verticalSlats, lengthFeet: input.heightFeet },
    { label: "Horizontal slats", count: input.horizontalSlats, lengthFeet: input.widthFeet },
    {
      label: "Diagonal braces",
      count: input.diagonalBraces,
      lengthFeet: Math.sqrt(input.widthFeet ** 2 + input.heightFeet ** 2),
    },
  ].filter((row) => row.count > 0);
}

function buildCutSheetText(input: CalculatorInput, result: ReturnType<typeof calculateTrellis>) {
  const rows = cutRows(input)
    .map((row) => `${row.label}: ${row.count} @ ${numberFormat(row.lengthFeet, 2)} ft each = ${numberFormat(row.count * row.lengthFeet, 2)} linear ft`)
    .join("\n");

  return `Redwood trellis cut sheet\n${input.widthFeet}' x ${input.heightFeet}' ${input.stockType} ${input.style}\n${rows}\nTotal linear feet: ${numberFormat(result.totalLinearFeet, 2)}\nWaste-adjusted board feet: ${numberFormat(result.wasteAdjustedBoardFeet, 2)}\nEstimated build cost: ${money(result.totalBuildCost)}\nSuggested retail: ${money(result.retailPrice)}`;
}


export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>("dashboard");
  const [dataStatus, setDataStatus] = useState("Seeded local data");
  const [products, setProducts] = useState<Product[]>(seedProducts);
  const [calculator, setCalculator] = useState<CalculatorInput>(defaultCalculator);
  const [lumberBatches, setLumberBatches] = useState<LumberBatch[]>(seedLumberBatches);
  const [quotes, setQuotes] = useState<Quote[]>(seedQuotes);
  const [jobs, setJobs] = useState<Job[]>(seedJobs);
  const [quoteDraft, setQuoteDraft] = useState<Quote>(defaultQuote);
  const [settings, setSettings] = useState<ShopSettings>(defaultSettings);
  const [remoteLoaded, setRemoteLoaded] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  function productById(id: string) {
    return products.find((product) => product.id === id) ?? products[0] ?? seedProducts[0];
  }

  function exportBackup() {
    const backup = {
      exportedAt: new Date().toISOString(),
      products,
      lumberBatches,
      quotes,
      jobs,
      settings,
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `redwood-trellis-manager-backup-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function importBackup(file: File) {
    try {
      const text = await file.text();
      const backup = validateBackup(JSON.parse(text));

      setProducts(backup.products);
      setLumberBatches(backup.lumberBatches);
      setQuotes(backup.quotes);
      setJobs(backup.jobs);
      setSettings(backup.settings ?? defaultSettings);
      saveLocalData({
        products: backup.products,
        lumberBatches: backup.lumberBatches,
        quotes: backup.quotes,
        jobs: backup.jobs,
        settings: backup.settings ?? defaultSettings,
      });
      setDataStatus("Imported backup into browser data");
    } catch (error) {
      setDataStatus(`Import failed: ${(error as Error).message}`);
    }
  }

  useEffect(() => {
    let alive = true;
    const localData = loadLocalData();

    queueMicrotask(() => {
      if (!alive) {
        return;
      }

      if (localData) {
        setProducts(localData.products.length > 0 ? localData.products : seedProducts);
        setLumberBatches(localData.lumberBatches);
        setQuotes(localData.quotes);
        setJobs(localData.jobs);
        setSettings(localData.settings ?? defaultSettings);
        setDataStatus("Loaded saved browser data");
      }

      setHydrated(true);
    });

    if (!hasSupabaseConfig()) {
      return;
    }

    loadSupabaseData()
      .then((data) => {
        if (!alive || !data) {
          return;
        }

        if (data.products.length > 0) {
          setProducts(data.products);
        }
        setLumberBatches(data.lumberBatches);
        setQuotes(data.quotes);
        setJobs(data.jobs);
        if (data.settings) {
          setSettings(data.settings);
        }
        setDataStatus("Connected to Supabase");
        setRemoteLoaded(true);
      })
      .catch((error: Error) => {
        if (alive) {
          setDataStatus(`Supabase unavailable: ${error.message}`);
        }
      });

    queueMicrotask(() => {
      if (alive) {
        setDataStatus("Loading Supabase data...");
      }
    });

    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!hydrated || remoteLoaded) {
      return;
    }

    saveLocalData({ products, lumberBatches, quotes, jobs, settings });
  }, [hydrated, jobs, lumberBatches, products, quotes, remoteLoaded, settings]);

  const result = useMemo(() => calculateTrellis(calculator), [calculator]);
  const currentBoardFootCost = useMemo(() => {
    const totalUsable = lumberBatches.reduce(
      (sum, batch) => sum + (batch.actualUsableBoardFeet || batch.nominalBoardFeet * (batch.estimatedUsablePercentage / 100)),
      0,
    );
    const totalCost = lumberBatches.reduce((sum, batch) => sum + landedCost(batch), 0);
    return totalUsable > 0 ? totalCost / totalUsable : calculator.boardFootCost;
  }, [calculator.boardFootCost, lumberBatches]);

  const profitability = useMemo(() => {
    return products
      .map((product) => {
        const calc = calculateTrellis({
          ...defaultCalculator,
          stockType: product.stockType,
          thicknessInches: product.thicknessInches,
          slatWidthInches: product.slatWidthInches,
          widthFeet: product.widthFeet,
          heightFeet: product.heightFeet,
          verticalSlats: product.verticalSlatCount,
          horizontalSlats: product.horizontalSlatCount,
          diagonalBraces: product.diagonalBraceCount,
          laborMinutes: product.estimatedLaborMinutes,
          boardFootCost: currentBoardFootCost,
          markupPercentage: 0,
        });
        const profit = product.retailPrice - calc.totalBuildCost;
        const margin = product.retailPrice > 0 ? (profit / product.retailPrice) * 100 : 0;
        return { product, profit, margin };
      })
      .sort((a, b) => b.margin - a.margin);
  }, [currentBoardFootCost, products]);

  const dashboard = {
    activeJobs: jobs.filter(isOpenJob).length,
    quotesPending: quotes.filter((quote) => quote.status === "draft" || quote.status === "sent").length,
    totalQuotedValue: quotes.reduce((sum, quote) => sum + quote.quotedPrice, 0),
    expectedProfit: quotes.reduce((sum, quote) => sum + Math.max(0, quote.quotedPrice - quote.calculatedCost), 0),
  };

  function updateCalculator<K extends keyof CalculatorInput>(key: K, value: CalculatorInput[K]) {
    setCalculator((current) => ({ ...current, [key]: value }));
  }

  function resetCalculatorFromSettings() {
    setCalculator((current) => ({
      ...current,
      boardFootCost: settings.defaultBoardFootCost,
      wastePercentage: settings.defaultWastePercentage,
      hardwareCost: settings.defaultHardwareCost,
      hourlyLaborRate: settings.defaultHourlyLaborRate,
      markupPercentage: settings.defaultMarkupPercentage,
      wholesaleDiscountPercentage: settings.defaultWholesaleDiscountPercentage,
    }));
    setDataStatus("Calculator defaults applied");
  }

  async function saveSettings(nextSettings: ShopSettings, status = "Saved settings") {
    setSettings(nextSettings);
    saveLocalData({ products, lumberBatches, quotes, jobs, settings: nextSettings });

    try {
      const savedSettings = await saveShopSettings(nextSettings);
      setSettings(savedSettings);
      setDataStatus(hasSupabaseConfig() ? status : "Saved browser settings");
    } catch (error) {
      setDataStatus(`Settings save failed: ${(error as Error).message}`);
    }
  }

  function saveCurrentCalculatorAsSettings() {
    const nextSettings = {
      defaultBoardFootCost: calculator.boardFootCost,
      defaultWastePercentage: calculator.wastePercentage,
      defaultHardwareCost: calculator.hardwareCost,
      defaultHourlyLaborRate: calculator.hourlyLaborRate,
      defaultMarkupPercentage: calculator.markupPercentage,
      defaultWholesaleDiscountPercentage: calculator.wholesaleDiscountPercentage,
    };
    void saveSettings(nextSettings, "Saved calculator defaults");
  }

  function loadProduct(product: Product) {
    setCalculator((current) => ({
      ...current,
      style: product.stockType === "3/4\"" ? "Open Grid" : "Custom",
      stockType: product.stockType,
      thicknessInches: product.thicknessInches,
      slatWidthInches: product.slatWidthInches,
      widthFeet: product.widthFeet,
      heightFeet: product.heightFeet,
      verticalSlats: product.verticalSlatCount,
      horizontalSlats: product.horizontalSlatCount,
      diagonalBraces: product.diagonalBraceCount,
      laborMinutes: product.estimatedLaborMinutes,
      boardFootCost: currentBoardFootCost,
    }));
    setActiveTab("calculator");
  }

  function addProduct() {
    const widthFeet = calculator.widthFeet;
    const heightFeet = calculator.heightFeet;
    const stockType = calculator.stockType;
    const nextProduct: Product = {
      id: `custom-${Date.now()}`,
      name: `${stockType} Custom Trellis ${widthFeet}' x ${heightFeet}'`,
      dimensions: `${widthFeet}' x ${heightFeet}'`,
      stockType,
      thicknessInches: calculator.thicknessInches,
      slatWidthInches: calculator.slatWidthInches,
      widthFeet,
      heightFeet,
      verticalSlatCount: calculator.verticalSlats,
      horizontalSlatCount: calculator.horizontalSlats,
      diagonalBraceCount: calculator.diagonalBraces,
      estimatedLaborMinutes: calculator.laborMinutes,
      retailPrice: Math.round(result.retailPrice),
      wholesalePrice: Math.round(result.wholesalePrice),
      active: true,
    };

    setProducts((current) => [nextProduct, ...current]);
    setActiveTab("products");
  }

  async function addLumberBatch() {
    const draftBatch = {
      id: `batch-${Date.now()}`,
      supplierName: "New supplier",
      woodType: "Rough redwood",
      unitCost: 5,
      nominalBoardFeet: 100,
      fuelTravelCost: 25,
      estimatedUsablePercentage: 75,
      actualUsableBoardFeet: 75,
      notes: "Add notes here.",
    };

    try {
      const savedBatch = await saveLumberBatch(draftBatch);
      setLumberBatches((current) => [savedBatch, ...current]);
    } catch (error) {
      setDataStatus(`Save failed: ${(error as Error).message}`);
      setLumberBatches((current) => [draftBatch, ...current]);
    }
  }

  async function saveEditedBatch(batch: LumberBatch, index: number) {
    try {
      const savedBatch = await upsertLumberBatch(batch);
      setLumberBatches((current) =>
        current.map((item, itemIndex) => (itemIndex === index ? savedBatch : item)),
      );
      setDataStatus(hasSupabaseConfig() ? "Saved lumber batch" : "Seeded local data");
    } catch (error) {
      setDataStatus(`Save failed: ${(error as Error).message}`);
    }
  }

  async function saveExistingProduct(product: Product, index: number) {
    try {
      const savedProduct = await upsertProduct(product);
      setProducts((current) =>
        current.map((item, itemIndex) => (itemIndex === index ? savedProduct : item)),
      );
      setDataStatus(hasSupabaseConfig() ? "Saved product" : "Saved browser data");
    } catch (error) {
      setDataStatus(`Save failed: ${(error as Error).message}`);
    }
  }

  async function removeBatch(batch: LumberBatch) {
    if (!window.confirm(`Delete lumber batch from ${batch.supplierName}?`)) {
      return;
    }

    try {
      await deleteLumberBatch(batch.id);
      setLumberBatches((current) => current.filter((item) => item.id !== batch.id));
      setDataStatus(hasSupabaseConfig() ? "Deleted lumber batch" : "Saved browser data");
    } catch (error) {
      setDataStatus(`Delete failed: ${(error as Error).message}`);
    }
  }

  async function addQuote() {
    const product = productById(quoteDraft.productId);
    const nextQuote = {
      ...quoteDraft,
      id: `quote-${Date.now()}`,
      calculatedCost: Math.max(quoteDraft.calculatedCost, product.wholesalePrice * quoteDraft.quantity),
      quotedPrice: quoteDraft.quotedPrice || product.retailPrice * quoteDraft.quantity,
    };

    try {
      const savedQuote = await saveQuote(nextQuote);
      setQuotes((current) => [savedQuote, ...current]);
    } catch (error) {
      setDataStatus(`Save failed: ${(error as Error).message}`);
      setQuotes((current) => [nextQuote, ...current]);
    }
  }

  async function addJobFromQuote(quote: Quote) {
    const nextJob: Job = {
      id: `job-${Date.now()}`,
      customerName: quote.customerName,
      productId: quote.productId,
      quoteId: quote.id,
      status: quote.status === "accepted" ? "deposit paid" : "quoted",
      dueDate: quote.validUntil,
      balanceOwed: Math.max(0, quote.quotedPrice - quote.depositAmount),
      notes: quote.notes,
    };

    try {
      const savedJob = await saveJob(nextJob);
      setJobs((current) => [savedJob, ...current]);
    } catch (error) {
      setDataStatus(`Save failed: ${(error as Error).message}`);
      setJobs((current) => [nextJob, ...current]);
    }
    setActiveTab("jobs");
  }

  async function saveExistingQuote(quote: Quote, index: number) {
    try {
      const savedQuote = await upsertQuote(quote);
      setQuotes((current) =>
        current.map((item, itemIndex) => (itemIndex === index ? savedQuote : item)),
      );
      setDataStatus(hasSupabaseConfig() ? "Saved quote" : "Saved browser data");
    } catch (error) {
      setDataStatus(`Save failed: ${(error as Error).message}`);
    }
  }

  async function removeQuote(quote: Quote) {
    if (!window.confirm(`Delete quote for ${quote.customerName}?`)) {
      return;
    }

    try {
      await deleteQuote(quote.id);
      setQuotes((current) => current.filter((item) => item.id !== quote.id));
      setDataStatus(hasSupabaseConfig() ? "Deleted quote" : "Saved browser data");
    } catch (error) {
      setDataStatus(`Delete failed: ${(error as Error).message}`);
    }
  }

  async function saveExistingJob(job: Job, index: number) {
    try {
      const savedJob = await upsertJob(job);
      setJobs((current) =>
        current.map((item, itemIndex) => (itemIndex === index ? savedJob : item)),
      );
      setDataStatus(hasSupabaseConfig() ? "Saved job" : "Saved browser data");
    } catch (error) {
      setDataStatus(`Save failed: ${(error as Error).message}`);
    }
  }

  async function removeJob(job: Job) {
    if (!window.confirm(`Delete job for ${job.customerName}?`)) {
      return;
    }

    try {
      await deleteJob(job.id);
      setJobs((current) => current.filter((item) => item.id !== job.id));
      setDataStatus(hasSupabaseConfig() ? "Deleted job" : "Saved browser data");
    } catch (error) {
      setDataStatus(`Delete failed: ${(error as Error).message}`);
    }
  }

  const quoteProduct = productById(quoteDraft.productId);
  const textMessageQuote = buildQuoteMessage(quoteDraft, quoteProduct);

  return (
    <main className="min-h-screen">
      <header className="border-b border-redwood/20 bg-bark text-linen">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <Ruler className="h-9 w-9 text-clay" aria-hidden="true" />
              <h1 className="text-4xl font-bold">Redwood Trellis Manager</h1>
            </div>
            <p className="mt-2 text-lg text-shop">Internal shop tool for pricing, quotes, lumber costs, and jobs.</p>
          </div>
          <div className="rounded-lg border border-shop/20 bg-white/10 px-4 py-3 text-lg">
            <div>Current board-foot cost: <strong>{money(currentBoardFootCost)}</strong></div>
            <div className="text-sm text-shop">{dataStatus}</div>
          </div>
          <div className="no-print flex flex-wrap gap-2">
            <button type="button" onClick={exportBackup} className="flex h-11 items-center gap-2 rounded-md bg-clay px-3 text-base font-bold text-white">
              <Download className="h-5 w-5" />
              Export
            </button>
            <label className="flex h-11 cursor-pointer items-center gap-2 rounded-md bg-moss px-3 text-base font-bold text-white">
              <Upload className="h-5 w-5" />
              Import
              <input
                type="file"
                accept="application/json"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) {
                    void importBackup(file);
                  }
                  event.target.value = "";
                }}
              />
            </label>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-5 px-5 py-5 lg:grid-cols-[220px_1fr]">
        <nav className="no-print grid h-fit grid-cols-2 gap-2 rounded-lg border border-shop bg-white p-2 shadow-soft lg:sticky lg:top-5 lg:grid-cols-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex min-h-12 items-center gap-3 rounded-md px-3 text-left text-lg font-bold ${
                  activeTab === tab.id
                    ? "bg-redwood text-white"
                    : "bg-linen text-bark hover:bg-shop"
                }`}
              >
                <Icon className="h-5 w-5" aria-hidden="true" />
                {tab.label}
              </button>
            );
          })}
        </nav>

        <div className="grid gap-5">
          {activeTab === "dashboard" ? (
            <Dashboard
              dashboard={dashboard}
              profitability={profitability}
              currentBoardFootCost={currentBoardFootCost}
              jobs={jobs}
              products={products}
              lumberBatches={lumberBatches}
            />
          ) : null}

          {activeTab === "calculator" ? (
            <Section title="Trellis Cost Calculator" description="Change the inputs and the shop price updates immediately.">
              <div className="mb-4 flex flex-wrap gap-2">
                <button type="button" onClick={resetCalculatorFromSettings} className="h-11 rounded-md bg-bark px-4 text-base font-bold text-white">
                  Apply shop defaults
                </button>
                <button type="button" onClick={saveCurrentCalculatorAsSettings} className="h-11 rounded-md bg-moss px-4 text-base font-bold text-white">
                  Save current as defaults
                </button>
              </div>
              <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Trellis style">
                    <SelectInput value={calculator.style} onChange={(event) => updateCalculator("style", event.target.value as CalculatorInput["style"])}>
                      <option>Open Grid</option>
                      <option>Fan</option>
                      <option>Custom</option>
                    </SelectInput>
                  </Field>
                  <Field label="Stock type">
                    <SelectInput
                      value={calculator.stockType}
                      onChange={(event) => {
                        const stockType = event.target.value as CalculatorInput["stockType"];
                        updateCalculator("stockType", stockType);
                        updateCalculator("thicknessInches", stockType === "1 1/8\"" ? 1.125 : 0.75);
                      }}
                    >
                      <option>3/4&quot;</option>
                      <option>1 1/8&quot;</option>
                    </SelectInput>
                  </Field>
                  {[
                    ["Width feet", "widthFeet"],
                    ["Height feet", "heightFeet"],
                    ["Vertical slats", "verticalSlats"],
                    ["Horizontal slats", "horizontalSlats"],
                    ["Diagonal braces", "diagonalBraces"],
                    ["Board-foot cost", "boardFootCost"],
                    ["Waste percentage", "wastePercentage"],
                    ["Hardware cost", "hardwareCost"],
                    ["Labor minutes", "laborMinutes"],
                    ["Hourly labor rate", "hourlyLaborRate"],
                    ["Markup percentage", "markupPercentage"],
                    ["Wholesale discount", "wholesaleDiscountPercentage"],
                  ].map(([label, key]) => (
                    <Field key={key} label={label}>
                      <TextInput
                        type="number"
                        min="0"
                        step="0.01"
                        value={calculator[key as keyof CalculatorInput] as number}
                        onChange={(event) => updateCalculator(key as keyof CalculatorInput, numericValue(event.target.value) as never)}
                      />
                    </Field>
                  ))}
                </div>
                <div className="grid gap-3">
                  <MetricCard label="Retail price" value={money(result.retailPrice)} tone="good" />
                  <MetricCard label="Total build cost" value={money(result.totalBuildCost)} />
                  <MetricCard label="Profit" value={money(result.profit)} tone="good" help={`${numberFormat(result.marginPercentage, 1)}% margin`} />
                  <div className="grid grid-cols-2 gap-3">
                    <MetricCard label="Linear feet" value={numberFormat(result.totalLinearFeet)} />
                    <MetricCard label="Board feet" value={numberFormat(result.wasteAdjustedBoardFeet)} help="Waste adjusted" />
                    <MetricCard label="Material" value={money(result.materialCost)} />
                    <MetricCard label="Labor" value={money(result.laborCost)} />
                    <MetricCard label="Hardware" value={money(result.hardwareCost)} />
                    <MetricCard label="Wholesale" value={money(result.wholesalePrice)} />
                  </div>
                  <CutSheet input={calculator} result={result} />
                </div>
              </div>
            </Section>
          ) : null}

          {activeTab === "products" ? (
            <Section title="Product Database" description="Seeded standard trellises with active status, dimensions, labor, and retail/wholesale pricing.">
              <button type="button" onClick={addProduct} className="mb-4 h-12 rounded-md bg-redwood px-4 text-lg font-bold text-white hover:bg-redwoodDark">
                Add product from calculator
              </button>
              <ProductTable
                products={products}
                onChange={(product, index) => {
                  setProducts((current) =>
                    current.map((item, itemIndex) => (itemIndex === index ? product : item)),
                  );
                }}
                onSave={saveExistingProduct}
                onLoad={loadProduct}
                profitability={profitability}
              />
            </Section>
          ) : null}

          {activeTab === "lumber" ? (
            <Section title="Lumber Batch / Sourcing Tracker" description="Track rough redwood, travel, waste, and true usable board-foot cost.">
              <button type="button" onClick={addLumberBatch} className="mb-4 h-12 rounded-md bg-redwood px-4 text-lg font-bold text-white hover:bg-redwoodDark">
                Add lumber batch
              </button>
              {lumberBatches.length === 0 ? (
                <EmptyState title="No lumber batches yet" message="Add a purchase to calculate landed and usable board-foot cost." />
              ) : null}
              <div className="grid gap-4">
                {lumberBatches.map((batch, index) => (
                  <div key={batch.id} className="rounded-lg border border-shop bg-linen p-4">
                    <div className="grid gap-3 md:grid-cols-4">
                      <Field label="Supplier">
                        <TextInput value={batch.supplierName} onChange={(event) => updateBatch(index, "supplierName", event.target.value, setLumberBatches)} />
                      </Field>
                      <Field label="Wood type">
                        <TextInput value={batch.woodType} onChange={(event) => updateBatch(index, "woodType", event.target.value, setLumberBatches)} />
                      </Field>
                      <Field label="Unit cost">
                        <TextInput type="number" value={batch.unitCost} onChange={(event) => updateBatch(index, "unitCost", numericValue(event.target.value), setLumberBatches)} />
                      </Field>
                      <Field label="Nominal board feet">
                        <TextInput type="number" value={batch.nominalBoardFeet} onChange={(event) => updateBatch(index, "nominalBoardFeet", numericValue(event.target.value), setLumberBatches)} />
                      </Field>
                      <Field label="Fuel/travel">
                        <TextInput type="number" value={batch.fuelTravelCost} onChange={(event) => updateBatch(index, "fuelTravelCost", numericValue(event.target.value), setLumberBatches)} />
                      </Field>
                      <Field label="Usable percentage">
                        <TextInput type="number" value={batch.estimatedUsablePercentage} onChange={(event) => updateBatch(index, "estimatedUsablePercentage", numericValue(event.target.value), setLumberBatches)} />
                      </Field>
                      <Field label="Actual usable board feet">
                        <TextInput type="number" value={batch.actualUsableBoardFeet} onChange={(event) => updateBatch(index, "actualUsableBoardFeet", numericValue(event.target.value), setLumberBatches)} />
                      </Field>
                      <div className="grid content-end gap-1 rounded-md bg-white p-3">
                        <div className="text-sm font-bold text-barkSoft">Effective cost</div>
                        <div className="text-2xl font-bold text-bark">{money(effectiveBoardFootCost(batch))}</div>
                        <div className="text-sm text-barkSoft">Landed: {money(landedCost(batch))}</div>
                      </div>
                    </div>
                    <textarea
                      value={batch.notes}
                      onChange={(event) => updateBatch(index, "notes", event.target.value, setLumberBatches)}
                      className="mt-3 min-h-20 w-full rounded-md border border-shop bg-white p-3 text-lg text-bark outline-none focus:border-redwood"
                    />
                    <div className="mt-3 flex gap-2">
                      <button type="button" onClick={() => saveEditedBatch(batch, index)} className="h-11 rounded-md bg-bark px-4 text-base font-bold text-white">
                        Save batch
                      </button>
                      <button type="button" onClick={() => removeBatch(batch)} className="h-11 rounded-md bg-redwood px-4 text-base font-bold text-white">
                        Delete batch
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          ) : null}

          {activeTab === "quotes" ? (
            <Section title="Quote Generator" description="Create a quote, print it, copy a text-message version, and turn accepted quotes into jobs.">
              <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
                <QuoteEditor quote={quoteDraft} setQuote={setQuoteDraft} addQuote={addQuote} products={products} productById={productById} />
                <div className="grid gap-4">
                  <PrintableQuote quote={quoteDraft} product={quoteProduct} textMessageQuote={textMessageQuote} />
                  <QuoteList
                    quotes={quotes}
                    products={products}
                    onCreateJob={addJobFromQuote}
                    onChange={(quote, index) => {
                      setQuotes((current) =>
                        current.map((item, itemIndex) => (itemIndex === index ? quote : item)),
                      );
                    }}
                    onDelete={removeQuote}
                    onSave={saveExistingQuote}
                    productById={productById}
                  />
                </div>
              </div>
            </Section>
          ) : null}

          {activeTab === "jobs" ? (
            <Section title="Job Tracker" description="Track shop work from new quote through deposit, build, delivery, and final payment.">
              <JobBoard
                jobs={jobs}
                products={products}
                productById={productById}
                onChange={(job, index) => {
                  setJobs((current) =>
                    current.map((item, itemIndex) => (itemIndex === index ? job : item)),
                  );
                }}
                onSave={saveExistingJob}
                onDelete={removeJob}
              />
            </Section>
          ) : null}

          {activeTab === "settings" ? (
            <Section title="Shop Settings" description="Defaults used by the calculator for normal shop pricing.">
              <SettingsPanel
                settings={settings}
                onChange={(nextSettings) => {
                  setSettings(nextSettings);
                  saveLocalData({ products, lumberBatches, quotes, jobs, settings: nextSettings });
                  setDataStatus("Updated browser settings");
                }}
                onSave={() => void saveSettings(settings)}
                onApply={resetCalculatorFromSettings}
              />
            </Section>
          ) : null}
        </div>
      </div>
    </main>
  );
}

function CutSheet({ input, result }: { input: CalculatorInput; result: ReturnType<typeof calculateTrellis> }) {
  const rows = cutRows(input);
  const copyText = () => navigator.clipboard.writeText(buildCutSheetText(input, result));

  return (
    <div className="rounded-lg border border-shop bg-linen p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-xl font-bold text-bark">
            <Scissors className="h-5 w-5 text-redwood" /> Shop cut sheet
          </div>
          <p className="text-sm text-barkSoft">Fast material breakdown for the current calculator setup.</p>
        </div>
        <button type="button" onClick={copyText} className="rounded-md bg-bark px-3 py-2 text-sm font-bold text-white">
          Copy
        </button>
      </div>
      <div className="grid gap-2">
        {rows.map((row) => (
          <div key={row.label} className="grid grid-cols-[1fr_auto_auto] gap-3 rounded-md bg-white p-3 text-base">
            <div className="font-bold">{row.label}</div>
            <div>{row.count} × {numberFormat(row.lengthFeet, 2)} ft</div>
            <div className="font-bold">{numberFormat(row.count * row.lengthFeet, 2)} ft</div>
          </div>
        ))}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-sm text-barkSoft">
        <div className="rounded-md bg-white p-3">Total linear feet: <strong className="text-bark">{numberFormat(result.totalLinearFeet, 2)}</strong></div>
        <div className="rounded-md bg-white p-3">Waste-adjusted board feet: <strong className="text-bark">{numberFormat(result.wasteAdjustedBoardFeet, 2)}</strong></div>
      </div>
    </div>
  );
}

function Dashboard({
  dashboard,
  profitability,
  currentBoardFootCost,
  jobs,
  products,
  lumberBatches,
}: {
  dashboard: { activeJobs: number; quotesPending: number; totalQuotedValue: number; expectedProfit: number };
  profitability: { product: Product; profit: number; margin: number }[];
  currentBoardFootCost: number;
  jobs: Job[];
  products: Product[];
  lumberBatches: LumberBatch[];
}) {
  const productMap = new Map(products.map((product) => [product.id, product]));
  const openJobPlans = jobs
    .filter(isOpenJob)
    .map((job) => {
      const product = productMap.get(job.productId) ?? products[0] ?? seedProducts[0];
      const estimate = calculateTrellis(productCalculatorInput(product, currentBoardFootCost));
      return { job, product, estimate, due: dueSignal(job.dueDate) };
    })
    .sort((a, b) => (daysUntil(a.job.dueDate) ?? 9999) - (daysUntil(b.job.dueDate) ?? 9999));

  const availableBoardFeet = lumberBatches.reduce((sum, batch) => sum + usableBoardFeet(batch), 0);
  const committedBoardFeet = openJobPlans.reduce((sum, plan) => sum + plan.estimate.wasteAdjustedBoardFeet, 0);
  const boardFootBuffer = availableBoardFeet - committedBoardFeet;
  const openBalance = openJobPlans.reduce((sum, plan) => sum + plan.job.balanceOwed, 0);
  const urgentJobs = openJobPlans.filter((plan) => plan.due.tone === "bad" || plan.due.tone === "warn").length;

  return (
    <div className="grid gap-5">
      <section className="overflow-hidden rounded-lg border border-redwood/20 bg-bark text-linen shadow-soft">
        <div className="grid gap-5 p-5 lg:grid-cols-[1.3fr_0.7fr] lg:p-6">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-sm font-bold uppercase tracking-wide text-shop">
              <CalendarDays className="h-4 w-4" /> Shop command center
            </div>
            <h2 className="mt-4 text-4xl font-bold leading-tight lg:text-5xl">Know what to build, quote, buy, and collect next.</h2>
            <p className="mt-3 max-w-3xl text-lg text-shop">
              The dashboard now connects jobs, lumber, pricing, and balances so the app acts less like a spreadsheet and more like a daily production manager.
            </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <div className="rounded-md bg-white/10 p-3">
                <div className="text-sm text-shop">Urgent jobs</div>
                <div className="text-3xl font-bold">{urgentJobs}</div>
              </div>
              <div className="rounded-md bg-white/10 p-3">
                <div className="text-sm text-shop">Open balance</div>
                <div className="text-3xl font-bold">{money(openBalance)}</div>
              </div>
              <div className="rounded-md bg-white/10 p-3">
                <div className="text-sm text-shop">Lumber buffer</div>
                <div className="text-3xl font-bold">{numberFormat(boardFootBuffer, 1)} bf</div>
              </div>
            </div>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/10 p-4">
            <h3 className="text-xl font-bold">Today&apos;s focus</h3>
            <div className="mt-3 grid gap-2">
              {openJobPlans.slice(0, 3).map(({ job, product, due }) => (
                <div key={job.id} className="rounded-md bg-linen p-3 text-bark">
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-bold">{job.customerName}</div>
                    <span className={`rounded-full px-2 py-1 text-xs font-bold ${dueBadgeClass(due.tone)}`}>{due.label}</span>
                  </div>
                  <div className="mt-1 text-sm text-barkSoft">{product.name} · {job.status} · {money(job.balanceOwed)} owed</div>
                </div>
              ))}
              {openJobPlans.length === 0 ? <div className="rounded-md bg-linen p-3 text-bark">No open jobs. Start from a quote or add a job.</div> : null}
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <MetricCard label="Active jobs" value={String(dashboard.activeJobs)} tone="warn" />
        <MetricCard label="Quotes pending" value={String(dashboard.quotesPending)} />
        <MetricCard label="Quoted value" value={money(dashboard.totalQuotedValue)} tone="good" />
        <MetricCard label="Expected profit" value={money(dashboard.expectedProfit)} tone="good" />
        <MetricCard label="Board-foot cost" value={money(currentBoardFootCost)} />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <Section title="Production Priority Queue" description="Open jobs sorted by due date with estimated lumber demand and remaining balance.">
          <div className="grid gap-2">
            {openJobPlans.slice(0, 6).map(({ job, product, estimate, due }) => (
              <div key={job.id} className="grid gap-3 rounded-md bg-linen p-3 text-lg lg:grid-cols-[1.1fr_1fr_0.8fr_0.7fr] lg:items-center">
                <div>
                  <div className="font-bold text-bark">{job.customerName}</div>
                  <div className="text-sm text-barkSoft">{product.name}</div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className={`rounded-full px-2 py-1 text-xs font-bold ${dueBadgeClass(due.tone)}`}>{due.label}</span>
                  <span className="rounded-full bg-white px-2 py-1 text-xs font-bold text-bark">{job.status}</span>
                </div>
                <div>
                  <div className="text-sm text-barkSoft">Build lumber</div>
                  <div className="font-bold">{numberFormat(estimate.wasteAdjustedBoardFeet, 1)} bf</div>
                </div>
                <div>
                  <div className="text-sm text-barkSoft">Balance</div>
                  <div className="font-bold">{money(job.balanceOwed)}</div>
                </div>
              </div>
            ))}
            {openJobPlans.length === 0 ? <EmptyState title="No active production queue" message="Jobs marked delivered or paid are hidden from this queue." /> : null}
          </div>
        </Section>

        <Section title="Lumber Runway" description="Compares usable board feet on hand against active job demand.">
          <div className="grid gap-3">
            <MetricCard label="Usable lumber on hand" value={`${numberFormat(availableBoardFeet, 1)} bf`} />
            <MetricCard label="Committed to open jobs" value={`${numberFormat(committedBoardFeet, 1)} bf`} tone={committedBoardFeet > availableBoardFeet ? "warn" : "good"} />
            <MetricCard label="Buffer after queue" value={`${numberFormat(boardFootBuffer, 1)} bf`} tone={boardFootBuffer < 0 ? "warn" : "good"} />
            <div className="rounded-md bg-linen p-3 text-base text-barkSoft">
              {boardFootBuffer < 0
                ? `Buy or source about ${numberFormat(Math.abs(boardFootBuffer), 1)} more usable board feet before committing to the full queue.`
                : `You have enough entered lumber for the active queue, with about ${numberFormat(boardFootBuffer, 1)} usable board feet left over.`}
            </div>
          </div>
        </Section>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <Section title="Most Profitable Sizes">
          <ProfitList items={profitability.slice(0, 5)} />
        </Section>
        <Section title="Lowest Margin Sizes">
          <ProfitList items={[...profitability].reverse().slice(0, 5)} />
        </Section>
      </div>
    </div>
  );
}

function ProfitList({ items }: { items: { product: Product; profit: number; margin: number }[] }) {
  return (
    <div className="grid gap-2">
      {items.map(({ product, profit, margin }) => (
        <div key={product.id} className="grid grid-cols-[1fr_auto_auto] gap-3 rounded-md bg-linen p-3 text-lg">
          <div className="font-bold">{product.name}</div>
          <div>{money(profit)}</div>
          <div className="font-bold">{numberFormat(margin, 1)}%</div>
        </div>
      ))}
    </div>
  );
}

function ProductTable({
  products,
  onChange,
  onSave,
  onLoad,
  profitability,
}: {
  products: Product[];
  onChange: (product: Product, index: number) => void;
  onSave: (product: Product, index: number) => void;
  onLoad: (product: Product) => void;
  profitability: { product: Product; profit: number; margin: number }[];
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1180px] border-separate border-spacing-y-2 text-left">
        <thead className="text-sm uppercase text-barkSoft">
          <tr>
            <th className="px-3">Product</th>
            <th className="px-3">Size</th>
            <th className="px-3">Stock</th>
            <th className="px-3">Slats</th>
            <th className="px-3">Braces</th>
            <th className="px-3">Labor</th>
            <th className="px-3">Wholesale</th>
            <th className="px-3">Retail</th>
            <th className="px-3">Margin</th>
            <th className="px-3">Active</th>
            <th className="px-3">Action</th>
          </tr>
        </thead>
        <tbody>
          {products.map((product, index) => {
            const profit = profitability.find((item) => item.product.id === product.id);
            const update = <K extends keyof Product>(key: K, value: Product[K]) => {
              onChange({ ...product, [key]: value }, index);
            };

            return (
              <tr key={product.id} className="bg-linen text-lg">
                <td className="rounded-l-md px-3 py-3 font-bold">
                  <TextInput value={product.name} onChange={(event) => update("name", event.target.value)} />
                </td>
                <td className="px-3 py-3">
                  <div className="grid grid-cols-3 gap-2">
                    <TextInput value={product.dimensions} onChange={(event) => update("dimensions", event.target.value)} aria-label="Dimensions label" />
                    <TextInput type="number" value={product.widthFeet} onChange={(event) => update("widthFeet", numericValue(event.target.value))} aria-label="Width feet" />
                    <TextInput type="number" value={product.heightFeet} onChange={(event) => update("heightFeet", numericValue(event.target.value))} aria-label="Height feet" />
                  </div>
                </td>
                <td className="px-3 py-3">
                  <SelectInput value={product.stockType} onChange={(event) => {
                    const stockType = event.target.value as Product["stockType"];
                    onChange({
                      ...product,
                      stockType,
                      thicknessInches: stockType === "1 1/8\"" ? 1.125 : 0.75,
                    }, index);
                  }}>
                    <option>3/4&quot;</option>
                    <option>1 1/8&quot;</option>
                  </SelectInput>
                </td>
                <td className="px-3 py-3">
                  <div className="grid grid-cols-2 gap-2">
                    <TextInput type="number" value={product.verticalSlatCount} onChange={(event) => update("verticalSlatCount", numericValue(event.target.value))} aria-label="Vertical slats" />
                    <TextInput type="number" value={product.horizontalSlatCount} onChange={(event) => update("horizontalSlatCount", numericValue(event.target.value))} aria-label="Horizontal slats" />
                  </div>
                </td>
                <td className="px-3 py-3">
                  <TextInput type="number" value={product.diagonalBraceCount} onChange={(event) => update("diagonalBraceCount", numericValue(event.target.value))} />
                </td>
                <td className="px-3 py-3">
                  <TextInput type="number" value={product.estimatedLaborMinutes} onChange={(event) => update("estimatedLaborMinutes", numericValue(event.target.value))} />
                </td>
                <td className="px-3 py-3">
                  <TextInput type="number" value={product.wholesalePrice} onChange={(event) => update("wholesalePrice", numericValue(event.target.value))} />
                </td>
                <td className="px-3 py-3 font-bold">
                  <TextInput type="number" value={product.retailPrice} onChange={(event) => update("retailPrice", numericValue(event.target.value))} />
                </td>
                <td className="px-3 py-3">{profit ? `${numberFormat(profit.margin, 1)}%` : "-"}</td>
                <td className="px-3 py-3">
                  <SelectInput value={product.active ? "active" : "inactive"} onChange={(event) => update("active", event.target.value === "active")}>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </SelectInput>
                </td>
                <td className="rounded-r-md px-3 py-3">
                  <div className="flex gap-2">
                    <button type="button" onClick={() => onSave(product, index)} className="rounded-md bg-moss p-3 text-white" aria-label="Save product">
                      <Save className="h-5 w-5" />
                    </button>
                    <button type="button" onClick={() => onLoad(product)} className="rounded-md bg-bark px-3 py-2 text-base font-bold text-white">
                      Calculate
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function QuoteEditor({
  quote,
  setQuote,
  addQuote,
  products,
  productById,
}: {
  quote: Quote;
  setQuote: Dispatch<SetStateAction<Quote>>;
  addQuote: () => void;
  products: Product[];
  productById: (id: string) => Product;
}) {
  const product = productById(quote.productId);
  const financials = quoteFinancials(quote);
  const tone = quoteTone(financials.marginPercentage);
  const productRetail = product.retailPrice * quote.quantity;
  const productWholesale = product.wholesalePrice * quote.quantity;
  const floorPrice = Math.ceil(financials.cost * 1.45);

  function update<K extends keyof Quote>(key: K, value: Quote[K]) {
    setQuote((current) => ({ ...current, [key]: value }));
  }

  function applyProductPrice() {
    setQuote((current) => ({
      ...current,
      calculatedCost: product.wholesalePrice * current.quantity,
      quotedPrice: product.retailPrice * current.quantity,
      depositAmount: suggestedDeposit(product.retailPrice * current.quantity),
    }));
  }

  return (
    <div className="grid gap-4 rounded-lg bg-linen p-4">
      <div className="rounded-md border border-shop bg-white p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-2xl font-bold text-bark">Quote builder</h3>
            <p className="text-base text-barkSoft">Price the job, collect a real deposit, and keep the balance visible before it becomes a shop job.</p>
          </div>
          <span className={`rounded-full px-3 py-1 text-sm font-bold ${tone.className}`}>{tone.label}</span>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Customer price" value={money(financials.revenue)} tone="good" />
          <MetricCard label="Gross profit" value={money(financials.profit)} tone={financials.profit >= 0 ? "good" : "warn"} help={`${numberFormat(financials.marginPercentage, 1)}% margin`} />
          <MetricCard label="Deposit" value={money(financials.deposit)} help={`${numberFormat(financials.depositPercentage, 0)}% collected`} />
          <MetricCard label="Balance" value={money(financials.balance)} />
        </div>
        {financials.marginPercentage < 30 ? (
          <div className="mt-3 rounded-md border border-redwood/30 bg-redwood/10 p-3 text-base font-bold text-redwood">
            Raise this quote toward at least {money(floorPrice)} or reduce labor/material cost before sending.
          </div>
        ) : null}
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <Field label="Customer name"><TextInput value={quote.customerName} onChange={(event) => update("customerName", event.target.value)} /></Field>
        <Field label="Phone"><TextInput value={quote.phone} onChange={(event) => update("phone", event.target.value)} /></Field>
        <Field label="Email"><TextInput value={quote.email} onChange={(event) => update("email", event.target.value)} /></Field>
        <Field label="Product">
          <SelectInput
            value={quote.productId}
            onChange={(event) => {
              const nextProduct = productById(event.target.value);
              setQuote((current) => {
                const nextPrice = nextProduct.retailPrice * current.quantity;
                return {
                  ...current,
                  productId: nextProduct.id,
                  calculatedCost: nextProduct.wholesalePrice * current.quantity,
                  quotedPrice: nextPrice,
                  depositAmount: suggestedDeposit(nextPrice),
                };
              });
            }}
          >
            {products.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}
          </SelectInput>
        </Field>
        <Field label="Quantity"><TextInput type="number" value={quote.quantity} onChange={(event) => {
          const quantity = numericValue(event.target.value);
          const nextPrice = product.retailPrice * quantity;
          setQuote((current) => ({
            ...current,
            quantity,
            calculatedCost: product.wholesalePrice * quantity,
            quotedPrice: nextPrice,
            depositAmount: suggestedDeposit(nextPrice),
          }));
        }} /></Field>
        <Field label="Custom dimensions"><TextInput value={quote.customDimensions} onChange={(event) => update("customDimensions", event.target.value)} /></Field>
        <Field label="Calculated cost"><TextInput type="number" value={quote.calculatedCost} onChange={(event) => update("calculatedCost", numericValue(event.target.value))} /></Field>
        <Field label="Quoted price"><TextInput type="number" value={quote.quotedPrice} onChange={(event) => update("quotedPrice", numericValue(event.target.value))} /></Field>
        <Field label="Deposit"><TextInput type="number" value={quote.depositAmount} onChange={(event) => update("depositAmount", numericValue(event.target.value))} /></Field>
        <Field label="Valid until"><TextInput type="date" value={quote.validUntil} onChange={(event) => update("validUntil", event.target.value)} /></Field>
        <Field label="Status">
          <SelectInput value={quote.status} onChange={(event) => update("status", event.target.value as Quote["status"])}>
            <option>draft</option>
            <option>sent</option>
            <option>accepted</option>
            <option>declined</option>
          </SelectInput>
        </Field>
      </div>

      <div className="grid gap-2 rounded-md border border-shop bg-white p-3 text-base text-barkSoft md:grid-cols-3">
        <div><strong className="text-bark">Catalog retail:</strong> {money(productRetail)}</div>
        <div><strong className="text-bark">Catalog wholesale:</strong> {money(productWholesale)}</div>
        <div><strong className="text-bark">Suggested deposit:</strong> {money(suggestedDeposit(quote.quotedPrice))}</div>
      </div>

      <textarea value={quote.notes} onChange={(event) => update("notes", event.target.value)} className="min-h-24 rounded-md border border-shop bg-white p-3 text-lg text-bark outline-none focus:border-redwood" />
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={applyProductPrice} className="h-12 rounded-md bg-bark px-4 text-lg font-bold text-white hover:bg-bark/90">
          Reset to catalog price
        </button>
        <button type="button" onClick={() => update("depositAmount", suggestedDeposit(quote.quotedPrice))} className="h-12 rounded-md bg-clay px-4 text-lg font-bold text-white hover:bg-clay/90">
          Set 50% deposit
        </button>
        <button type="button" onClick={addQuote} className="h-12 rounded-md bg-redwood px-4 text-lg font-bold text-white hover:bg-redwoodDark">
          Save quote
        </button>
      </div>
    </div>
  );
}

function PrintableQuote({
  quote,
  product,
  textMessageQuote,
}: {
  quote: Quote;
  product: Product;
  textMessageQuote: string;
}) {
  const financials = quoteFinancials(quote);

  return (
    <div className="rounded-lg border border-shop bg-white p-5">
      <div className="mb-3 flex flex-wrap gap-2 no-print">
        <button type="button" onClick={() => window.print()} className="flex h-11 items-center gap-2 rounded-md bg-bark px-3 font-bold text-white">
          <Printer className="h-5 w-5" /> Print
        </button>
        <button type="button" onClick={() => navigator.clipboard.writeText(textMessageQuote)} className="flex h-11 items-center gap-2 rounded-md bg-moss px-3 font-bold text-white">
          <Copy className="h-5 w-5" /> Copy text quote
        </button>
      </div>
      <div className="print-quote rounded-md border border-shop p-5">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-shop pb-4">
          <div>
            <h3 className="text-3xl font-bold text-bark">Redwood Trellis Quote</h3>
            <p className="mt-1 text-lg text-barkSoft">Prepared for {quote.customerName}</p>
          </div>
          <div className="text-right text-base text-barkSoft">
            <div className="font-bold text-bark">Dennis Ellis Trellis</div>
            <div>Handcrafted redwood trellises</div>
          </div>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <div className="rounded-md bg-linen p-4">
            <h4 className="text-lg font-bold text-bark">Customer</h4>
            <div className="mt-2 grid gap-1 text-base text-barkSoft">
              <div>{quote.customerName}</div>
              <div>{quote.phone}</div>
              <div>{quote.email}</div>
            </div>
          </div>
          <div className="rounded-md bg-linen p-4">
            <h4 className="text-lg font-bold text-bark">Quote terms</h4>
            <div className="mt-2 grid gap-1 text-base text-barkSoft">
              <div>Quote status: {quote.status}</div>
              <div>Valid until: {quote.validUntil}</div>
              <div>Deposit required to start: {money(financials.deposit)}</div>
            </div>
          </div>
        </div>

        <div className="mt-5 grid gap-2 text-lg">
          <div><strong>Product:</strong> {product.name}</div>
          <div><strong>Quantity:</strong> {quote.quantity}</div>
          {quote.customDimensions ? <div><strong>Custom dimensions:</strong> {quote.customDimensions}</div> : null}
          <div><strong>Quoted price:</strong> {money(financials.revenue)}</div>
          <div><strong>Deposit:</strong> {money(financials.deposit)}</div>
          <div><strong>Balance due on completion:</strong> {money(financials.balance)}</div>
          <div><strong>Notes:</strong> {quote.notes}</div>
        </div>

        <div className="mt-5 rounded-md border border-shop bg-linen p-4 text-base text-barkSoft">
          <strong className="text-bark">Next step:</strong> Approve the quote and pay the deposit so materials can be allocated and the build can be placed on the production schedule.
        </div>
      </div>
      <div className="mt-3 rounded-md bg-linen p-3 text-base text-bark no-print">{textMessageQuote}</div>
    </div>
  );
}

function QuoteList({
  quotes,
  products,
  onCreateJob,
  onChange,
  onDelete,
  onSave,
  productById,
}: {
  quotes: Quote[];
  products: Product[];
  onCreateJob: (quote: Quote) => void;
  onChange: (quote: Quote, index: number) => void;
  onDelete: (quote: Quote) => void;
  onSave: (quote: Quote, index: number) => void;
  productById: (id: string) => Product;
}) {
  return (
    <div className="grid gap-2">
      {quotes.length === 0 ? (
        <EmptyState title="No saved quotes yet" message="Save a quote from the form to track customer pricing and follow-up." />
      ) : null}
      {quotes.map((quote, index) => (
        <EditableQuote
          key={quote.id}
          quote={quote}
          products={products}
          productById={productById}
          onChange={(nextQuote) => onChange(nextQuote, index)}
          onCreateJob={onCreateJob}
          onDelete={onDelete}
          onSave={(nextQuote) => onSave(nextQuote, index)}
        />
      ))}
    </div>
  );
}

function EditableQuote({
  quote,
  products,
  productById,
  onChange,
  onCreateJob,
  onDelete,
  onSave,
}: {
  quote: Quote;
  products: Product[];
  productById: (id: string) => Product;
  onChange: (quote: Quote) => void;
  onCreateJob: (quote: Quote) => void;
  onDelete: (quote: Quote) => void;
  onSave: (quote: Quote) => void;
}) {
  const [draft, setDraft] = useState(quote);
  const product = productById(draft.productId);
  const financials = quoteFinancials(draft);
  const marginTone = quoteTone(financials.marginPercentage);
  const copyText = buildQuoteMessage(draft, product);

  function update<K extends keyof Quote>(key: K, value: Quote[K]) {
    const nextQuote = { ...draft, [key]: value };
    setDraft(nextQuote);
    onChange(nextQuote);
  }

  function updateProduct(productId: string) {
    const nextProduct = productById(productId);
    const nextPrice = nextProduct.retailPrice * draft.quantity;
    const nextQuote = {
      ...draft,
      productId,
      calculatedCost: nextProduct.wholesalePrice * draft.quantity,
      quotedPrice: nextPrice,
      depositAmount: suggestedDeposit(nextPrice),
    };
    setDraft(nextQuote);
    onChange(nextQuote);
  }

  return (
    <div className="rounded-md border border-shop bg-linen p-3 text-lg">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="text-xl font-bold text-bark">{draft.customerName}</div>
          <div className="text-sm text-barkSoft">{product.name} · {money(financials.revenue)} quote · {money(financials.balance)} balance</div>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className={`rounded-full px-3 py-1 text-xs font-bold ${quoteStatusClass(draft.status)}`}>{draft.status}</span>
          <span className={`rounded-full px-3 py-1 text-xs font-bold ${marginTone.className}`}>{numberFormat(financials.marginPercentage, 1)}% margin</span>
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-[1.2fr_1.4fr_0.7fr_0.8fr_0.8fr_0.8fr]">
        <Field label="Customer">
          <TextInput value={draft.customerName} onChange={(event) => update("customerName", event.target.value)} />
        </Field>
        <Field label="Product">
          <SelectInput value={draft.productId} onChange={(event) => updateProduct(event.target.value)}>
            {products.map((product) => <option value={product.id} key={product.id}>{product.name}</option>)}
          </SelectInput>
        </Field>
        <Field label="Qty">
          <TextInput
            type="number"
            value={draft.quantity}
            onChange={(event) => {
              const quantity = numericValue(event.target.value);
              const nextPrice = product.retailPrice * quantity;
              const nextQuote = {
                ...draft,
                quantity,
                calculatedCost: product.wholesalePrice * quantity,
                quotedPrice: nextPrice,
                depositAmount: suggestedDeposit(nextPrice),
              };
              setDraft(nextQuote);
              onChange(nextQuote);
            }}
          />
        </Field>
        <Field label="Price">
          <TextInput type="number" value={draft.quotedPrice} onChange={(event) => update("quotedPrice", numericValue(event.target.value))} />
        </Field>
        <Field label="Deposit">
          <TextInput type="number" value={draft.depositAmount} onChange={(event) => update("depositAmount", numericValue(event.target.value))} />
        </Field>
        <Field label="Status">
          <SelectInput value={draft.status} onChange={(event) => update("status", event.target.value as Quote["status"])}>
            <option>draft</option>
            <option>sent</option>
            <option>accepted</option>
            <option>declined</option>
          </SelectInput>
        </Field>
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-[1fr_1fr_1fr_1.5fr_auto] lg:items-end">
        <Field label="Phone">
          <TextInput value={draft.phone} onChange={(event) => update("phone", event.target.value)} />
        </Field>
        <Field label="Email">
          <TextInput value={draft.email} onChange={(event) => update("email", event.target.value)} />
        </Field>
        <Field label="Valid until">
          <TextInput type="date" value={draft.validUntil} onChange={(event) => update("validUntil", event.target.value)} />
        </Field>
        <Field label="Notes">
          <TextInput value={draft.notes} onChange={(event) => update("notes", event.target.value)} />
        </Field>
        <div className="flex gap-2">
          <button type="button" onClick={() => navigator.clipboard.writeText(copyText)} className="rounded-md bg-clay p-3 text-white" aria-label="Copy quote text">
            <Copy className="h-5 w-5" />
          </button>
          <button type="button" onClick={() => onSave(draft)} className="rounded-md bg-moss p-3 text-white" aria-label="Save quote">
            <Save className="h-5 w-5" />
          </button>
          <button type="button" onClick={() => onCreateJob(draft)} className="rounded-md bg-bark p-3 text-white" aria-label="Make job">
            <Pencil className="h-5 w-5" />
          </button>
          <button type="button" onClick={() => onDelete(draft)} className="rounded-md bg-redwood p-3 text-white" aria-label="Delete quote">
            <Trash2 className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="mt-3 grid gap-2 rounded-md bg-white p-3 text-base text-barkSoft sm:grid-cols-4">
        <div><strong className="text-bark">Cost:</strong> {money(financials.cost)}</div>
        <div><strong className="text-bark">Profit:</strong> {money(financials.profit)}</div>
        <div><strong className="text-bark">Deposit:</strong> {numberFormat(financials.depositPercentage, 0)}%</div>
        <div><strong className="text-bark">Balance:</strong> {money(financials.balance)}</div>
      </div>
    </div>
  );
}


function JobBoard({
  jobs,
  products,
  productById,
  onChange,
  onSave,
  onDelete,
}: {
  jobs: Job[];
  products: Product[];
  productById: (id: string) => Product;
  onChange: (job: Job, index: number) => void;
  onSave: (job: Job, index: number) => void;
  onDelete: (job: Job) => void;
}) {
  const openJobs = jobs
    .map((job, index) => ({ job, index }))
    .filter(({ job }) => isOpenJob(job))
    .map(({ job, index }) => ({ job, index, due: dueSignal(job.dueDate) }))
    .sort((a, b) => a.job.dueDate.localeCompare(b.job.dueDate));

  const completedJobs = jobs
    .map((job, index) => ({ job, index }))
    .filter(({ job }) => !isOpenJob(job))
    .map(({ job, index }) => ({ job, index, due: dueSignal(job.dueDate) }));

  const totalOpenBalance = openJobs.reduce((sum, item) => sum + item.job.balanceOwed, 0);
  const overdueOrDueSoon = openJobs.filter((item) => item.due.tone === "bad" || item.due.tone === "warn").length;
  const readyJobs = jobs.filter((job) => job.status === "ready").length;
  const paidJobs = jobs.filter((job) => job.status === "paid").length;

  if (jobs.length === 0) {
    return <EmptyState title="No jobs yet" message="Accepted quotes can be turned into jobs from the Quotes tab." />;
  }

  return (
    <div className="grid gap-5">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Open balance" value={money(totalOpenBalance)} tone={totalOpenBalance > 0 ? "warn" : "good"} />
        <MetricCard label="Due soon / overdue" value={String(overdueOrDueSoon)} tone={overdueOrDueSoon > 0 ? "warn" : "good"} />
        <MetricCard label="Ready for delivery" value={String(readyJobs)} />
        <MetricCard label="Paid jobs" value={String(paidJobs)} tone="good" />
      </div>

      <div className="grid gap-4">
        <div className="rounded-lg border border-shop bg-white p-4">
          <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
            <div>
              <h3 className="text-2xl font-bold text-bark">Active production board</h3>
              <p className="text-base text-barkSoft">Sorted by due date. Use Advance to move each job through the shop.</p>
            </div>
            <div className="rounded-full bg-linen px-3 py-1 text-sm font-bold text-bark">{openJobs.length} open</div>
          </div>
          <div className="grid gap-3">
            {openJobs.map(({ job, index, due }) => (
              <EditableJob
                key={job.id}
                job={job}
                index={index}
                products={products}
                due={due}
                productById={productById}
                onChange={onChange}
                onSave={onSave}
                onDelete={onDelete}
              />
            ))}
            {openJobs.length === 0 ? <EmptyState title="No active jobs" message="Delivered and paid jobs are stored below." /> : null}
          </div>
        </div>

        <div className="rounded-lg border border-shop bg-white p-4">
          <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
            <div>
              <h3 className="text-2xl font-bold text-bark">Completed / closed jobs</h3>
              <p className="text-base text-barkSoft">Delivered and paid work stays here for reference.</p>
            </div>
            <div className="rounded-full bg-linen px-3 py-1 text-sm font-bold text-bark">{completedJobs.length} closed</div>
          </div>
          <div className="grid gap-2">
            {completedJobs.map(({ job, index, due }) => (
              <EditableJob
                key={job.id}
                job={job}
                index={index}
                products={products}
                due={due}
                productById={productById}
                onChange={onChange}
                onSave={onSave}
                onDelete={onDelete}
              />
            ))}
            {completedJobs.length === 0 ? <EmptyState title="No closed jobs yet" message="Jobs move here when marked delivered or paid." /> : null}
          </div>
        </div>
      </div>
    </div>
  );
}

function EditableJob({
  job,
  index,
  products,
  due,
  productById,
  onChange,
  onSave,
  onDelete,
}: {
  job: Job;
  index: number;
  products: Product[];
  due: ReturnType<typeof dueSignal>;
  productById: (id: string) => Product;
  onChange: (job: Job, index: number) => void;
  onSave: (job: Job, index: number) => void;
  onDelete: (job: Job) => void;
}) {
  const [draft, setDraft] = useState(job);
  const activeProduct = productById(draft.productId);
  const progress = jobProgress(draft.status);
  const statusClass = jobStatusClass(draft.status);
  const copyText = buildJobMessage(draft, activeProduct);

  function update<K extends keyof Job>(key: K, value: Job[K]) {
    const nextJob = { ...draft, [key]: value };
    setDraft(nextJob);
    onChange(nextJob, index);
  }

  function save(nextJob = draft) {
    setDraft(nextJob);
    onChange(nextJob, index);
    onSave(nextJob, index);
  }

  function advance() {
    const nextStatus = nextJobStatus(draft.status);
    const nextBalance = nextStatus === "paid" ? 0 : draft.balanceOwed;
    const nextJob = { ...draft, status: nextStatus, balanceOwed: nextBalance };
    save(nextJob);
  }

  return (
    <div className="rounded-md border border-shop bg-linen p-4">
      <div className="grid gap-4 xl:grid-cols-[1fr_1.2fr_0.8fr] xl:items-start">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="text-2xl font-bold text-bark">{draft.customerName}</h4>
            <span className={`rounded-full px-3 py-1 text-xs font-bold ${statusClass}`}>{draft.status}</span>
            <span className={`rounded-full px-3 py-1 text-xs font-bold ${dueBadgeClass(due.tone)}`}>{due.label}</span>
          </div>
          <div className="mt-2 text-base text-barkSoft">{activeProduct.name} · {activeProduct.dimensions} · {money(draft.balanceOwed)} owed</div>
          <div className="mt-3 h-3 overflow-hidden rounded-full bg-white">
            <div className="h-full rounded-full bg-moss" style={{ width: `${progress}%` }} />
          </div>
          <div className="mt-1 text-sm font-bold text-barkSoft">{progress}% through workflow</div>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Customer">
            <TextInput value={draft.customerName} onChange={(event) => update("customerName", event.target.value)} />
          </Field>
          <Field label="Product">
            <SelectInput value={draft.productId} onChange={(event) => update("productId", event.target.value)}>
              {products.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}
            </SelectInput>
          </Field>
          <Field label="Status">
            <SelectInput value={draft.status} onChange={(event) => update("status", event.target.value as Job["status"])}>
              {jobStatuses.map((status) => <option key={status}>{status}</option>)}
            </SelectInput>
          </Field>
          <Field label="Due date">
            <TextInput type="date" value={draft.dueDate} onChange={(event) => update("dueDate", event.target.value)} />
          </Field>
          <Field label="Balance owed">
            <TextInput type="number" value={draft.balanceOwed} onChange={(event) => update("balanceOwed", numericValue(event.target.value))} />
          </Field>
          <Field label="Notes">
            <TextInput value={draft.notes} onChange={(event) => update("notes", event.target.value)} />
          </Field>
        </div>

        <div className="grid gap-2">
          <button type="button" onClick={advance} className="h-11 rounded-md bg-bark px-4 text-base font-bold text-white hover:bg-bark/90">
            Advance
          </button>
          <button type="button" onClick={() => navigator.clipboard.writeText(copyText)} className="h-11 rounded-md bg-clay px-4 text-base font-bold text-white hover:bg-clay/90">
            Copy update
          </button>
          <button type="button" onClick={() => save()} className="h-11 rounded-md bg-moss px-4 text-base font-bold text-white hover:bg-moss/90">
            Save
          </button>
          <button type="button" onClick={() => onDelete(draft)} className="h-11 rounded-md bg-redwood px-4 text-base font-bold text-white hover:bg-redwoodDark">
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

function SettingsPanel({
  settings,
  onChange,
  onSave,
  onApply,
}: {
  settings: ShopSettings;
  onChange: (settings: ShopSettings) => void;
  onSave: () => void;
  onApply: () => void;
}) {
  function update<K extends keyof ShopSettings>(key: K, value: ShopSettings[K]) {
    onChange({ ...settings, [key]: value });
  }

  return (
    <div className="grid gap-4">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Field label="Default board-foot cost">
          <TextInput type="number" value={settings.defaultBoardFootCost} onChange={(event) => update("defaultBoardFootCost", numericValue(event.target.value))} />
        </Field>
        <Field label="Default waste percentage">
          <TextInput type="number" value={settings.defaultWastePercentage} onChange={(event) => update("defaultWastePercentage", numericValue(event.target.value))} />
        </Field>
        <Field label="Default hardware cost">
          <TextInput type="number" value={settings.defaultHardwareCost} onChange={(event) => update("defaultHardwareCost", numericValue(event.target.value))} />
        </Field>
        <Field label="Default hourly labor rate">
          <TextInput type="number" value={settings.defaultHourlyLaborRate} onChange={(event) => update("defaultHourlyLaborRate", numericValue(event.target.value))} />
        </Field>
        <Field label="Default markup percentage">
          <TextInput type="number" value={settings.defaultMarkupPercentage} onChange={(event) => update("defaultMarkupPercentage", numericValue(event.target.value))} />
        </Field>
        <Field label="Default wholesale discount">
          <TextInput type="number" value={settings.defaultWholesaleDiscountPercentage} onChange={(event) => update("defaultWholesaleDiscountPercentage", numericValue(event.target.value))} />
        </Field>
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={onSave} className="h-12 rounded-md bg-moss px-4 text-lg font-bold text-white">
          Save settings
        </button>
        <button type="button" onClick={onApply} className="h-12 rounded-md bg-bark px-4 text-lg font-bold text-white">
          Apply to calculator
        </button>
      </div>
    </div>
  );
}

function updateBatch<K extends keyof LumberBatch>(
  index: number,
  key: K,
  value: LumberBatch[K],
  setLumberBatches: Dispatch<SetStateAction<LumberBatch[]>>,
) {
  setLumberBatches((current) =>
    current.map((batch, batchIndex) => batchIndex === index ? { ...batch, [key]: value } : batch),
  );
}

