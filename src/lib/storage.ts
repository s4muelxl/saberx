import { Product } from '../types/product';
import { Supplier } from '../types/supplier';
import { Customer } from '../types/customer';
import { Quotation, QuotationFull, QuotationItem, SupplierQuote, SupplierQuoteItem } from '../types/quotation';
import { PurchaseOrder, PurchaseOrderItem } from '../types/purchase';
import { SalesQuote, SalesQuoteItem } from '../types/sales';
import { AuditLog } from '../types/audit';
import { AppSettings } from '../types/settings';
import { UserProfile } from '../types/database';
import { calculateQuotationTotal, calculateSupplierSubtotal } from '../domain/calculations';
import { validateSupplierQuote } from '../domain/validations';

const STORAGE_KEYS = {
  PRODUCTS: 'saberx_products',
  SUPPLIERS: 'saberx_suppliers',
  CUSTOMERS: 'saberx_customers',
  QUOTATIONS: 'saberx_quotations',
  PURCHASE_ORDERS: 'saberx_purchase_orders',
  SALES_QUOTES: 'saberx_sales_quotes',
  AUDIT_LOGS: 'saberx_audit_logs',
  SETTINGS: 'saberx_settings',
  USERS: 'saberx_users',
  CURRENT_USER: 'saberx_current_user',
};

export const DEMO_ORG_ID = '00000000-0000-0000-0000-000000000001';

// Dados iniciais baseados fielmente na planilha real
export const INITIAL_PRODUCTS: Product[] = [
  {
    id: '10000000-0000-0000-0000-000000000001',
    organization_id: DEMO_ORG_ID,
    codigo_mpr: 'MPR-CAI-1500-0188-1020',
    sku: 'SKU-CAI-15',
    description: 'CANTONEIRA ABAS IGUAIS 1.1/2" x 3/16" - AISI 1020',
    category: 'Aço Carbono',
    subcategory: 'Cantoneiras',
    material: 'AISI 1020',
    standard: 'ASTM A36 / SAE 1020',
    dimensions: '1.1/2" x 3/16"',
    stock_unit: 'barra',
    purchase_unit: 'kg',
    weight_unit_kg: 16.76,
    length_unit_meters: 6.0,
    reference_price: 7.50,
    min_stock: 5,
    is_active: true,
    notes: 'Item padrão de linha da planilha de acesso',
    created_at: new Date('2026-09-01').toISOString(),
    updated_at: new Date('2026-09-01').toISOString(),
  },
  {
    id: '10000000-0000-0000-0000-000000000002',
    organization_id: DEMO_ORG_ID,
    codigo_mpr: 'MPR-CAI-2000-0188-1020',
    sku: 'SKU-CAI-20',
    description: 'CANTONEIRA ABAS IGUAIS 2" x 3/16" - AISI 1020',
    category: 'Aço Carbono',
    subcategory: 'Cantoneiras',
    material: 'AISI 1020',
    standard: 'ASTM A36 / SAE 1020',
    dimensions: '2" x 3/16"',
    stock_unit: 'barra',
    purchase_unit: 'kg',
    weight_unit_kg: 22.75,
    length_unit_meters: 6.0,
    reference_price: 7.80,
    min_stock: 10,
    is_active: true,
    notes: 'Item 2 da planilha de referência',
    created_at: new Date('2026-09-01').toISOString(),
    updated_at: new Date('2026-09-01').toISOString(),
  },
  {
    id: '10000000-0000-0000-0000-000000000003',
    organization_id: DEMO_ORG_ID,
    codigo_mpr: 'MPR-TIR-1000-0400-0048-1020',
    sku: 'SKU-TIR-10040',
    description: 'TUBO INDUSTRIAL RETANGULAR 100,00 X 40,00 X 4,75 - AISI 1020',
    category: 'Aço Carbono',
    subcategory: 'Tubos Retangulares',
    material: 'AISI 1020',
    standard: 'NBR 6591 / ASTM A500',
    dimensions: '100,00 X 40,00 X 4,75',
    stock_unit: 'barra',
    purchase_unit: 'kg',
    weight_unit_kg: 57.20,
    length_unit_meters: 6.0,
    reference_price: 8.10,
    min_stock: 8,
    is_active: true,
    notes: 'Item 3 da planilha',
    created_at: new Date('2026-09-01').toISOString(),
    updated_at: new Date('2026-09-01').toISOString(),
  },
  {
    id: '10000000-0000-0000-0000-000000000004',
    organization_id: DEMO_ORG_ID,
    codigo_mpr: 'MPR-TIR-0800-0400-0048-1020',
    sku: 'SKU-TIR-8040',
    description: 'TUBO INDUSTRIAL RETANGULAR 80,00 X 40,00 X 4,75 - AISI 1020',
    category: 'Aço Carbono',
    subcategory: 'Tubos Retangulares',
    material: 'AISI 1020',
    standard: 'NBR 6591 / ASTM A500',
    dimensions: '80,00 X 40,00 X 4,75',
    stock_unit: 'barra',
    purchase_unit: 'kg',
    weight_unit_kg: 48.10,
    length_unit_meters: 6.0,
    reference_price: 8.15,
    min_stock: 8,
    is_active: true,
    notes: 'Item 4 da planilha',
    created_at: new Date('2026-09-01').toISOString(),
    updated_at: new Date('2026-09-01').toISOString(),
  },
  {
    id: '10000000-0000-0000-0000-000000000005',
    organization_id: DEMO_ORG_ID,
    codigo_mpr: 'MPR-TIR-0800-0500-0030-1020',
    sku: 'SKU-TIR-8050',
    description: 'TUBO INDUSTRIAL RETANGULAR 80,00 X 50,00 X 3,00 - AISI 1020',
    category: 'Aço Carbono',
    subcategory: 'Tubos Retangulares',
    material: 'AISI 1020',
    standard: 'NBR 6591 / ASTM A500',
    dimensions: '80,00 X 50,00 X 3,00',
    stock_unit: 'barra',
    purchase_unit: 'kg',
    weight_unit_kg: 34.40,
    length_unit_meters: 6.0,
    reference_price: 8.30,
    min_stock: 6,
    is_active: true,
    notes: 'Item 5 da planilha',
    created_at: new Date('2026-09-01').toISOString(),
    updated_at: new Date('2026-09-01').toISOString(),
  }
];

export const INITIAL_SUPPLIERS: Supplier[] = [
  {
    id: '20000000-0000-0000-0000-000000000001',
    organization_id: DEMO_ORG_ID,
    company_name: 'JD Aço Indústria e Comércio Ltda',
    trade_name: 'JD Aço',
    cnpj: '01.234.567/0001-11',
    state_registration: '111.222.333.444',
    email: 'vendas@jdaco.com.br',
    phone: '(11) 4000-1111',
    whatsapp: '(11) 98888-1111',
    address: 'Av. Industrial do Aço, 500',
    city: 'São Paulo',
    state: 'SP',
    contact_person: 'Carlos Silva',
    payment_terms: '28 DDL',
    default_lead_time_days: 7,
    is_active: true,
    created_at: new Date('2026-09-01').toISOString(),
    updated_at: new Date('2026-09-01').toISOString(),
  },
  {
    id: '20000000-0000-0000-0000-000000000002',
    organization_id: DEMO_ORG_ID,
    company_name: 'Paulisteel Comercial de Ferro e Aço Ltda',
    trade_name: 'Paulisteel',
    cnpj: '02.345.678/0001-22',
    state_registration: '222.333.444.555',
    email: 'cotacao@paulisteel.com.br',
    phone: '(11) 4000-2222',
    whatsapp: '(11) 98888-2222',
    address: 'Rod. dos Bandeirantes, km 35',
    city: 'Campinas',
    state: 'SP',
    contact_person: 'Mariana Souza',
    payment_terms: '30 DDL',
    default_lead_time_days: 10,
    is_active: true,
    created_at: new Date('2026-09-01').toISOString(),
    updated_at: new Date('2026-09-01').toISOString(),
  },
  {
    id: '20000000-0000-0000-0000-000000000003',
    organization_id: DEMO_ORG_ID,
    company_name: 'Romeva Tubos Ltda',
    trade_name: 'Romeva Tubos',
    cnpj: '03.456.789/0001-33',
    state_registration: '333.444.555.666',
    email: 'comercial@romeva.com.br',
    phone: '(11) 4000-3333',
    whatsapp: '(11) 98888-3333',
    address: 'Rua das Indústrias, 1200',
    city: 'Guarulhos',
    state: 'SP',
    contact_person: 'Roberto Mendes',
    payment_terms: '28 DDL',
    default_lead_time_days: 5,
    is_active: true,
    created_at: new Date('2026-09-01').toISOString(),
    updated_at: new Date('2026-09-01').toISOString(),
  },
  {
    id: '20000000-0000-0000-0000-000000000004',
    organization_id: DEMO_ORG_ID,
    company_name: 'Luxfer Tubos e Aços Ltda',
    trade_name: 'Luxfer Tubos',
    cnpj: '04.567.890/0001-44',
    state_registration: '444.555.666.777',
    email: 'vendas@luxfer.com.br',
    phone: '(11) 4000-4444',
    whatsapp: '(11) 98888-4444',
    address: 'Distrito Industrial I, Lote 14',
    city: 'São Bernardo do Campo',
    state: 'SP',
    contact_person: 'Luciana Ferreira',
    payment_terms: '35 DDL',
    default_lead_time_days: 8,
    is_active: true,
    created_at: new Date('2026-09-01').toISOString(),
    updated_at: new Date('2026-09-01').toISOString(),
  }
];

export const INITIAL_CUSTOMERS: Customer[] = [
  {
    id: '30000000-0000-0000-0000-000000000001',
    organization_id: DEMO_ORG_ID,
    company_name: 'Estruturas Metálicas Brasil S.A.',
    trade_name: 'Metálicas Brasil',
    document: '55.444.333/0001-22',
    email: 'compras@metalicasbrasil.com.br',
    phone: '(11) 5555-1234',
    whatsapp: '(11) 97777-1234',
    address: 'Av. Paulista, 1000 - Cj 50',
    city: 'São Paulo',
    state: 'SP',
    contact_person: 'Eduardo Martins',
    is_active: true,
    created_at: new Date('2026-09-01').toISOString(),
    updated_at: new Date('2026-09-01').toISOString(),
  }
];

export const INITIAL_USERS: UserProfile[] = [
  {
    id: 'usr-admin',
    organization_id: DEMO_ORG_ID,
    full_name: 'Administrador Demo',
    email: 'admin@demo.local',
    phone: '(11) 99999-0001',
    position: 'Diretor Geral',
    department: 'Diretoria',
    role: 'ADMIN',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'usr-compras',
    organization_id: DEMO_ORG_ID,
    full_name: 'Comprador Técnico',
    email: 'compras@demo.local',
    phone: '(11) 99999-0002',
    position: 'Comprador Pleno',
    department: 'Suprimentos & Compras',
    role: 'COMPRAS',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'usr-vendas',
    organization_id: DEMO_ORG_ID,
    full_name: 'Executivo de Vendas',
    email: 'vendas@demo.local',
    phone: '(11) 99999-0003',
    position: 'Gerente Comercial',
    department: 'Vendas & Novos Negócios',
    role: 'VENDAS',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
];

export const INITIAL_SETTINGS: AppSettings = {
  organization_id: DEMO_ORG_ID,
  include_ipi_in_total: false,
  include_icms_in_total: false,
  default_price_unit: 'kg',
  default_delivery_days: 10,
  default_sales_margin_percent: 25.0
};

// Cotação Inicial Demo reproduzindo a Planilha Real
export const createInitialQuotation = (): QuotationFull => {
  const quotationId = 'cot-demo-001';

  const items: QuotationItem[] = [
    {
      id: 'qitem-1',
      quotation_id: quotationId,
      product_id: '10000000-0000-0000-0000-000000000001', // MPR-CAI-1500-0188-1020
      item_order: 1,
      quantity_bars: 26.94,
      quantity_meters: 161.64,
      estimated_weight_kg: 451.71,
      target_price: 7.50,
      notes: 'Item 1 da planilha real (Exemplo do problema de 2 barras vs 26.94)',
      created_at: new Date('2026-09-10').toISOString(),
      product: INITIAL_PRODUCTS[0]
    },
    {
      id: 'qitem-2',
      quotation_id: quotationId,
      product_id: '10000000-0000-0000-0000-000000000002', // MPR-CAI-2000-0188-1020
      item_order: 2,
      quantity_bars: 30.90,
      quantity_meters: 185.40,
      estimated_weight_kg: 702.98,
      target_price: 7.80,
      notes: 'Item 2 da planilha real (Exemplo de 30 barras vs 30.90)',
      created_at: new Date('2026-09-10').toISOString(),
      product: INITIAL_PRODUCTS[1]
    },
    {
      id: 'qitem-3',
      quotation_id: quotationId,
      product_id: '10000000-0000-0000-0000-000000000003', // MPR-TIR-1000-0400-0048-1020
      item_order: 3,
      quantity_bars: 10.00,
      quantity_meters: 60.00,
      estimated_weight_kg: 572.00,
      target_price: 8.10,
      notes: 'Item 3 da planilha',
      created_at: new Date('2026-09-10').toISOString(),
      product: INITIAL_PRODUCTS[2]
    }
  ];

  // Fornecedor 1: JD Aço (atendimento integral, itens válidos com valores reais da planilha)
  const sqJdAco: SupplierQuote = {
    id: 'sq-jd',
    quotation_id: quotationId,
    supplier_id: INITIAL_SUPPLIERS[0].id,
    proposal_number: 'ORC-JD-2026-889',
    proposal_date: '2026-09-12',
    validity_days: 7,
    payment_terms: '28 DDL',
    delivery_time_days: 7,
    freight_type: 'CIF',
    freight_amount: 0,
    calculated_subtotal: 18564.77,
    official_proposal_total: 18564.77,
    notes: 'Proposta comercial completa JD Aço',
    created_at: new Date('2026-09-12').toISOString(),
    updated_at: new Date('2026-09-12').toISOString(),
    supplier: INITIAL_SUPPLIERS[0],
    items: [
      {
        id: 'sqi-jd-1',
        supplier_quote_id: 'sq-jd',
        quotation_item_id: 'qitem-1',
        quoted_quantity: 26.94,
        weight_kg: 451.71,
        unit_price: 7.39, // R$ 7.39 / kg
        price_unit: 'kg',
        ipi_percent: 5.0,
        icms_percent: 18.0,
        calculated_total: 3338.14, // 451.71 * 7.39 = 3338.14
        validation_status: 'VALIDA',
        manual_exclude_from_lowest: false,
        created_at: new Date('2026-09-12').toISOString(),
        updated_at: new Date('2026-09-12').toISOString(),
      },
      {
        id: 'sqi-jd-2',
        supplier_quote_id: 'sq-jd',
        quotation_item_id: 'qitem-2',
        quoted_quantity: 30.90,
        weight_kg: 702.98,
        unit_price: 7.42,
        price_unit: 'kg',
        ipi_percent: 5.0,
        icms_percent: 18.0,
        calculated_total: 5216.11,
        validation_status: 'VALIDA',
        manual_exclude_from_lowest: false,
        created_at: new Date('2026-09-12').toISOString(),
        updated_at: new Date('2026-09-12').toISOString(),
      },
      {
        id: 'sqi-jd-3',
        supplier_quote_id: 'sq-jd',
        quotation_item_id: 'qitem-3',
        quoted_quantity: 10.00,
        weight_kg: 572.00,
        unit_price: 7.95,
        price_unit: 'kg',
        ipi_percent: 5.0,
        icms_percent: 18.0,
        calculated_total: 4547.40,
        validation_status: 'VALIDA',
        manual_exclude_from_lowest: false,
        created_at: new Date('2026-09-12').toISOString(),
        updated_at: new Date('2026-09-12').toISOString(),
      }
    ]
  };

  // Fornecedor 2: Paulisteel (casos de teste 3 e 4: cotou 2 pçs e 30 barras -> QUANTIDADE_INSUFICIENTE)
  const sqPaulisteel: SupplierQuote = {
    id: 'sq-pauli',
    quotation_id: quotationId,
    supplier_id: INITIAL_SUPPLIERS[1].id,
    proposal_number: 'ORC-PAULI-1022',
    proposal_date: '2026-09-12',
    validity_days: 5,
    payment_terms: '30 DDL',
    delivery_time_days: 10,
    freight_type: 'CIF',
    freight_amount: 0,
    calculated_subtotal: 5460.00,
    official_proposal_total: 5460.00,
    notes: 'Proposta Paulisteel com sobras de estoque',
    created_at: new Date('2026-09-12').toISOString(),
    updated_at: new Date('2026-09-12').toISOString(),
    supplier: INITIAL_SUPPLIERS[1],
    items: [
      {
        id: 'sqi-pauli-1',
        supplier_quote_id: 'sq-pauli',
        quotation_item_id: 'qitem-1',
        quoted_quantity: 2, // 2 < 26.94 -> QUANTIDADE_INSUFICIENTE
        weight_kg: 33.52,
        unit_price: 120.0,
        price_unit: 'pç',
        ipi_percent: 0,
        icms_percent: 18.0,
        calculated_total: 240.00, // Preço aparentemente baixo (R$ 240,00), mas inválido!
        validation_status: 'QUANTIDADE_INSUFICIENTE',
        manual_exclude_from_lowest: false,
        created_at: new Date('2026-09-12').toISOString(),
        updated_at: new Date('2026-09-12').toISOString(),
      },
      {
        id: 'sqi-pauli-2',
        supplier_quote_id: 'sq-pauli',
        quotation_item_id: 'qitem-2',
        quoted_quantity: 30, // 30 < 30.90 -> QUANTIDADE_INSUFICIENTE
        weight_kg: 682.50,
        unit_price: 7.30,
        price_unit: 'kg',
        ipi_percent: 5.0,
        icms_percent: 18.0,
        calculated_total: 4982.25,
        validation_status: 'QUANTIDADE_INSUFICIENTE',
        manual_exclude_from_lowest: false,
        created_at: new Date('2026-09-12').toISOString(),
        updated_at: new Date('2026-09-12').toISOString(),
      },
      {
        id: 'sqi-pauli-3',
        supplier_quote_id: 'sq-pauli',
        quotation_item_id: 'qitem-3',
        quoted_quantity: 0,
        weight_kg: 0,
        unit_price: 0,
        price_unit: 'kg',
        ipi_percent: 0,
        icms_percent: 0,
        calculated_total: 0,
        validation_status: 'NAO_COTADO',
        manual_exclude_from_lowest: false,
        created_at: new Date('2026-09-12').toISOString(),
        updated_at: new Date('2026-09-12').toISOString(),
      }
    ]
  };

  // Fornecedor 3: Romeva Tubos (caso de teste 6: produto divergente no item 3)
  const sqRomeva: SupplierQuote = {
    id: 'sq-romeva',
    quotation_id: quotationId,
    supplier_id: INITIAL_SUPPLIERS[2].id,
    proposal_number: 'ROM-9932',
    proposal_date: '2026-09-13',
    validity_days: 5,
    payment_terms: '28 DDL',
    delivery_time_days: 5,
    freight_type: 'CIF',
    freight_amount: 0,
    calculated_subtotal: 13200.00,
    official_proposal_total: 13200.00,
    notes: 'Proposta Romeva',
    created_at: new Date('2026-09-13').toISOString(),
    updated_at: new Date('2026-09-13').toISOString(),
    supplier: INITIAL_SUPPLIERS[2],
    items: [
      {
        id: 'sqi-rom-1',
        supplier_quote_id: 'sq-romeva',
        quotation_item_id: 'qitem-1',
        quoted_quantity: 26.94,
        weight_kg: 451.71,
        unit_price: 7.65,
        price_unit: 'kg',
        ipi_percent: 5.0,
        icms_percent: 18.0,
        calculated_total: 3455.58,
        validation_status: 'VALIDA',
        manual_exclude_from_lowest: false,
        created_at: new Date('2026-09-13').toISOString(),
        updated_at: new Date('2026-09-13').toISOString(),
      },
      {
        id: 'sqi-rom-2',
        supplier_quote_id: 'sq-romeva',
        quotation_item_id: 'qitem-2',
        quoted_quantity: 30.90,
        weight_kg: 702.98,
        unit_price: 7.55,
        price_unit: 'kg',
        ipi_percent: 5.0,
        icms_percent: 18.0,
        calculated_total: 5307.50,
        validation_status: 'VALIDA',
        manual_exclude_from_lowest: false,
        created_at: new Date('2026-09-13').toISOString(),
        updated_at: new Date('2026-09-13').toISOString(),
      },
      {
        id: 'sqi-rom-3',
        supplier_quote_id: 'sq-romeva',
        quotation_item_id: 'qitem-3',
        quoted_quantity: 10.00,
        weight_kg: 572.00,
        unit_price: 7.75,
        price_unit: 'kg',
        ipi_percent: 5.0,
        icms_percent: 18.0,
        calculated_total: 4433.00,
        validation_status: 'PRODUTO_DIVERGENTE',
        manual_exclude_from_lowest: false,
        divergent_product_reason: 'Fornecedor ofereceu tubo redondo em vez de tubo retangular 100x40x4.75',
        created_at: new Date('2026-09-13').toISOString(),
        updated_at: new Date('2026-09-13').toISOString(),
      }
    ]
  };

  return {
    id: quotationId,
    organization_id: DEMO_ORG_ID,
    quotation_number: 'COT-2026-001',
    project_name: 'Plataforma de Acesso Industrial - Aço Carbono',
    related_client: 'Metálicas Brasil S.A.',
    responsible_user_id: 'usr-compras',
    responsible_user_name: 'Comprador Técnico',
    quotation_date: '2026-09-10',
    deadline_date: '2026-09-25',
    notes: 'Mapa de cotação oficial importado da planilha matriz atualizada.',
    status: 'EM_COTACAO',
    created_at: new Date('2026-09-10').toISOString(),
    updated_at: new Date('2026-09-13').toISOString(),
    items,
    supplier_quotes: [sqJdAco, sqPaulisteel, sqRomeva]
  };
};

// Gerenciador de armazenamento unificado
class LocalStorageManager {
  private getItem<T>(key: string, defaultValue: T): T {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : defaultValue;
    } catch {
      return defaultValue;
    }
  }

  private setItem<T>(key: string, value: T): void {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.error('Erro ao salvar no localStorage:', e);
    }
  }

  init(): void {
    if (!localStorage.getItem(STORAGE_KEYS.PRODUCTS)) {
      this.setItem(STORAGE_KEYS.PRODUCTS, INITIAL_PRODUCTS);
    }
    if (!localStorage.getItem(STORAGE_KEYS.SUPPLIERS)) {
      this.setItem(STORAGE_KEYS.SUPPLIERS, INITIAL_SUPPLIERS);
    }
    if (!localStorage.getItem(STORAGE_KEYS.CUSTOMERS)) {
      this.setItem(STORAGE_KEYS.CUSTOMERS, INITIAL_CUSTOMERS);
    }
    if (!localStorage.getItem(STORAGE_KEYS.USERS)) {
      this.setItem(STORAGE_KEYS.USERS, INITIAL_USERS);
    }
    if (!localStorage.getItem(STORAGE_KEYS.SETTINGS)) {
      this.setItem(STORAGE_KEYS.SETTINGS, INITIAL_SETTINGS);
    }
    if (!localStorage.getItem(STORAGE_KEYS.QUOTATIONS)) {
      this.setItem(STORAGE_KEYS.QUOTATIONS, [createInitialQuotation()]);
    }
    if (!localStorage.getItem(STORAGE_KEYS.PURCHASE_ORDERS)) {
      this.setItem(STORAGE_KEYS.PURCHASE_ORDERS, []);
    }
    if (!localStorage.getItem(STORAGE_KEYS.SALES_QUOTES)) {
      this.setItem(STORAGE_KEYS.SALES_QUOTES, []);
    }
    if (!localStorage.getItem(STORAGE_KEYS.AUDIT_LOGS)) {
      this.setItem(STORAGE_KEYS.AUDIT_LOGS, [
        {
          id: 'log-1',
          organization_id: DEMO_ORG_ID,
          user_id: 'usr-admin',
          user_name: 'Administrador Demo',
          action: 'SISTEMA_INICIALIZADO',
          entity: 'organizations',
          entity_id: DEMO_ORG_ID,
          new_data: { name: 'SaberX Metais' },
          reason: 'Criação do ambiente inicial',
          created_at: new Date('2026-09-10').toISOString()
        }
      ]);
    }
  }

  // --- PRODUCTS ---
  getProducts(): Product[] {
    return this.getItem<Product[]>(STORAGE_KEYS.PRODUCTS, INITIAL_PRODUCTS);
  }

  saveProduct(product: Product): Product {
    const products = this.getProducts();
    const index = products.findIndex((p) => p.id === product.id);
    if (index >= 0) {
      products[index] = { ...product, updated_at: new Date().toISOString() };
    } else {
      products.unshift({
        ...product,
        id: product.id || `prod-${Date.now()}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    }
    this.setItem(STORAGE_KEYS.PRODUCTS, products);
    return product;
  }

  deleteProduct(id: string): void {
    const products = this.getProducts().filter((p) => p.id !== id);
    this.setItem(STORAGE_KEYS.PRODUCTS, products);
  }

  // --- SUPPLIERS ---
  getSuppliers(): Supplier[] {
    return this.getItem<Supplier[]>(STORAGE_KEYS.SUPPLIERS, INITIAL_SUPPLIERS);
  }

  saveSupplier(supplier: Supplier): Supplier {
    const suppliers = this.getSuppliers();
    const index = suppliers.findIndex((s) => s.id === supplier.id);
    if (index >= 0) {
      suppliers[index] = { ...supplier, updated_at: new Date().toISOString() };
    } else {
      suppliers.unshift({
        ...supplier,
        id: supplier.id || `sup-${Date.now()}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    }
    this.setItem(STORAGE_KEYS.SUPPLIERS, suppliers);
    return supplier;
  }

  deleteSupplier(id: string): void {
    const suppliers = this.getSuppliers().filter((s) => s.id !== id);
    this.setItem(STORAGE_KEYS.SUPPLIERS, suppliers);
  }

  // --- CUSTOMERS ---
  getCustomers(): Customer[] {
    return this.getItem<Customer[]>(STORAGE_KEYS.CUSTOMERS, INITIAL_CUSTOMERS);
  }

  saveCustomer(customer: Customer): Customer {
    const customers = this.getCustomers();
    const index = customers.findIndex((c) => c.id === customer.id);
    if (index >= 0) {
      customers[index] = { ...customer, updated_at: new Date().toISOString() };
    } else {
      customers.unshift({
        ...customer,
        id: customer.id || `cust-${Date.now()}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    }
    this.setItem(STORAGE_KEYS.CUSTOMERS, customers);
    return customer;
  }

  deleteCustomer(id: string): void {
    const customers = this.getCustomers().filter((c) => c.id !== id);
    this.setItem(STORAGE_KEYS.CUSTOMERS, customers);
  }

  // --- QUOTATIONS ---
  getQuotations(): QuotationFull[] {
    return this.getItem<QuotationFull[]>(STORAGE_KEYS.QUOTATIONS, []);
  }

  getQuotationById(id: string): QuotationFull | undefined {
    return this.getQuotations().find((q) => q.id === id);
  }

  saveQuotation(quotation: QuotationFull): QuotationFull {
    const quotations = this.getQuotations();
    const index = quotations.findIndex((q) => q.id === quotation.id);
    const updated = { ...quotation, updated_at: new Date().toISOString() };
    if (index >= 0) {
      quotations[index] = updated;
    } else {
      quotations.unshift(updated);
    }
    this.setItem(STORAGE_KEYS.QUOTATIONS, quotations);
    return updated;
  }

  deleteQuotation(id: string): void {
    const quotations = this.getQuotations().filter((q) => q.id !== id);
    this.setItem(STORAGE_KEYS.QUOTATIONS, quotations);
  }

  // --- PURCHASE ORDERS ---
  getPurchaseOrders(): PurchaseOrder[] {
    return this.getItem<PurchaseOrder[]>(STORAGE_KEYS.PURCHASE_ORDERS, []);
  }

  savePurchaseOrder(po: PurchaseOrder): PurchaseOrder {
    const orders = this.getPurchaseOrders();
    const index = orders.findIndex((o) => o.id === po.id);
    const updated = { ...po, updated_at: new Date().toISOString() };
    if (index >= 0) {
      orders[index] = updated;
    } else {
      orders.unshift(updated);
    }
    this.setItem(STORAGE_KEYS.PURCHASE_ORDERS, orders);
    return updated;
  }

  deletePurchaseOrder(id: string): void {
    const orders = this.getPurchaseOrders().filter((o) => o.id !== id);
    this.setItem(STORAGE_KEYS.PURCHASE_ORDERS, orders);
  }

  // --- SALES QUOTES ---
  getSalesQuotes(): SalesQuote[] {
    return this.getItem<SalesQuote[]>(STORAGE_KEYS.SALES_QUOTES, []);
  }

  saveSalesQuote(sq: SalesQuote): SalesQuote {
    const quotes = this.getSalesQuotes();
    const index = quotes.findIndex((s) => s.id === sq.id);
    const updated = { ...sq, updated_at: new Date().toISOString() };
    if (index >= 0) {
      quotes[index] = updated;
    } else {
      quotes.unshift(updated);
    }
    this.setItem(STORAGE_KEYS.SALES_QUOTES, quotes);
    return updated;
  }

  deleteSalesQuote(id: string): void {
    const quotes = this.getSalesQuotes().filter((s) => s.id !== id);
    this.setItem(STORAGE_KEYS.SALES_QUOTES, quotes);
  }

  // --- AUDIT LOGS ---
  getAuditLogs(): AuditLog[] {
    return this.getItem<AuditLog[]>(STORAGE_KEYS.AUDIT_LOGS, []);
  }

  logAudit(log: Omit<AuditLog, 'id' | 'created_at'>): void {
    const logs = this.getAuditLogs();
    logs.unshift({
      ...log,
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      created_at: new Date().toISOString()
    });
    this.setItem(STORAGE_KEYS.AUDIT_LOGS, logs);
  }

  // --- SETTINGS ---
  getSettings(): AppSettings {
    return this.getItem<AppSettings>(STORAGE_KEYS.SETTINGS, INITIAL_SETTINGS);
  }

  saveSettings(settings: AppSettings): AppSettings {
    const updated = { ...settings, updated_at: new Date().toISOString() };
    this.setItem(STORAGE_KEYS.SETTINGS, updated);
    return updated;
  }

  // --- CURRENT USER / USERS ---
  getUsers(): UserProfile[] {
    return this.getItem<UserProfile[]>(STORAGE_KEYS.USERS, INITIAL_USERS);
  }

  getCurrentUser(): UserProfile {
    return this.getItem<UserProfile>(STORAGE_KEYS.CURRENT_USER, INITIAL_USERS[0]);
  }

  setCurrentUser(user: UserProfile): void {
    this.setItem(STORAGE_KEYS.CURRENT_USER, user);
  }
}

export const localStore = new LocalStorageManager();
