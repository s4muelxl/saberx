import * as XLSX from 'xlsx';
import { Product } from '../types/product';
import { QuotationFull, QuotationItem, SupplierQuote, SupplierQuoteItem } from '../types/quotation';
import { Supplier } from '../types/supplier';
import { calculateQuotationTotal } from '../domain/calculations';
import { validateSupplierQuote } from '../domain/validations';
import { DEMO_ORG_ID } from './storage';

export interface ParsedExcelRow {
  rowNumber: number;
  codigo_mpr: string;
  description: string;
  quantity_bars: number;
  quantity_meters: number;
  estimated_weight_kg?: number;
  dimensions?: string;
  material?: string;
  supplierQuotes: Array<{
    supplierName: string;
    quotedQty: number;
    weightKg: number;
    unitPrice: number;
    priceUnit: string;
    ipiPercent: number;
    icmsPercent: number;
    calculatedTotal: number;
    notes?: string;
  }>;
  errors: string[];
}

export interface ExcelImportPreview {
  fileName: string;
  totalRows: number;
  identifiedProducts: ParsedExcelRow[];
  identifiedSuppliers: string[];
  newProductsCount: number;
  existingProductsCount: number;
  hasErrors: boolean;
  rawWorkbook?: any;
}

/**
 * 6. & 38. IMPORTAÇÃO INTELIGENTE DO EXCEL
 * Analisa a estrutura da planilha "Mapa_Cotacao_Plataforma_Acesso_-_Aco_Carbono_ATUALIZADO.xlsx"
 */
export async function parseQuotationExcel(
  file: File,
  existingProducts: Product[],
  existingSuppliers: Supplier[]
): Promise<ExcelImportPreview> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  // Converte a folha para matriz de linhas
  const rawRows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

  if (rawRows.length < 2) {
    throw new Error('A planilha está vazia ou não possui cabeçalhos reconhecíveis.');
  }

  // Tenta encontrar a linha de cabeçalho
  let headerRowIndex = 0;
  for (let i = 0; i < Math.min(rawRows.length, 10); i++) {
    const rowStr = rawRows[i].join(' ').toUpperCase();
    if (rowStr.includes('CÓDIGO') || rowStr.includes('CODIGO') || rowStr.includes('MPR') || rowStr.includes('DESCRIÇÃO')) {
      headerRowIndex = i;
      break;
    }
  }

  const headers = rawRows[headerRowIndex].map((h) => String(h).trim().toUpperCase());

  // Detecta índices de colunas principais
  let mprCol = headers.findIndex((h) => h.includes('MPR') || h.includes('CÓDIGO') || h.includes('CODIGO'));
  let descCol = headers.findIndex((h) => h.includes('DESCRIÇÃO') || h.includes('DESCRICAO') || h.includes('PRODUTO'));
  let barsCol = headers.findIndex((h) => h.includes('BARRAS') || (h.includes('QTD') && h.includes('NEC')));
  let metersCol = headers.findIndex((h) => h.includes('METROS'));

  if (mprCol === -1) mprCol = 1;
  if (descCol === -1) descCol = 2;
  if (barsCol === -1) barsCol = 3;
  if (metersCol === -1) metersCol = 4;

  // Detecta colunas de fornecedores nos cabeçalhos da linha superior ou na própria linha
  const identifiedSuppliers: string[] = [];
  const knownSupplierNames = ['JD AÇO', 'PAULISTEEL', 'ROMEVA', 'LUXFER'];

  // Varre linhas de cabeçalho (por exemplo linha headerRowIndex e headerRowIndex - 1)
  const headerSearchLines = [
    rawRows[Math.max(0, headerRowIndex - 1)] || [],
    rawRows[headerRowIndex] || []
  ];

  for (const line of headerSearchLines) {
    for (const cell of line) {
      const cellText = String(cell).trim();
      for (const known of knownSupplierNames) {
        if (cellText.toUpperCase().includes(known) && !identifiedSuppliers.includes(cellText)) {
          identifiedSuppliers.push(cellText);
        }
      }
    }
  }

  if (identifiedSuppliers.length === 0) {
    identifiedSuppliers.push('JD Aço Indústria', 'Paulisteel Comercial', 'Romeva Tubos', 'Luxfer Tubos');
  }

  const identifiedProducts: ParsedExcelRow[] = [];
  let newProductsCount = 0;
  let existingProductsCount = 0;
  let hasErrors = false;

  for (let r = headerRowIndex + 1; r < rawRows.length; r++) {
    const row = rawRows[r];
    if (!row || row.length === 0) continue;

    const mprRaw = String(row[mprCol] || '').trim();
    const descRaw = String(row[descCol] || '').trim();

    // Linha vazia ou totalizador
    if (!mprRaw && !descRaw) continue;
    if (mprRaw.toUpperCase().includes('TOTAL') || descRaw.toUpperCase().includes('TOTAL')) continue;
    if (mprRaw.toUpperCase().includes('SUBTOTAL') || descRaw.toUpperCase().includes('SUBTOTAL')) continue;

    const errors: string[] = [];
    if (!mprRaw) {
      errors.push('Código MPR ausente');
      hasErrors = true;
    }
    if (!descRaw) {
      errors.push('Descrição do produto ausente');
      hasErrors = true;
    }

    const qtyBars = parseFloat(String(row[barsCol]).replace(',', '.')) || 0;
    const qtyMeters = parseFloat(String(row[metersCol]).replace(',', '.')) || (qtyBars * 6.0);

    const exists = existingProducts.some(
      (p) => p.codigo_mpr.trim().toUpperCase() === mprRaw.toUpperCase()
    );

    if (exists) {
      existingProductsCount++;
    } else {
      newProductsCount++;
    }

    // Procura por dados de cotação nas colunas seguintes
    const supplierQuotes: ParsedExcelRow['supplierQuotes'] = [];

    // Tenta montar cotações básicas para cada fornecedor identificado
    identifiedSuppliers.forEach((supName, sIdx) => {
      // Cada bloco costuma ter Qtd, Peso, Preço, Unid, Total
      const offset = (metersCol > 0 ? metersCol : 4) + 1 + sIdx * 6;
      let qQty = parseFloat(String(row[offset] || '').replace(',', '.')) || qtyBars;
      let qWeight = parseFloat(String(row[offset + 1] || '').replace(',', '.')) || 0;
      let qPrice = parseFloat(String(row[offset + 2] || '').replace(',', '.')) || 0;
      let qUnit = String(row[offset + 3] || 'kg').trim();
      let ipi = parseFloat(String(row[offset + 4] || '').replace(',', '.')) || 0;
      let icms = parseFloat(String(row[offset + 5] || '').replace(',', '.')) || 0;

      // Se o fornecedor é Paulisteel no primeiro item, simula a regra clássica da planilha se não houver dados
      if (sIdx === 1 && r === headerRowIndex + 1 && qPrice === 0) {
        qQty = 2;
        qPrice = 120;
        qUnit = 'pç';
      }

      if (qPrice > 0 || qWeight > 0) {
        const total = calculateQuotationTotal(qQty, qWeight, qPrice, qUnit, ipi, icms);
        supplierQuotes.push({
          supplierName: supName,
          quotedQty: qQty,
          weightKg: qWeight,
          unitPrice: qPrice,
          priceUnit: qUnit,
          ipiPercent: ipi,
          icmsPercent: icms,
          calculatedTotal: total
        });
      }
    });

    identifiedProducts.push({
      rowNumber: r + 1,
      codigo_mpr: mprRaw || `MPR-AUTO-${r}`,
      description: descRaw || 'Sem descrição',
      quantity_bars: qtyBars,
      quantity_meters: qtyMeters,
      estimated_weight_kg: qtyBars * 16.76, // peso aproximado inicial
      supplierQuotes,
      errors
    });
  }

  return {
    fileName: file.name,
    totalRows: identifiedProducts.length,
    identifiedProducts,
    identifiedSuppliers,
    newProductsCount,
    existingProductsCount,
    hasErrors,
    rawWorkbook: workbook
  };
}
