import React, { useState } from 'react';
import {
  Trophy,
  AlertTriangle,
  Edit3,
  Sliders,
  Plus,
  FileSpreadsheet,
  FileText,
  CheckCircle,
  XCircle,
  Truck,
  ArrowRight,
  TrendingDown,
  Info
} from 'lucide-react';
import { QuotationFull, QuotationItem, SupplierQuote, SupplierQuoteItem } from '../../types/quotation';
import { Supplier } from '../../types/supplier';
import { calculateLowestValidPrice, validateSupplierQuote } from '../../domain/validations';
import { calculateSupplierSubtotal, calculateQuotationTotal } from '../../domain/calculations';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { SupplierQuoteModal } from './SupplierQuoteModal';
import { ManualOverrideModal } from './ManualOverrideModal';
import { useAuth } from '../../context/AuthContext';
import { localStore } from '../../lib/storage';
import { exportQuotationToExcel } from '../../lib/excel-exporter';
import { exportQuotationToPdf } from '../../lib/pdf-exporter';
import { useNotification } from '../../context/NotificationContext';

interface QuotationComparisonMatrixProps {
  quotation: QuotationFull;
  onUpdate: (updatedQuotation: QuotationFull) => void;
  onGeneratePurchaseOrder?: (supplierId: string) => void;
}

export const QuotationComparisonMatrix: React.FC<QuotationComparisonMatrixProps> = ({
  quotation,
  onUpdate,
  onGeneratePurchaseOrder,
}) => {
  const { user, role } = useAuth();
  const { success, error, info } = useNotification();

  // Modals state
  const [quoteModalOpen, setQuoteModalOpen] = useState(false);
  const [overrideModalOpen, setOverrideModalOpen] = useState(false);
  const [selectedQuotationItem, setSelectedQuotationItem] = useState<QuotationItem | undefined>();
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | undefined>();
  const [selectedQuoteItem, setSelectedQuoteItem] = useState<SupplierQuoteItem | undefined>();

  // Opens quote edit modal
  const handleOpenQuoteModal = (item: QuotationItem, sq: SupplierQuote) => {
    setSelectedQuotationItem(item);
    setSelectedSupplier(sq.supplier);
    const existing = sq.items?.find((i) => i.quotation_item_id === item.id);
    setSelectedQuoteItem(existing);
    setQuoteModalOpen(true);
  };

  // Opens manual override modal
  const handleOpenOverrideModal = (item: QuotationItem, sq: SupplierQuote, quoteItem: SupplierQuoteItem) => {
    setSelectedQuotationItem(item);
    setSelectedSupplier(sq.supplier);
    setSelectedQuoteItem(quoteItem);
    setOverrideModalOpen(true);
  };

  // Saves updated quote item
  const handleSaveQuoteItem = (updates: Partial<SupplierQuoteItem>) => {
    if (!selectedQuotationItem || !selectedSupplier) return;

    const newQuotation: QuotationFull = JSON.parse(JSON.stringify(quotation));
    const sqIndex = newQuotation.supplier_quotes.findIndex((s) => s.supplier_id === selectedSupplier.id);

    if (sqIndex >= 0) {
      const sq = newQuotation.supplier_quotes[sqIndex];
      if (!sq.items) sq.items = [];

      const itemIndex = sq.items.findIndex((i) => i.quotation_item_id === selectedQuotationItem.id);

      // Valida automaticamente de acordo com as regras de negócio
      const validation = validateSupplierQuote(updates, selectedQuotationItem);

      const updatedItem: SupplierQuoteItem = {
        id: selectedQuoteItem?.id || `sqi-${Date.now()}`,
        supplier_quote_id: sq.id,
        quotation_item_id: selectedQuotationItem.id,
        quoted_quantity: updates.quoted_quantity || 0,
        weight_kg: updates.weight_kg || 0,
        unit_price: updates.unit_price || 0,
        price_unit: updates.price_unit || 'kg',
        ipi_percent: updates.ipi_percent || 0,
        icms_percent: updates.icms_percent || 0,
        calculated_total: updates.calculated_total || 0,
        validation_status: validation.status,
        manual_exclude_from_lowest: selectedQuoteItem?.manual_exclude_from_lowest || false,
        manual_exclude_reason: selectedQuoteItem?.manual_exclude_reason,
        divergent_product_reason: selectedQuoteItem?.divergent_product_reason,
        notes: updates.notes,
        created_at: selectedQuoteItem?.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      if (itemIndex >= 0) {
        sq.items[itemIndex] = updatedItem;
      } else {
        sq.items.push(updatedItem);
      }

      // Recalcula subtotal do fornecedor
      sq.calculated_subtotal = calculateSupplierSubtotal(sq.items);
      if (sq.official_proposal_total === 0) {
        sq.official_proposal_total = sq.calculated_subtotal;
      }

      // Log de Auditoria
      localStore.logAudit({
        organization_id: quotation.organization_id,
        user_id: user?.id,
        user_name: user?.full_name,
        action: 'LANÇAMENTO_COTAÇÃO',
        entity: 'supplier_quote_items',
        entity_id: updatedItem.id,
        new_data: updatedItem as any,
        reason: `Lançamento de preço: ${selectedSupplier.trade_name} para ${selectedQuotationItem.product?.codigo_mpr}`
      });

      localStore.saveQuotation(newQuotation);
      onUpdate(newQuotation);
      success('Cotação salva com sucesso!');
    }
  };

  // Salva sobreposição manual (exclusão ou divergência)
  const handleSaveOverride = (override: {
    manual_exclude_from_lowest: boolean;
    manual_exclude_reason?: string;
    divergent_product_reason?: string;
  }) => {
    if (!selectedQuoteItem || !selectedQuotationItem || !selectedSupplier) return;

    const newQuotation: QuotationFull = JSON.parse(JSON.stringify(quotation));
    const sqIndex = newQuotation.supplier_quotes.findIndex((s) => s.supplier_id === selectedSupplier.id);

    if (sqIndex >= 0) {
      const sq = newQuotation.supplier_quotes[sqIndex];
      const itemIndex = sq.items?.findIndex((i) => i.id === selectedQuoteItem.id);

      if (itemIndex !== undefined && itemIndex >= 0 && sq.items) {
        const item = sq.items[itemIndex];
        item.manual_exclude_from_lowest = override.manual_exclude_from_lowest;
        item.manual_exclude_reason = override.manual_exclude_reason;
        item.divergent_product_reason = override.divergent_product_reason;

        // Reavalia status
        const validation = validateSupplierQuote(item, selectedQuotationItem);
        item.validation_status = validation.status;

        // Auditoria
        localStore.logAudit({
          organization_id: quotation.organization_id,
          user_id: user?.id,
          user_name: user?.full_name,
          action: 'DECISAO_MANUAL_COMPRADOR',
          entity: 'supplier_quote_items',
          entity_id: item.id,
          new_data: override,
          reason: override.manual_exclude_reason || override.divergent_product_reason || 'Alteração manual de elegibilidade'
        });

        localStore.saveQuotation(newQuotation);
        onUpdate(newQuotation);
        info('Status do item atualizado e registrado no log de auditoria.');
      }
    }
  };

  // Status de aprovação da cotação
  const handleApproveQuotation = () => {
    const updated = {
      ...quotation,
      status: 'APROVADA' as const,
      approved_by: user?.id,
      approved_at: new Date().toISOString()
    };
    localStore.saveQuotation(updated);
    localStore.logAudit({
      organization_id: quotation.organization_id,
      user_id: user?.id,
      user_name: user?.full_name,
      action: 'APROVAÇÃO_COTAÇÃO',
      entity: 'quotations',
      entity_id: quotation.id,
      new_data: { status: 'APROVADA' },
      reason: 'Cotação aprovada pelo gestor'
    });
    onUpdate(updated);
    success('Cotação aprovada com sucesso!', 'Pronta para emissão do Pedido de Compra.');
  };

  // Cálculos globais do mapa
  let totalLowestValidSum = 0;
  let totalReferenceSum = 0;

  quotation.items.forEach((item) => {
    const quoteItemsForThisProduct: SupplierQuoteItem[] = [];
    quotation.supplier_quotes.forEach((sq) => {
      const q = sq.items?.find((i) => i.quotation_item_id === item.id);
      if (q) quoteItemsForThisProduct.push(q);
    });
    const analysis = calculateLowestValidPrice(quoteItemsForThisProduct, item);
    if (analysis.lowestValidTotal) {
      totalLowestValidSum += analysis.lowestValidTotal;
    }
    const ref = (item.product?.reference_price || 0) * (item.estimated_weight_kg || 0);
    totalReferenceSum += ref;
  });

  const potentialSavings = Math.max(0, totalReferenceSum - totalLowestValidSum);

  return (
    <div className="space-y-6">
      {/* Action Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-slate-900 border border-slate-800">
        <div className="flex items-center gap-3">
          <Badge status={quotation.status} />
          <div>
            <h2 className="text-base font-bold text-white">{quotation.project_name}</h2>
            <p className="text-xs text-slate-400">
              Cotação nº <strong className="text-slate-200">{quotation.quotation_number}</strong> • Data: {quotation.quotation_date}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            icon={<FileSpreadsheet className="w-4 h-4 text-emerald-400" />}
            onClick={() => exportQuotationToExcel(quotation)}
          >
            Exportar Excel (.xlsx)
          </Button>
          <Button
            variant="outline"
            size="sm"
            icon={<FileText className="w-4 h-4 text-rose-400" />}
            onClick={() => exportQuotationToPdf(quotation)}
          >
            Exportar PDF
          </Button>
          {quotation.status !== 'APROVADA' && (role === 'ADMIN' || role === 'COMPRAS') && (
            <Button
              variant="success"
              size="sm"
              icon={<CheckCircle className="w-4 h-4" />}
              onClick={handleApproveQuotation}
            >
              Aprovar Cotação
            </Button>
          )}
          {quotation.status === 'APROVADA' && onGeneratePurchaseOrder && (
            <Button
              variant="primary"
              size="sm"
              icon={<Truck className="w-4 h-4" />}
              onClick={() => onGeneratePurchaseOrder(quotation.supplier_quotes[0]?.supplier_id)}
            >
              Gerar Pedido de Compra
            </Button>
          )}
        </div>
      </div>

      {/* Tabela de Matriz Comparativa (Desktop Scroll Horizontal) */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden shadow-2xl backdrop-blur-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead>
              {/* Linha 1 de Cabeçalho: Fornecedores Agrupados */}
              <tr className="bg-slate-950/90 text-slate-300 text-xs font-bold border-b border-slate-800">
                <th colSpan={3} className="py-3 px-4 border-r border-slate-800 uppercase tracking-wider text-slate-400">
                  Especificação Técnica dos Produtos
                </th>
                {quotation.supplier_quotes.map((sq) => (
                  <th
                    key={sq.id}
                    className="py-3 px-4 border-r border-slate-800 text-center bg-slate-900/90 min-w-[220px]"
                  >
                    <div className="flex items-center justify-center gap-1.5 text-white font-extrabold text-sm">
                      <Truck className="w-4 h-4 text-blue-400" />
                      <span>{sq.supplier?.trade_name || sq.supplier?.company_name}</span>
                    </div>
                    <div className="text-[10px] text-slate-400 font-normal">
                      {sq.proposal_number ? `Orç. ${sq.proposal_number}` : 'Aguardando nº proposta'} • {sq.payment_terms || '28 DDL'}
                    </div>
                  </th>
                ))}
                <th className="py-3 px-4 text-center bg-emerald-950/40 text-emerald-300 min-w-[200px]">
                  🏆 Menor Preço Válido & Alertas
                </th>
              </tr>

              {/* Linha 2 de Sub-cabeçalhos */}
              <tr className="bg-slate-900 text-[11px] font-semibold text-slate-400 border-b border-slate-800">
                <th className="py-2.5 px-3 w-12 text-center">#</th>
                <th className="py-2.5 px-3 min-w-[220px]">Código MPR & Descrição</th>
                <th className="py-2.5 px-3 w-32 border-r border-slate-800">Necessidade</th>
                {quotation.supplier_quotes.map((sq) => (
                  <th key={`sub-${sq.id}`} className="py-2.5 px-3 border-r border-slate-800 text-center">
                    Qtd | Preço | Total
                  </th>
                ))}
                <th className="py-2.5 px-3 text-center bg-emerald-950/20 text-emerald-400">
                  Resultado da Apuração
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-800 text-xs text-slate-200">
              {quotation.items.map((item, index) => {
                // Coleta cotações de todos os fornecedores para esse produto
                const quoteItemsForThisProduct: SupplierQuoteItem[] = [];
                quotation.supplier_quotes.forEach((sq) => {
                  const q = sq.items?.find((i) => i.quotation_item_id === item.id);
                  if (q) quoteItemsForThisProduct.push(q);
                });

                // Executa análise estrita de validação e menor preço
                const analysis = calculateLowestValidPrice(quoteItemsForThisProduct, item);

                return (
                  <tr key={item.id} className="hover:bg-slate-800/40 transition-colors">
                    {/* # Index */}
                    <td className="py-3 px-3 text-center font-mono text-slate-400 font-bold">
                      {index + 1}
                    </td>

                    {/* Produto MPR */}
                    <td className="py-3 px-3">
                      <div className="font-mono font-bold text-blue-400 text-[11px]">
                        {item.product?.codigo_mpr}
                      </div>
                      <div className="font-medium text-white line-clamp-2">
                        {item.product?.description}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        Dim: {item.product?.dimensions || 'N/A'} • Mat: {item.product?.material || 'AISI 1020'}
                      </div>
                    </td>

                    {/* Quantidade Necessária */}
                    <td className="py-3 px-3 border-r border-slate-800 font-medium">
                      <div className="text-white font-bold">{item.quantity_bars} barras</div>
                      <div className="text-[11px] text-slate-400 font-mono">{item.quantity_meters} m</div>
                      <div className="text-[10px] text-slate-400 font-mono">{item.estimated_weight_kg} kg</div>
                    </td>

                    {/* Células de Cada Fornecedor */}
                    {quotation.supplier_quotes.map((sq) => {
                      const quoteItem = sq.items?.find((i) => i.quotation_item_id === item.id);
                      const isLowest = quoteItem && analysis.lowestValidSupplierQuoteItemId === quoteItem.id;

                      if (!quoteItem || quoteItem.validation_status === 'NAO_COTADO' || (quoteItem.quoted_quantity === 0 && quoteItem.unit_price === 0)) {
                        return (
                          <td key={sq.id} className="py-3 px-3 border-r border-slate-800 text-center">
                            <Badge status="NAO_COTADO" size="sm" />
                            <div className="mt-1.5">
                              <button
                                onClick={() => handleOpenQuoteModal(item, sq)}
                                className="text-[11px] text-blue-400 hover:text-blue-300 font-medium hover:underline inline-flex items-center gap-1"
                              >
                                <Plus className="w-3 h-3" /> Lançar Preço
                              </button>
                            </div>
                          </td>
                        );
                      }

                      return (
                        <td
                          key={sq.id}
                          className={`py-3 px-3 border-r border-slate-800 transition-colors ${
                            isLowest ? 'bg-emerald-950/20 ring-1 ring-inset ring-emerald-500/30' : ''
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1 mb-1">
                            <Badge status={quoteItem.validation_status} size="sm" />
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleOpenQuoteModal(item, sq)}
                                title="Editar Cotação"
                                className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-700/60"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleOpenOverrideModal(item, sq, quoteItem)}
                                title="Decisão Manual / Divergência"
                                className="text-slate-400 hover:text-amber-400 p-1 rounded hover:bg-slate-700/60"
                              >
                                <Sliders className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          <div className="space-y-0.5">
                            <div className="flex justify-between text-[11px]">
                              <span className="text-slate-400">Cotado:</span>
                              <span className={`font-mono font-medium ${quoteItem.quoted_quantity < item.quantity_bars ? 'text-amber-400 font-bold' : 'text-slate-200'}`}>
                                {quoteItem.quoted_quantity} {quoteItem.price_unit}
                              </span>
                            </div>
                            <div className="flex justify-between text-[11px]">
                              <span className="text-slate-400">Preço:</span>
                              <span className="font-mono text-slate-200">
                                R$ {quoteItem.unit_price.toFixed(2)}/{quoteItem.price_unit}
                              </span>
                            </div>
                            <div className="flex justify-between text-xs font-bold pt-1 border-t border-slate-800">
                              <span className="text-slate-300">Total:</span>
                              <span className={`font-mono text-sm ${isLowest ? 'text-emerald-400 font-extrabold' : 'text-white'}`}>
                                R$ {quoteItem.calculated_total.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                            </div>
                          </div>

                          {/* Se produto divergente */}
                          {quoteItem.divergent_product_reason && (
                            <div className="mt-1 text-[10px] text-orange-400 bg-orange-950/40 p-1 rounded border border-orange-500/30">
                              {quoteItem.divergent_product_reason}
                            </div>
                          )}

                          {/* Se excluído manualmente */}
                          {quoteItem.manual_exclude_from_lowest && (
                            <div className="mt-1 text-[10px] text-purple-400 bg-purple-950/40 p-1 rounded border border-purple-500/30">
                              Desconsiderado: {quoteItem.manual_exclude_reason}
                            </div>
                          )}
                        </td>
                      );
                    })}

                    {/* Coluna de Menor Preço e Alertas */}
                    <td className="py-3 px-3 bg-emerald-950/15 text-center">
                      {analysis.hasValidQuotes && analysis.lowestValidTotal !== null ? (
                        <div className="space-y-1">
                          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold text-xs">
                            <Trophy className="w-3 h-3 text-emerald-400" />
                            R$ {analysis.lowestValidTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>
                          {/* Nome do fornecedor vencedor */}
                          {(() => {
                            const winner = quotation.supplier_quotes.find((sq) =>
                              sq.items?.some((i) => i.id === analysis.lowestValidSupplierQuoteItemId)
                            );
                            return winner ? (
                              <div className="text-[10px] text-emerald-400/90 font-medium">
                                {winner.supplier?.trade_name}
                              </div>
                            ) : null;
                          })()}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 font-medium">Nenhuma cotação válida</span>
                      )}

                      {/* Alerta de Menor Preço Desclassificado (Seção 16, 17 e 18) */}
                      {analysis.lowestInvalidAlert && (
                        <div className="mt-2 p-2 rounded-lg bg-amber-950/50 border border-amber-500/40 text-left">
                          <div className="flex items-center gap-1 text-[10px] font-bold text-amber-400 uppercase tracking-tight">
                            <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0" />
                            Menor nominal desclassificado:
                          </div>
                          <div className="text-xs font-bold text-amber-300 font-mono mt-0.5">
                            R$ {analysis.lowestInvalidAlert.total.toFixed(2)}
                          </div>
                          <div className="text-[10px] text-amber-200/80 leading-tight mt-0.5">
                            {analysis.lowestInvalidAlert.reason}
                          </div>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}

              {/* Linha de Subtotal Calculado dos Itens */}
              <tr className="bg-slate-950 font-bold text-xs border-t-2 border-slate-700">
                <td colSpan={3} className="py-4 px-4 text-right uppercase tracking-wider text-slate-300 border-r border-slate-800">
                  Subtotal Calculado dos Itens Cotados:
                </td>
                {quotation.supplier_quotes.map((sq) => {
                  return (
                    <td key={`sub-${sq.id}`} className="py-4 px-3 border-r border-slate-800 text-right">
                      <div className="text-base font-extrabold text-white font-mono">
                        R$ {sq.calculated_subtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                      <div className="text-[10px] text-slate-400 font-normal">
                        Soma dos itens válidos
                      </div>
                    </td>
                  );
                })}
                <td className="py-4 px-3 bg-emerald-950/40 text-center">
                  <div className="text-xs text-emerald-400 font-bold uppercase">Custo Ótimo (Menores Válidos)</div>
                  <div className="text-lg font-black text-emerald-300 font-mono">
                    R$ {totalLowestValidSum.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </td>
              </tr>

              {/* Linha de Total Oficial da Proposta do Fornecedor */}
              <tr className="bg-slate-950/70 text-xs border-t border-slate-800">
                <td colSpan={3} className="py-3 px-4 text-right text-slate-400 border-r border-slate-800">
                  Total Oficial Informado pelo Fornecedor:
                </td>
                {quotation.supplier_quotes.map((sq) => {
                  const diff = (sq.official_proposal_total || 0) - sq.calculated_subtotal;
                  return (
                    <td key={`off-${sq.id}`} className="py-3 px-3 border-r border-slate-800 text-right">
                      <div className="font-mono text-slate-200 font-bold">
                        R$ {(sq.official_proposal_total || sq.calculated_subtotal).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                      {Math.abs(diff) > 0.01 && (
                        <div className={`text-[10px] font-medium ${diff > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                          Diferença: {diff > 0 ? '+' : ''}R$ {diff.toFixed(2)}
                        </div>
                      )}
                    </td>
                  );
                })}
                <td className="py-3 px-3 bg-emerald-950/30 text-center">
                  <div className="flex items-center justify-center gap-1 text-[11px] text-emerald-400 font-semibold">
                    <TrendingDown className="w-3.5 h-3.5" />
                    Economia Estimada:
                  </div>
                  <div className="font-bold text-sm text-emerald-300 font-mono">
                    R$ {potentialSavings.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Modais */}
      {selectedQuotationItem && selectedSupplier && (
        <SupplierQuoteModal
          isOpen={quoteModalOpen}
          onClose={() => setQuoteModalOpen(false)}
          quotationItem={selectedQuotationItem}
          supplier={selectedSupplier}
          initialQuoteItem={selectedQuoteItem}
          onSave={handleSaveQuoteItem}
        />
      )}

      {selectedQuoteItem && selectedQuotationItem && selectedSupplier && (
        <ManualOverrideModal
          isOpen={overrideModalOpen}
          onClose={() => setOverrideModalOpen(false)}
          quoteItem={selectedQuoteItem}
          productDescription={selectedQuotationItem.product?.description}
          supplierName={selectedSupplier.trade_name || selectedSupplier.company_name}
          onConfirm={handleSaveOverride}
        />
      )}
    </div>
  );
};
