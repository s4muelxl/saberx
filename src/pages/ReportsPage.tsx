import React, { useState } from 'react';
import { BarChart3, TrendingDown, DollarSign, Calendar, History, Truck } from 'lucide-react';
import { Card, CardHeader } from '../components/ui/Card';
import { localStore } from '../lib/storage';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

export const ReportsPage: React.FC = () => {
  const products = localStore.getProducts();
  const [selectedProductId, setSelectedProductId] = useState(products[0]?.id || '');

  const selectedProduct = products.find((p) => p.id === selectedProductId);

  // Histórico de Preços por Produto (Seção 45)
  const priceHistoryData = [
    { data: '05/08/2026', fornecedor: 'Paulisteel', preco: 7.90 },
    { data: '18/08/2026', fornecedor: 'Luxfer', preco: 7.80 },
    { data: '01/09/2026', fornecedor: 'Romeva', preco: 7.55 },
    { data: '12/09/2026', fornecedor: 'JD Aço', preco: 7.39 },
    { data: '23/09/2026', fornecedor: 'JD Aço', preco: 7.35 },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-blue-500" />
          Relatórios & Inteligência de Preços
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Análise histórica de preços praticados por fornecedor, economia alcançada e margem comercial
        </p>
      </div>

      {/* Histórico de Preços do Produto (Seção 45) */}
      <Card>
        <CardHeader
          title="Histórico e Evolução de Preços por Produto (R$/kg)"
          subtitle="Acompanhamento da curva de preços cotados por diferentes fornecedores"
          action={
            <div className="w-72">
              <select
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 text-xs text-white rounded-lg px-3 py-2"
              >
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.codigo_mpr}
                  </option>
                ))}
              </select>
            </div>
          }
        />

        {selectedProduct && (
          <div className="p-3 mb-4 rounded-xl bg-slate-950 border border-slate-800 text-xs flex justify-between items-center">
            <div>
              <span className="text-slate-400">Produto Selecionado:</span>{' '}
              <strong className="text-white">{selectedProduct.description}</strong>
            </div>
            <div className="font-mono text-emerald-400">
              Preço de Referência: <strong>R$ {selectedProduct.reference_price?.toFixed(2)}/kg</strong>
            </div>
          </div>
        )}

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={priceHistoryData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="data" stroke="#94a3b8" fontSize={11} />
              <YAxis stroke="#94a3b8" fontSize={11} domain={['dataMin - 0.5', 'dataMax + 0.5']} />
              <Tooltip
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.75rem', fontSize: '12px' }}
                formatter={(v: any, name: any, item: any) => [`R$ ${Number(v).toFixed(2)}/kg (${item.payload.fornecedor})`, 'Preço Cotado']}
              />
              <Line type="monotone" dataKey="preco" stroke="#10b981" strokeWidth={3} dot={{ r: 5, fill: '#10b981' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Histórico em Lista */}
        <div className="mt-4 border-t border-slate-800 pt-3">
          <div className="text-xs font-bold text-slate-300 uppercase mb-2">Últimos Lançamentos Registrados</div>
          <div className="divide-y divide-slate-800 text-xs">
            {priceHistoryData.map((h, i) => (
              <div key={i} className="py-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Truck className="w-3.5 h-3.5 text-blue-400" />
                  <span className="font-semibold text-white">{h.fornecedor}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-slate-400 font-mono">{h.data}</span>
                  <span className="font-mono font-bold text-emerald-400">R$ {h.preco.toFixed(2)}/kg</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
};
