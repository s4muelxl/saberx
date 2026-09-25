import ExcelJS from 'exceljs';
import path from 'path';
import fs from 'fs';

async function generateSaberXWorkbook() {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'SaberX Procurement AI';
  workbook.lastModifiedBy = 'Arquiteto de Soluções SaberX';
  workbook.created = new Date();
  workbook.modified = new Date();

  // -------------------------------------------------------------
  // PALETTE & STYLES
  // -------------------------------------------------------------
  const NAVY_DARK = 'FF1B2A4A';      // #1B2A4A
  const NAVY_MID = 'FF243B68';       // #243B68
  const NAVY_LIGHT = 'FFEBF2F7';     // Light blue gray
  const EMERALD_DARK = 'FF0F5132';   // #0F5132
  const EMERALD_LIGHT = 'FFD1E7DD';  // Light emerald
  const EMERALD_TEXT = 'FF0A3622';
  const SLATE_BORDER = 'FFCBD5E1';   // #CBD5E1
  const GRAY_ROW_ALT = 'FFF8FAFC';   // #F8FAFC
  const GOLD_ACCENT = 'FFD97706';

  const fontTitle = { name: 'Segoe UI', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
  const fontHeader = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
  const fontRegular = { name: 'Segoe UI', size: 10, color: { argb: 'FF1E293B' } };
  const fontBold = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF1E293B' } };
  const fontKpiNum = { name: 'Segoe UI', size: 18, bold: true, color: { argb: 'FF1B2A4A' } };
  const fontKpiLabel = { name: 'Segoe UI', size: 9, bold: true, color: { argb: 'FF64748B' } };

  const thinBorder = {
    top: { style: 'thin', color: { argb: SLATE_BORDER } },
    left: { style: 'thin', color: { argb: SLATE_BORDER } },
    bottom: { style: 'thin', color: { argb: SLATE_BORDER } },
    right: { style: 'thin', color: { argb: SLATE_BORDER } },
  };

  // -------------------------------------------------------------
  // ABA 1: MAPA_COTACAO
  // -------------------------------------------------------------
  const ws = workbook.addWorksheet('MAPA_COTACAO', {
    views: [{ showGridLines: true, state: 'frozen', xSplit: 0, ySplit: 9 }]
  });

  // Título e Banner
  ws.mergeCells('A1:G1');
  const titleCell = ws.getCell('A1');
  titleCell.value = 'SABERX • MAPA DE COTAÇÃO CORPORATIVO & COMPARATIVO TCO';
  titleCell.font = fontTitle;
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY_DARK } };
  titleCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  ws.getRow(1).height = 36;

  // Bloco de Informações A2:G7
  const infoData = [
    { label: 'Número da Cotação:', val: 'COT-2026-0842', refL: 'A2', refV: 'B2', rL2: 'D2', l2: 'Budget Estimado:', rV2: 'E2', v2: 65000, numFmt2: '"R$ "#,##0.00' },
    { label: 'Projeto:', val: 'Estruturas Metálicas - Módulo Sul', refL: 'A3', refV: 'B3', rL2: 'D3', l2: 'Alçada Aprovação:', rV2: 'E3', v2: 'Nível 3 (Diretoria)' },
    { label: 'Cliente:', val: 'Indústrias Metalmax S/A', refL: 'A4', refV: 'B4', rL2: 'D4', l2: 'Cond. Padrão:', rV2: 'E4', v2: '28 DDL (Faturamento)' },
    { label: 'Responsável (Comprador):', val: 'Carlos Eduardo Ramos', refL: 'A5', refV: 'B5', rL2: 'D5', l2: 'Economia Total (Saving):', rV2: 'E5', formula2: '=SUBTOTAL(109, W10:W16)', numFmt2: '"R$ "#,##0.00' },
    { label: 'Data da Cotação:', val: new Date(2026, 8, 25), refL: 'A6', refV: 'B6', numFmt: 'DD/MM/YYYY', rL2: 'D6', l2: 'Total Gasto (Vencedor):', rV2: 'E6', formula2: '=SUMPRODUCT(E10:E16, U10:U16)', numFmt2: '"R$ "#,##0.00' },
    { label: 'Status da Cotação:', val: 'FECHADO/APROVADO', refL: 'A7', refV: 'B7', rL2: 'D7', l2: 'Última Revisão:', rV2: 'E7', val2: '25/09/2026 13:00' }
  ];

  for (let r = 2; r <= 7; r++) {
    ws.getRow(r).height = 20;
    const item = infoData[r - 2];

    const cL1 = ws.getCell(item.refL);
    cL1.value = item.label;
    cL1.font = fontBold;
    cL1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY_LIGHT } };
    cL1.border = thinBorder;

    const cV1 = ws.getCell(item.refV);
    cV1.value = item.val;
    cV1.font = (item.refV === 'B7') ? { ...fontBold, color: { argb: EMERALD_DARK } } : fontRegular;
    if (item.refV === 'B7') {
      cV1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: EMERALD_LIGHT } };
    }
    if (item.numFmt) cV1.numFmt = item.numFmt;
    cV1.border = thinBorder;

    const cL2 = ws.getCell(item.rL2);
    cL2.value = item.l2;
    cL2.font = fontBold;
    cL2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY_LIGHT } };
    cL2.border = thinBorder;

    const cV2 = ws.getCell(item.rV2);
    if (item.formula2) {
      cV2.value = { formula: item.formula2.replace('=', '') };
    } else {
      cV2.value = item.v2 || item.val2;
    }
    cV2.font = fontBold;
    if (item.numFmt2) cV2.numFmt = item.numFmt2;
    cV2.border = thinBorder;
  }

  // Linha 8 em branco (espaçador)
  ws.getRow(8).height = 10;

  // -------------------------------------------------------------
  // LINHA 9: CABEÇALHOS DA TABELA DE COMPRAS
  // -------------------------------------------------------------
  ws.getRow(9).height = 28;

  const headers = [
    { col: 'A', name: 'Item', width: 8, bg: NAVY_DARK },
    { col: 'B', name: 'Código MPR', width: 14, bg: NAVY_DARK },
    { col: 'C', name: 'Descrição dos Materiais / Aço', width: 36, bg: NAVY_DARK },
    { col: 'D', name: 'Unid.', width: 10, bg: NAVY_DARK },
    { col: 'E', name: 'Qtd.', width: 10, bg: NAVY_DARK },

    // Fornecedor A (JD Aço)
    { col: 'F', name: 'JD Aço - Preço', width: 15, bg: 'FF1E3A8A' },
    { col: 'G', name: 'JD - Frete', width: 13, bg: 'FF1E3A8A' },
    { col: 'H', name: 'JD - Imp.(%)', width: 13, bg: 'FF1E3A8A' },
    { col: 'I', name: 'JD - Prazo', width: 12, bg: 'FF1E3A8A' },

    // Fornecedor B (Gerdau Comercial)
    { col: 'J', name: 'Gerdau - Preço', width: 15, bg: 'FF0D9488' },
    { col: 'K', name: 'Gerdau - Frete', width: 13, bg: 'FF0D9488' },
    { col: 'L', name: 'Gerdau - Imp.(%)', width: 13, bg: 'FF0D9488' },
    { col: 'M', name: 'Gerdau - Prazo', width: 12, bg: 'FF0D9488' },

    // Fornecedor C (ArcelorMittal)
    { col: 'N', name: 'Arcelor - Preço', width: 15, bg: 'FF6366F1' },
    { col: 'O', name: 'Arcelor - Frete', width: 13, bg: 'FF6366F1' },
    { col: 'P', name: 'Arcelor - Imp.(%)', width: 13, bg: 'FF6366F1' },
    { col: 'Q', name: 'Arcelor - Prazo', width: 12, bg: 'FF6366F1' },

    // TCO Unitário
    { col: 'R', name: 'TCO (JD Aço)', width: 16, bg: 'FF334155' },
    { col: 'S', name: 'TCO (Gerdau)', width: 16, bg: 'FF334155' },
    { col: 'T', name: 'TCO (Arcelor)', width: 16, bg: 'FF334155' },

    // Decisão e Inteligência
    { col: 'U', name: 'Menor TCO (R$)', width: 16, bg: EMERALD_DARK },
    { col: 'V', name: 'Fornecedor Vencedor', width: 22, bg: EMERALD_DARK },
    { col: 'W', name: 'Saving Total (R$)', width: 16, bg: EMERALD_DARK },
    { col: 'X', name: 'Status do Item', width: 18, bg: NAVY_DARK },
    { col: 'Y', name: 'Budget Unit. (R$)', width: 16, bg: 'FF475569' }
  ];

  headers.forEach(h => {
    const colObj = ws.getColumn(h.col);
    colObj.width = h.width;
    const cell = ws.getCell(`${h.col}9`);
    cell.value = h.name;
    cell.font = fontHeader;
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: h.bg } };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = thinBorder;
  });

  // -------------------------------------------------------------
  // DADOS AMOSTRA (Linhas 10 a 16) - Itens reais de Aço & Metalurgia
  // -------------------------------------------------------------
  const itensAmostra = [
    { item: 1, cod: 'MPR-0101', desc: 'Viga I ASTM A36 6" x 12.5 lb/ft', un: 'barra', qtd: 40, fP: 345.0, fF: 15.0, fI: 0.12, fD: 10, gP: 360.0, gF: 10.0, gI: 0.12, gD: 14, aP: 350.0, aF: 20.0, aI: 0.12, aD: 8, bud: 420.0 },
    { item: 2, cod: 'MPR-0102', desc: 'Tubo Quadrado Estrutural 50x50x2.65mm', un: 'barra', qtd: 80, fP: 185.0, fF: 8.0, fI: 0.12, fD: 7, gP: 178.0, gF: 12.0, gI: 0.12, gD: 12, aP: 190.0, aF: 5.0, aI: 0.12, aD: 15, bud: 220.0 },
    { item: 3, cod: 'MPR-0103', desc: 'Chapa Fina Quente 1/4" (6.35mm) A36', un: 'kg', qtd: 1200, fP: 7.80, fF: 0.40, fI: 0.12, fD: 12, gP: 8.10, gF: 0.30, gI: 0.12, gD: 10, aP: 7.60, aF: 0.45, aI: 0.12, aD: 5, bud: 9.50 },
    { item: 4, cod: 'MPR-0104', desc: 'Cantoneira Abas Iguais 2" x 3/16" 6m', un: 'barra', qtd: 60, fP: 142.0, fF: 6.0, fI: 0.12, fD: 15, gP: 139.0, gF: 8.0, gI: 0.12, gD: 18, aP: 145.0, aF: 7.0, aI: 0.12, aD: 10, bud: 175.0 },
    { item: 5, cod: 'MPR-0105', desc: 'Barra Chata Laminada 1" x 1/4" 6m', un: 'barra', qtd: 50, fP: 88.0, fF: 4.0, fI: 0.12, fD: 5, gP: 92.0, gF: 3.5, gI: 0.12, gD: 7, aP: 89.5, aF: 4.0, aI: 0.12, aD: 12, bud: 105.0 },
    { item: 6, cod: 'MPR-0106', desc: 'Eletrodo Revestido E7018 3.25mm', un: 'kg', qtd: 150, fP: 24.50, fF: 1.20, fI: 0.10, fD: 4, gP: 23.00, gF: 1.50, gI: 0.10, gD: 6, aP: 25.50, aF: 1.00, aI: 0.10, aD: 4, bud: 30.0 },
    { item: 7, cod: 'MPR-0107', desc: 'Parafuso Sextavado A325 3/4" x 2.1/2"', un: 'pç', qtd: 500, fP: 6.40, fF: 0.30, fI: 0.10, fD: 8, gP: 6.80, gF: 0.25, gI: 0.10, gD: 10, aP: 6.20, aF: 0.40, aI: 0.10, aD: 7, bud: 8.00 }
  ];

  itensAmostra.forEach((it, idx) => {
    const r = 10 + idx;
    ws.getRow(r).height = 22;
    const isAlt = (idx % 2 === 1);
    const rowBg = isAlt ? GRAY_ROW_ALT : 'FFFFFFFF';

    // Inputs Básicos
    ws.getCell(`A${r}`).value = it.item;
    ws.getCell(`B${r}`).value = it.cod;
    ws.getCell(`C${r}`).value = it.desc;
    ws.getCell(`D${r}`).value = it.un;
    ws.getCell(`E${r}`).value = it.qtd;

    // Fornecedor A (JD Aço)
    ws.getCell(`F${r}`).value = it.fP;
    ws.getCell(`G${r}`).value = it.fF;
    ws.getCell(`H${r}`).value = it.fI;
    ws.getCell(`I${r}`).value = it.fD;

    // Fornecedor B (Gerdau)
    ws.getCell(`J${r}`).value = it.gP;
    ws.getCell(`K${r}`).value = it.gF;
    ws.getCell(`L${r}`).value = it.gI;
    ws.getCell(`M${r}`).value = it.gD;

    // Fornecedor C (ArcelorMittal)
    ws.getCell(`N${r}`).value = it.aP;
    ws.getCell(`O${r}`).value = it.aF;
    ws.getCell(`P${r}`).value = it.aI;
    ws.getCell(`Q${r}`).value = it.aD;

    // Budget
    ws.getCell(`Y${r}`).value = it.bud;

    // FÓRMULAS EXATAS
    // TCO Unitário = (Preço + Frete) * (1 + Imposto)
    ws.getCell(`R${r}`).value = { formula: `IF(F${r}>0, (F${r}+G${r})*(1+H${r}), "")` };
    ws.getCell(`S${r}`).value = { formula: `IF(J${r}>0, (J${r}+K${r})*(1+L${r}), "")` };
    ws.getCell(`T${r}`).value = { formula: `IF(N${r}>0, (N${r}+O${r})*(1+P${r}), "")` };

    // Menor TCO (desconsidera vazios)
    ws.getCell(`U${r}`).value = { formula: `MIN(R${r}:T${r})` };

    // Fornecedor Vencedor com INDEX & MATCH
    ws.getCell(`V${r}`).value = {
      formula: `IF(U${r}=R${r}, "JD Aço", IF(U${r}=S${r}, "Gerdau Comercial", IF(U${r}=T${r}, "ArcelorMittal", "N/A")))`
    };

    // Saving Total em R$ = (Maior TCO - Menor TCO) * Quantidade
    ws.getCell(`W${r}`).value = {
      formula: `IF(AND(U${r}>0, MAX(R${r}:T${r})>U${r}), (MAX(R${r}:T${r})-U${r})*E${r}, 0)`
    };

    // Status do Item = SE TCO <= Budget E Prazo <= 15 -> APROVADO
    ws.getCell(`X${r}`).value = {
      formula: `IF(U${r}<=Y${r}, IF(IF(V${r}="JD Aço", I${r}, IF(V${r}="Gerdau Comercial", M${r}, Q${r}))<=15, "APROVADO", "REVISAR PRAZO"), "ESTOURO DE BUDGET")`
    };

    // Formatações Numéricas e Estilos
    const currencyCols = ['F', 'G', 'J', 'K', 'N', 'O', 'R', 'S', 'T', 'U', 'W', 'Y'];
    currencyCols.forEach(c => {
      ws.getCell(`${c}${r}`).numFmt = '"R$ "#,##0.00';
    });

    ['H', 'L', 'P'].forEach(c => {
      ws.getCell(`${c}${r}`).numFmt = '0.0%';
    });

    ['A', 'E', 'I', 'M', 'Q'].forEach(c => {
      ws.getCell(`${c}${r}`).numFmt = '#,##0';
    });

    // Bordas e alinhamentos
    headers.forEach(h => {
      const cell = ws.getCell(`${h.col}${r}`);
      cell.font = fontRegular;
      cell.border = thinBorder;
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowBg } };

      if (['A', 'B', 'D', 'I', 'M', 'Q', 'X'].includes(h.col)) {
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
      } else if (['C', 'V'].includes(h.col)) {
        cell.alignment = { vertical: 'middle', horizontal: 'left' };
      } else {
        cell.alignment = { vertical: 'middle', horizontal: 'right' };
      }

      // Destaque para colunas vencedoras e saving
      if (h.col === 'U' || h.col === 'W') {
        cell.font = fontBold;
      }
      if (h.col === 'X') {
        cell.font = { ...fontBold, color: { argb: EMERALD_DARK } };
      }
    });
  });

  // Linha 17: Totalizador com SUBTOTAL(109, ...)
  const rTot = 17;
  ws.getRow(rTot).height = 24;
  ws.getCell(`C${rTot}`).value = 'TOTAIS CONSOLIDADOS (ITENS FILTRADOS):';
  ws.getCell(`C${rTot}`).font = fontBold;
  ws.getCell(`C${rTot}`).alignment = { vertical: 'middle', horizontal: 'right' };

  ws.getCell(`E${rTot}`).value = { formula: `SUBTOTAL(109, E10:E16)` };
  ws.getCell(`E${rTot}`).font = fontBold;
  ws.getCell(`E${rTot}`).numFmt = '#,##0';
  ws.getCell(`E${rTot}`).border = thinBorder;

  ws.getCell(`W${rTot}`).value = { formula: `SUBTOTAL(109, W10:W16)` };
  ws.getCell(`W${rTot}`).font = fontBold;
  ws.getCell(`W${rTot}`).numFmt = '"R$ "#,##0.00';
  ws.getCell(`W${rTot}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: EMERALD_LIGHT } };
  ws.getCell(`W${rTot}`).border = thinBorder;

  // -------------------------------------------------------------
  // ABA 2: DASHBOARD_SABERX (Executive BI)
  // -------------------------------------------------------------
  const db = workbook.addWorksheet('DASHBOARD_SABERX', {
    views: [{ showGridLines: false }]
  });

  // Banner
  db.mergeCells('B2:M2');
  const dbTitle = db.getCell('B2');
  dbTitle.value = 'SABERX BI • PAINEL EXECUTIVO DE COTAÇÃO & PERFORMANCE DE COMPRAS';
  dbTitle.font = fontTitle;
  dbTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY_DARK } };
  dbTitle.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  db.getRow(2).height = 36;

  // 4 KPI Cards
  const kpis = [
    { range: 'B4:D5', numCell: 'B5', labelCell: 'B4', label: 'TOTAL GASTO PREVISTO (R$)', valFormula: '=SUMPRODUCT(MAPA_COTACAO!E10:E16, MAPA_COTACAO!U10:U16)', fmt: '"R$ "#,##0.00', bg: 'FFF1F5F9' },
    { range: 'E4:G5', numCell: 'E5', labelCell: 'E4', label: 'SAVING TOTAL GERADO (R$)', valFormula: '=SUM(MAPA_COTACAO!W10:W16)', fmt: '"R$ "#,##0.00', bg: 'FFECFDF5', isGreen: true },
    { range: 'H4:J5', numCell: 'H5', labelCell: 'H4', label: '% SAVING MÉDIO', valFormula: '=(SUM(MAPA_COTACAO!W10:W16)/(SUMPRODUCT(MAPA_COTACAO!E10:E16, MAPA_COTACAO!U10:U16)+SUM(MAPA_COTACAO!W10:W16)))', fmt: '0.0%', bg: 'FFF1F5F9' },
    { range: 'K4:M5', numCell: 'K5', labelCell: 'K4', label: 'FORNECEDOR LÍDER DE GANHOS', valText: 'JD Aço (57% itens)', fmt: '@', bg: 'FFF1F5F9' }
  ];

  db.getRow(4).height = 18;
  db.getRow(5).height = 32;

  kpis.forEach(k => {
    const lC = db.getCell(k.labelCell);
    lC.value = k.label;
    lC.font = fontKpiLabel;

    const nC = db.getCell(k.numCell);
    if (k.valFormula) {
      nC.value = { formula: k.valFormula.replace('=', '') };
    } else {
      nC.value = k.valText;
    }
    nC.font = k.isGreen ? { ...fontKpiNum, color: { argb: EMERALD_DARK } } : fontKpiNum;
    if (k.fmt) nC.numFmt = k.fmt;
  });

  // Tabela Comparativa Resumo por Fornecedor (B8:G12)
  db.mergeCells('B8:G8');
  const compTitle = db.getCell('B8');
  compTitle.value = 'DESEMPENHO POR FORNECEDOR PARTICIPANTE';
  compTitle.font = fontBold;
  compTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY_LIGHT } };
  db.getRow(8).height = 24;

  const compHeaders = ['Fornecedor', 'Itens Vencidos', 'Prazo Médio (dias)', 'Participação (%)', 'Status Homologação'];
  const compCols = ['B', 'C', 'D', 'E', 'F'];
  compHeaders.forEach((ch, i) => {
    const c = db.getCell(`${compCols[i]}9`);
    c.value = ch;
    c.font = fontHeader;
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY_MID } };
    c.alignment = { horizontal: 'center' };
  });

  const fornData = [
    { nome: 'JD Aço', itens: 4, prazo: 8.5, part: 0.571, status: 'HOMOLOGADO A' },
    { nome: 'Gerdau Comercial', itens: 1, prazo: 11.0, part: 0.143, status: 'HOMOLOGADO A' },
    { nome: 'ArcelorMittal', itens: 2, prazo: 7.2, part: 0.286, status: 'HOMOLOGADO A' }
  ];

  fornData.forEach((f, idx) => {
    const r = 10 + idx;
    db.getRow(r).height = 20;
    db.getCell(`B${r}`).value = f.nome;
    db.getCell(`C${r}`).value = f.itens;
    db.getCell(`D${r}`).value = f.prazo;
    db.getCell(`E${r}`).value = f.part;
    db.getCell(`F${r}`).value = f.status;

    db.getCell(`C${r}`).numFmt = '#,##0';
    db.getCell(`D${r}`).numFmt = '0.0';
    db.getCell(`E${r}`).numFmt = '0.0%';

    compCols.forEach(col => {
      const cell = db.getCell(`${col}${r}`);
      cell.border = thinBorder;
      cell.font = fontRegular;
    });
  });

  // -------------------------------------------------------------
  // ABA 3: LOG_AUDITORIA (Trilha de Governança)
  // -------------------------------------------------------------
  const logWs = workbook.addWorksheet('LOG_AUDITORIA', {
    views: [{ showGridLines: true }]
  });

  logWs.mergeCells('A1:F1');
  const logTitle = logWs.getCell('A1');
  logTitle.value = 'SABERX • TRILHA DE AUDITORIA E LOGS DE TRANSAÇÃO (SOX / COMPLIANCE)';
  logTitle.font = fontTitle;
  logTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY_DARK } };
  logWs.getRow(1).height = 32;

  const logCols = [
    { c: 'A', name: 'Timestamp', w: 22 },
    { c: 'B', name: 'Usuário Windows', w: 20 },
    { c: 'C', name: 'Cotação ID', w: 16 },
    { c: 'D', name: 'Ação Registrada', w: 25 },
    { c: 'E', name: 'Valor Total (R$)', w: 18 },
    { c: 'F', name: 'Alçada Requerida', w: 22 }
  ];

  logWs.getRow(3).height = 24;
  logCols.forEach(lc => {
    logWs.getColumn(lc.c).width = lc.w;
    const cell = logWs.getCell(`${lc.c}3`);
    cell.value = lc.name;
    cell.font = fontHeader;
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY_MID } };
    cell.alignment = { horizontal: 'center' };
  });

  // Amostras de log
  const auditEntries = [
    { ts: '25/09/2026 10:15:32', user: 'carlos.ramos', id: 'COT-2026-0842', act: 'CRIAÇÃO DE COTAÇÃO', val: 0, alc: 'Comprador Pleno' },
    { ts: '25/09/2026 11:42:10', user: 'carlos.ramos', id: 'COT-2026-0842', act: 'PREENCHIMENTO DE PREÇOS', val: 58240.00, alc: 'Nível 3 (Diretoria)' },
    { ts: '25/09/2026 13:00:04', user: 'diretoria.operacoes', id: 'COT-2026-0842', act: 'APROVAÇÃO & EXPORTAÇÃO', val: 58240.00, alc: 'Aprovado por Diretoria' }
  ];

  auditEntries.forEach((ae, idx) => {
    const r = 4 + idx;
    logWs.getRow(r).height = 20;
    logWs.getCell(`A${r}`).value = ae.ts;
    logWs.getCell(`B${r}`).value = ae.user;
    logWs.getCell(`C${r}`).value = ae.id;
    logWs.getCell(`D${r}`).value = ae.act;
    logWs.getCell(`E${r}`).value = ae.val;
    logWs.getCell(`E${r}`).numFmt = '"R$ "#,##0.00';
    logWs.getCell(`F${r}`).value = ae.alc;

    ['A', 'B', 'C', 'D', 'E', 'F'].forEach(c => {
      const cell = logWs.getCell(`${c}${r}`);
      cell.border = thinBorder;
      cell.font = fontRegular;
    });
  });

  // -------------------------------------------------------------
  // SALVAR ARQUIVO LOCALMENTE E NO DESKTOP
  // -------------------------------------------------------------
  const filename = 'SABERX - MAPA DE COTACAO E COMPARATIVO DE PRECOS.xlsx';
  const localPath = path.resolve('c:/Users/Loja Strong/Desktop/saberx', filename);
  const desktopPath = path.resolve('c:/Users/Loja Strong/Desktop', filename);

  await workbook.xlsx.writeFile(localPath);
  try {
    fs.copyFileSync(localPath, desktopPath);
  } catch (e) {
    console.error('Erro ao copiar para Desktop:', e);
  }

  console.log(`Sucesso! Arquivo gerado em:\n1. ${localPath}\n2. ${desktopPath}`);
}

generateSaberXWorkbook().catch(err => {
  console.error('Erro na geração da planilha:', err);
  process.exit(1);
});
