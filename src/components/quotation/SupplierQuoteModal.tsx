import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { QuotationItem, SupplierQuoteItem } from '../../types/quotation';
import { Supplier } from '../../types/supplier';
import { PriceUnit } from '../../types/database';
import { calculateQuotationTotal } from '../../domain/calculations';
import { useSettings } from '../../context/SettingsContext';

interface SupplierQuoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  quotationItem?: QuotationItem;
  supplier?: Supplier;
  initialQuoteItem?: SupplierQuoteItem;
  onSave: (quoteItem: Partial<SupplierQuoteItem>) => void;
}

export const SupplierQuoteModal: React.FC<SupplierQuoteModalProps> = ({
  isOpen,
  onClose,
  quotationItem,
  supplier,
  initialQuoteItem,
  onSave,
}) => {
  const { settings } = useSettings();
  const [quotedQuantity, setQuotedQuantity] = useState<number>(0);
  const [weightKg, setWeightKg] = useState<number>(0);
  const [unitPrice, setUnitPrice] = useState<number>(0);
  const [priceUnit, setPriceUnit] = useState<PriceUnit>('kg');
  const [ipiPercent, setIpiPercent] = useState<number>(0);
  const [icmsPercent, setIcmsPercent] = useState<number>(18);
  const [notes, setNotes] = useState<string>('');

  useEffect(() => {
    if (initialQuoteItem) {
      setQuotedQuantity(initialQuoteItem.quoted_quantity || quotationItem?.quantity_bars || 0);
      setWeightKg(initialQuoteItem.weight_kg || quotationItem?.estimated_weight_kg || 0);
      setUnitPrice(initialQuoteItem.unit_price || 0);
      setPriceUnit(initialQuoteItem.price_unit || 'kg');
      setIpiPercent(initialQuoteItem.ipi_percent || 0);
      setIcmsPercent(initialQuoteItem.icms_percent || 18);
      setNotes(initialQuoteItem.notes || '');
    } else if (quotationItem) {
      setQuotedQuantity(quotationItem.quantity_bars);
      setWeightKg(quotationItem.estimated_weight_kg);
      setUnitPrice(0);
      setPriceUnit('kg');
      setIpiPercent(0);
      setIcmsPercent(18);
      setNotes('');
    }
  }, [initialQuoteItem, quotationItem, isOpen]);

  // Recalcula total em tempo real
  const calculatedTotal = calculateQuotationTotal(
    quotedQuantity,
    weightKg,
    unitPrice,
    priceUnit,
    ipiPercent,
    icmsPercent,
    settings
  );

  const handleSave = () => {
    onSave({
      quoted_quantity: Number(quotedQuantity),
      weight_kg: Number(weightKg),
      unit_price: Number(unitPrice),
      price_unit: priceUnit,
      ipi_percent: Number(ipiPercent),
      icms_percent: Number(icmsPercent),
      calculated_total: calculatedTotal,
      notes,
    });
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Lançamento de Cotação do Fornecedor"
      subtitle={`${supplier?.trade_name || supplier?.company_name || 'Fornecedor'} • ${quotationItem?.product?.codigo_mpr || ''}`}
      maxWidth="lg"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button variant="primary" onClick={handleSave}>Salvar Cotação</Button>
        </>
      }
    >
      <div className="space-y-4 text-sm">
        {/* Item specs summary */}
        <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 space-y-1">
          <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Demanda Solicitada</div>
          <div className="text-white font-medium">{quotationItem?.product?.description}</div>
          <div className="flex gap-4 text-xs text-slate-300">
            <span>Necessário: <strong>{quotationItem?.quantity_bars} barras</strong></span>
            <span>Metragem: <strong>{quotationItem?.quantity_meters} m</strong></span>
            <span>Peso Est.: <strong>{quotationItem?.estimated_weight_kg} kg</strong></span>
          </div>
        </div>

        {/* Inputs */}
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Quantidade Cotada"
            type="number"
            step="any"
            value={quotedQuantity}
            onChange={(e) => setQuotedQuantity(parseFloat(e.target.value) || 0)}
            helperText={
              quotationItem && quotedQuantity < quotationItem.quantity_bars
                ? '⚠️ Atenção: Cotado menor que a necessidade gerará status QUANTIDADE_INSUFICIENTE.'
                : undefined
            }
          />
          <Input
            label="Peso em KG"
            type="number"
            step="any"
            value={weightKg}
            onChange={(e) => setWeightKg(parseFloat(e.target.value) || 0)}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Preço Unitário (R$)"
            type="number"
            step="any"
            value={unitPrice}
            onChange={(e) => setUnitPrice(parseFloat(e.target.value) || 0)}
          />
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
              Unidade do Preço
            </label>
            <select
              value={priceUnit}
              onChange={(e) => setPriceUnit(e.target.value as PriceUnit)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-blue-500"
            >
              <option value="kg">kg (Total = Peso × Preço)</option>
              <option value="pç">pç / peça (Total = Qtd × Preço)</option>
              <option value="barra">barra (Total = Qtd × Preço)</option>
              <option value="metro">metro (Total = Metros × Preço)</option>
              <option value="tonelada">tonelada (Total = Peso Ton × Preço)</option>
              <option value="unidade">unidade (Total = Qtd × Preço)</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="IPI %"
            type="number"
            step="any"
            value={ipiPercent}
            onChange={(e) => setIpiPercent(parseFloat(e.target.value) || 0)}
            helperText={settings.include_ipi_in_total ? 'Incluso no cálculo' : 'Informativo fiscal (padrão)'}
          />
          <Input
            label="ICMS %"
            type="number"
            step="any"
            value={icmsPercent}
            onChange={(e) => setIcmsPercent(parseFloat(e.target.value) || 0)}
            helperText={settings.include_icms_in_total ? 'Incluso no cálculo' : 'Informativo fiscal (padrão)'}
          />
        </div>

        <Input
          label="Observações da proposta"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Ex: Entrega em 7 dias, material com certificado"
        />

        {/* Total preview card */}
        <div className="mt-4 p-4 rounded-xl bg-blue-950/40 border border-blue-500/30 flex items-center justify-between">
          <div>
            <div className="text-xs text-blue-300 font-semibold uppercase tracking-wider">Total Calculado do Item</div>
            <div className="text-[11px] text-slate-400">
              {priceUnit === 'kg' ? `${weightKg} kg × R$ ${unitPrice}/kg` : `${quotedQuantity} ${priceUnit} × R$ ${unitPrice}`}
            </div>
          </div>
          <div className="text-2xl font-black text-white">
            R$ {calculatedTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>
      </div>
    </Modal>
  );
};
