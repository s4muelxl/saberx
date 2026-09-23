export interface Supplier {
  id: string;
  organization_id: string;
  company_name: string; // Razão social
  trade_name?: string; // Nome fantasia
  cnpj?: string;
  state_registration?: string; // Inscrição estadual
  email?: string;
  phone?: string;
  whatsapp?: string;
  address?: string;
  city?: string;
  state?: string;
  contact_person?: string;
  payment_terms?: string;
  default_lead_time_days?: number;
  notes?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type SupplierInput = Omit<Supplier, 'id' | 'organization_id' | 'created_at' | 'updated_at'>;
