export type UserRole = 'ADMIN' | 'COMPRAS' | 'VENDAS' | 'VISUALIZADOR';

export type QuotationStatus = 
  | 'RASCUNHO'
  | 'EM_COTACAO'
  | 'AGUARDANDO_APROVACAO'
  | 'APROVADA'
  | 'REJEITADA'
  | 'FINALIZADA'
  | 'CANCELADA';

export type QuoteItemValidationStatus =
  | 'VALIDA'
  | 'QUANTIDADE_INSUFICIENTE'
  | 'PRODUTO_DIVERGENTE'
  | 'NAO_COTADO'
  | 'PRECO_AUSENTE'
  | 'EXCLUIDA_MANUALMENTE';

export type PurchaseOrderStatus =
  | 'RASCUNHO'
  | 'APROVADO'
  | 'ENVIADO'
  | 'CONFIRMADO'
  | 'EM_TRANSPORTE'
  | 'RECEBIDO'
  | 'CANCELADO';

export type SalesQuoteStatus =
  | 'RASCUNHO'
  | 'ENVIADO'
  | 'NEGOCIACAO'
  | 'APROVADO'
  | 'REJEITADO'
  | 'FATURADO'
  | 'CANCELADO';

export type PriceUnit = 'kg' | 'pç' | 'barra' | 'metro' | 'tonelada' | 'unidade';

export interface Organization {
  id: string;
  name: string;
  trade_name?: string;
  document_cnpj?: string;
  phone?: string;
  email?: string;
  logo_url?: string;
  created_at: string;
  updated_at: string;
}

export interface UserProfile {
  id: string;
  organization_id: string;
  organization_name?: string;
  full_name: string;
  email: string;
  phone?: string;
  position?: string;
  department?: string;
  role: UserRole;
  avatar_url?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
