-- ==========================================================
-- SABERX - SISTEMA WEB DE COTAÃ‡ÃƒO, COMPRAS E VENDAS
-- PostgreSQL Schema para Supabase
-- ==========================================================

-- ExtensÃµes necessÃ¡rias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Enums
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('ADMIN', 'COMPRAS', 'VENDAS', 'VISUALIZADOR');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE quotation_status AS ENUM (
        'RASCUNHO',
        'EM_COTACAO',
        'AGUARDANDO_APROVACAO',
        'APROVADA',
        'REJEITADA',
        'FINALIZADA',
        'CANCELADA'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE quote_item_validation_status AS ENUM (
        'VALIDA',
        'QUANTIDADE_INSUFICIENTE',
        'PRODUTO_DIVERGENTE',
        'NAO_COTADO',
        'PRECO_AUSENTE',
        'EXCLUIDA_MANUALMENTE'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE purchase_order_status AS ENUM (
        'RASCUNHO',
        'APROVADO',
        'ENVIADO',
        'CONFIRMADO',
        'EM_TRANSPORTE',
        'RECEBIDO',
        'CANCELADO'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE sales_quote_status AS ENUM (
        'RASCUNHO',
        'ENVIADO',
        'NEGOCIACAO',
        'APROVADO',
        'REJEITADO',
        'FATURADO',
        'CANCELADO'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 1. ORGANIZATIONS (Multi-tenancy)
CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    trade_name VARCHAR(255),
    document_cnpj VARCHAR(20) UNIQUE,
    phone VARCHAR(30),
    email VARCHAR(255),
    logo_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. PROFILES (Vinculado ao auth.users do Supabase)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    phone VARCHAR(30),
    position VARCHAR(100), -- Cargo
    department VARCHAR(100), -- Setor
    role user_role NOT NULL DEFAULT 'VISUALIZADOR',
    avatar_url TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. ORGANIZATION MEMBERS
CREATE TABLE IF NOT EXISTS organization_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    role user_role NOT NULL DEFAULT 'VISUALIZADOR',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (organization_id, user_id)
);

-- 4. APP SETTINGS (ConfiguraÃ§Ãµes por organizaÃ§Ã£o)
CREATE TABLE IF NOT EXISTS app_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL UNIQUE REFERENCES organizations(id) ON DELETE CASCADE,
    include_ipi_in_total BOOLEAN NOT NULL DEFAULT FALSE,
    include_icms_in_total BOOLEAN NOT NULL DEFAULT FALSE,
    default_price_unit VARCHAR(20) NOT NULL DEFAULT 'kg',
    default_delivery_days INT NOT NULL DEFAULT 10,
    default_sales_margin_percent NUMERIC(5,2) NOT NULL DEFAULT 25.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. PRODUCTS (Banco de Produtos)
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    codigo_mpr VARCHAR(100) NOT NULL, -- CÃ³digo MPR Ãºnico na organizaÃ§Ã£o
    sku VARCHAR(100),
    description TEXT NOT NULL,
    category VARCHAR(100) NOT NULL DEFAULT 'AÃ§o Carbono',
    subcategory VARCHAR(100),
    material VARCHAR(100) DEFAULT 'AISI 1020',
    standard VARCHAR(100), -- Norma
    dimensions VARCHAR(100), -- ex: 100 x 40 x 4,75 ou 1.1/2" x 3/16"
    stock_unit VARCHAR(20) NOT NULL DEFAULT 'barra',
    purchase_unit VARCHAR(20) NOT NULL DEFAULT 'kg',
    weight_unit_kg NUMERIC(12,4) NOT NULL DEFAULT 0.0000, -- Peso kg por barra/unidade
    length_unit_meters NUMERIC(12,4) NOT NULL DEFAULT 6.0000, -- Comprimento em metros por barra
    reference_price NUMERIC(14,2) DEFAULT 0.00,
    min_stock NUMERIC(12,2) DEFAULT 0.00,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (organization_id, codigo_mpr)
);

CREATE INDEX IF NOT EXISTS idx_products_org_mpr ON products(organization_id, codigo_mpr);
CREATE INDEX IF NOT EXISTS idx_products_org_desc ON products(organization_id, description);

-- 6. SUPPLIERS (Fornecedores)
CREATE TABLE IF NOT EXISTS suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    company_name VARCHAR(255) NOT NULL, -- RazÃ£o Social
    trade_name VARCHAR(255), -- Nome Fantasia
    cnpj VARCHAR(20),
    state_registration VARCHAR(30), -- InscriÃ§Ã£o Estadual
    email VARCHAR(255),
    phone VARCHAR(30),
    whatsapp VARCHAR(30),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(10),
    contact_person VARCHAR(100),
    payment_terms VARCHAR(100) DEFAULT '28 DDL',
    default_lead_time_days INT DEFAULT 7,
    notes TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_suppliers_org ON suppliers(organization_id);

-- 7. CUSTOMERS (Clientes para MÃ³dulo de Vendas)
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    company_name VARCHAR(255) NOT NULL,
    trade_name VARCHAR(255),
    document VARCHAR(30), -- CNPJ ou CPF
    email VARCHAR(255),
    phone VARCHAR(30),
    whatsapp VARCHAR(30),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(10),
    contact_person VARCHAR(100),
    notes TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. QUOTATIONS (CotaÃ§Ãµes de Compras)
CREATE TABLE IF NOT EXISTS quotations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    quotation_number VARCHAR(50) NOT NULL,
    project_name VARCHAR(255) NOT NULL,
    related_client VARCHAR(255),
    responsible_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    quotation_date DATE NOT NULL DEFAULT CURRENT_DATE,
    deadline_date DATE,
    notes TEXT,
    status quotation_status NOT NULL DEFAULT 'RASCUNHO',
    approved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (organization_id, quotation_number)
);

CREATE INDEX IF NOT EXISTS idx_quotations_org ON quotations(organization_id);
CREATE INDEX IF NOT EXISTS idx_quotations_status ON quotations(organization_id, status);

-- 9. QUOTATION ITEMS (Itens solicitados na cotaÃ§Ã£o)
CREATE TABLE IF NOT EXISTS quotation_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quotation_id UUID NOT NULL REFERENCES quotations(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    item_order INT NOT NULL DEFAULT 1,
    quantity_bars NUMERIC(12,2) NOT NULL DEFAULT 0.00, -- Quantidade necessÃ¡ria em barras
    quantity_meters NUMERIC(12,2) NOT NULL DEFAULT 0.00, -- Quantidade necessÃ¡ria em metros
    estimated_weight_kg NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    target_price NUMERIC(14,2),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_q_items_quotation ON quotation_items(quotation_id);

-- 10. SUPPLIER QUOTES (OrÃ§amentos dos Fornecedores na CotaÃ§Ã£o)
CREATE TABLE IF NOT EXISTS supplier_quotes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quotation_id UUID NOT NULL REFERENCES quotations(id) ON DELETE CASCADE,
    supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
    proposal_number VARCHAR(100),
    proposal_date DATE DEFAULT CURRENT_DATE,
    validity_days INT DEFAULT 5,
    payment_terms VARCHAR(100),
    delivery_time_days INT,
    freight_type VARCHAR(50) DEFAULT 'CIF',
    freight_amount NUMERIC(14,2) DEFAULT 0.00,
    calculated_subtotal NUMERIC(14,2) DEFAULT 0.00,
    official_proposal_total NUMERIC(14,2) DEFAULT 0.00, -- Total informado pelo fornecedor
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (quotation_id, supplier_id)
);

-- 11. SUPPLIER QUOTE ITEMS (LanÃ§amentos de preÃ§os item por item por fornecedor)
CREATE TABLE IF NOT EXISTS supplier_quote_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_quote_id UUID NOT NULL REFERENCES supplier_quotes(id) ON DELETE CASCADE,
    quotation_item_id UUID NOT NULL REFERENCES quotation_items(id) ON DELETE CASCADE,
    quoted_quantity NUMERIC(12,2) DEFAULT 0.00, -- Quantidade cotada
    weight_kg NUMERIC(12,2) DEFAULT 0.00, -- Peso em kg
    unit_price NUMERIC(14,4) DEFAULT 0.00, -- PreÃ§o unitÃ¡rio
    price_unit VARCHAR(20) NOT NULL DEFAULT 'kg', -- 'kg', 'pÃ§', 'barra', 'metro', 'tonelada', 'unidade'
    ipi_percent NUMERIC(5,2) DEFAULT 0.00,
    icms_percent NUMERIC(5,2) DEFAULT 0.00,
    calculated_total NUMERIC(14,2) NOT NULL DEFAULT 0.00,
    validation_status quote_item_validation_status NOT NULL DEFAULT 'VALIDA',
    manual_exclude_from_lowest BOOLEAN NOT NULL DEFAULT FALSE,
    manual_exclude_reason TEXT,
    divergent_product_reason TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (supplier_quote_id, quotation_item_id)
);

CREATE INDEX IF NOT EXISTS idx_sq_items ON supplier_quote_items(supplier_quote_id, quotation_item_id);

-- 12. PURCHASE ORDERS (MÃ³dulo de Compras)
CREATE TABLE IF NOT EXISTS purchase_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    order_number VARCHAR(50) NOT NULL,
    quotation_id UUID REFERENCES quotations(id) ON DELETE SET NULL,
    supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
    responsible_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    order_date DATE NOT NULL DEFAULT CURRENT_DATE,
    expected_delivery_date DATE,
    actual_delivery_date DATE,
    payment_terms VARCHAR(100),
    shipping_terms VARCHAR(50) DEFAULT 'FOB',
    subtotal NUMERIC(14,2) NOT NULL DEFAULT 0.00,
    tax_amount NUMERIC(14,2) NOT NULL DEFAULT 0.00,
    freight_amount NUMERIC(14,2) NOT NULL DEFAULT 0.00,
    total_amount NUMERIC(14,2) NOT NULL DEFAULT 0.00,
    status purchase_order_status NOT NULL DEFAULT 'RASCUNHO',
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (organization_id, order_number)
);

CREATE TABLE IF NOT EXISTS purchase_order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_order_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    quantity NUMERIC(12,2) NOT NULL,
    unit VARCHAR(20) NOT NULL DEFAULT 'kg',
    unit_price NUMERIC(14,4) NOT NULL,
    total_price NUMERIC(14,2) NOT NULL,
    ipi_percent NUMERIC(5,2) DEFAULT 0.00,
    icms_percent NUMERIC(5,2) DEFAULT 0.00,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 13. SALES QUOTES (MÃ³dulo de Vendas)
CREATE TABLE IF NOT EXISTS sales_quotes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    quote_number VARCHAR(50) NOT NULL,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    responsible_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    quote_date DATE NOT NULL DEFAULT CURRENT_DATE,
    valid_until DATE,
    total_cost NUMERIC(14,2) NOT NULL DEFAULT 0.00,
    total_price NUMERIC(14,2) NOT NULL DEFAULT 0.00,
    total_profit NUMERIC(14,2) NOT NULL DEFAULT 0.00,
    margin_percent NUMERIC(6,2) NOT NULL DEFAULT 0.00,
    status sales_quote_status NOT NULL DEFAULT 'RASCUNHO',
    payment_terms VARCHAR(100),
    delivery_terms VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (organization_id, quote_number)
);

CREATE TABLE IF NOT EXISTS sales_quote_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sales_quote_id UUID NOT NULL REFERENCES sales_quotes(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    quantity NUMERIC(12,2) NOT NULL,
    unit VARCHAR(20) NOT NULL DEFAULT 'barra',
    unit_cost NUMERIC(14,4) NOT NULL DEFAULT 0.00,
    unit_sale_price NUMERIC(14,4) NOT NULL DEFAULT 0.00,
    discount_percent NUMERIC(5,2) DEFAULT 0.00,
    tax_percent NUMERIC(5,2) DEFAULT 0.00,
    total_cost NUMERIC(14,2) NOT NULL DEFAULT 0.00,
    total_sale NUMERIC(14,2) NOT NULL DEFAULT 0.00,
    profit NUMERIC(14,2) NOT NULL DEFAULT 0.00,
    margin_percent NUMERIC(6,2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 14. AUDIT LOGS (Trilha de Auditoria Minuciosa)
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL, -- ex: 'UPDATE_PRICE', 'MANUAL_EXCLUSION', 'APPROVE_QUOTATION'
    entity VARCHAR(100) NOT NULL, -- ex: 'supplier_quote_items', 'quotations'
    entity_id UUID NOT NULL,
    previous_data JSONB,
    new_data JSONB,
    reason TEXT,
    ip_address VARCHAR(50),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_org_entity ON audit_logs(organization_id, entity, entity_id);

-- 15. ATTACHMENTS (Arquivos e Comprovantes via Supabase Storage)
CREATE TABLE IF NOT EXISTS attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    quotation_id UUID REFERENCES quotations(id) ON DELETE CASCADE,
    supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
    file_name VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    file_size_bytes BIGINT,
    mime_type VARCHAR(100),
    uploaded_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- FunÃ§Ã£o e triggers automÃ¡ticos de updated_at
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_orgs_updated_at BEFORE UPDATE ON organizations FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE OR REPLACE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE OR REPLACE TRIGGER trg_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE OR REPLACE TRIGGER trg_suppliers_updated_at BEFORE UPDATE ON suppliers FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE OR REPLACE TRIGGER trg_customers_updated_at BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE OR REPLACE TRIGGER trg_quotations_updated_at BEFORE UPDATE ON quotations FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE OR REPLACE TRIGGER trg_sq_updated_at BEFORE UPDATE ON supplier_quotes FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE OR REPLACE TRIGGER trg_sqi_updated_at BEFORE UPDATE ON supplier_quote_items FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE OR REPLACE TRIGGER trg_po_updated_at BEFORE UPDATE ON purchase_orders FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE OR REPLACE TRIGGER trg_sqo_updated_at BEFORE UPDATE ON sales_quotes FOR EACH ROW EXECUTE FUNCTION set_updated_at();
-- ==========================================================
-- ROW LEVEL SECURITY (RLS) POLICIES PARA SUPABASE
-- Isolamento estrito por organization_id e controle por perfil/role
-- ==========================================================

-- Habilita RLS em todas as tabelas sensÃ­veis
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotation_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_quote_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_quote_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE attachments ENABLE ROW LEVEL SECURITY;

-- FunÃ§Ã£o auxiliar para obter a organizaÃ§Ã£o do usuÃ¡rio logado
CREATE OR REPLACE FUNCTION get_user_org_id()
RETURNS UUID AS $$
    SELECT organization_id FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- FunÃ§Ã£o auxiliar para obter o role do usuÃ¡rio logado
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS user_role AS $$
    SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- 1. PROFILES
CREATE POLICY "Users can view profiles in their organization"
ON profiles FOR SELECT
USING (organization_id = get_user_org_id() OR id = auth.uid());

CREATE POLICY "Users can update their own profile"
ON profiles FOR UPDATE
USING (id = auth.uid());

-- 2. ORGANIZATIONS
CREATE POLICY "Users can view their own organization"
ON organizations FOR SELECT
USING (id = get_user_org_id());

CREATE POLICY "Admins can update their organization"
ON organizations FOR UPDATE
USING (id = get_user_org_id() AND get_user_role() = 'ADMIN');

-- 3. APP SETTINGS
CREATE POLICY "Members can view org settings"
ON app_settings FOR SELECT
USING (organization_id = get_user_org_id());

CREATE POLICY "Admins can update org settings"
ON app_settings FOR ALL
USING (organization_id = get_user_org_id() AND get_user_role() = 'ADMIN');

-- 4. PRODUCTS
CREATE POLICY "Members can view products"
ON products FOR SELECT
USING (organization_id = get_user_org_id());

CREATE POLICY "Purchasing and Admin can manage products"
ON products FOR ALL
USING (
    organization_id = get_user_org_id() AND
    get_user_role() IN ('ADMIN', 'COMPRAS')
);

-- 5. SUPPLIERS
CREATE POLICY "Members can view suppliers"
ON suppliers FOR SELECT
USING (organization_id = get_user_org_id());

CREATE POLICY "Purchasing and Admin can manage suppliers"
ON suppliers FOR ALL
USING (
    organization_id = get_user_org_id() AND
    get_user_role() IN ('ADMIN', 'COMPRAS')
);

-- 6. CUSTOMERS
CREATE POLICY "Members can view customers"
ON customers FOR SELECT
USING (organization_id = get_user_org_id());

CREATE POLICY "Sales and Admin can manage customers"
ON customers FOR ALL
USING (
    organization_id = get_user_org_id() AND
    get_user_role() IN ('ADMIN', 'VENDAS')
);

-- 7. QUOTATIONS
CREATE POLICY "Members can view quotations"
ON quotations FOR SELECT
USING (organization_id = get_user_org_id());

CREATE POLICY "Purchasing and Admin can insert/update quotations"
ON quotations FOR ALL
USING (
    organization_id = get_user_org_id() AND
    get_user_role() IN ('ADMIN', 'COMPRAS')
);

-- 8. QUOTATION ITEMS
CREATE POLICY "Members can view quotation items"
ON quotation_items FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM quotations q
        WHERE q.id = quotation_items.quotation_id
        AND q.organization_id = get_user_org_id()
    )
);

CREATE POLICY "Purchasing and Admin can manage quotation items"
ON quotation_items FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM quotations q
        WHERE q.id = quotation_items.quotation_id
        AND q.organization_id = get_user_org_id()
        AND get_user_role() IN ('ADMIN', 'COMPRAS')
    )
);

-- 9. SUPPLIER QUOTES & ITEMS
CREATE POLICY "Members can view supplier quotes"
ON supplier_quotes FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM quotations q
        WHERE q.id = supplier_quotes.quotation_id
        AND q.organization_id = get_user_org_id()
    )
);

CREATE POLICY "Purchasing and Admin can manage supplier quotes"
ON supplier_quotes FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM quotations q
        WHERE q.id = supplier_quotes.quotation_id
        AND q.organization_id = get_user_org_id()
        AND get_user_role() IN ('ADMIN', 'COMPRAS')
    )
);

CREATE POLICY "Members can view supplier quote items"
ON supplier_quote_items FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM supplier_quotes sq
        JOIN quotations q ON q.id = sq.quotation_id
        WHERE sq.id = supplier_quote_items.supplier_quote_id
        AND q.organization_id = get_user_org_id()
    )
);

CREATE POLICY "Purchasing and Admin can manage supplier quote items"
ON supplier_quote_items FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM supplier_quotes sq
        JOIN quotations q ON q.id = sq.quotation_id
        WHERE sq.id = supplier_quote_items.supplier_quote_id
        AND q.organization_id = get_user_org_id()
        AND get_user_role() IN ('ADMIN', 'COMPRAS')
    )
);

-- 10. PURCHASE ORDERS
CREATE POLICY "Members can view purchase orders"
ON purchase_orders FOR SELECT
USING (organization_id = get_user_org_id());

CREATE POLICY "Purchasing and Admin can manage purchase orders"
ON purchase_orders FOR ALL
USING (
    organization_id = get_user_org_id() AND
    get_user_role() IN ('ADMIN', 'COMPRAS')
);

CREATE POLICY "Members can view purchase order items"
ON purchase_order_items FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM purchase_orders po
        WHERE po.id = purchase_order_items.purchase_order_id
        AND po.organization_id = get_user_org_id()
    )
);

CREATE POLICY "Purchasing and Admin can manage purchase order items"
ON purchase_order_items FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM purchase_orders po
        WHERE po.id = purchase_order_items.purchase_order_id
        AND po.organization_id = get_user_org_id()
        AND get_user_role() IN ('ADMIN', 'COMPRAS')
    )
);

-- 11. SALES QUOTES
CREATE POLICY "Members can view sales quotes"
ON sales_quotes FOR SELECT
USING (organization_id = get_user_org_id());

CREATE POLICY "Sales and Admin can manage sales quotes"
ON sales_quotes FOR ALL
USING (
    organization_id = get_user_org_id() AND
    get_user_role() IN ('ADMIN', 'VENDAS')
);

CREATE POLICY "Members can view sales quote items"
ON sales_quote_items FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM sales_quotes sq
        WHERE sq.id = sales_quote_items.sales_quote_id
        AND sq.organization_id = get_user_org_id()
    )
);

CREATE POLICY "Sales and Admin can manage sales quote items"
ON sales_quote_items FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM sales_quotes sq
        WHERE sq.id = sales_quote_items.sales_quote_id
        AND sq.organization_id = get_user_org_id()
        AND get_user_role() IN ('ADMIN', 'VENDAS')
    )
);

-- 12. AUDIT LOGS
CREATE POLICY "Members can view audit logs"
ON audit_logs FOR SELECT
USING (organization_id = get_user_org_id());

CREATE POLICY "System and members can insert audit logs"
ON audit_logs FOR INSERT
WITH CHECK (organization_id = get_user_org_id());

-- 13. ATTACHMENTS
CREATE POLICY "Members can view attachments"
ON attachments FOR SELECT
USING (organization_id = get_user_org_id());

CREATE POLICY "Members can manage attachments"
ON attachments FOR ALL
USING (organization_id = get_user_org_id());
-- ==========================================================
-- SABERX - SEED DATA PARA DESENVOLVIMENTO E DEMO
-- ==========================================================

-- 1. OrganizaÃ§Ã£o Demo
INSERT INTO organizations (id, name, trade_name, document_cnpj, phone, email)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'IndÃºstria MetalÃºrgica SaberX S.A.',
    'SaberX Metais',
    '12.345.678/0001-90',
    '(11) 3456-7890',
    'contato@saberx.com.br'
) ON CONFLICT DO NOTHING;

-- ConfiguraÃ§Ãµes padrÃ£o da organizaÃ§Ã£o Demo (IPI e ICMS desativados por padrÃ£o para fidelidade Ã  planilha)
INSERT INTO app_settings (organization_id, include_ipi_in_total, include_icms_in_total, default_price_unit, default_sales_margin_percent)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    FALSE,
    FALSE,
    'kg',
    25.00
) ON CONFLICT DO NOTHING;

-- 2. Produtos Reais da Planilha de ReferÃªncia
INSERT INTO products (id, organization_id, codigo_mpr, description, category, material, dimensions, stock_unit, purchase_unit, weight_unit_kg, length_unit_meters, reference_price)
VALUES 
(
    '10000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    'MPR-CAI-1500-0188-1020',
    'CANTONEIRA ABAS IGUAIS 1.1/2" x 3/16" - AISI 1020',
    'AÃ§o Carbono',
    'AISI 1020',
    '1.1/2" x 3/16"',
    'barra',
    'kg',
    16.76,
    6.00,
    7.50
),
(
    '10000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000001',
    'MPR-CAI-2000-0188-1020',
    'CANTONEIRA ABAS IGUAIS 2" x 3/16" - AISI 1020',
    'AÃ§o Carbono',
    'AISI 1020',
    '2" x 3/16"',
    'barra',
    'kg',
    22.75,
    6.00,
    7.80
),
(
    '10000000-0000-0000-0000-000000000003',
    '00000000-0000-0000-0000-000000000001',
    'MPR-TIR-1000-0400-0048-1020',
    'TUBO INDUSTRIAL RETANGULAR 100,00 X 40,00 X 4,75 - AISI 1020',
    'AÃ§o Carbono',
    'AISI 1020',
    '100,00 X 40,00 X 4,75',
    'barra',
    'kg',
    57.20,
    6.00,
    8.10
),
(
    '10000000-0000-0000-0000-000000000004',
    '00000000-0000-0000-0000-000000000001',
    'MPR-TIR-0800-0400-0048-1020',
    'TUBO INDUSTRIAL RETANGULAR 80,00 X 40,00 X 4,75 - AISI 1020',
    'AÃ§o Carbono',
    'AISI 1020',
    '80,00 X 40,00 X 4,75',
    'barra',
    'kg',
    48.10,
    6.00,
    8.15
),
(
    '10000000-0000-0000-0000-000000000005',
    '00000000-0000-0000-0000-000000000001',
    'MPR-TIR-0800-0500-0030-1020',
    'TUBO INDUSTRIAL RETANGULAR 80,00 X 50,00 X 3,00 - AISI 1020',
    'AÃ§o Carbono',
    'AISI 1020',
    '80,00 X 50,00 X 3,00',
    'barra',
    'kg',
    34.40,
    6.00,
    8.30
) ON CONFLICT DO NOTHING;

-- 3. Fornecedores da Planilha de ReferÃªncia
INSERT INTO suppliers (id, organization_id, company_name, trade_name, cnpj, phone, email, payment_terms, default_lead_time_days)
VALUES
(
    '20000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    'JD AÃ§o IndÃºstria e ComÃ©rcio Ltda',
    'JD AÃ§o',
    '01.234.567/0001-11',
    '(11) 4000-1111',
    'vendas@jdaco.com.br',
    '28 DDL',
    7
),
(
    '20000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000001',
    'Paulisteel Comercial de Ferro e AÃ§o Ltda',
    'Paulisteel',
    '02.345.678/0001-22',
    '(11) 4000-2222',
    'cotacao@paulisteel.com.br',
    '30 DDL',
    10
),
(
    '20000000-0000-0000-0000-000000000003',
    '00000000-0000-0000-0000-000000000001',
    'Romeva Tubos Ltda',
    'Romeva Tubos',
    '03.456.789/0001-33',
    '(11) 4000-3333',
    'comercial@romeva.com.br',
    '28 DDL',
    5
),
(
    '20000000-0000-0000-0000-000000000004',
    '00000000-0000-0000-0000-000000000001',
    'Luxfer Tubos e AÃ§os Ltda',
    'Luxfer Tubos',
    '04.567.890/0001-44',
    '(11) 4000-4444',
    'vendas@luxfer.com.br',
    '35 DDL',
    8
) ON CONFLICT DO NOTHING;

-- 4. Clientes para Vendas
INSERT INTO customers (id, organization_id, company_name, trade_name, document, phone, email)
VALUES
(
    '30000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    'Estruturas MetÃ¡licas Brasil S.A.',
    'MetÃ¡licas Brasil',
    '55.444.333/0001-22',
    '(11) 5555-1234',
    'compras@metalicasbrasil.com.br'
) ON CONFLICT DO NOTHING;
