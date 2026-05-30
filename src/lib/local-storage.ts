import type { Job, LumberBatch, Product, Quote, ShopSettings } from "./types";

const STORAGE_KEY = "redwood-trellis-manager-data-v2-clean";

export type LocalAppData = {
  products: Product[];
  lumberBatches: LumberBatch[];
  quotes: Quote[];
  jobs: Job[];
  settings?: ShopSettings;
};

export function loadLocalData() {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as LocalAppData;
  } catch {
    return null;
  }
}

export function saveLocalData(data: LocalAppData) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}
