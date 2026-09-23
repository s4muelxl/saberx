import React, { useState } from 'react';
import {
  ShoppingCart,
  Plus,
  Search,
  Truck,
  CheckCircle,
  Clock,
  ChevronRight,
  Eye,
  FileText
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { PurchaseOrder, PurchaseOrderStatus } from '../types/purchase';
import { localStore } from '../lib/storage';
import { useNotification } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';

export const PurchasesPage: React.FC = () => {
  const { user, role } = useAuth();
  const { success, info } = useNotification();
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>(() =>
    localStore.getPurchaseOrders()
  );
  const [search, setSearch] = useState('');
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);

  const statuses: PurchaseOrderStatus[] = [
    'RASCUNHO',
    'APROVADO',
    'ENVIADO',
    'CONFIRMADO',
    'EM_TRANSPORTE',
    'RECEBIDO',
    'CANCELADO'
  ];

  const handleUpdateStatus = (po: PurchaseOrder, newStatus: PurchaseOrderStatus) => {
    const updated = { ...po, status: newStatus };
    localStore.savePurchaseOrder(updated);
    localStore.logAudit({
      organization_id: po.organization_id,
      user_id: user?.id,
      user_name: user?.full_name,
      action: 'STATUS_PEDIDO_COMPRA_ALTERADO',
      entity: 'purchase_orders',
      entity_id: po.id,
      new_data: { status: newStatus },
      reason: `Alteração de status do pedido ${po.order_number}`
    });
    setPurchaseOrders(localStore.getPurchaseOrders());
    if (selectedPO?.id === po.id) setSelectedPO(updated);
    success(`Pedido ${po.order_number} atualizado para ${newStatus}!`);
  };

  const filteredOrders = purchaseOrders.filter((po) => {
    return (
      po.order_number.toLowerCase().includes(search.toLowerCase()) ||
      po.supplier?.trade_name?.toLowerCase().includes(search.toLowerCase())
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <ShoppingCart className="w-6 h-6 text-indigo-500" />
            Módulo de Compras (Pedidos)
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Pedidos de compra gerados a partir das cotações aprovadas com os menores preços válidos
          </p>
        </div>
      </div>

      {/* Filter */}
      <Card className="p-4">
        <Input
          placeholder="Pesquisar pedido por número ou fornecedor..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          leftIcon={<Search className="w-4 h-4" />}
        />
      </Card>

      {/* Orders List */}
      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800">
                <th className="py-3 px-4">Pedido Nº</th>
                <th className="py-3 px-4">Fornecedor</th>
                <th className="py-3 px-4 text-center">Itens</th>
                <th className="py-3 px-4">Condição de Pagto</th>
                <th className="py-3 px-4 text-right">Valor Total</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Data</th>
                <th className="py-3 px-4 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    Nenhum pedido de compra gerado ainda. Aprove uma cotação e clique em "Gerar Pedido de Compra".
                  </td>
                </tr>
              ) : (
                filteredOrders.map((po) => (
                  <tr key={po.id} className="hover:bg-slate-800/40 cursor-pointer" onClick={() => setSelectedPO(po)}>
                    <td className="py-3 px-4 font-mono font-bold text-indigo-400">{po.order_number}</td>
                    <td className="py-3 px-4 font-semibold text-white">{po.supplier?.trade_name || po.supplier?.company_name}</td>
                    <td className="py-3 px-4 text-center font-mono">{po.items?.length || 0}</td>
                    <td className="py-3 px-4 text-slate-300">{po.payment_terms || '28 DDL'}</td>
                    <td className="py-3 px-4 text-right font-mono font-extrabold text-white">
                      R$ {po.total_amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <Badge status={po.status} size="sm" />
                    </td>
                    <td className="py-3 px-4 text-right text-slate-400">{po.order_date}</td>
                    <td className="py-3 px-4 text-right">
                      <Button size="sm" variant="ghost" icon={<Eye className="w-3.5 h-3.5" />}>
                        Detalhes
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modal Detalhe do Pedido */}
      {selectedPO && (
        <Modal
          isOpen={!!selectedPO}
          onClose={() => setSelectedPO(null)}
          title={`Pedido de Compra: ${selectedPO.order_number}`}
          subtitle={`Fornecedor: ${selectedPO.supplier?.trade_name || selectedPO.supplier?.company_name}`}
          maxWidth="2xl"
          footer={
            <Button variant="outline" onClick={() => setSelectedPO(null)}>Fechar</Button>
          }
        >
          <div className="space-y-4 text-xs">
            {/* Status Pipeline Buttons */}
            <div>
              <div className="text-[11px] font-bold text-slate-400 uppercase mb-2">Avançar Fluxo de Status</div>
              <div className="flex flex-wrap gap-1.5">
                {statuses.map((st) => (
                  <button
                    key={st}
                    onClick={() => handleUpdateStatus(selectedPO, st)}
                    className={`px-2.5 py-1 rounded-lg font-semibold transition-colors ${
                      selectedPO.status === st
                        ? 'bg-indigo-600 text-white shadow'
                        : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            {/* Items */}
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
              <div className="font-bold text-white mb-2">Itens do Pedido</div>
              <div className="divide-y divide-slate-800">
                {selectedPO.items?.map((it, idx) => (
                  <div key={idx} className="py-2 flex items-center justify-between">
                    <div>
                      <div className="font-mono text-blue-400 font-bold">{it.product?.codigo_mpr}</div>
                      <div className="text-white">{it.product?.description}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono text-white">{it.quantity} {it.unit} @ R$ {it.unit_price.toFixed(2)}</div>
                      <div className="font-mono font-bold text-emerald-400">R$ {it.total_price.toFixed(2)}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-between font-bold text-sm text-white">
                <span>Total do Pedido:</span>
                <span className="text-emerald-400 font-mono">
                  R$ {selectedPO.total_amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
