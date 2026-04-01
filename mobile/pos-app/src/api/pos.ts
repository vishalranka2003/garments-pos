import { apiFetch } from "./client";
import type {
  DashboardSummaryOut,
  InventoryItemOut,
  OrderOut,
  ProductOut,
  StoreOut,
} from "./types";

export async function listStores(): Promise<StoreOut[]> {
  return apiFetch<StoreOut[]>("/stores");
}

export async function createStore(name: string): Promise<StoreOut> {
  return apiFetch<StoreOut>("/stores", {
    method: "POST",
    body: JSON.stringify({ name }),
  });
}

export async function listProducts(storeId: string): Promise<ProductOut[]> {
  const q = new URLSearchParams({ store_id: storeId });
  return apiFetch<ProductOut[]>(`/products?${q.toString()}`);
}

export async function createProduct(payload: {
  store_id: string;
  name: string;
  category: string;
  variants: {
    size: string;
    color: string;
    sku: string;
    price: string;
    stock_quantity: number;
  }[];
}): Promise<ProductOut> {
  return apiFetch<ProductOut>("/products", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function listInventory(storeId: string): Promise<InventoryItemOut[]> {
  const q = new URLSearchParams({ store_id: storeId });
  return apiFetch<InventoryItemOut[]>(`/inventory?${q.toString()}`);
}

export async function getVariantBySku(
  storeId: string,
  sku: string
): Promise<InventoryItemOut> {
  const q = new URLSearchParams({ store_id: storeId, sku });
  return apiFetch<InventoryItemOut>(`/products/variant/by-sku?${q.toString()}`);
}

export async function getDashboardSummary(storeId: string): Promise<DashboardSummaryOut> {
  const q = new URLSearchParams({ store_id: storeId });
  return apiFetch<DashboardSummaryOut>(`/dashboard/summary?${q.toString()}`);
}

export async function createOrder(payload: {
  store_id: string;
  items: { product_variant_id: string; quantity: number }[];
  discount: string;
  payment_method: string;
}): Promise<OrderOut> {
  return apiFetch<OrderOut>("/orders", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
