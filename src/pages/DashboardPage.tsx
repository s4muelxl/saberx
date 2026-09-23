import React from 'react';
import {
  FileSpreadsheet,
  ShoppingCart,
  TrendingUp,
  DollarSign,
  Truck,
  Package,
  AlertTriangle,
  ArrowUpRight,
  TrendingDown,
  CheckCircle,
  Clock,
  Sparkles
} from 'lucide-react';
import { Card, CardHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { ActivePage } from '../components/layout/Sidebar';
import { localStore } from '../lib/storage';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell } from 'recharts';

interface DashboardPageProps {
  onNavigate: (page: ActivePage) => void;
  onSelectQuotation: (id: string) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigate, onSelectQuotation }) => {
  const quotations = localStore.getQuotations();
  const products = localStore.getProducts();
  const suppliers = localStore.getSuppliers();
  const purchaseOrders = localStore.getPurchaseOrders();
  const salesQuotes = localStore.getSalesQuotes();

  const openQuotes = quotations.filter((q) => q.status === 'EM_COTACAO' || q.status === 'RASCUNHO');
  const awaitingApproval = quotations.filter((q) => q.status === 'AGUARDANDO_APROVACAO');
  const completedQuotes = quotations.filter((q) => q.status === 'FINALIZADA' || q.status === 'APROVADA');

  // Total economizado estimado
  const totalEconomy = 4850.50;
  const totalPurchases = purchaseOrders.reduce((sum, po) => sum + po.total_amount, 0) || 18564.77;
  const totalSales = salesQuotes.reduce((sum, sq) => sum + sq.total_price, 0) || 32450.00;

  // Dados para gráficos
  const supplierChartData = [
    { name: 'JD Aço', valor: 18564.77 },
    { name: 'Paulisteel', valor: 5460.00 },
    { name: 'Romeva Tubos', valor: 13200.00 },
    { name: 'Luxfer Tubos', valor: 9800.00 },
  ];

  const savingsData = [
    { mes: 'Mai', compras: 45000, economia: 5200 },
    { mes: 'Jun', compras: 52000, economia: 6400 },
    { mes: 'Jul', compras: 38000, economia: 4100 },
    { mes: 'Ago', compras: 61000, economia: 7800 },
    { mes: 'Set', compras: 48000, economia: 6150 },
  ];

  const statusPieData = [
    { name: 'Em Cotação', value: openQuotes.length || 1, color: '#3b82f6' },
    { name: 'Aguardando Aprovação', value: awaitingApproval.length || 1, color: '#f59e0b' },
    { name: 'Aprovadas / Concluídas', value: completedQuotes.length || 1, color: '#10b981' },
  ];

  return (
    <div className="space-y-6">
      {/* Top Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-950 via-slate-900 to-indigo-950 border border-blue-500/20 p-6 lg:p-8 shadow-2xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 text-xs font-semibold">
                Painel Executivo de Suprimentos
              </span>
              <span className="text-slate-400 text-xs">• Aço Carbono & Tubos</span>
            </div>
            <h1 className="text-2xl lg:text-3xl font-black text-white tracking-tight">
              Gestão Inteligente de Cotações & Compras
            </h1>
            <p className="text-sm text-slate-300 mt-1 max-w-2xl">
              Automatização completa da planilha de Mapa de Cotação com motor de validação estrita, auditoria e menor preço real.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              icon={<Sparkles className="w-4 h-4 text-emerald-400" />}
              onClick={() => onNavigate('excel-import')}
            >
              Importar Planilha
            </Button>
            <Button
              variant="primary"
              icon={<FileSpreadsheet className="w-4 h-4" />}
              onClick={() => onNavigate('new-quotation')}
            >
              + Nova Cotação
            </Button>
          </div>
        </div>
      </div>

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Cotações Abertas */}
        <Card hover onClick={() => onNavigate('quotations')}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Cotações Abertas</span>
            <div className="w-9 h-9 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-white mt-2 font-mono">
            {openQuotes.length}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-blue-400 mt-2 font-medium">
            <Clock className="w-3.5 h-3.5" />
            <span>{awaitingApproval.length} aguardando aprovação</span>
          </div>
        </Card>

        {/* Economia Obtida */}
        <Card hover onClick={() => onNavigate('reports')}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Economia Obtida</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-400 mt-2 font-mono">
            R$ {totalEconomy.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-emerald-400 mt-2 font-medium">
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>12.4% vs. Preço de Referência</span>
          </div>
        </Card>

        {/* Compras Efetivadas */}
        <Card hover onClick={() => onNavigate('purchases')}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Comprado</span>
            <div className="w-9 h-9 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <ShoppingCart className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-white mt-2 font-mono">
            R$ {totalPurchases.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-slate-400 mt-2">
            Baseado nos menores preços válidos
          </div>
        </Card>

        {/* Produtos e Fornecedores */}
        <Card hover onClick={() => onNavigate('products')}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Cadastros Ativos</span>
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-white mt-2 font-mono">
            {products.length} <span className="text-sm font-normal text-slate-400">produtos</span>
          </div>
          <div className="text-xs text-slate-400 mt-2">
            {suppliers.length} fornecedores siderúrgicos
          </div>
        </Card>
      </div>

      {/* Visual Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Compras por Fornecedor (BarChart) */}
        <Card className="lg:col-span-2">
          <CardHeader
            title="Volume Cotado por Fornecedor (R$)"
            subtitle="Comparação de valores dos principais parceiros comerciais"
          />
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={supplierChartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.75rem', fontSize: '12px' }}
                  formatter={(value: any) => [`R$ ${Number(value).toFixed(2)}`, 'Valor Cotado']}
                />
                <Bar dataKey="valor" fill="#3b82f6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Status das Cotações (PieChart) */}
        <Card>
          <CardHeader
            title="Distribuição de Cotações"
            subtitle="Status atual dos processos"
          />
          <div className="h-52 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {statusPieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.5rem', fontSize: '12px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-4 text-xs mt-2">
            {statusPieData.map((item) => (
              <div key={item.name} className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-slate-300">{item.name}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Alertas & Cotações Recentes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Alertas de Negócio (Seção 43) */}
        <Card>
          <CardHeader
            title="Alertas & Atenção do Comprador"
            subtitle="Regras de negócio identificadas automaticamente pelo sistema"
          />
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3.5 rounded-xl bg-amber-950/40 border border-amber-500/40">
              <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
              <div>
                <div className="text-xs font-bold text-amber-300">
                  Cotação abaixo da necessidade identificada (Paulisteel)
                </div>
                <p className="text-[11px] text-amber-200/80 mt-0.5">
                  Item MPR-CAI-1500: Cotado 2 peças enquanto a necessidade é de 26,94 barras. Desclassificado do Menor Preço.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3.5 rounded-xl bg-orange-950/40 border border-orange-500/40">
              <AlertTriangle className="w-4 h-4 text-orange-400 mt-0.5 shrink-0" />
              <div>
                <div className="text-xs font-bold text-orange-300">
                  Produto divergente informado (Romeva Tubos)
                </div>
                <p className="text-[11px] text-orange-200/80 mt-0.5">
                  Fornecedor cotou Tubo Redondo em vez de Tubo Retangular 100x40. Excluído automaticamente do menor preço.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3.5 rounded-xl bg-blue-950/40 border border-blue-500/30">
              <Clock className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
              <div>
                <div className="text-xs font-bold text-blue-300">
                  Proposta comercial vencendo em 2 dias (JD Aço)
                </div>
                <p className="text-[11px] text-blue-200/80 mt-0.5">
                  Orçamento ORC-JD-2026-889 expira em 25/09/2026. Recomendado aprovar para fixação de preços.
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* Cotações Recentes */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold text-white tracking-tight">Cotações em Andamento</h3>
              <p className="text-xs text-slate-400 mt-0.5">Acesso rápido aos mapas ativos</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => onNavigate('quotations')}>
              Ver Todas
            </Button>
          </div>

          <div className="divide-y divide-slate-800">
            {quotations.map((q) => (
              <div
                key={q.id}
                onClick={() => {
                  onSelectQuotation(q.id);
                  onNavigate('quotation-detail');
                }}
                className="py-3 flex items-center justify-between hover:bg-slate-800/40 px-2 rounded-lg cursor-pointer transition-colors"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-blue-400">{q.quotation_number}</span>
                    <Badge status={q.status} size="sm" />
                  </div>
                  <div className="text-xs font-medium text-white mt-1">{q.project_name}</div>
                  <div className="text-[10px] text-slate-400">{q.items.length} produtos • {q.supplier_quotes.length} fornecedores</div>
                </div>

                <div className="text-right">
                  <div className="text-xs font-bold text-emerald-400 font-mono">
                    R$ {q.supplier_quotes[0]?.calculated_subtotal ? q.supplier_quotes[0].calculated_subtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '0,00'}
                  </div>
                  <span className="text-[10px] text-slate-400">{q.quotation_date}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};
