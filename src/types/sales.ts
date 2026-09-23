import { SalesQuoteStatus } from './database';
export type { SalesQuoteStatus };
import { Customer } from './customer';
import { Product } from './product';

export interface SalesQuoteItem {
  id: string;
  sales_quote_id: string;
  product_id: string;
  quantity: number;
  unit: string;
  unit_cost: number;
  unit_sale_price: number;
  discount_percent: number;
  tax_percent: number;
  total_cost: number;
  total_sale: number;
  profit: number;
  margin_percent: number;
  created_at: string;
  product?: Product;
}

export interface SalesQuote {
  id: string;
  organization_id: string;
  quote_number: string;
  customer_id: string;
  responsible_user_id?: string;
  quote_date: string;
  valid_until?: string;
  total_cost: number;
  total_price: number;
  total_profit: number;
  margin_percent: number;
  status: SalesQuoteStatus;
  payment_terms?: string;
  delivery_terms?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  // Joins
  customer?: Customer;
  items?: SalesQuoteItem[];
}
