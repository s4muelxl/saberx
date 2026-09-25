import React, { useState } from 'react';
import {
  TrendingUp,
  Plus,
  Search,
  DollarSign,
  Percent,
  Users,
  Eye,
  CheckCircle,
  FileText
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { SalesQuote, SalesQuoteItem, SalesQuoteStatus } from '../types/sales';
import { localStore, DEMO_ORG_ID } from '../lib/storage';
import { calculateProfitMargin } from '../domain/calculations';
import { useNotification } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';

export const SalesPage: React.FC = () => {
  const { user } = useAuth();
  const { success, error } = useNotification();
  const [salesQuotes, setSalesQuotes] = useState<SalesQuote[]>(() =>
    localStore.getSalesQuotes()
  );
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const customers = localStore.getCustomers();
  const products = localStore.getProducts();

  // Form State para Novo Orçamento
  const [selectedCustomerId, setSelectedCustomerId] = useState(customers[0]?.id || '');
  const [quoteNumber, setQuoteNumber] = useState(`ORC-VND-${Date.now().toString().slice(-4)}`);
  const [selectedProductId, setSelectedProductId] = useState(products[0]?.id || '');
  const [quantity, setQuantity] = useState(10);
  const [unitCost, setUnitCost] = useState(125.0);
  const [unitSalePrice, setUnitSalePrice] = useState(175.0);

  // Cálculos automáticos de margem
  const totalCost = quantity * unitCost;
  const totalSale = quantity * unitSalePrice;
  const { profit, marginPercent } = calculateProfitMargin(totalCost, totalSale);

  const handleCreateSalesQuote = () => {
    if (isSubmitting) return;

    const cust = customers.find((c) => c.id === selectedCustomerId);
    const prod = products.find((p) => p.id === selectedProductId);

    if (!cust || !prod) {
      error('Selecione o cliente e o produto.');
      return;
    }

    setIsSubmitting(true);

    try {
      const item: SalesQuoteItem = {
        id: `sqi-${Date.now()}`,
        sales_quote_id: `sq-${Date.now()}`,
        product_id: prod.id,
        quantity,
        unit: 'barra',
        unit_cost: unitCost,
        unit_sale_price: unitSalePrice,
        discount_percent: 0,
        tax_percent: 0,
        total_cost: totalCost,
        total_sale: totalSale,
        profit,
        margin_percent: marginPercent,
        created_at: new Date().toISOString(),
        product: prod
      };

      const newQuote: SalesQuote = {
        id: `sq-${Date.now()}`,
        organization_id: DEMO_ORG_ID,
        quote_number: quoteNumber,
        customer_id: cust.id,
        responsible_user_id: user?.id,
        quote_date: new Date().toISOString().split('T')[0],
        total_cost: totalCost,
        total_price: totalSale,
        total_profit: profit,
        margin_percent: marginPercent,
        status: 'NEGOCIACAO',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        customer: cust,
        items: [item]
      };

      localStore.saveSalesQuote(newQuote);
      localStore.logAudit({
        organization_id: DEMO_ORG_ID,
        user_id: user?.id,
        user_name: user?.full_name,
        action: 'NOVO_ORCAMENTO_VENDA',
        entity: 'sales_quotes',
        entity_id: newQuote.id,
        new_data: { quote_number: quoteNumber, total: totalSale, margin: marginPercent },
        reason: 'Criação de proposta comercial de venda'
      });

      setSalesQuotes(localStore.getSalesQuotes());
      setModalOpen(false);
      success('Orçamento de venda criado com sucesso!');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredQuotes = salesQuotes.filter((sq) => {
    return (
      sq.quote_number.toLowerCase().includes(search.toLowerCase()) ||
      sq.customer?.company_name.toLowerCase().includes(search.toLowerCase())
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-emerald-500" />
            Módulo de Vendas & Margem Comercial
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Orçamentos para clientes com análise de custo, markup e margem de lucro calculada
          </p>
        </div>

        <Button variant="primary" icon={<Plus className="w-4 h-4" />} onClick={() => setModalOpen(true)}>
          + Novo Orçamento de Venda
        </Button>
      </div>

      {/* Search */}
      <Card className="p-4">
        <Input
          placeholder="Pesquisar orçamento por número ou cliente..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          leftIcon={<Search className="w-4 h-4" />}
        />
      </Card>

      {/* Quotes List */}
      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800">
                <th className="py-3 px-4">Orçamento Nº</th>
                <th className="py-3 px-4">Cliente</th>
                <th className="py-3 px-4 text-right">Custo Total</th>
                <th className="py-3 px-4 text-right">Valor Venda</th>
                <th className="py-3 px-4 text-right">Lucro Bruto</th>
                <th className="py-3 px-4 text-center">Margem %</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Data</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filteredQuotes.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    Nenhum orçamento de venda cadastrado. Clique em "+ Novo Orçamento de Venda".
                  </td>
                </tr>
              ) : (
                filteredQuotes.map((sq) => (
                  <tr key={sq.id} className="hover:bg-slate-800/40">
                    <td className="py-3 px-4 font-mono font-bold text-emerald-400">{sq.quote_number}</td>
                    <td className="py-3 px-4 font-semibold text-white">{sq.customer?.trade_name || sq.customer?.company_name}</td>
                    <td className="py-3 px-4 text-right font-mono text-slate-400">
                      R$ {sq.total_cost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-white">
                      R$ {sq.total_price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-emerald-400">
                      R$ {sq.total_profit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                        {sq.margin_percent.toFixed(1)}%
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <Badge status={sq.status} size="sm" />
                    </td>
                    <td className="py-3 px-4 text-right text-slate-400">{sq.quote_date}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modal Novo Orçamento de Venda */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Novo Orçamento Comercial de Venda"
        subtitle="O sistema calcula automaticamente o lucro e a margem percentual real"
        maxWidth="xl"
        footer={
          <>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button variant="primary" onClick={handleCreateSalesQuote} loading={isSubmitting} disabled={isSubmitting}>Criar Orçamento</Button>
          </>
        }
      >
        <div className="space-y-4 text-sm">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Número do Orçamento"
              value={quoteNumber}
              onChange={(e) => setQuoteNumber(e.target.value)}
            />
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase">Cliente *</label>
              <select
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
              >
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>{c.trade_name || c.company_name}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase">Produto Solicitado *</label>
            <select
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.codigo_mpr} - {p.description}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <Input
              label="Quantidade (Barras)"
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(parseFloat(e.target.value) || 0)}
            />
            <Input
              label="Custo Unitário (R$)"
              type="number"
              step="any"
              value={unitCost}
              onChange={(e) => setUnitCost(parseFloat(e.target.value) || 0)}
            />
            <Input
              label="Preço de Venda Unit. (R$)"
              type="number"
              step="any"
              value={unitSalePrice}
              onChange={(e) => setUnitSalePrice(parseFloat(e.target.value) || 0)}
            />
          </div>

          {/* Card Resumo do Cálculo de Margem (Seção 26) */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Demonstrativo de Resultado & Margem
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-1">
              <div>
                <div className="text-slate-400">Custo Total:</div>
                <div className="font-bold text-white font-mono">R$ {totalCost.toFixed(2)}</div>
              </div>
              <div>
                <div className="text-slate-400">Preço de Venda:</div>
                <div className="font-bold text-white font-mono">R$ {totalSale.toFixed(2)}</div>
              </div>
              <div>
                <div className="text-slate-400">Lucro Estimado:</div>
                <div className="font-bold text-emerald-400 font-mono">R$ {profit.toFixed(2)}</div>
              </div>
              <div>
                <div className="text-slate-400">Margem %:</div>
                <div className="font-extrabold text-emerald-400 font-mono text-sm">{marginPercent.toFixed(1)}%</div>
              </div>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};
