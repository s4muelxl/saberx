import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { SupplierQuoteItem } from '../../types/quotation';

interface ManualOverrideModalProps {
  isOpen: boolean;
  onClose: () => void;
  quoteItem?: SupplierQuoteItem;
  productDescription?: string;
  supplierName?: string;
  onConfirm: (updates: {
    manual_exclude_from_lowest: boolean;
    manual_exclude_reason?: string;
    divergent_product_reason?: string;
  }) => void;
}

export const ManualOverrideModal: React.FC<ManualOverrideModalProps> = ({
  isOpen,
  onClose,
  quoteItem,
  productDescription,
  supplierName,
  onConfirm,
}) => {
  const [excludeFromLowest, setExcludeFromLowest] = useState<boolean>(
    quoteItem?.manual_exclude_from_lowest || false
  );
  const [excludeReason, setExcludeReason] = useState<string>(
    quoteItem?.manual_exclude_reason || ''
  );
  const [isDivergent, setIsDivergent] = useState<boolean>(
    !!quoteItem?.divergent_product_reason
  );
  const [divergentReason, setDivergentReason] = useState<string>(
    quoteItem?.divergent_product_reason || ''
  );
  const [error, setError] = useState<string>('');

  const handleSave = () => {
    if (excludeFromLowest && (!excludeReason || excludeReason.trim() === '')) {
      setError('Por favor, informe a justificativa obrigatória para desconsiderar esta cotação.');
      return;
    }
    if (isDivergent && (!divergentReason || divergentReason.trim() === '')) {
      setError('Por favor, especifique o motivo da divergência do produto.');
      return;
    }

    onConfirm({
      manual_exclude_from_lowest: excludeFromLowest,
      manual_exclude_reason: excludeFromLowest ? excludeReason : undefined,
      divergent_product_reason: isDivergent ? divergentReason : undefined,
    });
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Validação Manual & Divergência"
      subtitle={`${supplierName || 'Fornecedor'} • ${productDescription || ''}`}
      maxWidth="md"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button variant="primary" onClick={handleSave}>Confirmar Decisão</Button>
        </>
      }
    >
      <div className="space-y-5 text-sm">
        {/* Desconsiderar do Menor Preço */}
        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="font-bold text-white block">Desconsiderar no Menor Preço</span>
              <span className="text-xs text-slate-400">
                Se ativado, esta cotação não competirá como Menor Preço Válido 🏆.
              </span>
            </div>
            <input
              type="checkbox"
              checked={excludeFromLowest}
              onChange={(e) => {
                setExcludeFromLowest(e.target.checked);
                setError('');
              }}
              className="w-5 h-5 rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-blue-500 cursor-pointer"
            />
          </div>

          {excludeFromLowest && (
            <div className="pt-2 border-t border-slate-800">
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase">
                Justificativa Obrigatória (Audit Log)
              </label>
              <select
                value={excludeReason}
                onChange={(e) => setExcludeReason(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white mb-2"
              >
                <option value="">Selecione ou digite abaixo...</option>
                <option value="Preço manifestamente inexequível ou desatualizado">Preço manifestamente inexequível ou desatualizado</option>
                <option value="Fornecedor não atende o prazo de entrega necessário">Fornecedor não atende o prazo de entrega necessário</option>
                <option value="Material com especificação técnica incompleta">Material com especificação técnica incompleta</option>
                <option value="Condição comercial incompatível com a política de compras">Condição comercial incompatível com a política de compras</option>
              </select>
              <Input
                placeholder="Ou digite uma justificativa personalizada..."
                value={excludeReason}
                onChange={(e) => setExcludeReason(e.target.value)}
              />
            </div>
          )}
        </div>

        {/* Produto Divergente */}
        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="font-bold text-white block">Produto Divergente do Solicitado</span>
              <span className="text-xs text-slate-400">
                Marque se o fornecedor cotou uma especificação diferente da requisitada.
              </span>
            </div>
            <input
              type="checkbox"
              checked={isDivergent}
              onChange={(e) => {
                setIsDivergent(e.target.checked);
                setError('');
              }}
              className="w-5 h-5 rounded border-slate-700 bg-slate-900 text-amber-600 focus:ring-amber-500 cursor-pointer"
            />
          </div>

          {isDivergent && (
            <div className="pt-2 border-t border-slate-800">
              <Input
                label="Especificação Cotada pelo Fornecedor (Obrigatório)"
                placeholder="Ex: Fornecedor cotou Tubo Redondo em vez de Tubo Retangular 100x40"
                value={divergentReason}
                onChange={(e) => setDivergentReason(e.target.value)}
              />
            </div>
          )}
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-rose-950/60 border border-rose-500/50 text-rose-300 text-xs">
            {error}
          </div>
        )}
      </div>
    </Modal>
  );
};
