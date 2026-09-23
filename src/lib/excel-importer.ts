import * as XLSX from 'xlsx';
import { Product } from '../types/product';
import { Supplier } from '../types/supplier';
import { parseSafeFloat, sanitizeString } from './security';
import { calculateQuotationTotal } from '../domain/calculations';

export interface ColumnMapping {
  mprCol: number;
  descCol: number;
  barsCol: number;
  metersCol: number;
  weightCol: number;
  dimensionsCol: number;
  materialCol: number;
  categoryCol: number;
  refPriceCol: number;
}

export interface ParsedSupplierColumnGroup {
  supplierName: string;
  qtyCol: number;
  weightCol: number;
  priceCol: number;
  unitCol: number;
  ipiCol: number;
  icmsCol: number;
}

export interface EnterpriseImportRow {
  rowNumber: number;
  codigo_mpr: string;
  description: string;
  quantity_bars: number;
  quantity_meters: number;
  estimated_weight_kg: number;
  dimensions?: string;
  material?: string;
  category?: string;
  reference_price?: number;
  isExisting: boolean;
  validationErrors: string[];
  validationWarnings: string[];
  supplierQuotes: Array<{
    supplierName: string;
    quotedQty: number;
    weightKg: number;
    unitPrice: number;
    priceUnit: string;
    ipiPercent: number;
    icmsPercent: number;
    calculatedTotal: number;
  }>;
}

export interface SheetInfo {
  name: string;
  rowCount: number;
  columnCount: number;
}

export interface EnterpriseWorkbookAnalysis {
  fileName: string;
  fileSize: number;
  sheets: SheetInfo[];
  selectedSheetName: string;
  headers: string[];
  headerRowIndex: number;
  rawRows: any[][];
  suggestedMapping: ColumnMapping;
  detectedSupplierGroups: ParsedSupplierColumnGroup[];
}

// Dicionário de sinônimos em português para mapeamento inteligente
const SYNONYMS = {
  mpr: ['MPR', 'CÓDIGO', 'CODIGO', 'CÓDIGO MPR', 'CODIGO MPR', 'PART NUMBER', 'SKU', 'REFERENCIA', 'REF', 'ITEM CODE'],
  desc: ['DESCRIÇÃO', 'DESCRICAO', 'PRODUTO', 'ESPECIFICAÇÃO', 'ESPECIFICACAO', 'NOME', 'MATERIAL', 'DENOMINAÇÃO'],
  bars: ['BARRAS', 'QTD BARRAS', 'QTD. BARRAS', 'QUANTIDADE', 'QTD', 'DEMANDA', 'QTD NECESSÁRIA', 'QTD NECESSARIA'],
  meters: ['METROS', 'METRAGEM', 'QTD METROS', 'QTD. METROS', 'M', 'COMPRIMENTO'],
  weight: ['PESO', 'PESO KG', 'PESO (KG)', 'KG', 'PESO ESTIMADO', 'PESO BARRA'],
  dimensions: ['DIMENSÕES', 'DIMENSOES', 'MEDIDA', 'BITOLA', 'DIMENSÃO', 'DIMENSAO', 'MEDIDAS'],
  material: ['AÇO', 'ACO', 'NORMA', 'SAE', 'ASTM', 'TIPO AÇO'],
  refPrice: ['PREÇO REF', 'PRECO REF', 'REFERÊNCIA', 'REFERENCIA', 'VALOR REF', 'R$/KG']
};

function findBestColumn(headers: string[], synonymsList: string[]): number {
  for (let i = 0; i < headers.length; i++) {
    const h = headers[i].toUpperCase().trim();
    for (const syn of synonymsList) {
      if (h === syn || h.includes(syn)) {
        return i;
      }
    }
  }
  return -1;
}

/**
 * Lê e analisa a pasta de trabalho Excel (Workbook)
 */
export async function analyzeExcelWorkbook(file: File): Promise<EnterpriseWorkbookAnalysis> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });

  if (workbook.SheetNames.length === 0) {
    throw new Error('A planilha está vazia.');
  }

  const sheets: SheetInfo[] = workbook.SheetNames.map((name) => {
    const sheet = workbook.Sheets[name];
    const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');
    return {
      name,
      rowCount: range.e.r + 1,
      columnCount: range.e.c + 1
    };
  });

  const selectedSheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[selectedSheetName];
  const rawRows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

  // Localiza a linha mais provável de ser o cabeçalho (varre as 15 primeiras linhas)
  let headerRowIndex = 0;
  for (let r = 0; r < Math.min(rawRows.length, 15); r++) {
    const lineStr = rawRows[r].map((c) => String(c).toUpperCase()).join(' ');
    if (
      lineStr.includes('MPR') ||
      lineStr.includes('CÓDIGO') ||
      lineStr.includes('CODIGO') ||
      lineStr.includes('DESCRIÇÃO') ||
      lineStr.includes('DESCRICAO') ||
      lineStr.includes('BARRAS')
    ) {
      headerRowIndex = r;
      break;
    }
  }

  const headers = (rawRows[headerRowIndex] || []).map((h) => String(h).trim());

  // Sugere mapeamento inteligente
  const suggestedMapping: ColumnMapping = {
    mprCol: findBestColumn(headers, SYNONYMS.mpr),
    descCol: findBestColumn(headers, SYNONYMS.desc),
    barsCol: findBestColumn(headers, SYNONYMS.bars),
    metersCol: findBestColumn(headers, SYNONYMS.meters),
    weightCol: findBestColumn(headers, SYNONYMS.weight),
    dimensionsCol: findBestColumn(headers, SYNONYMS.dimensions),
    materialCol: findBestColumn(headers, SYNONYMS.material),
    categoryCol: -1,
    refPriceCol: findBestColumn(headers, SYNONYMS.refPrice)
  };

  // Fallbacks se não encontrou cabeçalho explícito
  if (suggestedMapping.mprCol === -1) suggestedMapping.mprCol = 1;
  if (suggestedMapping.descCol === -1) suggestedMapping.descCol = 2;
  if (suggestedMapping.barsCol === -1) suggestedMapping.barsCol = 3;
  if (suggestedMapping.metersCol === -1) suggestedMapping.metersCol = 4;

  // Detecta fornecedores nos cabeçalhos
  const detectedSupplierGroups: ParsedSupplierColumnGroup[] = [];
  const knownSuppliers = ['JD AÇO', 'PAULISTEEL', 'ROMEVA', 'LUXFER', 'GERDAU', 'ARCELOR', 'USIMINAS', 'VALLOUREC'];

  // Procura fornecedores em linhas de cabeçalho
  const searchRow = rawRows[Math.max(0, headerRowIndex - 1)] || [];
  const currentRow = rawRows[headerRowIndex] || [];

  for (let c = 0; c < Math.max(searchRow.length, currentRow.length); c++) {
    const text1 = String(searchRow[c] || '').toUpperCase();
    const text2 = String(currentRow[c] || '').toUpperCase();
    const combined = `${text1} ${text2}`;

    for (const sup of knownSuppliers) {
      if (combined.includes(sup) && !detectedSupplierGroups.some((g) => g.supplierName.toUpperCase().includes(sup))) {
        detectedSupplierGroups.push({
          supplierName: sup,
          qtyCol: c,
          weightCol: c + 1,
          priceCol: c + 2,
          unitCol: c + 3,
          ipiCol: c + 4,
          icmsCol: c + 5
        });
      }
    }
  }

  return {
    fileName: file.name,
    fileSize: file.size,
    sheets,
    selectedSheetName,
    headers,
    headerRowIndex,
    rawRows,
    suggestedMapping,
    detectedSupplierGroups
  };
}

/**
 * Processa as linhas do Excel utilizando o mapeamento definido pelo usuário
 */
export function processMappedExcelRows(
  analysis: EnterpriseWorkbookAnalysis,
  mapping: ColumnMapping,
  existingProducts: Product[]
): EnterpriseImportRow[] {
  const { rawRows, headerRowIndex, detectedSupplierGroups } = analysis;
  const processed: EnterpriseImportRow[] = [];

  for (let r = headerRowIndex + 1; r < rawRows.length; r++) {
    const row = rawRows[r];
    if (!row || row.length === 0) continue;

    const mprRaw = sanitizeString(String(row[mapping.mprCol] || ''));
    const descRaw = sanitizeString(String(row[mapping.descCol] || ''));

    // Pula linhas vazias ou totais
    if (!mprRaw && !descRaw) continue;
    if (mprRaw.toUpperCase().includes('TOTAL') || descRaw.toUpperCase().includes('TOTAL')) continue;
    if (mprRaw.toUpperCase().includes('SUBTOTAL') || descRaw.toUpperCase().includes('SUBTOTAL')) continue;

    const validationErrors: string[] = [];
    const validationWarnings: string[] = [];

    if (!mprRaw) {
      validationErrors.push('Código MPR não informado nesta linha');
    }
    if (!descRaw) {
      validationErrors.push('Descrição técnica ausente');
    }

    const qtyBars = parseSafeFloat(row[mapping.barsCol], 0);
    const qtyMeters = mapping.metersCol >= 0 ? parseSafeFloat(row[mapping.metersCol], qtyBars * 6.0) : qtyBars * 6.0;
    const weight = mapping.weightCol >= 0 ? parseSafeFloat(row[mapping.weightCol], qtyBars * 16.76) : qtyBars * 16.76;
    const refPrice = mapping.refPriceCol >= 0 ? parseSafeFloat(row[mapping.refPriceCol], 0) : 0;
    const dimensions = mapping.dimensionsCol >= 0 ? sanitizeString(String(row[mapping.dimensionsCol] || '')) : undefined;
    const material = mapping.materialCol >= 0 ? sanitizeString(String(row[mapping.materialCol] || 'AISI 1020')) : 'AISI 1020';

    if (qtyBars <= 0) {
      validationWarnings.push('Quantidade em barras zerada ou inválida');
    }

    const isExisting = existingProducts.some(
      (p) => p.codigo_mpr.trim().toUpperCase() === mprRaw.toUpperCase()
    );

    // Mapeia cotações de fornecedores da linha
    const supplierQuotes: EnterpriseImportRow['supplierQuotes'] = [];
    detectedSupplierGroups.forEach((group) => {
      const qQty = parseSafeFloat(row[group.qtyCol], qtyBars);
      const qWeight = parseSafeFloat(row[group.weightCol], weight);
      const qPrice = parseSafeFloat(row[group.priceCol], 0);
      const qUnit = String(row[group.unitCol] || 'kg').trim();
      const ipi = parseSafeFloat(row[group.ipiCol], 0);
      const icms = parseSafeFloat(row[group.icmsCol], 18);

      if (qPrice > 0 || qWeight > 0) {
        const total = calculateQuotationTotal(qQty, qWeight, qPrice, qUnit, ipi, icms);
        supplierQuotes.push({
          supplierName: group.supplierName,
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

    processed.push({
      rowNumber: r + 1,
      codigo_mpr: mprRaw || `MPR-AUTO-${r}`,
      description: descRaw || 'Sem descrição',
      quantity_bars: qtyBars,
      quantity_meters: qtyMeters,
      estimated_weight_kg: weight,
      dimensions,
      material,
      reference_price: refPrice,
      isExisting,
      validationErrors,
      validationWarnings,
      supplierQuotes
    });
  }

  return processed;
}

/**
 * Gera e faz download da planilha modelo oficial (.xlsx) formatada para o cliente corporativo
 */
export function downloadOfficialQuotationTemplate(): void {
  const headers = [
    'ITEM',
    'CÓDIGO MPR',
    'DESCRIÇÃO TÉCNICA',
    'DIMENSÕES',
    'MATERIAL',
    'QTD. BARRAS',
    'METROS',
    'PESO TOTAL (KG)',
    'JD AÇO (QTD)',
    'JD AÇO (PESO)',
    'JD AÇO (PREÇO)',
    'JD AÇO (UNID)',
    'PAULISTEEL (QTD)',
    'PAULISTEEL (PESO)',
    'PAULISTEEL (PREÇO)',
    'PAULISTEEL (UNID)',
    'ROMEVA TUBOS (QTD)',
    'ROMEVA (PESO)',
    'ROMEVA (PREÇO)',
    'ROMEVA (UNID)'
  ];

  const sampleRows = [
    [1, 'MPR-CAI-1500-0188-1020', 'CANTONEIRA ABAS IGUAIS 1.1/2" x 3/16" - AISI 1020', '1.1/2" x 3/16"', 'AISI 1020', 26.94, 161.64, 451.71, 26.94, 451.71, 7.39, 'kg', 2.0, 33.52, 120.0, 'pç', 26.94, 451.71, 7.65, 'kg'],
    [2, 'MPR-CAI-2000-0188-1020', 'CANTONEIRA ABAS IGUAIS 2" x 3/16" - AISI 1020', '2" x 3/16"', 'AISI 1020', 30.90, 185.40, 702.98, 30.90, 702.98, 7.42, 'kg', 30.0, 682.50, 7.30, 'kg', 30.90, 702.98, 7.55, 'kg'],
    [3, 'MPR-TIR-1000-0400-0048-1020', 'TUBO INDUSTRIAL RETANGULAR 100,00 X 40,00 X 4,75', '100 x 40 x 4,75', 'AISI 1020', 10.00, 60.00, 572.00, 10.00, 572.00, 7.95, 'kg', 0, 0, 0, 'kg', 10.00, 572.00, 7.75, 'kg']
  ];

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleRows]);

  // Larguras das colunas
  ws['!cols'] = [
    { wch: 8 },
    { wch: 28 },
    { wch: 45 },
    { wch: 18 },
    { wch: 14 },
    { wch: 14 },
    { wch: 12 },
    { wch: 16 },
    { wch: 14 },
    { wch: 14 },
    { wch: 14 },
    { wch: 12 },
    { wch: 16 },
    { wch: 16 },
    { wch: 16 },
    { wch: 12 },
    { wch: 16 },
    { wch: 16 },
    { wch: 16 },
    { wch: 12 }
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Mapa_Cotacao_Padrao');
  XLSX.writeFile(wb, 'Planilha_Modelo_SaberX_Mapa_Cotacao.xlsx');
}
