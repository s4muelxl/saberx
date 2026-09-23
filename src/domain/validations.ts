import { QuoteItemValidationStatus } from '../types/database';
import { SupplierQuoteItem, QuotationItem } from '../types/quotation';

export interface ValidationDetails {
  status: QuoteItemValidationStatus;
  message: string;
  isEligibleForLowest: boolean;
}

/**
 * Validação de quantidade necessária vs cotada
 */
export function validateQuantity(quotedQty: number, requiredQty: number): boolean {
  if (requiredQty <= 0) return true;
  // Consideramos suficiente se quotedQty >= requiredQty (permitindo tolerância de arredondamento de 0.001)
  return quotedQty >= (requiredQty - 0.001);
}

/**
 * Validação de correspondência de produto
 */
export function validateProductMatch(isDivergent: boolean, divergentReason?: string): boolean {
  return !isDivergent && (!divergentReason || divergentReason.trim() === '');
}

/**
 * 15. VALIDAÇÃO AUTOMÁTICA DA COTAÇÃO DO FORNECEDOR
 * Status possíveis:
 * - NAO_COTADO
 * - PRECO_AUSENTE
 * - EXCLUIDA_MANUALMENTE
 * - PRODUTO_DIVERGENTE
 * - QUANTIDADE_INSUFICIENTE
 * - VALIDA
 */
export function validateSupplierQuote(
  quoteItem: Partial<SupplierQuoteItem>,
  quotationItem?: Partial<QuotationItem>
): ValidationDetails {
  const quotedQty = quoteItem.quoted_quantity ?? 0;
  const unitPrice = quoteItem.unit_price ?? 0;
  const reqQty = quotationItem?.quantity_bars ?? 0;

  // 1. Não cotado
  if (quotedQty <= 0 && unitPrice <= 0) {
    return {
      status: 'NAO_COTADO',
      message: 'Item não cotado pelo fornecedor',
      isEligibleForLowest: false
    };
  }

  // 2. Preço ausente
  if (unitPrice <= 0) {
    return {
      status: 'PRECO_AUSENTE',
      message: 'Preço unitário não informado ou zerado',
      isEligibleForLowest: false
    };
  }

  // 3. Excluída manualmente
  if (quoteItem.manual_exclude_from_lowest) {
    return {
      status: 'EXCLUIDA_MANUALMENTE',
      message: quoteItem.manual_exclude_reason || 'Desconsiderada manualmente pelo comprador',
      isEligibleForLowest: false
    };
  }

  // 4. Produto divergente
  if (quoteItem.divergent_product_reason && quoteItem.divergent_product_reason.trim().length > 0) {
    return {
      status: 'PRODUTO_DIVERGENTE',
      message: `Produto divergente: ${quoteItem.divergent_product_reason}`,
      isEligibleForLowest: false
    };
  }

  // 5. Quantidade insuficiente
  if (reqQty > 0 && !validateQuantity(quotedQty, reqQty)) {
    return {
      status: 'QUANTIDADE_INSUFICIENTE',
      message: `Quantidade insuficiente (Cotado: ${quotedQty} | Necessário: ${reqQty})`,
      isEligibleForLowest: false
    };
  }

  // 6. Válida
  return {
    status: 'VALIDA',
    message: 'Cotação válida e apta para concorrência de menor preço',
    isEligibleForLowest: true
  };
}

export interface LowestPriceAnalysis {
  hasValidQuotes: boolean;
  lowestValidTotal: number | null;
  lowestValidSupplierQuoteItemId: string | null;
  lowestInvalidAlert: {
    total: number;
    supplierQuoteItemId: string;
    reason: string;
    status: QuoteItemValidationStatus;
  } | null;
  allQuotesSorted: Array<{
    quoteItem: SupplierQuoteItem;
    validation: ValidationDetails;
  }>;
}

/**
 * 16. MENOR PREÇO
 * Identifica o menor preço entre cotações VÁLIDAS.
 * Também detecta se existe uma cotação com valor nominal inferior que foi descartada por ser inválida.
 */
export function calculateLowestValidPrice(
  quoteItems: SupplierQuoteItem[],
  quotationItem?: QuotationItem
): LowestPriceAnalysis {
  if (!quoteItems || quoteItems.length === 0) {
    return {
      hasValidQuotes: false,
      lowestValidTotal: null,
      lowestValidSupplierQuoteItemId: null,
      lowestInvalidAlert: null,
      allQuotesSorted: []
    };
  }

  const evaluated = quoteItems.map((item) => ({
    quoteItem: item,
    validation: validateSupplierQuote(item, quotationItem)
  }));

  // Filtra válidas que possuem total > 0
  const validQuotes = evaluated.filter(
    (e) => e.validation.isEligibleForLowest && e.quoteItem.calculated_total > 0
  );

  // Ordena válidas por menor total
  validQuotes.sort((a, b) => a.quoteItem.calculated_total - b.quoteItem.calculated_total);

  const lowestValid = validQuotes.length > 0 ? validQuotes[0] : null;

  // Filtra inválidas que possuem preço/total positivo
  const invalidWithTotal = evaluated.filter(
    (e) => !e.validation.isEligibleForLowest && e.quoteItem.calculated_total > 0
  );

  invalidWithTotal.sort((a, b) => a.quoteItem.calculated_total - b.quoteItem.calculated_total);

  let lowestInvalidAlert = null;

  if (invalidWithTotal.length > 0) {
    const cheapestInvalid = invalidWithTotal[0];
    // Se não há cotação válida OU se a cotação inválida é mais barata que a cotação válida mais baixa
    if (!lowestValid || cheapestInvalid.quoteItem.calculated_total < lowestValid.quoteItem.calculated_total) {
      lowestInvalidAlert = {
        total: cheapestInvalid.quoteItem.calculated_total,
        supplierQuoteItemId: cheapestInvalid.quoteItem.id,
        reason: cheapestInvalid.validation.message,
        status: cheapestInvalid.validation.status
      };
    }
  }

  return {
    hasValidQuotes: !!lowestValid,
    lowestValidTotal: lowestValid ? lowestValid.quoteItem.calculated_total : null,
    lowestValidSupplierQuoteItemId: lowestValid ? lowestValid.quoteItem.id : null,
    lowestInvalidAlert,
    allQuotesSorted: evaluated
  };
}
