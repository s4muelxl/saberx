import { describe, it, expect } from 'vitest';
import { calculateQuotationTotal, calculateSupplierSubtotal } from './calculations';
import { validateSupplierQuote, calculateLowestValidPrice } from './validations';
import { SupplierQuoteItem, QuotationItem } from '../types/quotation';

describe('Testes Obrigatórios do Motor de Cálculo e Validação (Seção 58)', () => {
  // Teste 1: Peso = 451,71, Preço = 7,39, Unidade = kg -> Resultado: R$ 3.338,14
  it('Teste 1: Cálculo correto para unidade kg (451.71 kg * R$ 7.39/kg = R$ 3.338,14)', () => {
    const total = calculateQuotationTotal(
      10, // Quantidade de barras informada (não utilizada no cálculo por kg)
      451.71, // Peso em kg
      7.39, // Preço por kg
      'kg'
    );
    expect(total).toBe(3338.14);
  });

  // Teste 2: Quantidade = 2, Preço = 120, Unidade = pç -> Resultado: R$ 240,00
  it('Teste 2: Cálculo correto para unidade pç (2 pç * R$ 120.00 = R$ 240,00)', () => {
    const total = calculateQuotationTotal(
      2, // Quantidade cotada
      30.5, // Peso (ignorado na unidade pç)
      120.0, // Preço unitário
      'pç'
    );
    expect(total).toBe(240.0);
  });

  // Teste 3: Necessidade = 26,94 barras, Cotado = 2 barras -> QUANTIDADE_INSUFICIENTE
  it('Teste 3: Quantidade cotada (2) menor que necessidade (26.94) gera QUANTIDADE_INSUFICIENTE', () => {
    const quotationItem: Partial<QuotationItem> = {
      quantity_bars: 26.94
    };
    const quoteItem: Partial<SupplierQuoteItem> = {
      quoted_quantity: 2,
      unit_price: 120.0,
      price_unit: 'pç'
    };

    const validation = validateSupplierQuote(quoteItem, quotationItem);
    expect(validation.status).toBe('QUANTIDADE_INSUFICIENTE');
    expect(validation.isEligibleForLowest).toBe(false);
  });

  // Teste 4: Necessidade = 30,90 barras, Cotado = 30 barras -> QUANTIDADE_INSUFICIENTE
  it('Teste 4: Quantidade cotada (30) menor que necessidade (30.90) gera QUANTIDADE_INSUFICIENTE', () => {
    const quotationItem: Partial<QuotationItem> = {
      quantity_bars: 30.90
    };
    const quoteItem: Partial<SupplierQuoteItem> = {
      quoted_quantity: 30,
      unit_price: 7.50,
      price_unit: 'kg'
    };

    const validation = validateSupplierQuote(quoteItem, quotationItem);
    expect(validation.status).toBe('QUANTIDADE_INSUFICIENTE');
    expect(validation.isEligibleForLowest).toBe(false);
  });

  // Teste 5: Fornecedor não cotou produto -> NÃO COTADO
  it('Teste 5: Fornecedor que não cotou o produto retorna status NAO_COTADO', () => {
    const quoteItem: Partial<SupplierQuoteItem> = {
      quoted_quantity: 0,
      unit_price: 0
    };

    const validation = validateSupplierQuote(quoteItem);
    expect(validation.status).toBe('NAO_COTADO');
    expect(validation.isEligibleForLowest).toBe(false);
  });

  // Teste 6: Produto solicitado ≠ produto cotado -> PRODUTO_DIVERGENTE
  it('Teste 6: Produto solicitado divergente do cotado retorna status PRODUTO_DIVERGENTE', () => {
    const quoteItem: Partial<SupplierQuoteItem> = {
      quoted_quantity: 50,
      unit_price: 8.50,
      price_unit: 'kg',
      divergent_product_reason: 'Fornecedor ofereceu tubo redondo em vez de tubo retangular'
    };

    const validation = validateSupplierQuote(quoteItem);
    expect(validation.status).toBe('PRODUTO_DIVERGENTE');
    expect(validation.isEligibleForLowest).toBe(false);
  });

  // Teste 7: Comparar menor preço: Considerar somente STATUS = VALIDA
  it('Teste 7: Menor preço considera estritamente cotações válidas e emite alerta para cotação inválida mais barata', () => {
    const quotationItem: QuotationItem = {
      id: 'item-1',
      quotation_id: 'q-1',
      product_id: 'prod-1',
      item_order: 1,
      quantity_bars: 26.94,
      quantity_meters: 161.64,
      estimated_weight_kg: 451.71,
      created_at: new Date().toISOString()
    };

    // Fornecedor A (Paulisteel): cotou apenas 2 barras a R$ 120 -> Total R$ 240,00 (Inválido!)
    const quotePaulisteel: SupplierQuoteItem = {
      id: 'quote-pauli',
      supplier_quote_id: 'sq-pauli',
      quotation_item_id: 'item-1',
      quoted_quantity: 2,
      weight_kg: 33.52,
      unit_price: 120.0,
      price_unit: 'pç',
      ipi_percent: 0,
      icms_percent: 0,
      calculated_total: 240.0,
      validation_status: 'QUANTIDADE_INSUFICIENTE',
      manual_exclude_from_lowest: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Fornecedor B (JD Aço): atende as 26.94 barras (peso 451.71 kg a R$ 7.39/kg) -> Total R$ 3.338,14 (Válido!)
    const quoteJdAco: SupplierQuoteItem = {
      id: 'quote-jd',
      supplier_quote_id: 'sq-jd',
      quotation_item_id: 'item-1',
      quoted_quantity: 26.94,
      weight_kg: 451.71,
      unit_price: 7.39,
      price_unit: 'kg',
      ipi_percent: 0,
      icms_percent: 0,
      calculated_total: 3338.14,
      validation_status: 'VALIDA',
      manual_exclude_from_lowest: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Fornecedor C (Romeva Tubos): atende as 26.94 barras (peso 451.71 kg a R$ 7.80/kg) -> Total R$ 3.523,34 (Válido!)
    const quoteRomeva: SupplierQuoteItem = {
      id: 'quote-romeva',
      supplier_quote_id: 'sq-romeva',
      quotation_item_id: 'item-1',
      quoted_quantity: 26.94,
      weight_kg: 451.71,
      unit_price: 7.80,
      price_unit: 'kg',
      ipi_percent: 0,
      icms_percent: 0,
      calculated_total: 3523.34,
      validation_status: 'VALIDA',
      manual_exclude_from_lowest: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const quotes = [quotePaulisteel, quoteJdAco, quoteRomeva];
    const analysis = calculateLowestValidPrice(quotes, quotationItem);

    // O menor preço válido DEVE ser o de JD Aço (R$ 3.338,14) e NUNCA o de Paulisteel (R$ 240,00)
    expect(analysis.hasValidQuotes).toBe(true);
    expect(analysis.lowestValidTotal).toBe(3338.14);
    expect(analysis.lowestValidSupplierQuoteItemId).toBe('quote-jd');

    // O sistema DEVE identificar que existe uma cotação mais barata desclassificada e emitir alerta
    expect(analysis.lowestInvalidAlert).not.toBeNull();
    expect(analysis.lowestInvalidAlert?.total).toBe(240.0);
    expect(analysis.lowestInvalidAlert?.supplierQuoteItemId).toBe('quote-pauli');
    expect(analysis.lowestInvalidAlert?.status).toBe('QUANTIDADE_INSUFICIENTE');
  });

  // Testes de Segurança & Resiliência Numérica
  it('Teste 8: Proteção contra NaN, Infinity e valores negativos em cálculos', () => {
    expect(calculateQuotationTotal(NaN, 100, 10, 'kg')).toBe(1000);
    expect(calculateQuotationTotal(10, NaN, 10, 'kg')).toBe(0);
    expect(calculateQuotationTotal(10, 100, -5, 'kg')).toBe(0);
    expect(calculateQuotationTotal(10, 100, Infinity, 'kg')).toBe(0);
    expect(calculateSupplierSubtotal([
      { calculated_total: 100 } as any,
      { calculated_total: NaN } as any,
      { calculated_total: 250 } as any
    ])).toBe(350);
  });
});

import { isValidEmail, normalizeEmail } from '../lib/security';

describe('Testes de Validação e Sanitização de E-mail Corporativo', () => {
  it('Deve rejeitar e-mails sem @ (ex: samuel8877alves.gmail.com)', () => {
    expect(isValidEmail('samuel8877alves.gmail.com')).toBe(false);
  });

  it('Deve rejeitar e-mails com domínio incompleto (ex: samuel@.com)', () => {
    expect(isValidEmail('samuel@.com')).toBe(false);
  });

  it('Deve rejeitar e-mails sem TLD válido (ex: samuel@com)', () => {
    expect(isValidEmail('samuel@com')).toBe(false);
  });

  it('Deve aceitar e-mails válidos corporativos', () => {
    expect(isValidEmail('samuel8877alves@gmail.com')).toBe(true);
    expect(isValidEmail('comprador@saberx.com.br')).toBe(true);
  });

  it('Deve normalizar e-mails removendo espaços e passando para minúsculas', () => {
    expect(normalizeEmail('  Samuel8877Alves@Gmail.Com  ')).toBe('samuel8877alves@gmail.com');
  });
});
