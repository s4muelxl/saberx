export interface Customer {
  id: string;
  organization_id: string;
  company_name: string;
  trade_name?: string;
  document?: string; // CNPJ / CPF
  email?: string;
  phone?: string;
  whatsapp?: string;
  address?: string;
  city?: string;
  state?: string;
  contact_person?: string;
  notes?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type CustomerInput = Omit<Customer, 'id' | 'organization_id' | 'created_at' | 'updated_at'>;
