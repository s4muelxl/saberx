import { PriceUnit, QuotationStatus, QuoteItemValidationStatus } from './database';
import { Product } from './product';
import { Supplier } from './supplier';

export interface Quotation {
  id: string;
  organization_id: string;
  quotation_number: string;
  project_name: string;
  related_client?: string;
  responsible_user_id?: string;
  responsible_user_name?: string;
  quotation_date: string;
  deadline_date?: string;
  notes?: string;
  status: QuotationStatus;
  approved_by?: string;
  approved_at?: string;
  created_at: string;
  updated_at: string;
}

export interface QuotationItem {
  id: string;
  quotation_id: string;
  product_id: string;
  item_order: number;
  quantity_bars: number;
  quantity_meters: number;
  estimated_weight_kg: number;
  target_price?: number;
  notes?: string;
  created_at: string;
  // Join
  product?: Product;
}

export interface SupplierQuote {
  id: string;
  quotation_id: string;
  supplier_id: string;
  proposal_number?: string;
  proposal_date?: string;
  validity_days?: number;
  payment_terms?: string;
  delivery_time_days?: number;
  freight_type?: 'CIF' | 'FOB';
  freight_amount?: number;
  calculated_subtotal: number;
  official_proposal_total: number;
  notes?: string;
  created_at: string;
  updated_at: string;
  // Join
  supplier?: Supplier;
  items?: SupplierQuoteItem[];
}

export interface SupplierQuoteItem {
  id: string;
  supplier_quote_id: string;
  quotation_item_id: string;
  quoted_quantity: number;
  weight_kg: number;
  unit_price: number;
  price_unit: PriceUnit;
  ipi_percent: number;
  icms_percent: number;
  calculated_total: number;
  validation_status: QuoteItemValidationStatus;
  manual_exclude_from_lowest: boolean;
  manual_exclude_reason?: string;
  divergent_product_reason?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface QuotationFull extends Quotation {
  items: QuotationItem[];
  supplier_quotes: SupplierQuote[];
}
