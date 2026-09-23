import React, { useState } from 'react';
import {
  FileSpreadsheet,
  Plus,
  Trash2,
  Search,
  Check,
  Truck,
  Package,
  ArrowLeft,
  Save,
  HelpCircle
} from 'lucide-react';
import { Card, CardHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { localStore, DEMO_ORG_ID } from '../lib/storage';
import { Product } from '../types/product';
import { Supplier } from '../types/supplier';
import { QuotationFull, QuotationItem, SupplierQuote } from '../types/quotation';
import { ActivePage } from '../components/layout/Sidebar';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';

interface NewQuotationPageProps {
  onNavigate: (page: ActivePage) => void;
  onSelectQuotation: (id: string) => void;
}

export const NewQuotationPage: React.FC<NewQuotationPageProps> = ({ onNavigate, onSelectQuotation }) => {
  const { user } = useAuth();
  const { success, error } = useNotification();

  const allProducts = localStore.getProducts();
  const allSuppliers = localStore.getSuppliers();

  // Header info
  const [quotationNumber, setQuotationNumber] = useState(`COT-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`);
  const [projectName, setProjectName] = useState('');
  const [relatedClient, setRelatedClient] = useState('');
  const [deadlineDate, setDeadlineDate] = useState('');
  const [notes, setNotes] = useState('');

  // Selected Products with required quantities
  const [selectedItems, setSelectedItems] = useState<
    Array<{
      product: Product;
      quantity_bars: number;
      quantity_meters: number;
      estimated_weight_kg: number;
      notes?: string;
    }>
  >([]);

  // Selected Suppliers
  const [selectedSupplierIds, setSelectedSupplierIds] = useState<string[]>(
    allSuppliers.slice(0, 4).map((s) => s.id)
  );

  // MPR search state
  const [mprSearch, setMprSearch] = useState('');

  const filteredProducts = allProducts.filter(
    (p) =>
      p.codigo_mpr.toLowerCase().includes(mprSearch.toLowerCase()) ||
      p.description.toLowerCase().includes(mprSearch.toLowerCase())
  );

  const handleAddProduct = (prod: Product) => {
    if (selectedItems.some((i) => i.product.id === prod.id)) return;

    const initialBars = 10;
    const initialMeters = initialBars * (prod.length_unit_meters || 6.0);
    const initialWeight = initialBars * (prod.weight_unit_kg || 16.76);

    setSelectedItems([
      ...selectedItems,
      {
        product: prod,
        quantity_bars: initialBars,
        quantity_meters: initialMeters,
        estimated_weight_kg: initialWeight,
        notes: ''
      }
    ]);
    setMprSearch('');
  };

  const handleRemoveItem = (index: number) => {
    setSelectedItems(selectedItems.filter((_, i) => i !== index));
  };

  const handleUpdateItemQuantity = (index: number, bars: number) => {
    const item = selectedItems[index];
    const lengthUnit = item.product.length_unit_meters || 6.0;
    const weightUnit = item.product.weight_unit_kg || 0;

    const updated = [...selectedItems];
    updated[index] = {
      ...item,
      quantity_bars: bars,
      quantity_meters: Number((bars * lengthUnit).toFixed(2)),
      estimated_weight_kg: Number((bars * weightUnit).toFixed(2))
    };
    setSelectedItems(updated);
  };

  const toggleSupplier = (supplierId: string) => {
    if (selectedSupplierIds.includes(supplierId)) {
      if (selectedSupplierIds.length <= 1) {
        error('Selecione pelo menos um fornecedor para a cotação.');
        return;
      }
      setSelectedSupplierIds(selectedSupplierIds.filter((id) => id !== supplierId));
    } else {
      setSelectedSupplierIds([...selectedSupplierIds, supplierId]);
    }
  };

  const handleCreateQuotation = () => {
    if (!projectName.trim()) {
      error('Por favor, informe o nome do projeto ou obra.');
      return;
    }
    if (selectedItems.length === 0) {
      error('Adicione pelo menos um produto na cotação.');
      return;
    }
    if (selectedSupplierIds.length === 0) {
      error('Selecione pelo menos um fornecedor.');
      return;
    }

    const quotationId = `cot-${Date.now()}`;

    // Monta itens
    const items: QuotationItem[] = selectedItems.map((si, idx) => ({
      id: `qitem-${quotationId}-${idx + 1}`,
      quotation_id: quotationId,
      product_id: si.product.id,
      item_order: idx + 1,
      quantity_bars: si.quantity_bars,
      quantity_meters: si.quantity_meters,
      estimated_weight_kg: si.estimated_weight_kg,
      notes: si.notes,
      created_at: new Date().toISOString(),
      product: si.product
    }));

    // Monta estruturas de fornecedores
    const supplierQuotes: SupplierQuote[] = selectedSupplierIds.map((sId) => {
      const sup = allSuppliers.find((s) => s.id === sId);
      const sqId = `sq-${quotationId}-${sId}`;

      // Inicia com itens não cotados prontos para lançamento
      const sqItems = items.map((it) => ({
        id: `sqi-${sqId}-${it.id}`,
        supplier_quote_id: sqId,
        quotation_item_id: it.id,
        quoted_quantity: 0,
        weight_kg: 0,
        unit_price: 0,
        price_unit: 'kg' as const,
        ipi_percent: 0,
        icms_percent: 18,
        calculated_total: 0,
        validation_status: 'NAO_COTADO' as const,
        manual_exclude_from_lowest: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }));

      return {
        id: sqId,
        quotation_id: quotationId,
        supplier_id: sId,
        proposal_date: new Date().toISOString().split('T')[0],
        validity_days: 7,
        payment_terms: sup?.payment_terms || '28 DDL',
        calculated_subtotal: 0,
        official_proposal_total: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        supplier: sup,
        items: sqItems
      };
    });

    const newQuotation: QuotationFull = {
      id: quotationId,
      organization_id: DEMO_ORG_ID,
      quotation_number: quotationNumber,
      project_name: projectName,
      related_client: relatedClient,
      responsible_user_id: user?.id,
      responsible_user_name: user?.full_name,
      quotation_date: new Date().toISOString().split('T')[0],
      deadline_date: deadlineDate,
      notes,
      status: 'EM_COTACAO',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      items,
      supplier_quotes: supplierQuotes
    };

    localStore.saveQuotation(newQuotation);
    localStore.logAudit({
      organization_id: DEMO_ORG_ID,
      user_id: user?.id,
      user_name: user?.full_name,
      action: 'NOVA_COTAÇÃO_CRIADA',
      entity: 'quotations',
      entity_id: quotationId,
      new_data: { number: quotationNumber, project: projectName },
      reason: 'Criação de nova cotação de compras'
    });

    success('Cotação criada com sucesso!', 'Redirecionando para o mapa comparativo...');
    onSelectQuotation(quotationId);
    onNavigate('quotation-detail');
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => onNavigate('quotations')}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Voltar
          </Button>
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight">Nova Cotação de Compras</h1>
            <p className="text-xs text-slate-400">Preencha os dados e selecione os itens por Código MPR</p>
          </div>
        </div>

        <Button variant="primary" icon={<Save className="w-4 h-4" />} onClick={handleCreateQuotation}>
          Salvar & Abrir Mapa
        </Button>
      </div>

      {/* 1. Header Information */}
      <Card>
        <CardHeader
          title="1. Dados Gerais da Cotação"
          subtitle="Identificação do projeto, obra e prazos da concorrência"
        />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input
            label="Número da Cotação"
            value={quotationNumber}
            onChange={(e) => setQuotationNumber(e.target.value)}
            required
          />
          <Input
            label="Nome do Projeto / Obra *"
            placeholder="Ex: Plataforma de Manutenção Linha 2"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            required
          />
          <Input
            label="Cliente / Obra Vinculada"
            placeholder="Ex: Metálicas Brasil S.A."
            value={relatedClient}
            onChange={(e) => setRelatedClient(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <Input
            label="Prazo Desejado para Recebimento das Propostas"
            type="date"
            value={deadlineDate}
            onChange={(e) => setDeadlineDate(e.target.value)}
          />
          <Input
            label="Observações para os Fornecedores"
            placeholder="Ex: Exigir certificado de qualidade do aço 1020"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
      </Card>

      {/* 2. Seleção de Produtos por MPR */}
      <Card>
        <CardHeader
          title="2. Itens da Demanda (Buscar por Código MPR)"
          subtitle="Busque produtos no catálogo ou digite o código MPR"
        />

        {/* Campo de Busca Rápida por MPR */}
        <div className="relative mb-4">
          <Input
            placeholder="Digite o Código MPR (ex: MPR-CAI-1500-0188-1020) ou descrição do aço..."
            value={mprSearch}
            onChange={(e) => setMprSearch(e.target.value)}
            leftIcon={<Search className="w-4 h-4" />}
          />

          {/* Dropdown de sugestão */}
          {mprSearch.trim().length > 0 && (
            <div className="absolute left-0 right-0 top-full mt-1 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-30 max-h-60 overflow-y-auto">
              {filteredProducts.length === 0 ? (
                <div className="p-3 text-xs text-slate-400 text-center">Nenhum produto encontrado com este código ou descrição.</div>
              ) : (
                filteredProducts.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => handleAddProduct(p)}
                    className="p-3 hover:bg-slate-800 cursor-pointer flex items-center justify-between border-b border-slate-800 last:border-0"
                  >
                    <div>
                      <div className="text-xs font-mono font-bold text-blue-400">{p.codigo_mpr}</div>
                      <div className="text-xs font-medium text-white">{p.description}</div>
                      <div className="text-[10px] text-slate-400">
                        {p.dimensions} • Peso: {p.weight_unit_kg} kg/barra • Comprimento: {p.length_unit_meters} m
                      </div>
                    </div>
                    <Button size="sm" variant="ghost">
                      <Plus className="w-4 h-4 text-blue-400" /> Adicionar
                    </Button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Tabela de Itens Adicionados */}
        {selectedItems.length === 0 ? (
          <div className="p-8 text-center border-2 border-dashed border-slate-800 rounded-xl">
            <Package className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <div className="text-sm font-semibold text-slate-300">Nenhum produto adicionado à cotação</div>
            <p className="text-xs text-slate-500 mt-1">Busque pelo código MPR no campo acima para selecionar.</p>
          </div>
        ) : (
          <div className="border border-slate-800 rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">Código MPR</th>
                  <th className="py-2.5 px-3">Descrição Técnica</th>
                  <th className="py-2.5 px-3 text-center">Qtd. Necessária (Barras)</th>
                  <th className="py-2.5 px-3 text-center">Metragem (m)</th>
                  <th className="py-2.5 px-3 text-center">Peso Est. (kg)</th>
                  <th className="py-2.5 px-3 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {selectedItems.map((item, idx) => (
                  <tr key={item.product.id} className="hover:bg-slate-800/40">
                    <td className="py-2.5 px-3 font-mono font-bold text-blue-400">
                      {item.product.codigo_mpr}
                    </td>
                    <td className="py-2.5 px-3 font-medium text-white">
                      {item.product.description}
                    </td>
                    <td className="py-2.5 px-3 text-center w-36">
                      <input
                        type="number"
                        step="any"
                        value={item.quantity_bars}
                        onChange={(e) => handleUpdateItemQuantity(idx, parseFloat(e.target.value) || 0)}
                        className="w-24 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-center font-bold text-white text-xs focus:ring-1 focus:ring-blue-500"
                      />
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono text-slate-300">
                      {item.quantity_meters} m
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono text-slate-300">
                      {item.estimated_weight_kg} kg
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        onClick={() => handleRemoveItem(idx)}
                        className="text-slate-400 hover:text-rose-400 p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* 3. Fornecedores Participantes */}
      <Card>
        <CardHeader
          title="3. Fornecedores Participantes da Cotação"
          subtitle="Selecione quais empresas receberão a solicitação e constarão no mapa"
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {allSuppliers.map((s) => {
            const isSelected = selectedSupplierIds.includes(s.id);
            return (
              <div
                key={s.id}
                onClick={() => toggleSupplier(s.id)}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-start justify-between ${
                  isSelected
                    ? 'bg-blue-950/40 border-blue-500/50 shadow-md'
                    : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div>
                  <div className="flex items-center gap-1.5 font-bold text-xs text-white">
                    <Truck className="w-3.5 h-3.5 text-blue-400" />
                    <span>{s.trade_name || s.company_name}</span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1 font-mono">{s.cnpj}</div>
                  <div className="text-[10px] text-slate-400">{s.city} - {s.state} • {s.payment_terms}</div>
                </div>

                <div
                  className={`w-5 h-5 rounded-md flex items-center justify-center border transition-colors ${
                    isSelected
                      ? 'bg-blue-600 border-blue-500 text-white'
                      : 'border-slate-700 bg-slate-800'
                  }`}
                >
                  {isSelected && <Check className="w-3.5 h-3.5" />}
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
};
