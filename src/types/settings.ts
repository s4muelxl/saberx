export interface AppSettings {
  id?: string;
  organization_id: string;
  include_ipi_in_total: boolean;
  include_icms_in_total: boolean;
  default_price_unit: string;
  default_delivery_days: number;
  default_sales_margin_percent: number;
  updated_at?: string;
}
