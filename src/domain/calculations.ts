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
  if (!unitPrice || unitPrice <= 0) {
    return 0;
  }

  let baseTotal = 0;
  const unit = priceUnit.toLowerCase().trim();

  switch (unit) {
    case 'kg':
      baseTotal = weightKg * unitPrice;
      break;
    case 'tonelada':
      baseTotal = (weightKg / 1000) * unitPrice;
      break;
    case 'pç':
    case 'pc':
    case 'peca':
    case 'peça':
    case 'barra':
    case 'metro':
    case 'unidade':
    default:
      baseTotal = quotedQuantity * unitPrice;
      break;
  }

  let finalTotal = baseTotal;

  if (settings.include_ipi_in_total && ipiPercent > 0) {
    finalTotal += baseTotal * (ipiPercent / 100);
  }

  if (settings.include_icms_in_total && icmsPercent > 0) {
    finalTotal += baseTotal * (icmsPercent / 100);
  }

  return round2(finalTotal);
}

/**
 * 21. SUBTOTAL POR FORNECEDOR
 * Soma os totais de todos os itens cotados pelo fornecedor
 */
export function calculateSupplierSubtotal(quoteItems: SupplierQuoteItem[]): number {
  const sum = quoteItems.reduce((acc, item) => {
    return acc + (item.calculated_total || 0);
  }, 0);
  return round2(sum);
}

/**
 * 26. MARGEM DE LUCRO
 * Lucro = Preço de Venda - Custo Total
 * Margem % = (Lucro / Preço de Venda) * 100
 */
export function calculateProfitMargin(cost: number, salePrice: number): { profit: number; marginPercent: number } {
  const profit = round2(salePrice - cost);
  const marginPercent = salePrice > 0 ? round2((profit / salePrice) * 100) : 0;
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
  if (!lowestValidPrice || lowestValidPrice <= 0 || referencePriceOrMaxValid <= lowestValidPrice) {
    return { savingsAmount: 0, savingsPercent: 0 };
  }
  const savingsAmount = round2(referencePriceOrMaxValid - lowestValidPrice);
  const savingsPercent = round2((savingsAmount / referencePriceOrMaxValid) * 100);
  return { savingsAmount, savingsPercent };
}
