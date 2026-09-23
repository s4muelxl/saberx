import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SettingsProvider } from './context/SettingsContext';
import { NotificationProvider } from './context/NotificationContext';
import { Layout } from './components/layout/Layout';
import { ActivePage } from './components/layout/Sidebar';
import { AuthPage } from './pages/AuthPage';
import { DashboardPage } from './pages/DashboardPage';
import { QuotationsPage } from './pages/QuotationsPage';
import { NewQuotationPage } from './pages/NewQuotationPage';
import { QuotationDetailPage } from './pages/QuotationDetailPage';
import { ProductsPage } from './pages/ProductsPage';
import { SuppliersPage } from './pages/SuppliersPage';
import { CustomersPage } from './pages/CustomersPage';
import { PurchasesPage } from './pages/PurchasesPage';
import { SalesPage } from './pages/SalesPage';
import { ExcelImportPage } from './pages/ExcelImportPage';
import { AuditLogPage } from './pages/AuditLogPage';
import { ReportsPage } from './pages/ReportsPage';
import { SettingsPage } from './pages/SettingsPage';
import { UsersPage } from './pages/UsersPage';
import { localStore, DEMO_ORG_ID } from './lib/storage';
import { PurchaseOrder } from './types/purchase';

const MainApp: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const [activePage, setActivePage] = useState<ActivePage>('dashboard');
  const [selectedQuotationId, setSelectedQuotationId] = useState<string>('cot-demo-001');

  if (!isAuthenticated) {
    return <AuthPage />;
  }

  const handleGeneratePurchaseOrder = (supplierId: string) => {
    const q = localStore.getQuotationById(selectedQuotationId);
    if (!q) return;

    const sq = q.supplier_quotes.find((s) => s.supplier_id === supplierId) || q.supplier_quotes[0];
    const sup = sq?.supplier || localStore.getSuppliers()[0];

    const poItems = q.items.map((it) => {
      const sqi = sq?.items?.find((i) => i.quotation_item_id === it.id);
      return {
        id: `poi-${Date.now()}-${it.id}`,
        purchase_order_id: '',
        product_id: it.product_id,
        quantity: sqi?.quoted_quantity || it.quantity_bars,
        unit: sqi?.price_unit || 'kg',
        unit_price: sqi?.unit_price || 7.39,
        total_price: sqi?.calculated_total || (it.estimated_weight_kg * 7.39),
        ipi_percent: sqi?.ipi_percent || 0,
        icms_percent: sqi?.icms_percent || 0,
        created_at: new Date().toISOString(),
        product: it.product
      };
    });

    const total = poItems.reduce((acc, i) => acc + i.total_price, 0);

    const newPO: PurchaseOrder = {
      id: `po-${Date.now()}`,
      organization_id: DEMO_ORG_ID,
      order_number: `PC-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
      quotation_id: q.id,
      supplier_id: sup.id,
      order_date: new Date().toISOString().split('T')[0],
      payment_terms: sq?.payment_terms || sup.payment_terms || '28 DDL',
      shipping_terms: sq?.freight_type || 'CIF',
      subtotal: total,
      tax_amount: 0,
      freight_amount: 0,
      total_amount: total,
      status: 'APROVADO',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      supplier: sup,
      items: poItems
    };

    localStore.savePurchaseOrder(newPO);
    localStore.logAudit({
      organization_id: DEMO_ORG_ID,
      action: 'PEDIDO_COMPRA_GERADO',
      entity: 'purchase_orders',
      entity_id: newPO.id,
      new_data: { order_number: newPO.order_number, total },
      reason: `Gerado a partir da cotação aprovada ${q.quotation_number}`
    });

    setActivePage('purchases');
  };

  return (
    <Layout activePage={activePage} setActivePage={setActivePage}>
      {activePage === 'dashboard' && (
        <DashboardPage
          onNavigate={setActivePage}
          onSelectQuotation={(id) => {
            setSelectedQuotationId(id);
            setActivePage('quotation-detail');
          }}
        />
      )}

      {activePage === 'quotations' && (
        <QuotationsPage
          onNavigate={setActivePage}
          onSelectQuotation={(id) => {
            setSelectedQuotationId(id);
            setActivePage('quotation-detail');
          }}
        />
      )}

      {activePage === 'new-quotation' && (
        <NewQuotationPage
          onNavigate={setActivePage}
          onSelectQuotation={(id) => {
            setSelectedQuotationId(id);
            setActivePage('quotation-detail');
          }}
        />
      )}

      {activePage === 'quotation-detail' && (
        <QuotationDetailPage
          quotationId={selectedQuotationId}
          onNavigate={setActivePage}
          onGeneratePurchaseOrder={handleGeneratePurchaseOrder}
        />
      )}

      {activePage === 'purchases' && <PurchasesPage />}

      {activePage === 'sales' && <SalesPage />}

      {activePage === 'products' && <ProductsPage />}

      {activePage === 'suppliers' && <SuppliersPage />}

      {activePage === 'customers' && <CustomersPage />}

      {activePage === 'excel-import' && (
        <ExcelImportPage
          onNavigate={setActivePage}
          onSelectQuotation={(id) => {
            setSelectedQuotationId(id);
            setActivePage('quotation-detail');
          }}
        />
      )}

      {activePage === 'reports' && <ReportsPage />}

      {activePage === 'audit' && <AuditLogPage />}

      {activePage === 'users' && <UsersPage />}

      {activePage === 'settings' && <SettingsPage />}
    </Layout>
  );
};

export function App() {
  return (
    <AuthProvider>
      <SettingsProvider>
        <NotificationProvider>
          <MainApp />
        </NotificationProvider>
      </SettingsProvider>
    </AuthProvider>
  );
}

export default App;
