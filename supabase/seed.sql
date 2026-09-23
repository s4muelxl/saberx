-- ==========================================================
-- SABERX - SEED DATA PARA DESENVOLVIMENTO E DEMO
-- ==========================================================

-- 1. Organização Demo
INSERT INTO organizations (id, name, trade_name, document_cnpj, phone, email)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'Indústria Metalúrgica SaberX S.A.',
    'SaberX Metais',
    '12.345.678/0001-90',
    '(11) 3456-7890',
    'contato@saberx.com.br'
) ON CONFLICT DO NOTHING;

-- Configurações padrão da organização Demo (IPI e ICMS desativados por padrão para fidelidade à planilha)
INSERT INTO app_settings (organization_id, include_ipi_in_total, include_icms_in_total, default_price_unit, default_sales_margin_percent)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    FALSE,
    FALSE,
    'kg',
    25.00
) ON CONFLICT DO NOTHING;

-- 2. Produtos Reais da Planilha de Referência
INSERT INTO products (id, organization_id, codigo_mpr, description, category, material, dimensions, stock_unit, purchase_unit, weight_unit_kg, length_unit_meters, reference_price)
VALUES 
(
    '10000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    'MPR-CAI-1500-0188-1020',
    'CANTONEIRA ABAS IGUAIS 1.1/2" x 3/16" - AISI 1020',
    'Aço Carbono',
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
    'Aço Carbono',
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
    'Aço Carbono',
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
    'Aço Carbono',
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
    'Aço Carbono',
    'AISI 1020',
    '80,00 X 50,00 X 3,00',
    'barra',
    'kg',
    34.40,
    6.00,
    8.30
) ON CONFLICT DO NOTHING;

-- 3. Fornecedores da Planilha de Referência
INSERT INTO suppliers (id, organization_id, company_name, trade_name, cnpj, phone, email, payment_terms, default_lead_time_days)
VALUES
(
    '20000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    'JD Aço Indústria e Comércio Ltda',
    'JD Aço',
    '01.234.567/0001-11',
    '(11) 4000-1111',
    'vendas@jdaco.com.br',
    '28 DDL',
    7
),
(
    '20000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000001',
    'Paulisteel Comercial de Ferro e Aço Ltda',
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
    'Luxfer Tubos e Aços Ltda',
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
    'Estruturas Metálicas Brasil S.A.',
    'Metálicas Brasil',
    '55.444.333/0001-22',
    '(11) 5555-1234',
    'compras@metalicasbrasil.com.br'
) ON CONFLICT DO NOTHING;
