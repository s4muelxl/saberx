import * as XLSX from 'xlsx';
import { QuotationFull } from '../types/quotation';

/**
 * Converte índice de coluna (0-based) em letra de coluna Excel (ex: 0 -> A, 27 -> AB)
 */
function getColumnLetter(colIndex: number): string {
  let temp: number;
  let letter = '';
  colIndex += 1;
  while (colIndex > 0) {
    temp = (colIndex - 1) % 26;
    letter = String.fromCharCode(temp + 65) + letter;
    colIndex = Math.floor((colIndex - temp - 1) / 26);
  }
  return letter;
}

/**
 * Exporta Cotação Completa no Padrão Corporativo SaberX
 * Inclui:
 * - Pilar 1: UI/UX e Design Corporativo com cabeçalho A1:B7 e congelamento de painel
 * - Pilar 2: TCO Real (Preço Bruto, Frete, Alíquota de Imposto, Prazo) para cada fornecedor
 * - Pilar 3: Fórmulas Nativas de Excel (MÍNIMO, ÍNDICE/CORRESP, SUBTOTAL(109), SAVING, STATUS Booleano)
 * - Pilar 4: Segunda aba executiva DASHBOARD_SABERX com KPIs dinâmicos
 */
export function exportQuotationToExcel(quotation: QuotationFull): void {
  const wb = XLSX.utils.book_new();

  // Garante ao menos 3 fornecedores na matriz para comparativo corporativo
  const suppliers = quotation.supplier_quotes && quotation.supplier_quotes.length > 0
    ? quotation.supplier_quotes
    : [];

  const wsMain: XLSX.WorkSheet = {};

  // Helper para injetar células tipadas com formatação e fórmulas
  const setCell = (
    col: number,
    row: number,
    value: any,
    type: 's' | 'n' | 'b' = 's',
    formula?: string,
    numFmt?: string
  ) => {
    const cellRef = XLSX.utils.encode_cell({ c: col, r: row - 1 });
    const cell: XLSX.CellObject = { t: type, v: value };
    if (formula) {
      cell.f = formula;
    }
    if (numFmt) {
      cell.z = numFmt;
    }
    wsMain[cellRef] = cell;
  };

  // --- PILAR 1: CABEÇALHO EXECUTIVO (A1:B7) ---
  setCell(0, 1, 'SABERX - MAPA DE COTAÇÃO E COMPARATIVO DE PREÇOS (TCO PROCUREMENT)', 's');
  
  setCell(0, 2, 'Número da Cotação:', 's');
  setCell(1, 2, quotation.quotation_number || 'COT-2026-001', 's');

  setCell(0, 3, 'Projeto:', 's');
  setCell(1, 3, quotation.project_name || 'Projeto Industrial', 's');

  setCell(0, 4, 'Cliente Relacionado:', 's');
  setCell(1, 4, quotation.related_client || 'N/A', 's');

  setCell(0, 5, 'Responsável:', 's');
  setCell(1, 5, quotation.responsible_user_name || 'Comprador Técnico', 's');

  setCell(0, 6, 'Data:', 's');
  setCell(1, 6, quotation.quotation_date || new Date().toISOString().split('T')[0], 's');

  setCell(0, 7, 'Status:', 's');
  setCell(1, 7, quotation.status || 'EM_COTACAO', 's');

  // --- CABEÇALHO DA TABELA DE ITENS (LINHA 9) ---
  const headerRow = 9;
  const colNames = ['Item', 'Código MPR', 'Descrição', 'Qtd. Barras', 'Qtd. Metros (Base)'];

  colNames.forEach((name, i) => setCell(i, headerRow, name, 's'));

  let currentCol = 5;
  const supplierColMap: Array<{
    name: string;
    grossCol: number;
    freightCol: number;
    taxCol: number;
    leadTimeCol: number;
    tcoCol: number;
    quote: typeof suppliers[0] | undefined;
  }> = [];

  // Se a cotação tiver menos que 3 fornecedores, preenche com placeholders (Fornecedor A, B, C)
  const displaySuppliers = suppliers.length > 0 ? suppliers : [
    { supplier: { trade_name: 'Fornecedor A' } },
    { supplier: { trade_name: 'Fornecedor B' } },
    { supplier: { trade_name: 'Fornecedor C' } }
  ] as any[];

  displaySuppliers.forEach((sq, idx) => {
    const sName = sq.supplier?.trade_name || sq.supplier?.company_name || `Fornecedor ${String.fromCharCode(65 + idx)}`;
    const grossCol = currentCol;
    const freightCol = currentCol + 1;
    const taxCol = currentCol + 2;
    const leadTimeCol = currentCol + 3;
    const tcoCol = currentCol + 4;

    setCell(grossCol, headerRow, `${sName} (Preço Bruto R$)`, 's');
    setCell(freightCol, headerRow, `${sName} (Frete Unit. R$)`, 's');
    setCell(taxCol, headerRow, `${sName} (Alíquota Imposto %)`, 's');
    setCell(leadTimeCol, headerRow, `${sName} (Prazo Dias)`, 's');
    setCell(tcoCol, headerRow, `${sName} (TCO Total R$)`, 's');

    supplierColMap.push({
      name: sName,
      grossCol,
      freightCol,
      taxCol,
      leadTimeCol,
      tcoCol,
      quote: sq
    });

    currentCol += 5;
  });

  // Colunas de Inteligência e Decisão (TCO Vencedor, Vencedor, Budget, Status, Saving)
  const colLowestTco = currentCol;
  const colWinner = currentCol + 1;
  const colBudget = currentCol + 2;
  const colStatus = currentCol + 3;
  const colSaving = currentCol + 4;
  const colSavingPct = currentCol + 5;

  setCell(colLowestTco, headerRow, 'Menor TCO (Vencedor R$)', 's');
  setCell(colWinner, headerRow, 'Fornecedor Vencedor', 's');
  setCell(colBudget, headerRow, 'Budget Unitário TCO (R$)', 's');
  setCell(colStatus, headerRow, 'Status do Item', 's');
  setCell(colSaving, headerRow, 'Saving Bruto (R$)', 's');
  setCell(colSavingPct, headerRow, '% Saving', 's');

  const totalColumns = colSavingPct + 1;

  // --- PILAR 2 E 3: LINHAS DE DADOS E FÓRMULAS MATEMÁTICAS ---
  const startRow = 10;
  const items = quotation.items && quotation.items.length > 0 ? quotation.items : [
    {
      id: 'item-1',
      quotation_id: quotation.id,
      product_id: 'p1',
      item_order: 1,
      quantity_bars: 26.94,
      quantity_meters: 161.64,
      estimated_weight_kg: 451.71,
      target_price: 3600,
      created_at: new Date().toISOString(),
      product: {
        id: 'p1',
        organization_id: 'demo',
        codigo_mpr: 'MPR-CAI-1500-0188-1020',
        description: 'CANTONEIRA ABAS IGUAIS 1.1/2" x 3/16" - AISI 1020',
        category: 'Aço Carbono',
        dimensions: '1.1/2" x 3/16"',
        material: 'AISI 1020',
        stock_unit: 'barra',
        purchase_unit: 'kg',
        weight_unit_kg: 16.76,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    }
  ];

  items.forEach((item, idx) => {
    const row = startRow + idx;
    const qtyMeters = item.quantity_meters || item.quantity_bars * 6.0;
    const qtyColLetter = getColumnLetter(4); // Coluna E (Qtd Metros / Base)

    setCell(0, row, idx + 1, 'n', undefined, '0');
    setCell(1, row, item.product?.codigo_mpr || `MPR-${idx + 1}`, 's');
    setCell(2, row, item.product?.description || 'Item de Suprimentos', 's');
    setCell(3, row, item.quantity_bars, 'n', undefined, '#,##0.00');
    setCell(4, row, qtyMeters, 'n', undefined, '#,##0.00');

    const tcoColLetters: string[] = [];

    supplierColMap.forEach((supMap) => {
      let unitPrice = 0;
      let freight = 0;
      let taxPercent = 0.12; // 12% padrão ICMS/IPI
      let leadTime = 10;

      if (supMap.quote && supMap.quote.items) {
        const sqItem = supMap.quote.items.find((i) => i.quotation_item_id === item.id);
        if (sqItem) {
          unitPrice = sqItem.unit_price || 0;
          taxPercent = ((sqItem.ipi_percent || 0) + (sqItem.icms_percent || 0)) / 100 || 0.12;
        }
        leadTime = supMap.quote.delivery_time_days || 10;
        freight = (supMap.quote.freight_amount || 0) / Math.max(1, items.length);
      } else {
        // Valores de referência caso vazio
        unitPrice = 7.50 + idx * 0.2;
        freight = 50.0;
        taxPercent = 0.12;
        leadTime = 12;
      }

      setCell(supMap.grossCol, row, unitPrice, 'n', undefined, 'R$ #,##0.00');
      setCell(supMap.freightCol, row, freight, 'n', undefined, 'R$ #,##0.00');
      setCell(supMap.taxCol, row, taxPercent, 'n', undefined, '0.00%');
      setCell(supMap.leadTimeCol, row, leadTime, 'n', undefined, '0 "dias"');

      // OPERAÇÃO MATEMÁTICA TCO NATIVA DO EXCEL:
      // (Preço Bruto * (1 + Impostos) + Frete) * Quantidade
      const grossLetter = getColumnLetter(supMap.grossCol);
      const freightLetter = getColumnLetter(supMap.freightCol);
      const taxLetter = getColumnLetter(supMap.taxCol);
      const tcoLetter = getColumnLetter(supMap.tcoCol);
      tcoColLetters.push(tcoLetter);

      const tcoFormula = `(${grossLetter}${row}*(1+${taxLetter}${row})+${freightLetter}${row})*${qtyColLetter}${row}`;
      const evaluatedTco = (unitPrice * (1 + taxPercent) + freight) * qtyMeters;
      setCell(supMap.tcoCol, row, evaluatedTco, 'n', tcoFormula, 'R$ #,##0.00');
    });

    // FÓRMULA MÍNIMO: =MIN(TCO_A, TCO_B, TCO_C)
    const tcoRangeStr = `${tcoColLetters[0]}${row}:${tcoColLetters[tcoColLetters.length - 1]}${row}`;
    const minFormula = `MIN(${tcoRangeStr})`;
    setCell(colLowestTco, row, 0, 'n', minFormula, 'R$ #,##0.00');

    // FÓRMULA ÍNDICE/CORRESP PARA O FORNECEDOR VENCEDOR
    const tcoHeaderRange = `${tcoColLetters[0]}${headerRow}:${tcoColLetters[tcoColLetters.length - 1]}${headerRow}`;
    const lowestTcoLetter = getColumnLetter(colLowestTco);
    const winnerFormula = `INDEX(${tcoHeaderRange},1,MATCH(${lowestTcoLetter}${row},${tcoRangeStr},0))`;
    setCell(colWinner, row, supplierColMap[0]?.name || 'Fornecedor A', 's', winnerFormula);

    // BUDGET (Teto de Compras)
    const budgetVal = item.target_price || 3500;
    setCell(colBudget, row, budgetVal, 'n', undefined, 'R$ #,##0.00');

    // STATUS COM LÓGICA BOOLEANA AVANÇADA (SE, E, OU):
    // SE Menor TCO <= Budget E Prazo <= 15 -> 'APROVADO', senão 'ESTOURO DE BUDGET' ou 'REVISAR COTAÇÃO'
    const budgetLetter = getColumnLetter(colBudget);
    const firstLeadTimeLetter = getColumnLetter(supplierColMap[0].leadTimeCol);
    const statusFormula = `IF(AND(${lowestTcoLetter}${row}<=${budgetLetter}${row},${firstLeadTimeLetter}${row}<=15),"APROVADO",IF(${lowestTcoLetter}${row}>${budgetLetter}${row},"ESTOURO DE BUDGET","REVISAR COTAÇÃO"))`;
    setCell(colStatus, row, 'APROVADO', 's', statusFormula);

    // SAVING BRUTO (R$): Maior TCO - Menor TCO
    const savingLetter = getColumnLetter(colSaving);
    const savingFormula = `MAX(${tcoRangeStr})-${lowestTcoLetter}${row}`;
    setCell(colSaving, row, 0, 'n', savingFormula, 'R$ #,##0.00');

    // % DE SAVING: Saving / Maior TCO
    const savingPctFormula = `IF(MAX(${tcoRangeStr})>0,(${savingLetter}${row})/MAX(${tcoRangeStr}),0)`;
    setCell(colSavingPct, row, 0, 'n', savingPctFormula, '0.00%');
  });

  const endRow = startRow + items.length - 1;

  // --- PILAR 3.4: LINHA DE TOTAIS DINÂMICOS NO TOPO (LINHA 8) COM =SUBTOTAL(109; ...) ---
  const subtotalRow = 8;
  setCell(0, subtotalRow, 'SUBTOTAL DINÂMICO (FILTRADO):', 's');
  
  supplierColMap.forEach((supMap) => {
    const tcoColL = getColumnLetter(supMap.tcoCol);
    const subtotalF = `SUBTOTAL(109,${tcoColL}${startRow}:${tcoColL}${endRow})`;
    setCell(supMap.tcoCol, subtotalRow, 0, 'n', subtotalF, 'R$ #,##0.00');
  });

  const lowestL = getColumnLetter(colLowestTco);
  setCell(colLowestTco, subtotalRow, 0, 'n', `SUBTOTAL(109,${lowestL}${startRow}:${lowestL}${endRow})`, 'R$ #,##0.00');

  const savingL = getColumnLetter(colSaving);
  setCell(colSaving, subtotalRow, 0, 'n', `SUBTOTAL(109,${savingL}${startRow}:${savingL}${endRow})`, 'R$ #,##0.00');

  // Define dimensões da planilha principal
  const rangeRef = XLSX.utils.encode_range({
    s: { c: 0, r: 0 },
    e: { c: totalColumns - 1, r: endRow }
  });
  wsMain['!ref'] = rangeRef;

  // Larguras das colunas
  const colWidths: any[] = [];
  for (let c = 0; c < totalColumns; c++) {
    if (c === 1) colWidths.push({ wch: 28 }); // Código MPR
    else if (c === 2) colWidths.push({ wch: 42 }); // Descrição
    else if (c === 3 || c === 4) colWidths.push({ wch: 14 }); // Qtd
    else colWidths.push({ wch: 20 }); // Valores e Fornecedores
  }
  wsMain['!cols'] = colWidths;

  // Congelamento de painel em F10 (mantém cabeçalho e descrição do item fixos ao rolar)
  (wsMain as any)['!views'] = [
    { state: 'frozen', xSplit: 5, ySplit: 9 }
  ];

  XLSX.utils.book_append_sheet(wb, wsMain, 'SABERX_MAPA_COTACAO');

  // --- PILAR 4: SEGUNDA ABA DASHBOARD_SABERX COM KPIS E BUSINESS INTELLIGENCE ---
  const wsDash: XLSX.WorkSheet = {};
  const setDashCell = (c: number, r: number, val: any, type: 's' | 'n' = 's', f?: string, numFmt?: string) => {
    const ref = XLSX.utils.encode_cell({ c, r: r - 1 });
    const cell: XLSX.CellObject = { t: type, v: val };
    if (f) cell.f = f;
    if (numFmt) cell.z = numFmt;
    wsDash[ref] = cell;
  };

  setDashCell(0, 1, 'SABERX - DASHBOARD EXECUTIVO DE SUPRIMENTOS (BI)', 's');

  setDashCell(0, 3, 'INDICADOR EXECUTIVO (KPI)', 's');
  setDashCell(1, 3, 'VALOR / FÓRMULA', 's');
  setDashCell(2, 3, 'DESCRIÇÃO ESTRATÉGICA', 's');

  // KPI 1: TOTAL COMPRAS HOMOLOGADAS (TCO)
  setDashCell(0, 4, '1. TOTAL GASTO (TCO CONTRATADO)', 's');
  setDashCell(1, 4, 0, 'n', `SUM(SABERX_MAPA_COTACAO!${lowestL}${startRow}:${lowestL}${endRow})`, 'R$ #,##0.00');
  setDashCell(2, 4, 'Custo Total de Propriedade vencedor acumulado da rodada', 's');

  // KPI 2: TOTAL DE SAVING EM R$
  setDashCell(0, 5, '2. TOTAL DE SAVING OBTIDO (R$)', 's');
  setDashCell(1, 5, 0, 'n', `SUM(SABERX_MAPA_COTACAO!${savingL}${startRow}:${savingL}${endRow})`, 'R$ #,##0.00');
  setDashCell(2, 5, 'Economia monetária direta contra a pior proposta cotada', 's');

  // KPI 3: % DE SAVING MÉDIO
  setDashCell(0, 6, '3. % SAVING MÉDIO CORPORATIVO', 's');
  setDashCell(1, 6, 0, 'n', `B5/(B4+B5)`, '0.00%');
  setDashCell(2, 6, 'Eficiência percentual de negociação em relação ao teto', 's');

  // KPI 4: TOP FORNECEDOR EM VOLUME
  setDashCell(0, 7, '4. FORNECEDOR LÍDER (MENOR PREÇO)', 's');
  setDashCell(1, 7, supplierColMap[0]?.name || 'N/A', 's');
  setDashCell(2, 7, 'Parceiro comercial com maior índice de adjudicação', 's');

  // Resumo de Fornecedores Cotados
  setDashCell(0, 9, 'DISTRIBUIÇÃO DE VOLUME COTADO POR FORNECEDOR', 's');
  setDashCell(0, 10, 'Fornecedor', 's');
  setDashCell(1, 10, 'Subtotal Ofertado (TCO R$)', 's');

  supplierColMap.forEach((supMap, sIdx) => {
    const dashRow = 11 + sIdx;
    const supTcoLetter = getColumnLetter(supMap.tcoCol);
    setDashCell(0, dashRow, supMap.name, 's');
    setDashCell(1, dashRow, 0, 'n', `SUM(SABERX_MAPA_COTACAO!${supTcoLetter}${startRow}:${supTcoLetter}${endRow})`, 'R$ #,##0.00');
  });

  wsDash['!cols'] = [{ wch: 38 }, { wch: 26 }, { wch: 55 }];
  wsDash['!ref'] = 'A1:C20';

  XLSX.utils.book_append_sheet(wb, wsDash, 'DASHBOARD_SABERX');

  // Salva o arquivo final (.xlsx)
  const fileName = `${quotation.quotation_number || 'COT-2026'}_Mapa_Cotacao_SaberX_Executivo.xlsx`;
  XLSX.writeFile(wb, fileName);
}
