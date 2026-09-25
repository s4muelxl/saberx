import { PriceUnit } from '../types/database';
import { SupplierQuoteItem, QuotationItem } from '../types/quotation';

export interface CalculationSettings {
  include_ipi_in_total?: boolean;
  include_icms_in_total?: boolean;
}

/**
 * Arredonda para 2 casas decimais com precisão monetária
 */
export function round2(value: number): number {
  if (typeof value !== 'number' || !isFinite(value) || isNaN(value)) {
    return 0;
  }
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/**
 * 13. CÁLCULO PRINCIPAL
 * Replicando exatamente a lógica matemática da planilha.
 * - kg: Total = Peso (kg) * Preço Unitário
 * - tonelada: Total = (Peso (kg) / 1000) * Preço Unitário
 * - pç, barra, metro, unidade: Total = Quantidade Cotada * Preço Unitário
 * - Opção de inclusão de IPI e ICMS (desativados por padrão)
 */
export function calculateQuotationTotal(
  quotedQuantity: number,
  weightKg: number,
  unitPrice: number,
  priceUnit: PriceUnit | string,
  ipiPercent: number = 0,
  icmsPercent: number = 0,
  settings: CalculationSettings = { include_ipi_in_total: false, include_icms_in_total: false }
): number {
  const safeQty = Math.max(0, isFinite(quotedQuantity) ? quotedQuantity : 0);
  const safeWeight = Math.max(0, isFinite(weightKg) ? weightKg : 0);
  const safePrice = Math.max(0, isFinite(unitPrice) ? unitPrice : 0);

  if (safePrice <= 0) {
    return 0;
  }

  let baseTotal = 0;
  const unit = (priceUnit || '').toLowerCase().trim();

  switch (unit) {
    case 'kg':
      baseTotal = safeWeight * safePrice;
      break;
    case 'tonelada':
      baseTotal = (safeWeight / 1000) * safePrice;
      break;
    case 'pç':
    case 'pc':
    case 'peca':
    case 'peça':
    case 'barra':
    case 'metro':
    case 'unidade':
    default:
      baseTotal = safeQty * safePrice;
      break;
  }

  let finalTotal = baseTotal;

  const safeIpi = Math.max(0, isFinite(ipiPercent) ? ipiPercent : 0);
  const safeIcms = Math.max(0, isFinite(icmsPercent) ? icmsPercent : 0);

  if (settings.include_ipi_in_total && safeIpi > 0) {
    finalTotal += baseTotal * (safeIpi / 100);
  }

  if (settings.include_icms_in_total && safeIcms > 0) {
    finalTotal += baseTotal * (safeIcms / 100);
  }

  return round2(finalTotal);
}

/**
 * 21. SUBTOTAL POR FORNECEDOR
 * Soma os totais de todos os itens cotados pelo fornecedor
 */
export function calculateSupplierSubtotal(quoteItems: SupplierQuoteItem[]): number {
  if (!Array.isArray(quoteItems)) return 0;
  const sum = quoteItems.reduce((acc, item) => {
    const total = isFinite(item.calculated_total) ? item.calculated_total : 0;
    return acc + (total || 0);
  }, 0);
  return round2(sum);
}

/**
 * 26. MARGEM DE LUCRO
 * Lucro = Preço de Venda - Custo Total
 * Margem % = (Lucro / Preço de Venda) * 100
 */
export function calculateProfitMargin(cost: number, salePrice: number): { profit: number; marginPercent: number } {
  const safeCost = Math.max(0, isFinite(cost) ? cost : 0);
  const safeSale = Math.max(0, isFinite(salePrice) ? salePrice : 0);

  const profit = round2(safeSale - safeCost);
  const marginPercent = safeSale > 0 ? round2((profit / safeSale) * 100) : 0;
  return { profit, marginPercent };
}

/**
 * 51. ECONOMIA POTENCIAL
 * Economia = (Preço de Referência ou Maior Preço Válido) - Menor Preço Válido
 */
export function calculateSavings(
  referencePriceOrMaxValid: number,
  lowestValidPrice: number
): { savingsAmount: number; savingsPercent: number } {
  const safeRef = isFinite(referencePriceOrMaxValid) ? referencePriceOrMaxValid : 0;
  const safeLowest = isFinite(lowestValidPrice) ? lowestValidPrice : 0;

  if (safeLowest <= 0 || safeRef <= safeLowest) {
    return { savingsAmount: 0, savingsPercent: 0 };
  }
  const savingsAmount = round2(safeRef - safeLowest);
  const savingsPercent = round2((savingsAmount / safeRef) * 100);
  return { savingsAmount, savingsPercent };
}
