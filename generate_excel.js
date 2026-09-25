import ExcelJS from 'exceljs';
import path from 'path';
import fs from 'fs';

async function generateExecutiveSaberXWorkbook() {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'SaberX Enterprise Solution';
  workbook.lastModifiedBy = 'Arquiteto de Soluções SaberX';
  workbook.created = new Date();
  workbook.modified = new Date();

  // -------------------------------------------------------------
  // CORES E PALETA CORPORATIVA DE ALTA MATURIDADE
  // -------------------------------------------------------------
  const C_NAVY_DARK = 'FF0F172A';     // Azul Marinho Profundo (Slate 900)
  const C_NAVY_CARD = 'FF1E293B';     // Azul Slate 800
  const C_BLUE_ACCENT = 'FF2563EB';   // Azul Corporativo Royal
  const C_WHITE = 'FFFFFFFF';
  const C_BORDER = 'FFE2E8F0';        // Borda suave cinza
  const C_BORDER_DARK = 'FF94A3B8';
  
  // Cores por Fornecedor (Diferenciação clara para o comprador e vendedor)
  const C_SUP1_HEAD = 'FF1D4ED8';     // Azul JD Aço
  const C_SUP1_LIGHT = 'FFEFF6FF';    // Fundo suave de inputs JD Aço
  
  const C_SUP2_HEAD = 'FF0F766E';     // Verde Petróleo Gerdau
  const C_SUP2_LIGHT = 'FFF0FDFA';    // Fundo suave Gerdau
  
  const C_SUP3_HEAD = 'FF6D28D9';     // Roxo Imperial Arcelor
  const C_SUP3_LIGHT = 'FFF5F3FF';    // Fundo suave Arcelor

  // Decisão e TCO
  const C_DECISION_HEAD = 'FF065F46'; // Verde Floresta Decisão
  const C_DECISION_LIGHT = 'FFECFDF5';
  const C_WINNER_BG = 'FFDCFCE7';     // Destaque do vencedor
  const C_WINNER_TXT = 'FF14532D';

  // Fontes padronizadas
  const fontMainTitle = { name: 'Segoe UI', size: 14, bold: true, color: { argb: C_WHITE } };
  const fontCardHeader = { name: 'Segoe UI', size: 9, bold: true, color: { argb: 'FF94A3B8' } };
  const fontCardValue = { name: 'Segoe UI', size: 11, bold: true, color: { argb: C_WHITE } };
  const fontCardValueDark = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF0F172A' } };
  
  const fontSectionHeader = { name: 'Segoe UI', size: 10, bold: true, color: { argb: C_WHITE } };
  const fontColumnHeader = { name: 'Segoe UI', size: 9, bold: true, color: { argb: C_WHITE } };
  const fontDataRegular = { name: 'Segoe UI', size: 9, color: { argb: 'FF1E293B' } };
  const fontDataBold = { name: 'Segoe UI', size: 9, bold: true, color: { argb: 'FF0F172A' } };
  const fontWinner = { name: 'Segoe UI', size: 9, bold: true, color: { argb: C_WINNER_TXT } };

  const borderThin = {
    top: { style: 'thin', color: { argb: C_BORDER } },
    left: { style: 'thin', color: { argb: C_BORDER } },
    bottom: { style: 'thin', color: { argb: C_BORDER } },
    right: { style: 'thin', color: { argb: C_BORDER } }
  };

  const borderThickBottom = {
    top: { style: 'thin', color: { argb: C_BORDER } },
    left: { style: 'thin', color: { argb: C_BORDER } },
    bottom: { style: 'medium', color: { argb: C_NAVY_DARK } },
    right: { style: 'thin', color: { argb: C_BORDER } }
  };

  // -------------------------------------------------------------
  // ABA 1: MAPA_COTACAO
  // -------------------------------------------------------------
  const ws = workbook.addWorksheet('MAPA_COTACAO', {
    views: [{ showGridLines: true, state: 'frozen', xSplit: 4, ySplit: 11 }]
  });

  // 1. BANNER PRINCIPAL (A1:X1)
  ws.mergeCells('A1:X1');
  const banner = ws.getCell('A1');
  banner.value = '   SABERX • SISTEMA INTEGRADO DE COTAÇÃO, TCO & COMPARATIVO DE PREÇOS';
  banner.font = fontMainTitle;
  banner.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C_NAVY_DARK } };
  banner.alignment = { vertical: 'middle', horizontal: 'left' };
  ws.getRow(1).height = 40;

  // 2. CARDS DE METADADOS & KPI NO TOPO (Linhas 3 a 7)
  // Card 1: Identificação da Cotação (A3:E7)
  ws.mergeCells('A3:E3');
  ws.getCell('A3').value = 'DADOS DA SOLICITAÇÃO & ENGENHARIA';
  ws.getCell('A3').font = fontSectionHeader;
  ws.getCell('A3').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C_NAVY_CARD } };
  ws.getCell('A3').alignment = { vertical: 'middle', horizontal: 'center' };

  const metaFields1 = [
    { label: 'Número Cotação:', val: 'COT-IMP-2026-867', r: 4 },
    { label: 'Projeto:', val: 'Mapa Cotacao Plataforma Acesso - Aco Carbono ATUALIZADO', r: 5 },
    { label: 'Responsável:', val: 'Usuário Google Corporativo (Comprador Técnico)', r: 6 },
    { label: 'Data Abertura:', val: '25/09/2026', r: 7 }
  ];

  metaFields1.forEach(f => {
    ws.mergeCells(`A${f.r}:B${f.r}`);
    ws.mergeCells(`C${f.r}:E${f.r}`);
    const lbl = ws.getCell(`A${f.r}`);
    lbl.value = f.label;
    lbl.font = fontCardValueDark;
    lbl.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
    lbl.border = borderThin;

    const val = ws.getCell(`C${f.r}`);
    val.value = f.val;
    val.font = fontDataRegular;
    val.border = borderThin;
  });

  // Card 2: Status & Governança (F3:L7)
  ws.mergeCells('F3:L3');
  ws.getCell('F3').value = 'STATUS DO PROCESSO & GOVERNANÇA DE COMPRAS';
  ws.getCell('F3').font = fontSectionHeader;
  ws.getCell('F3').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C_NAVY_CARD } };
  ws.getCell('F3').alignment = { vertical: 'middle', horizontal: 'center' };

  const metaFields2 = [
    { label: 'Status Atual:', val: 'EM COTAÇÃO / ANÁLISE', r: 4, isStatus: true },
    { label: 'Alçada Requerida:', val: 'Nível 2 (Gerência de Suprimentos)', r: 5 },
    { label: 'Condição Padrão:', val: '28 DDL - Posto Obra', r: 6 },
    { label: 'Budget Teto Obra:', val: 12500.00, r: 7, isCurrency: true }
  ];

  metaFields2.forEach(f => {
    ws.mergeCells(`F${f.r}:H${f.r}`);
    ws.mergeCells(`I${f.r}:L${f.r}`);
    const lbl = ws.getCell(`F${f.r}`);
    lbl.value = f.label;
    lbl.font = fontCardValueDark;
    lbl.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
    lbl.border = borderThin;

    const val = ws.getCell(`I${f.r}`);
    val.value = f.val;
    if (f.isStatus) {
      val.font = { ...fontDataBold, color: { argb: 'FFD97706' } };
      val.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } };
    } else if (f.isCurrency) {
      val.font = fontDataBold;
      val.numFmt = '"R$ "#,##0.00';
    } else {
      val.font = fontDataRegular;
    }
    val.border = borderThin;
  });

  // Card 3: Indicadores Rápidos de Negociação (M3:X7)
  ws.mergeCells('M3:X3');
  ws.getCell('M3').value = 'RESUMO FINANCEIRO DA COTAÇÃO (RECALCULA COM FILTROS)';
  ws.getCell('M3').font = fontSectionHeader;
  ws.getCell('M3').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C_DECISION_HEAD } };
  ws.getCell('M3').alignment = { vertical: 'middle', horizontal: 'center' };

  ws.mergeCells('M4:P5');
  const cKpi1 = ws.getCell('M4');
  cKpi1.value = 'TOTAL GASTO HOMOLOGADO';
  cKpi1.font = fontCardHeader;
  cKpi1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
  cKpi1.alignment = { vertical: 'top', horizontal: 'center' };

  ws.mergeCells('M6:P7');
  const vKpi1 = ws.getCell('M6');
  vKpi1.value = { formula: 'SUBTOTAL(109, V12:V14)' };
  vKpi1.font = { name: 'Segoe UI', size: 14, bold: true, color: { argb: 'FF0F172A' } };
  vKpi1.numFmt = '"R$ "#,##0.00';
  vKpi1.alignment = { vertical: 'middle', horizontal: 'center' };
  vKpi1.border = borderThin;

  ws.mergeCells('Q4:T5');
  const cKpi2 = ws.getCell('Q4');
  cKpi2.value = 'SAVING OBTIDO (ECONOMIA)';
  cKpi2.font = fontCardHeader;
  cKpi2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
  cKpi2.alignment = { vertical: 'top', horizontal: 'center' };

  ws.mergeCells('Q6:T7');
  const vKpi2 = ws.getCell('Q6');
  vKpi2.value = { formula: 'SUBTOTAL(109, X12:X14)' };
  vKpi2.font = { name: 'Segoe UI', size: 14, bold: true, color: { argb: C_DECISION_HEAD } };
  vKpi2.numFmt = '"R$ "#,##0.00';
  vKpi2.alignment = { vertical: 'middle', horizontal: 'center' };
  vKpi2.border = borderThin;

  ws.mergeCells('U4:X5');
  const cKpi3 = ws.getCell('U4');
  cKpi3.value = '% EFICIÊNCIA SAVING';
  cKpi3.font = fontCardHeader;
  cKpi3.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
  cKpi3.alignment = { vertical: 'top', horizontal: 'center' };

  ws.mergeCells('U6:X7');
  const vKpi3 = ws.getCell('U6');
  vKpi3.value = { formula: 'Q6/(M6+Q6)' };
  vKpi3.font = { name: 'Segoe UI', size: 14, bold: true, color: { argb: C_DECISION_HEAD } };
  vKpi3.numFmt = '0.0%';
  vKpi3.alignment = { vertical: 'middle', horizontal: 'center' };
  vKpi3.border = borderThin;

  // Linha 8: Legenda para Vendedores e Compradores
  ws.getRow(8).height = 24;
  ws.mergeCells('A8:X8');
  const guide = ws.getCell('A8');
  guide.value = '   💡 GUIA OPERACIONAL:  [Colunas F até T]: ÁREA DE PREENCHIMENTO DOS FORNECEDORES/VENDEDORES (Preço, Frete, Imposto e Prazo)  |  [Colunas U até X]: MOTOR AUTOMÁTICO DE DECISÃO & TCO (EXCLUSIVO COMPRADOR)';
  guide.font = { name: 'Segoe UI', size: 8.5, bold: true, color: { argb: 'FF1E3A8A' } };
  guide.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDBEAFE' } };
  guide.alignment = { vertical: 'middle', horizontal: 'left' };

  // Linha 9 em branco (respiro)
  ws.getRow(9).height = 8;

  // -------------------------------------------------------------
  // LINHA 10 & 11: CABEÇALHOS EM DOIS NÍVEIS (SUPER-ORGANIZADO)
  // -------------------------------------------------------------
  ws.getRow(10).height = 24;
  ws.getRow(11).height = 26;

  // Bloco 1: Itens (A10:E10)
  ws.mergeCells('A10:E10');
  ws.getCell('A10').value = '1. ESPECIFICAÇÃO DOS MATERIAIS (COMPRADOR)';
  ws.getCell('A10').font = fontSectionHeader;
  ws.getCell('A10').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C_NAVY_DARK } };
  ws.getCell('A10').alignment = { vertical: 'middle', horizontal: 'center' };

  // Bloco 2: Fornecedor A - JD Aço (F10:J10)
  ws.mergeCells('F10:J10');
  ws.getCell('F10').value = '2. FORNECEDOR A: JD AÇO';
  ws.getCell('F10').font = fontSectionHeader;
  ws.getCell('F10').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C_SUP1_HEAD } };
  ws.getCell('F10').alignment = { vertical: 'middle', horizontal: 'center' };

  // Bloco 3: Fornecedor B - GERDAU (K10:O10)
  ws.mergeCells('K10:O10');
  ws.getCell('K10').value = '3. FORNECEDOR B: GERDAU COMERCIAL';
  ws.getCell('K10').font = fontSectionHeader;
  ws.getCell('K10').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C_SUP2_HEAD } };
  ws.getCell('K10').alignment = { vertical: 'middle', horizontal: 'center' };

  // Bloco 4: Fornecedor C - ARCELORMITTAL (P10:T10)
  ws.mergeCells('P10:T10');
  ws.getCell('P10').value = '4. FORNECEDOR C: ARCELORMITTAL';
  ws.getCell('P10').font = fontSectionHeader;
  ws.getCell('P10').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C_SUP3_HEAD } };
  ws.getCell('P10').alignment = { vertical: 'middle', horizontal: 'center' };

  // Bloco 5: Comparativo e Decisão TCO (U10:X10)
  ws.mergeCells('U10:X10');
  ws.getCell('U10').value = '5. DECISÃO DE COMPRAS & SAVING';
  ws.getCell('U10').font = fontSectionHeader;
  ws.getCell('U10').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C_DECISION_HEAD } };
  ws.getCell('U10').alignment = { vertical: 'middle', horizontal: 'center' };

  // Colunas Individuais na Linha 11
  const cols = [
    { c: 'A', name: 'Item', w: 7, bg: C_NAVY_DARK },
    { c: 'B', name: 'Código MPR', w: 26, bg: C_NAVY_DARK },
    { c: 'C', name: 'Descrição Detalhada do Material', w: 46, bg: C_NAVY_DARK },
    { c: 'D', name: 'Qtd. Barras', w: 13, bg: C_NAVY_DARK },
    { c: 'E', name: 'Peso Total (kg)', w: 15, bg: C_NAVY_DARK },

    // JD Aço
    { c: 'F', name: 'Preço/kg (R$)', w: 14, bg: 'FF2563EB' },
    { c: 'G', name: 'Frete (R$)', w: 12, bg: 'FF2563EB' },
    { c: 'H', name: 'Imposto (%)', w: 12, bg: 'FF2563EB' },
    { c: 'I', name: 'Prazo (dias)', w: 12, bg: 'FF2563EB' },
    { c: 'J', name: 'TCO Total (R$)', w: 16, bg: 'FF1E40AF' },

    // Gerdau
    { c: 'K', name: 'Preço/kg (R$)', w: 14, bg: 'FF0D9488' },
    { c: 'L', name: 'Frete (R$)', w: 12, bg: 'FF0D9488' },
    { c: 'M', name: 'Imposto (%)', w: 12, bg: 'FF0D9488' },
    { c: 'N', name: 'Prazo (dias)', w: 12, bg: 'FF0D9488' },
    { c: 'O', name: 'TCO Total (R$)', w: 16, bg: 'FF115E59' },

    // ArcelorMittal
    { c: 'P', name: 'Preço/kg (R$)', w: 14, bg: 'FF7C3AED' },
    { c: 'Q', name: 'Frete (R$)', w: 12, bg: 'FF7C3AED' },
    { c: 'R', name: 'Imposto (%)', w: 12, bg: 'FF7C3AED' },
    { c: 'S', name: 'Prazo (dias)', w: 12, bg: 'FF7C3AED' },
    { c: 'T', name: 'TCO Total (R$)', w: 16, bg: 'FF5B21B6' },

    // Decisão
    { c: 'U', name: 'Fornecedor Vencedor', w: 22, bg: C_DECISION_HEAD },
    { c: 'V', name: 'Menor TCO (R$)', w: 16, bg: C_DECISION_HEAD },
    { c: 'W', name: 'Pior Cotação (R$)', w: 16, bg: 'FF475569' },
    { c: 'X', name: 'Saving Gerado (R$)', w: 18, bg: C_DECISION_HEAD }
  ];

  cols.forEach(col => {
    ws.getColumn(col.c).width = col.w;
    const cell = ws.getCell(`${col.c}11`);
    cell.value = col.name;
    cell.font = fontColumnHeader;
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: col.bg } };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = borderThin;
  });

  // -------------------------------------------------------------
  // DADOS DA COTAÇÃO (EXATOS DO SCREENSHOT DO USUÁRIO)
  // -------------------------------------------------------------
  const items = [
    {
      item: 1,
      mpr: 'MPR-CAI-1500-0188-1020',
      desc: 'CANTONEIRA ABAS IGUAIS 1.1/2" x 3/16" - AISI 1020',
      barras: 26.94,
      peso: 451.71, // 26.94 barras * ~16.76 kg
      jdP: 7.39, jdF: 50.0, jdI: 0.12, jdD: 8,
      gdP: 7.55, gdF: 40.0, gdI: 0.12, gdD: 12,
      arP: 7.48, arF: 60.0, arI: 0.12, arD: 6
    },
    {
      item: 2,
      mpr: 'MPR-CAI-2000-0188-1020',
      desc: 'CANTONEIRA ABAS IGUAIS 2" x 3/16" - AISI 1020',
      barras: 30.90,
      peso: 704.52, // 30.90 barras * ~22.8 kg
      jdP: 7.42, jdF: 70.0, jdI: 0.12, jdD: 10,
      gdP: 7.38, gdF: 65.0, gdI: 0.12, gdD: 15,
      arP: 7.45, arF: 75.0, arI: 0.12, arD: 7
    },
    {
      item: 3,
      mpr: 'MPR-TIR-1000-0400-0048-1020',
      desc: 'TUBO INDUSTRIAL RETANGULAR 100,00 X 40,00 X 4,75',
      barras: 10.00,
      peso: 600.00, // 10 barras * 60 kg
      jdP: 7.95, jdF: 60.0, jdI: 0.12, jdD: 9,
      gdP: 8.10, gdF: 50.0, gdI: 0.12, gdD: 14,
      arP: 7.89, arF: 80.0, arI: 0.12, arD: 8
    }
  ];

  items.forEach((it, idx) => {
    const r = 12 + idx;
    ws.getRow(r).height = 24;

    // 1. Dados Básicos do Item
    ws.getCell(`A${r}`).value = it.item;
    ws.getCell(`B${r}`).value = it.mpr;
    ws.getCell(`C${r}`).value = it.desc;
    ws.getCell(`D${r}`).value = it.barras;
    ws.getCell(`E${r}`).value = it.peso;

    // 2. JD Aço (Inputs Vendedor)
    ws.getCell(`F${r}`).value = it.jdP;
    ws.getCell(`G${r}`).value = it.jdF;
    ws.getCell(`H${r}`).value = it.jdI;
    ws.getCell(`I${r}`).value = it.jdD;
    // TCO JD Aço = (Preço * Peso * (1 + Imposto)) + Frete
    ws.getCell(`J${r}`).value = { formula: `(F${r}*E${r}*(1+H${r}))+G${r}` };

    // 3. Gerdau (Inputs Vendedor)
    ws.getCell(`K${r}`).value = it.gdP;
    ws.getCell(`L${r}`).value = it.gdF;
    ws.getCell(`M${r}`).value = it.gdI;
    ws.getCell(`N${r}`).value = it.gdD;
    // TCO Gerdau
    ws.getCell(`O${r}`).value = { formula: `(K${r}*E${r}*(1+M${r}))+L${r}` };

    // 4. ArcelorMittal (Inputs Vendedor)
    ws.getCell(`P${r}`).value = it.arP;
    ws.getCell(`Q${r}`).value = it.arF;
    ws.getCell(`R${r}`).value = it.arI;
    ws.getCell(`S${r}`).value = it.arD;
    // TCO Arcelor
    ws.getCell(`T${r}`).value = { formula: `(P${r}*E${r}*(1+R${r}))+Q${r}` };

    // 5. Decisão de Compras (Comprador)
    // Menor TCO
    ws.getCell(`V${r}`).value = { formula: `MIN(J${r}, O${r}, T${r})` };
    // Fornecedor Vencedor Dinâmico
    ws.getCell(`U${r}`).value = {
      formula: `IF(V${r}=J${r}, "JD Aço", IF(V${r}=O${r}, "Gerdau Comercial", IF(V${r}=T${r}, "ArcelorMittal", "N/A")))`
    };
    // Pior Cotação
    ws.getCell(`W${r}`).value = { formula: `MAX(J${r}, O${r}, T${r})` };
    // Saving Gerado
    ws.getCell(`X${r}`).value = { formula: `W${r}-V${r}` };

    // Formatações Numéricas
    ws.getCell(`A${r}`).numFmt = '#,##0';
    ws.getCell(`D${r}`).numFmt = '#,##0.00';
    ws.getCell(`E${r}`).numFmt = '#,##0.00 "kg"';

    ['F', 'G', 'K', 'L', 'P', 'Q'].forEach(c => {
      ws.getCell(`${c}${r}`).numFmt = '"R$ "#,##0.00';
    });
    ['H', 'M', 'R'].forEach(c => {
      ws.getCell(`${c}${r}`).numFmt = '0.0%';
    });
    ['I', 'N', 'S'].forEach(c => {
      ws.getCell(`${c}${r}`).numFmt = '0" d"';
    });
    ['J', 'O', 'T', 'V', 'W', 'X'].forEach(c => {
      ws.getCell(`${c}${r}`).numFmt = '"R$ "#,##0.00';
    });

    // Estilos de Célula e Cores por Seção
    cols.forEach(col => {
      const cell = ws.getCell(`${col.c}${r}`);
      cell.border = borderThin;
      cell.font = fontDataRegular;

      // Inputs de Fornecedores recebem fundo sutil indicando área de digitação
      if (['F', 'G', 'H', 'I'].includes(col.c)) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C_SUP1_LIGHT } };
      if (['K', 'L', 'M', 'N'].includes(col.c)) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C_SUP2_LIGHT } };
      if (['P', 'Q', 'R', 'S'].includes(col.c)) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C_SUP3_LIGHT } };

      // Colunas de TCO
      if (['J', 'O', 'T'].includes(col.c)) {
        cell.font = fontDataBold;
      }

      // Coluna do Vencedor e Menor TCO recebem destaque verde institucional
      if (col.c === 'U' || col.c === 'V') {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C_WINNER_BG } };
        cell.font = fontWinner;
      }
      if (col.c === 'X') {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C_DECISION_LIGHT } };
        cell.font = { ...fontDataBold, color: { argb: C_DECISION_HEAD } };
      }

      // Alinhamentos
      if (['A', 'I', 'N', 'S', 'U'].includes(col.c)) cell.alignment = { vertical: 'middle', horizontal: 'center' };
      else if (['B', 'C'].includes(col.c)) cell.alignment = { vertical: 'middle', horizontal: 'left' };
      else cell.alignment = { vertical: 'middle', horizontal: 'right' };
    });
  });

  // -------------------------------------------------------------
  // LINHA 15: TOTALIZADOR GERAL DINÂMICO =SUBTOTAL(109, ...)
  // -------------------------------------------------------------
  const rTot = 15;
  ws.getRow(rTot).height = 26;

  ws.mergeCells(`A${rTot}:C${rTot}`);
  const lblTot = ws.getCell(`A${rTot}`);
  lblTot.value = 'TOTAIS CONSOLIDADOS (RECALCULA AO FILTRAR):';
  lblTot.font = fontDataBold;
  lblTot.alignment = { vertical: 'middle', horizontal: 'right' };
  lblTot.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
  lblTot.border = borderThickBottom;

  ws.getCell(`D${rTot}`).value = { formula: `SUBTOTAL(109, D12:D14)` };
  ws.getCell(`D${rTot}`).numFmt = '#,##0.00';
  ws.getCell(`D${rTot}`).font = fontDataBold;
  ws.getCell(`D${rTot}`).border = borderThickBottom;

  ws.getCell(`E${rTot}`).value = { formula: `SUBTOTAL(109, E12:E14)` };
  ws.getCell(`E${rTot}`).numFmt = '#,##0.00 "kg"';
  ws.getCell(`E${rTot}`).font = fontDataBold;
  ws.getCell(`E${rTot}`).border = borderThickBottom;

  // Subtotais de cada TCO
  ws.getCell(`J${rTot}`).value = { formula: `SUBTOTAL(109, J12:J14)` };
  ws.getCell(`J${rTot}`).numFmt = '"R$ "#,##0.00';
  ws.getCell(`J${rTot}`).font = fontDataBold;
  ws.getCell(`J${rTot}`).border = borderThickBottom;

  ws.getCell(`O${rTot}`).value = { formula: `SUBTOTAL(109, O12:O14)` };
  ws.getCell(`O${rTot}`).numFmt = '"R$ "#,##0.00';
  ws.getCell(`O${rTot}`).font = fontDataBold;
  ws.getCell(`O${rTot}`).border = borderThickBottom;

  ws.getCell(`T${rTot}`).value = { formula: `SUBTOTAL(109, T12:T14)` };
  ws.getCell(`T${rTot}`).numFmt = '"R$ "#,##0.00';
  ws.getCell(`T${rTot}`).font = fontDataBold;
  ws.getCell(`T${rTot}`).border = borderThickBottom;

  // Subtotal Menor Preço e Saving
  ws.getCell(`V${rTot}`).value = { formula: `SUBTOTAL(109, V12:V14)` };
  ws.getCell(`V${rTot}`).numFmt = '"R$ "#,##0.00';
  ws.getCell(`V${rTot}`).font = { ...fontDataBold, color: { argb: C_WINNER_TXT } };
  ws.getCell(`V${rTot}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C_WINNER_BG } };
  ws.getCell(`V${rTot}`).border = borderThickBottom;

  ws.getCell(`X${rTot}`).value = { formula: `SUBTOTAL(109, X12:X14)` };
  ws.getCell(`X${rTot}`).numFmt = '"R$ "#,##0.00';
  ws.getCell(`X${rTot}`).font = { ...fontDataBold, color: { argb: C_DECISION_HEAD } };
  ws.getCell(`X${rTot}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C_DECISION_LIGHT } };
  ws.getCell(`X${rTot}`).border = borderThickBottom;

  // -------------------------------------------------------------
  // ABA 2: VISÃO EXCLUSIVA DO FORNECEDOR (ESPELHO DE COTAÇÃO)
  // -------------------------------------------------------------
  const wsVend = workbook.addWorksheet('COTAÇÃO_VENDEDOR', {
    views: [{ showGridLines: true }]
  });

  wsVend.mergeCells('A1:G1');
  const vendTitle = wsVend.getCell('A1');
  vendTitle.value = 'SABERX • FORMULÁRIO DE COTAÇÃO EXTERNA (PREENCHIMENTO PELO FORNECEDOR)';
  vendTitle.font = fontMainTitle;
  vendTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C_NAVY_DARK } };
  vendTitle.alignment = { vertical: 'middle', horizontal: 'left' };
  wsVend.getRow(1).height = 36;

  wsVend.mergeCells('A3:G3');
  const vendNotice = wsVend.getCell('A3');
  vendNotice.value = 'Prezado Fornecedor: Favor preencher unicamente as colunas em Amarelo (Preço Base, Frete, Alíquotas e Prazo de Entrega). Retornar esta planilha assinada.';
  vendNotice.font = { name: 'Segoe UI', size: 9.5, italic: true, color: { argb: 'FF1E293B' } };
  vendNotice.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } };
  vendNotice.alignment = { vertical: 'middle', horizontal: 'center' };
  wsVend.getRow(3).height = 24;

  const vendCols = [
    { c: 'A', name: 'Item', w: 8 },
    { c: 'B', name: 'Código MPR', w: 26 },
    { c: 'C', name: 'Descrição dos Materiais Requeridos', w: 48 },
    { c: 'D', name: 'Peso Estimado', w: 16 },
    { c: 'E', name: 'Seu Preço Unitário (R$/kg)', w: 24, isInput: true },
    { c: 'F', name: 'Frete Dedicado (R$)', w: 20, isInput: true },
    { c: 'G', name: 'Prazo Entrega (Dias)', w: 20, isInput: true }
  ];

  wsVend.getRow(5).height = 26;
  vendCols.forEach(vc => {
    wsVend.getColumn(vc.c).width = vc.w;
    const c = wsVend.getCell(`${vc.c}5`);
    c.value = vc.name;
    c.font = fontColumnHeader;
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: vc.isInput ? 'FFD97706' : C_NAVY_DARK } };
    c.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    c.border = borderThin;
  });

  items.forEach((it, idx) => {
    const r = 6 + idx;
    wsVend.getRow(r).height = 22;
    wsVend.getCell(`A${r}`).value = it.item;
    wsVend.getCell(`B${r}`).value = it.mpr;
    wsVend.getCell(`C${r}`).value = it.desc;
    wsVend.getCell(`D${r}`).value = it.peso;
    wsVend.getCell(`D${r}`).numFmt = '#,##0.00 "kg"';

    // Células abertas para o vendedor digitar
    wsVend.getCell(`E${r}`).value = it.jdP;
    wsVend.getCell(`E${r}`).numFmt = '"R$ "#,##0.00';
    wsVend.getCell(`E${r}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFBEB' } }; // Amarelo destaque

    wsVend.getCell(`F${r}`).value = it.jdF;
    wsVend.getCell(`F${r}`).numFmt = '"R$ "#,##0.00';
    wsVend.getCell(`F${r}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFBEB' } };

    wsVend.getCell(`G${r}`).value = it.jdD;
    wsVend.getCell(`G${r}`).numFmt = '0 "dias"';
    wsVend.getCell(`G${r}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFBEB' } };

    vendCols.forEach(vc => {
      wsVend.getCell(`${vc.c}${r}`).border = borderThin;
    });
  });

  // Salvar no Desktop e no projeto
  const filename = 'SABERX - MAPA DE COTACAO E COMPARATIVO DE PRECOS.xlsx';
  const localPath = path.resolve('c:/Users/Loja Strong/Desktop/saberx', filename);
  const desktopPath = path.resolve('c:/Users/Loja Strong/Desktop', filename);

  await workbook.xlsx.writeFile(localPath);
  try {
    fs.copyFileSync(localPath, desktopPath);
  } catch (e) {
    console.error('Erro ao copiar para Desktop:', e);
  }

  console.log('Planilha Corporativa Gerada com Sucesso com Dados Reais do Screenshot!');
}

generateExecutiveSaberXWorkbook().catch(err => {
  console.error(err);
  process.exit(1);
});
