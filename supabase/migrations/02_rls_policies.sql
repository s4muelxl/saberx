-- ==========================================================
-- ROW LEVEL SECURITY (RLS) POLICIES PARA SUPABASE
-- Isolamento estrito por organization_id e controle por perfil/role
-- ==========================================================

-- Habilita RLS em todas as tabelas sensíveis
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

-- Função auxiliar para obter a organização do usuário logado
CREATE OR REPLACE FUNCTION get_user_org_id()
RETURNS UUID AS $$
    SELECT organization_id FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Função auxiliar para obter o role do usuário logado
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
