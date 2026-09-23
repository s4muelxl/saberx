import { PurchaseOrderStatus } from './database';
export type { PurchaseOrderStatus };
import { Product } from './product';
import { Supplier } from './supplier';

export interface PurchaseOrderItem {
  id: string;
  purchase_order_id: string;
  product_id: string;
  quantity: number;
  unit: string;
  unit_price: number;
  total_price: number;
  ipi_percent: number;
  icms_percent: number;
  notes?: string;
  created_at: string;
  product?: Product;
}

export interface PurchaseOrder {
  id: string;
  organization_id: string;
  order_number: string;
  quotation_id?: string;
  supplier_id: string;
  responsible_user_id?: string;
  order_date: string;
  expected_delivery_date?: string;
  actual_delivery_date?: string;
  payment_terms?: string;
  shipping_terms?: string;
  subtotal: number;
  tax_amount: number;
  freight_amount: number;
  total_amount: number;
  status: PurchaseOrderStatus;
  notes?: string;
  created_at: string;
  updated_at: string;
  // Joins
  supplier?: Supplier;
  items?: PurchaseOrderItem[];
}
