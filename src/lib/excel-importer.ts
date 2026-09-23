import * as XLSX from 'xlsx';
import { Product } from '../types/product';
import { parseSafeFloat, sanitizeString } from './security';

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
  qtyCol?: number;
  weightCol?: number;
  priceCol: number;
  freightCol?: number;
  taxCol?: number;
  leadTimeCol?: number;
  tcoCol?: number;
  unitCol?: number;
  ipiCol?: number;
  icmsCol?: number;
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
    freightUnit?: number;
    taxPercent?: number;
    leadTimeDays?: number;
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

export interface QuotationImportMetadata {
  quotation_number?: string;
  project_name?: string;
  related_client?: string;
  responsible_user_name?: string;
  quotation_date?: string;
  status?: string;
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
  metadata?: QuotationImportMetadata;
}

// Dicionário de sinônimos em português para mapeamento inteligente
const SYNONYMS = {
  mpr: ['MPR', 'CÓDIGO', 'CODIGO', 'CÓDIGO MPR', 'CODIGO MPR', 'PART NUMBER', 'SKU', 'REFERENCIA', 'REF', 'ITEM CODE'],
  desc: ['DESCRIÇÃO', 'DESCRICAO', 'PRODUTO', 'ESPECIFICAÇÃO', 'ESPECIFICACAO', 'NOME', 'MATERIAL', 'DENOMINAÇÃO'],
  bars: ['BARRAS', 'QTD BARRAS', 'QTD. BARRAS', 'QUANTIDADE', 'QTD', 'DEMANDA', 'QTD NECESSÁRIA', 'QTD NECESSARIA'],
  meters: ['METROS', 'METRAGEM', 'QTD METROS', 'QTD. METROS', 'M', 'COMPRIMENTO', 'QTD. BASE'],
  weight: ['PESO', 'PESO KG', 'PESO (KG)', 'KG', 'PESO ESTIMADO', 'PESO BARRA'],
  dimensions: ['DIMENSÕES', 'DIMENSOES', 'MEDIDA', 'BITOLA', 'DIMENSÃO', 'DIMENSAO', 'MEDIDAS'],
  material: ['AÇO', 'ACO', 'NORMA', 'SAE', 'ASTM', 'TIPO AÇO'],
  refPrice: ['BUDGET', 'PREÇO REF', 'PRECO REF', 'REFERÊNCIA', 'REFERENCIA', 'VALOR REF', 'R$/KG', 'TETO']
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
 * Extrai automaticamente metadados do cabeçalho corporativo A1:B7
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

  // Prefere a aba principal de cotação caso exista
  const preferredSheet = workbook.SheetNames.find(
    (n) => n.includes('MAPA') || n.includes('COTACAO') || n.includes('COTAÇÃO') || n.includes('SABERX')
  ) || workbook.SheetNames[0];

  const sheet = workbook.Sheets[preferredSheet];
  const rawRows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

  // Extrai Metadados Corporativos (A1:B7)
  const metadata: QuotationImportMetadata = {};
  for (let r = 0; r < Math.min(rawRows.length, 9); r++) {
    const row = rawRows[r];
    if (!row || row.length < 2) continue;
    const label = String(row[0] || '').trim().toUpperCase();
    const val = String(row[1] || '').trim();

    if (label.includes('NÚMERO') || label.includes('NUMERO') || label.includes('COTAÇÃO')) {
      metadata.quotation_number = val;
    } else if (label.includes('PROJETO')) {
      metadata.project_name = val;
    } else if (label.includes('CLIENTE')) {
      metadata.related_client = val;
    } else if (label.includes('RESPONSÁVEL') || label.includes('RESPONSAVEL') || label.includes('COMPRADOR')) {
      metadata.responsible_user_name = val;
    } else if (label.includes('DATA')) {
      metadata.quotation_date = val;
    } else if (label.includes('STATUS')) {
      metadata.status = val;
    }
  }

  // Localiza a linha mais provável de ser o cabeçalho dos itens (varre até a linha 15)
  let headerRowIndex = 0;
  for (let r = 0; r < Math.min(rawRows.length, 15); r++) {
    const lineStr = rawRows[r].map((c) => String(c).toUpperCase()).join(' ');
    if (
      lineStr.includes('MPR') ||
      lineStr.includes('CÓDIGO') ||
      lineStr.includes('CODIGO') ||
      lineStr.includes('DESCRIÇÃO') ||
      lineStr.includes('DESCRICAO') ||
      (lineStr.includes('ITEM') && lineStr.includes('BARRAS'))
    ) {
      headerRowIndex = r;
      break;
    }
  }

  const headers = (rawRows[headerRowIndex] || []).map((h) => String(h).trim());

  // Sugere mapeamento com base no dicionário
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

  // Fallbacks inteligentes
  if (suggestedMapping.mprCol === -1) suggestedMapping.mprCol = 1;
  if (suggestedMapping.descCol === -1) suggestedMapping.descCol = 2;
  if (suggestedMapping.barsCol === -1) suggestedMapping.barsCol = 3;
  if (suggestedMapping.metersCol === -1) suggestedMapping.metersCol = 4;

  // Detecta colunas de fornecedores nos cabeçalhos
  const detectedSupplierGroups: ParsedSupplierColumnGroup[] = [];
  const knownSuppliers = ['JD AÇO', 'JD ACO', 'PAULISTEEL', 'ROMEVA', 'LUXFER', 'GERDAU', 'ARCELOR', 'USIMINAS', 'VALLOUREC', 'FORNECEDOR A', 'FORNECEDOR B', 'FORNECEDOR C'];

  // Procura fornecedores em cabeçalhos (incluindo formato TCO ou formato clássico)
  const searchRow = rawRows[Math.max(0, headerRowIndex - 1)] || [];
  const currentRow = rawRows[headerRowIndex] || [];

  for (let c = 0; c < Math.max(searchRow.length, currentRow.length); c++) {
    const text1 = String(searchRow[c] || '').toUpperCase();
    const text2 = String(currentRow[c] || '').toUpperCase();
    const combined = `${text1} ${text2}`;

    for (const sup of knownSuppliers) {
      if (combined.includes(sup) && !detectedSupplierGroups.some((g) => g.supplierName.toUpperCase().includes(sup))) {
        // Verifica se é formato corporativo TCO (Preço Bruto, Frete, Imposto, Prazo, TCO)
        const isTcoFormat = combined.includes('PREÇO BRUTO') || combined.includes('PRECO BRUTO') || combined.includes('FRETE') || combined.includes('TCO');

        if (isTcoFormat) {
          detectedSupplierGroups.push({
            supplierName: sup,
            priceCol: c,
            freightCol: c + 1,
            taxCol: c + 2,
            leadTimeCol: c + 3,
            tcoCol: c + 4,
            unitCol: -1,
            ipiCol: -1,
            icmsCol: -1
          });
        } else {
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
  }

  return {
    fileName: file.name,
    fileSize: file.size,
    sheets,
    selectedSheetName: preferredSheet,
    headers,
    headerRowIndex,
    rawRows,
    suggestedMapping,
    detectedSupplierGroups,
    metadata
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

    if (qtyBars <= 0 && qtyMeters <= 0) {
      validationWarnings.push('Quantidade em barras ou metros zerada');
    }

    const isExisting = existingProducts.some(
      (p) => p.codigo_mpr.trim().toUpperCase() === mprRaw.toUpperCase()
    );

    // Mapeia cotações de fornecedores da linha
    const supplierQuotes: EnterpriseImportRow['supplierQuotes'] = [];

    detectedSupplierGroups.forEach((group) => {
      const unitPrice = parseSafeFloat(row[group.priceCol], 0);
      const freight = group.freightCol !== undefined && group.freightCol >= 0 ? parseSafeFloat(row[group.freightCol], 0) : 0;
      const tax = group.taxCol !== undefined && group.taxCol >= 0 ? parseSafeFloat(row[group.taxCol], 0.12) : 0.12;
      const leadTime = group.leadTimeCol !== undefined && group.leadTimeCol >= 0 ? parseSafeFloat(row[group.leadTimeCol], 10) : 10;

      const quotedQty = group.qtyCol !== undefined && group.qtyCol >= 0 ? parseSafeFloat(row[group.qtyCol], qtyBars) : qtyBars;
      const weightKg = group.weightCol !== undefined && group.weightCol >= 0 ? parseSafeFloat(row[group.weightCol], weight) : weight;
      const priceUnit = group.unitCol !== undefined && group.unitCol >= 0 ? String(row[group.unitCol] || 'kg').toLowerCase() : 'kg';
      const ipi = group.ipiCol !== undefined && group.ipiCol >= 0 ? parseSafeFloat(row[group.ipiCol], 0) : 0;
      const icms = group.icmsCol !== undefined && group.icmsCol >= 0 ? parseSafeFloat(row[group.icmsCol], 0) : 0;

      if (unitPrice > 0) {
        // Cálculo Total: formato TCO ou unitPrice * qty
        const baseQty = priceUnit === 'kg' && weightKg > 0 ? weightKg : (qtyMeters > 0 ? qtyMeters : quotedQty);
        const calculatedTotal = (unitPrice * (1 + tax) + freight) * baseQty;

        supplierQuotes.push({
          supplierName: group.supplierName,
          quotedQty,
          weightKg,
          unitPrice,
          freightUnit: freight,
          taxPercent: tax,
          leadTimeDays: leadTime,
          priceUnit,
          ipiPercent: ipi,
          icmsPercent: icms,
          calculatedTotal: Number(calculatedTotal.toFixed(2))
        });
      }
    });

    processed.push({
      rowNumber: r + 1,
      codigo_mpr: mprRaw,
      description: descRaw,
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
 * Converte índice de coluna em letra Excel (0 -> A, 1 -> B...)
 */
function toColLetter(idx: number): string {
  let temp: number;
  let letter = '';
  idx += 1;
  while (idx > 0) {
    temp = (idx - 1) % 26;
    letter = String.fromCharCode(temp + 65) + letter;
    idx = Math.floor((idx - temp - 1) / 26);
  }
  return letter;
}

/**
 * Gera e faz download da planilha modelo oficial SaberX (.xlsx)
 * Estruturada conforme os 5 pilares corporativos:
 * - Pilar 1: UI/UX e Design Corporativo com cabeçalho A1:B7
 * - Pilar 2: TCO Real para 3 fornecedores (JD Aço, Paulisteel, Romeva)
 * - Pilar 3: Fórmulas Nativas de Excel (MÍNIMO, ÍNDICE/CORRESP, SUBTOTAL(109), SAVING, STATUS)
 * - Pilar 4: Segunda aba DASHBOARD_SABERX com KPIs e distribuição de compras
 */
export function downloadOfficialQuotationTemplate(): void {
  const wb = XLSX.utils.book_new();
  const wsMain: XLSX.WorkSheet = {};

  const setCell = (
    c: number,
    r: number,
    v: any,
    t: 's' | 'n' | 'b' = 's',
    f?: string,
    z?: string
  ) => {
    const ref = XLSX.utils.encode_cell({ c, r: r - 1 });
    const cell: XLSX.CellObject = { t, v };
    if (f) cell.f = f;
    if (z) cell.z = z;
    wsMain[ref] = cell;
  };

  // --- PILAR 1: METADADOS EXECUTIVOS (A1:B7) ---
  setCell(0, 1, 'SABERX - MAPA DE COTAÇÃO E COMPARATIVO DE PREÇOS', 's');
  setCell(0, 2, 'Número da Cotação:', 's');
  setCell(1, 2, 'COT-2026-001', 's');
  setCell(0, 3, 'Projeto:', 's');
  setCell(1, 3, 'Plataforma de Acesso Industrial - Aço Carbono', 's');
  setCell(0, 4, 'Cliente Relacionado:', 's');
  setCell(1, 4, 'Metálicas Brasil S.A.', 's');
  setCell(0, 5, 'Responsável:', 's');
  setCell(1, 5, 'Comprador Técnico', 's');
  setCell(0, 6, 'Data:', 's');
  setCell(1, 6, '2026-09-23', 's');
  setCell(0, 7, 'Status:', 's');
  setCell(1, 7, 'EM_COTACAO', 's');

  // --- PILAR 2: CABEÇALHOS DA TABELA DE ITENS (LINHA 9) ---
  const headerRow = 9;
  const basicCols = ['Item', 'Código MPR', 'Descrição', 'Qtd. Barras', 'Qtd. Metros'];
  basicCols.forEach((col, i) => setCell(i, headerRow, col, 's'));

  // 3 Fornecedores com Colunas TCO
  const suppliers = [
    { name: 'JD Aço', grossCol: 5, freightCol: 6, taxCol: 7, leadCol: 8, tcoCol: 9 },
    { name: 'Paulisteel', grossCol: 10, freightCol: 11, taxCol: 12, leadCol: 13, tcoCol: 14 },
    { name: 'Romeva Tubos', grossCol: 15, freightCol: 16, taxCol: 17, leadCol: 18, tcoCol: 19 }
  ];

  suppliers.forEach((s) => {
    setCell(s.grossCol, headerRow, `${s.name} (Preço Bruto R$)`, 's');
    setCell(s.freightCol, headerRow, `${s.name} (Frete Unit. R$)`, 's');
    setCell(s.taxCol, headerRow, `${s.name} (Alíquota Imposto %)`, 's');
    setCell(s.leadCol, headerRow, `${s.name} (Prazo Dias)`, 's');
    setCell(s.tcoCol, headerRow, `${s.name} (TCO Total R$)`, 's');
  });

  const colLowestTco = 20;
  const colWinner = 21;
  const colBudget = 22;
  const colStatus = 23;
  const colSaving = 24;
  const colSavingPct = 25;

  setCell(colLowestTco, headerRow, 'Menor TCO (Vencedor R$)', 's');
  setCell(colWinner, headerRow, 'Fornecedor Vencedor', 's');
  setCell(colBudget, headerRow, 'Budget Unitário TCO (R$)', 's');
  setCell(colStatus, headerRow, 'Status do Item', 's');
  setCell(colSaving, headerRow, 'Saving Bruto (R$)', 's');
  setCell(colSavingPct, headerRow, '% Saving', 's');

  const totalCols = 26;

  // --- PILAR 2 E 3: DADOS DE EXEMPLO REAIS E FÓRMULAS VIVAS ---
  const sampleItems = [
    {
      item: 1,
      mpr: 'MPR-CAI-1500-0188-1020',
      desc: 'CANTONEIRA ABAS IGUAIS 1.1/2" x 3/16" - AISI 1020',
      bars: 26.94,
      meters: 161.64,
      quotes: [
        { price: 7.39, freight: 45.0, tax: 0.12, lead: 10 },
        { price: 7.55, freight: 30.0, tax: 0.12, lead: 14 },
        { price: 7.65, freight: 50.0, tax: 0.12, lead: 12 }
      ],
      budget: 3700.0
    },
    {
      item: 2,
      mpr: 'MPR-CAI-2000-0188-1020',
      desc: 'CANTONEIRA ABAS IGUAIS 2" x 3/16" - AISI 1020',
      bars: 30.90,
      meters: 185.40,
      quotes: [
        { price: 7.42, freight: 45.0, tax: 0.12, lead: 10 },
        { price: 7.30, freight: 35.0, tax: 0.12, lead: 15 },
        { price: 7.55, freight: 50.0, tax: 0.12, lead: 12 }
      ],
      budget: 4500.0
    },
    {
      item: 3,
      mpr: 'MPR-TIR-1000-0400-0048-1020',
      desc: 'TUBO INDUSTRIAL RETANGULAR 100,00 X 40,00 X 4,75',
      bars: 10.00,
      meters: 60.00,
      quotes: [
        { price: 7.95, freight: 60.0, tax: 0.12, lead: 10 },
        { price: 8.20, freight: 40.0, tax: 0.12, lead: 16 },
        { price: 7.75, freight: 55.0, tax: 0.12, lead: 11 }
      ],
      budget: 1800.0
    }
  ];

  const startRow = 10;
  sampleItems.forEach((it, idx) => {
    const row = startRow + idx;
    const qtyLetter = toColLetter(4); // E (Metros)

    setCell(0, row, it.item, 'n', undefined, '0');
    setCell(1, row, it.mpr, 's');
    setCell(2, row, it.desc, 's');
    setCell(3, row, it.bars, 'n', undefined, '#,##0.00');
    setCell(4, row, it.meters, 'n', undefined, '#,##0.00');

    const tcoLetters: string[] = [];
    suppliers.forEach((s, sIdx) => {
      const q = it.quotes[sIdx];
      setCell(s.grossCol, row, q.price, 'n', undefined, 'R$ #,##0.00');
      setCell(s.freightCol, row, q.freight, 'n', undefined, 'R$ #,##0.00');
      setCell(s.taxCol, row, q.tax, 'n', undefined, '0.00%');
      setCell(s.leadCol, row, q.lead, 'n', undefined, '0 "dias"');

      // OPERAÇÃO TCO: =(Preço Bruto * (1 + Impostos) + Frete) * Quantidade
      const grossL = toColLetter(s.grossCol);
      const freightL = toColLetter(s.freightCol);
      const taxL = toColLetter(s.taxCol);
      const tcoL = toColLetter(s.tcoCol);
      tcoLetters.push(tcoL);

      const fTco = `(${grossL}${row}*(1+${taxL}${row})+${freightL}${row})*${qtyLetter}${row}`;
      const evalTco = (q.price * (1 + q.tax) + q.freight) * it.meters;
      setCell(s.tcoCol, row, evalTco, 'n', fTco, 'R$ #,##0.00');
    });

    // FÓRMULA MÍNIMO: =MIN(J9_TCO, P9_TCO, T9_TCO)
    const tcoRange = `${tcoLetters[0]}${row}:${tcoLetters[tcoLetters.length - 1]}${row}`;
    const fMin = `MIN(${tcoRange})`;
    setCell(colLowestTco, row, 0, 'n', fMin, 'R$ #,##0.00');

    // FÓRMULA ÍNDICE/CORRESP PARA O VENCEDOR
    const tcoHeaderRange = `${tcoLetters[0]}${headerRow}:${tcoLetters[tcoLetters.length - 1]}${headerRow}`;
    const lowestL = toColLetter(colLowestTco);
    const fWinner = `INDEX(${tcoHeaderRange},1,MATCH(${lowestL}${row},${tcoRange},0))`;
    setCell(colWinner, row, 'JD Aço', 's', fWinner);

    // BUDGET
    setCell(colBudget, row, it.budget, 'n', undefined, 'R$ #,##0.00');

    // STATUS BOOLEANO AVANÇADO (SE, E, OU)
    const budgetL = toColLetter(colBudget);
    const leadL = toColLetter(suppliers[0].leadCol);
    const fStatus = `IF(AND(${lowestL}${row}<=${budgetL}${row},${leadL}${row}<=15),"APROVADO",IF(${lowestL}${row}>${budgetL}${row},"ESTOURO DE BUDGET","REVISAR COTAÇÃO"))`;
    setCell(colStatus, row, 'APROVADO', 's', fStatus);

    // SAVING BRUTO (R$)
    const savingL = toColLetter(colSaving);
    const fSaving = `MAX(${tcoRange})-${lowestL}${row}`;
    setCell(colSaving, row, 0, 'n', fSaving, 'R$ #,##0.00');

    // % DE SAVING
    const fSavingPct = `IF(MAX(${tcoRange})>0,(${savingL}${row})/MAX(${tcoRange}),0)`;
    setCell(colSavingPct, row, 0, 'n', fSavingPct, '0.00%');
  });

  const endRow = startRow + sampleItems.length - 1;

  // --- PILAR 3.4: SUBTOTAL DINÂMICO NO TOPO (LINHA 8) COM =SUBTOTAL(109; ...) ---
  const subRow = 8;
  setCell(0, subRow, 'SUBTOTAL DINÂMICO (FILTRADO):', 's');

  suppliers.forEach((s) => {
    const tL = toColLetter(s.tcoCol);
    setCell(s.tcoCol, subRow, 0, 'n', `SUBTOTAL(109,${tL}${startRow}:${tL}${endRow})`, 'R$ #,##0.00');
  });

  const lowL = toColLetter(colLowestTco);
  setCell(colLowestTco, subRow, 0, 'n', `SUBTOTAL(109,${lowL}${startRow}:${lowL}${endRow})`, 'R$ #,##0.00');

  const savL = toColLetter(colSaving);
  setCell(colSaving, subRow, 0, 'n', `SUBTOTAL(109,${savL}${startRow}:${savL}${endRow})`, 'R$ #,##0.00');

  wsMain['!ref'] = `A1:${toColLetter(totalCols - 1)}${endRow}`;

  // Largura das Colunas
  const colsW: any[] = [];
  for (let c = 0; c < totalCols; c++) {
    if (c === 1) colsW.push({ wch: 28 }); // MPR
    else if (c === 2) colsW.push({ wch: 42 }); // Descrição
    else if (c === 3 || c === 4) colsW.push({ wch: 14 }); // Qtd
    else colsW.push({ wch: 20 });
  }
  wsMain['!cols'] = colsW;

  // Congelamento de painéis em F10
  (wsMain as any)['!views'] = [{ state: 'frozen', xSplit: 5, ySplit: 9 }];

  XLSX.utils.book_append_sheet(wb, wsMain, 'SABERX_MAPA_COTACAO');

  // --- PILAR 4: DASHBOARD_SABERX COM KPIS E BUSINESS INTELLIGENCE ---
  const wsDash: XLSX.WorkSheet = {};
  const setDashCell = (c: number, r: number, v: any, t: 's' | 'n' = 's', f?: string, z?: string) => {
    const ref = XLSX.utils.encode_cell({ c, r: r - 1 });
    const cell: XLSX.CellObject = { t, v };
    if (f) cell.f = f;
    if (z) cell.z = z;
    wsDash[ref] = cell;
  };

  setDashCell(0, 1, 'SABERX - DASHBOARD EXECUTIVO DE SUPRIMENTOS (BI)', 's');

  setDashCell(0, 3, 'INDICADOR EXECUTIVO (KPI)', 's');
  setDashCell(1, 3, 'VALOR / FÓRMULA', 's');
  setDashCell(2, 3, 'DESCRIÇÃO ESTRATÉGICA', 's');

  setDashCell(0, 4, '1. TOTAL GASTO (TCO CONTRATADO)', 's');
  setDashCell(1, 4, 0, 'n', `SUM(SABERX_MAPA_COTACAO!${lowL}${startRow}:${lowL}${endRow})`, 'R$ #,##0.00');
  setDashCell(2, 4, 'Custo Total de Propriedade vencedor acumulado da rodada', 's');

  setDashCell(0, 5, '2. TOTAL DE SAVING OBTIDO (R$)', 's');
  setDashCell(1, 5, 0, 'n', `SUM(SABERX_MAPA_COTACAO!${savL}${startRow}:${savL}${endRow})`, 'R$ #,##0.00');
  setDashCell(2, 5, 'Economia monetária direta contra a pior proposta cotada', 's');

  setDashCell(0, 6, '3. % SAVING MÉDIO CORPORATIVO', 's');
  setDashCell(1, 6, 0, 'n', `B5/(B4+B5)`, '0.00%');
  setDashCell(2, 6, 'Eficiência percentual de negociação em relação ao teto', 's');

  setDashCell(0, 7, '4. FORNECEDOR LÍDER (MENOR PREÇO)', 's');
  setDashCell(1, 7, 'JD Aço', 's');
  setDashCell(2, 7, 'Parceiro comercial com maior volume de adjudicação', 's');

  setDashCell(0, 9, 'DISTRIBUIÇÃO DE VOLUME COTADO POR FORNECEDOR', 's');
  setDashCell(0, 10, 'Fornecedor', 's');
  setDashCell(1, 10, 'Subtotal Ofertado (TCO R$)', 's');

  suppliers.forEach((sup, idx) => {
    const dashR = 11 + idx;
    const sTcoL = toColLetter(sup.tcoCol);
    setDashCell(0, dashR, sup.name, 's');
    setDashCell(1, dashR, 0, 'n', `SUM(SABERX_MAPA_COTACAO!${sTcoL}${startRow}:${sTcoL}${endRow})`, 'R$ #,##0.00');
  });

  wsDash['!cols'] = [{ wch: 38 }, { wch: 26 }, { wch: 55 }];
  wsDash['!ref'] = 'A1:C20';

  XLSX.utils.book_append_sheet(wb, wsDash, 'DASHBOARD_SABERX');

  XLSX.writeFile(wb, 'Planilha_Modelo_Oficial_SaberX_TCO.xlsx');
}
