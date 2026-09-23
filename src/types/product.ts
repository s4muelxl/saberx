export interface Product {
  id: string;
  organization_id: string;
  codigo_mpr: string;
  sku?: string;
  description: string;
  category: string;
  subcategory?: string;
  material?: string;
  standard?: string;
  dimensions?: string;
  stock_unit: string;
  purchase_unit: string;
  weight_unit_kg: number;
  length_unit_meters: number;
  reference_price?: number;
  min_stock?: number;
  is_active: boolean;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export type ProductInput = Omit<Product, 'id' | 'organization_id' | 'created_at' | 'updated_at'>;
