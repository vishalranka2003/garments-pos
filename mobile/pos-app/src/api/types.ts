export type PaymentMethod = "cash" | "upi" | "card";

export interface StoreOut {
  id: string;
  name: string;
  owner_id: string;
}

export interface ProductVariantOut {
  id: string;
  size: string;
  color: string;
  sku: string;
  barcode_value: string;
  price: string;
  stock_quantity: number;
}

export interface ProductOut {
  id: string;
  store_id: string;
  name: string;
  category: string;
  created_at: string;
  variants: ProductVariantOut[];
}

export interface InventoryItemOut {
  variant_id: string;
  product_id: string;
  product_name: string;
  sku: string;
  size: string;
  color: string;
  stock_quantity: number;
  price: number;
}

export interface TopSellingProduct {
  product_id: string;
  product_name: string;
  total_quantity_sold: number;
}

export interface DashboardSummaryOut {
  today_sales: number;
  total_orders_today: number;
  top_selling_products: TopSellingProduct[];
}

export interface OrderItemOut {
  id: string;
  product_variant_id: string;
  quantity: number;
  price: string;
}

export interface OrderOut {
  id: string;
  store_id: string;
  total_amount: string;
  discount: string;
  final_amount: string;
  payment_method: PaymentMethod;
  created_at: string;
  items: OrderItemOut[];
}
