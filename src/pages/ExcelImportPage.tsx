import React, { useState } from 'react';
import {
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  Download,
  Sparkles,
  Table,
  Check,
  RefreshCw,
  Sliders,
  Filter,
  Layers,
  Database,
  Info,
  AlertCircle,
  FileText,
  ChevronRight,
  Hash
} from 'lucide-react';
import { Card, CardHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import {
  analyzeExcelWorkbook,
  processMappedExcelRows,
  downloadOfficialQuotationTemplate,
  EnterpriseWorkbookAnalysis,
  EnterpriseImportRow,
  ColumnMapping,
  toColLetter
} from '../lib/excel-importer';
import { localStore, DEMO_ORG_ID } from '../lib/storage';
import { QuotationFull, QuotationItem, SupplierQuote } from '../types/quotation';
import { ActivePage } from '../components/layout/Sidebar';
import { useNotification } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';
import * as XLSX from 'xlsx';

interface ExcelImportPageProps {
  onNavigate: (page: ActivePage) => void;
  onSelectQuotation: (id: string) => void;
}

export const ExcelImportPage: React.FC<ExcelImportPageProps> = ({ onNavigate, onSelectQuotation }) => {
  const { user } = useAuth();
  const { success, error, info } = useNotification();

  // Wizard Step: 1 = Arquivo & Abas, 2 = Mapeamento & Tipagem, 3 = Governança & Conflitos, 4 = Homologação Pré-Voo
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [loading, setLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [analysis, setAnalysis] = useState<EnterpriseWorkbookAnalysis | null>(null);

  // Mapeamento de Colunas
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({
    mprCol: 1,
    descCol: 2,
    barsCol: 3,
    metersCol: 4,
    weightCol: -1,
    dimensionsCol: -1,
    materialCol: -1,
    categoryCol: -1,
    refPriceCol: -1
  });

  // Estratégia de Conflito de Produtos
  const [updateExistingProducts, setUpdateExistingProducts] = useState(true);

  // Linhas Processadas
  const [processedRows, setProcessedRows] = useState<EnterpriseImportRow[]>([]);
  const [previewFilter, setPreviewFilter] = useState<'all' | 'valid' | 'warnings' | 'errors' | 'new' | 'existing'>('all');

  const existingProducts = localStore.getProducts();
  const existingSuppliers = localStore.getSuppliers();

  // 1. Processa upload inicial ou alteração de aba / linha de cabeçalho
  const handleFileProcess = async (fileOrBuffer: File | ArrayBuffer, fileName?: string, targetSheet?: string, customHeaderRow?: number) => {
    try {
      setLoading(true);
      const res = await analyzeExcelWorkbook(fileOrBuffer, {
        fileName: fileName || (fileOrBuffer instanceof File ? fileOrBuffer.name : analysis?.fileName),
        targetSheetName: targetSheet,
        customHeaderRowIndex: customHeaderRow,
      });

      setAnalysis(res);
      setColumnMapping(res.suggestedMapping);
      success('Arquivo processado com sucesso', `${res.sheets.length} aba(s) e ${res.headers.length} colunas identificadas.`);
    } catch (err: any) {
      error('Erro ao processar planilha Excel', err.message || 'Verifique o formato do arquivo.');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (file: File) => {
    handleFileProcess(file);
    setStep(1);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  // Re-analisa se o usuário mudar de aba
  const handleSheetChange = (sheetName: string) => {
    if (!analysis?.arrayBuffer) return;
    handleFileProcess(analysis.arrayBuffer, analysis.fileName, sheetName, undefined);
  };

  // Re-analisa se o usuário mudar a linha do cabeçalho
  const handleHeaderRowChange = (headerRow: number) => {
    if (!analysis?.arrayBuffer) return;
    handleFileProcess(analysis.arrayBuffer, analysis.fileName, analysis.selectedSheetName, headerRow);
  };

  // Carrega planilha oficial corporativa modelo
  const handleLoadDemoTemplate = () => {
    const ws_data = [
      ['SABERX - MAPA DE COTAÇÃO E COMPARATIVO DE PREÇOS (TCO PROCUREMENT)'],
      ['Número da Cotação:', 'COT-2026-001'],
      ['Projeto:', 'Plataforma de Acesso Industrial - Aço Carbono'],
      ['Cliente Relacionado:', 'Metálicas Brasil S.A.'],
      ['Responsável:', 'Comprador Técnico'],
      ['Data:', '2026-09-23'],
      ['Status:', 'EM_COTACAO'],
      ['SUBTOTAL DINÂMICO (FILTRADO):'],
      [
        'Item',
        'Código MPR',
        'Descrição',
        'Qtd. Barras',
        'Qtd. Metros',
        'JD Aço (Preço Bruto R$)',
        'JD Aço (Frete Unit. R$)',
        'JD Aço (Alíquota Imposto %)',
        'JD Aço (Prazo Dias)',
        'JD Aço (TCO Total R$)',
        'Paulisteel (Preço Bruto R$)',
        'Paulisteel (Frete Unit. R$)',
        'Paulisteel (Alíquota Imposto %)',
        'Paulisteel (Prazo Dias)',
        'Paulisteel (TCO Total R$)',
        'Romeva Tubos (Preço Bruto R$)',
        'Romeva Tubos (Frete Unit. R$)',
        'Romeva Tubos (Alíquota Imposto %)',
        'Romeva Tubos (Prazo Dias)',
        'Romeva Tubos (TCO Total R$)',
        'Menor TCO (Vencedor R$)',
        'Fornecedor Vencedor',
        'Budget Unitário TCO (R$)',
        'Status do Item',
        'Saving Bruto (R$)',
        '% Saving'
      ],
      [
        1,
        'MPR-CAI-1500-0188-1020',
        'CANTONEIRA ABAS IGUAIS 1.1/2" x 3/16" - AISI 1020',
        26.94,
        161.64,
        7.39,
        45.0,
        0.12,
        10,
        3425.80,
        7.55,
        30.0,
        0.12,
        14,
        3470.15,
        7.65,
        50.0,
        0.12,
        12,
        3540.20,
        3425.80,
        'JD Aço',
        3700.00,
        'APROVADO',
        114.40,
        0.032
      ],
      [
        2,
        'MPR-CAI-2000-0188-1020',
        'CANTONEIRA ABAS IGUAIS 2" x 3/16" - AISI 1020',
        30.90,
        185.40,
        7.42,
        45.0,
        0.12,
        10,
        5380.20,
        7.30,
        35.0,
        0.12,
        15,
        5295.40,
        7.55,
        50.0,
        0.12,
        12,
        5510.80,
        5295.40,
        'Paulisteel',
        5600.00,
        'APROVADO',
        215.40,
        0.039
      ],
      [
        3,
        'MPR-TIR-1000-0400-0048-1020',
        'TUBO INDUSTRIAL RETANGULAR 100,00 X 40,00 X 4,75',
        10.00,
        60.00,
        7.95,
        60.0,
        0.12,
        10,
        1795.00,
        8.20,
        40.0,
        0.12,
        16,
        1840.00,
        7.75,
        55.0,
        0.12,
        11,
        1750.50,
        1750.50,
        'Romeva Tubos',
        1900.00,
        'APROVADO',
        89.50,
        0.048
      ]
    ];

    const ws = XLSX.utils.aoa_to_sheet(ws_data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'SABERX_MAPA_COTACAO');

    const dash_data = [
      ['SABERX - DASHBOARD EXECUTIVO DE SUPRIMENTOS (BI)'],
      [],
      ['INDICADOR EXECUTIVO (KPI)', 'VALOR', 'DESCRIÇÃO'],
      ['1. TOTAL GASTO (TCO CONTRATADO)', 10471.70, 'Custo Total de Propriedade vencedor acumulado'],
      ['2. TOTAL DE SAVING OBTIDO (R$)', 419.30, 'Economia monetária contra a pior proposta cotada'],
      ['3. % SAVING MÉDIO CORPORATIVO', '3.85%', 'Eficiência média nas negociações'],
      ['4. FORNECEDOR LÍDER', 'JD Aço', 'Parceiro com maior adjudicação']
    ];
    const wsDash = XLSX.utils.aoa_to_sheet(dash_data);
    XLSX.utils.book_append_sheet(wb, wsDash, 'DASHBOARD_SABERX');

    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const file = new File([blob], 'SaberX_Mapa_Cotacao_Padrao_Corporativo.xlsx', { type: blob.type });

    handleFileUpload(file);
  };

  // 2. Conclui Mapeamento e Avança para Resolução de Conflitos
  const handleProceedToValidation = () => {
    if (!analysis) return;
    const rows = processMappedExcelRows(analysis, columnMapping, existingProducts);
    setProcessedRows(rows);
    setStep(3);
  };

  // 3. Conclui Higienização e Avança para Homologação Pré-Voo
  const handleProceedToPreview = () => {
    setStep(4);
  };

  // 4. Confirmação Final da Importação e Inserção no Banco
  const handleFinalImport = () => {
    if (!analysis || processedRows.length === 0) return;

    let newProdsCount = 0;
    let updatedProdsCount = 0;

    // 1. Ingestão / Atualização dos produtos
    processedRows.forEach((row) => {
      const existing = existingProducts.find(
        (p) => p.codigo_mpr.trim().toUpperCase() === row.codigo_mpr.trim().toUpperCase()
      );

      if (existing) {
        if (updateExistingProducts) {
          localStore.saveProduct({
            ...existing,
            description: row.description || existing.description,
            dimensions: row.dimensions || existing.dimensions,
            material: row.material || existing.material,
            updated_at: new Date().toISOString()
          });
          updatedProdsCount++;
        }
      } else {
        localStore.saveProduct({
          id: `prod-imp-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          organization_id: DEMO_ORG_ID,
          codigo_mpr: row.codigo_mpr,
          description: row.description,
          category: 'Aço Carbono',
          dimensions: row.dimensions || 'Conforme especificação',
          material: row.material || 'AISI 1020',
          stock_unit: 'barra',
          purchase_unit: 'kg',
          weight_unit_kg: row.estimated_weight_kg && row.quantity_bars > 0 ? Number((row.estimated_weight_kg / row.quantity_bars).toFixed(2)) : 16.76,
          length_unit_meters: 6.0,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
        newProdsCount++;
      }
    });

    // 2. Geração da Cotação com os fornecedores
    const quotationId = `cot-imp-${Date.now()}`;
    const refreshedProducts = localStore.getProducts();

    const items: QuotationItem[] = processedRows.map((row, idx) => {
      const prod = refreshedProducts.find(
        (p) => p.codigo_mpr.trim().toUpperCase() === row.codigo_mpr.trim().toUpperCase()
      );

      return {
        id: `qitem-${quotationId}-${idx + 1}`,
        quotation_id: quotationId,
        product_id: prod?.id || `prod-${idx}`,
        item_order: idx + 1,
        quantity_bars: row.quantity_bars,
        quantity_meters: row.quantity_meters,
        estimated_weight_kg: row.estimated_weight_kg,
        created_at: new Date().toISOString(),
        product: prod
      };
    });

    const supplierQuotes: SupplierQuote[] = existingSuppliers.slice(0, 3).map((sup, sIdx) => {
      const sqId = `sq-${quotationId}-${sup.id}`;
      const sqItems = items.map((it, itIdx) => {
        const row = processedRows[itIdx];
        const quoteFound = row.supplierQuotes?.[sIdx];

        const qQty = quoteFound?.quotedQty ?? it.quantity_bars;
        const unitP = quoteFound?.unitPrice ?? 7.39;
        const pUnit = (quoteFound?.priceUnit as any) || 'kg';
        const calcTotal = quoteFound?.calculatedTotal ?? (it.estimated_weight_kg * 7.39);

        return {
          id: `sqi-${sqId}-${it.id}`,
          supplier_quote_id: sqId,
          quotation_item_id: it.id,
          quoted_quantity: qQty,
          weight_kg: quoteFound?.weightKg ?? it.estimated_weight_kg,
          unit_price: unitP,
          price_unit: pUnit,
          ipi_percent: quoteFound?.ipiPercent ?? 0,
          icms_percent: quoteFound?.icmsPercent ?? 18,
          calculated_total: calcTotal,
          validation_status: (qQty < it.quantity_bars ? 'QUANTIDADE_INSUFICIENTE' : 'VALIDA') as any,
          manual_exclude_from_lowest: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
      });

      const subtotal = sqItems.reduce((acc, i) => acc + i.calculated_total, 0);

      return {
        id: sqId,
        quotation_id: quotationId,
        supplier_id: sup.id,
        proposal_number: `IMP-${sup.trade_name?.substring(0, 4).toUpperCase() || 'PROP'}`,
        proposal_date: new Date().toISOString().split('T')[0],
        validity_days: 7,
        payment_terms: sup.payment_terms || '28 DDL',
        calculated_subtotal: subtotal,
        official_proposal_total: subtotal,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        supplier: sup,
        items: sqItems
      };
    });

    const newQuotation: QuotationFull = {
      id: quotationId,
      organization_id: DEMO_ORG_ID,
      quotation_number: analysis.metadata?.quotation_number || `COT-IMP-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
      project_name: analysis.metadata?.project_name || analysis.fileName.replace(/\.[^/.]+$/, '').replace(/_/g, ' '),
      related_client: analysis.metadata?.related_client || 'Metálicas Brasil S.A.',
      responsible_user_id: user?.id,
      responsible_user_name: analysis.metadata?.responsible_user_name || user?.full_name || 'Comprador Técnico',
      quotation_date: analysis.metadata?.quotation_date || new Date().toISOString().split('T')[0],
      notes: `Importado via Estação Corporativa SaberX (${processedRows.length} itens homologados)`,
      status: (analysis.metadata?.status as any) || 'EM_COTACAO',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      items,
      supplier_quotes: supplierQuotes
    };

    localStore.saveQuotation(newQuotation);
    localStore.logAudit({
      organization_id: DEMO_ORG_ID,
      user_id: user?.id,
      user_name: user?.full_name,
      action: 'IMPORTACAO_EXCEL_ENTERPRISE',
      entity: 'quotations',
      entity_id: quotationId,
      new_data: {
        file: analysis.fileName,
        sheet: analysis.selectedSheetName,
        totalItems: processedRows.length,
        newProducts: newProdsCount,
        updatedProducts: updatedProdsCount
      },
      reason: `Ingestão de mapa de cotação corporativo "${analysis.fileName}" com matriz TCO.`
    });

    success(
      'Mapa de cotação homologado e gerado!',
      `${newProdsCount} novos produtos cadastrados e ${updatedProdsCount} itens atualizados com sucesso.`
    );

    onSelectQuotation(quotationId);
    onNavigate('quotation-detail');
  };

  // Contadores de integridade
  const countTotal = processedRows.length;
  const countValid = processedRows.filter((r) => r.status === 'VALID').length;
  const countWarnings = processedRows.filter((r) => r.status === 'WARNING').length;
  const countErrors = processedRows.filter((r) => r.status === 'ERROR').length;
  const countNew = processedRows.filter((r) => !r.isExisting).length;
  const countExisting = processedRows.filter((r) => r.isExisting).length;

  const filteredPreviewRows = processedRows.filter((r) => {
    if (previewFilter === 'valid') return r.status === 'VALID';
    if (previewFilter === 'warnings') return r.status === 'WARNING';
    if (previewFilter === 'errors') return r.status === 'ERROR';
    if (previewFilter === 'new') return !r.isExisting;
    if (previewFilter === 'existing') return r.isExisting;
    return true;
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto font-sans">
      {/* Header Corporativo */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 font-mono text-[10px] font-bold border border-emerald-500/30">
              MÓDULO DE INGESTÃO
            </span>
            <span className="text-xs text-slate-400 font-mono">MAPA DE COTAÇÃO & TCO</span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2.5 mt-1">
            <UploadCloud className="w-6 h-6 text-emerald-400" />
            Estação de Importação de Mapas de Cotação
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Mecanismo corporativo de ingestão de matrizes de suprimentos, validação pré-voo de tipagem e higienização cadastral.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            icon={<Download className="w-4 h-4 text-blue-400" />}
            onClick={downloadOfficialQuotationTemplate}
          >
            Baixar Matriz Padrão (.xlsx)
          </Button>
        </div>
      </div>

      {/* Stepper Corporativo Técnico */}
      <div className="grid grid-cols-4 gap-2 text-xs font-semibold">
        {[
          { num: 1, title: 'Arquivo & Abas', desc: 'Ingestão e leitura' },
          { num: 2, title: 'Mapeamento & Tipos', desc: 'Inspeção de colunas' },
          { num: 3, title: 'Governança & Conflitos', desc: 'Resolução cadastral' },
          { num: 4, title: 'Homologação Pré-Voo', desc: 'Prévia de impacto' }
        ].map((s) => (
          <div
            key={s.num}
            className={`p-3 rounded-xl border text-left transition-all ${
              step === s.num
                ? 'bg-blue-600/15 border-blue-500 text-white shadow-lg shadow-blue-500/10'
                : step > s.num
                ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-400'
                : 'bg-slate-900/60 border-slate-800 text-slate-500'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase font-bold tracking-wider opacity-75">
                FASE 0{s.num}
              </span>
              {step > s.num && <Check className="w-3.5 h-3.5 text-emerald-400" />}
            </div>
            <div className="font-bold text-white mt-0.5 text-xs truncate">{s.title}</div>
            <div className="text-[10px] text-slate-400 truncate">{s.desc}</div>
          </div>
        ))}
      </div>

      {/* ETAPA 1: Ingestão de Arquivo & Multi-Aba */}
      {step === 1 && (
        <div className="space-y-4">
          <Card className="p-6">
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => document.getElementById('excel-file-input')?.click()}
              className={`border-2 border-dashed rounded-2xl p-10 text-center flex flex-col items-center justify-center cursor-pointer transition-all ${
                isDragging
                  ? 'border-emerald-500 bg-emerald-500/10'
                  : 'border-slate-700 hover:border-blue-500/70 bg-slate-950/60'
              }`}
            >
              <input
                id="excel-file-input"
                type="file"
                accept=".xlsx, .xls, .csv"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileUpload(e.target.files[0]);
                  }
                }}
              />
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-3 shadow-lg shadow-emerald-500/10">
                <FileSpreadsheet className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-white tracking-tight">
                {analysis ? 'Substituir arquivo de cotação (.xlsx, .xls)' : 'Arraste a planilha de cotação ou clique para selecionar'}
              </h3>
              <p className="text-xs text-slate-400 mt-1 max-w-md">
                Compatível com mapas de cotação industriais, tabelas TCO multi-fornecedores e planilhas de corte de aço.
              </p>
            </div>

            {/* Ingestão de Exemplo Rápido para Teste Rápido de Suprimentos */}
            <div className="mt-4 p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <FileText className="w-4 h-4 text-blue-400 shrink-0" />
                <span className="text-xs text-slate-300">
                  Carregar mapa de cotação siderúrgica oficial de referência (JD Aço, Paulisteel e Romeva).
                </span>
              </div>
              <Button variant="secondary" size="sm" onClick={handleLoadDemoTemplate}>
                Carregar Matriz Oficial
              </Button>
            </div>
          </Card>

          {/* Painel de Metadados e Seleção de Aba se o arquivo já foi lido */}
          {analysis && (
            <Card className="p-6 space-y-5 animate-fadeIn">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                <div>
                  <span className="text-[10px] font-mono font-bold text-emerald-400 uppercase tracking-wider">
                    ARQUIVO IDENTIFICADO
                  </span>
                  <h3 className="text-base font-bold text-white mt-0.5">{analysis.fileName}</h3>
                  <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                    <span>Tamanho: <strong className="text-slate-200">{(analysis.fileSize / 1024).toFixed(1)} KB</strong></span>
                    <span>•</span>
                    <span>Abas Encontradas: <strong className="text-slate-200">{analysis.sheets.length}</strong></span>
                  </div>
                </div>

                <Button variant="primary" onClick={() => setStep(2)}>
                  Avançar para Mapeamento <ArrowRight className="w-4 h-4 ml-1.5" />
                </Button>
              </div>

              {/* Seletor de Abas da Pasta de Trabalho */}
              <div>
                <label className="text-xs font-bold text-white flex items-center gap-1.5 mb-2">
                  <Layers className="w-4 h-4 text-blue-400" />
                  Selecione a Aba de Cotação da Pasta de Trabalho:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {analysis.sheets.map((sheet) => {
                    const isSelected = sheet.name === analysis.selectedSheetName;
                    return (
                      <button
                        key={sheet.name}
                        type="button"
                        onClick={() => handleSheetChange(sheet.name)}
                        className={`p-3 rounded-xl border text-left transition-all ${
                          isSelected
                            ? 'bg-blue-600/20 border-blue-500 text-white shadow-md'
                            : 'bg-slate-950 border-slate-800 hover:border-slate-700 text-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs truncate">{sheet.name}</span>
                          {isSelected && <span className="w-2 h-2 rounded-full bg-blue-400" />}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-1">
                          {sheet.rowCount} linhas × {sheet.columnCount} colunas
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Seletor de Linha do Cabeçalho */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Sliders className="w-4 h-4 text-amber-400" />
                    Linha de Cabeçalho da Tabela de Itens:
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Defina em qual linha da planilha começam os nomes das colunas (Código MPR, Descrição, Barras...).
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={analysis.headerRowIndex}
                    onChange={(e) => handleHeaderRowChange(parseInt(e.target.value))}
                    className="bg-slate-900 border border-slate-700 text-white rounded-lg px-3 py-1.5 text-xs font-bold"
                  >
                    {Array.from({ length: Math.min(20, analysis.rawRows.length) }, (_, i) => (
                      <option key={i} value={i}>
                        Linha {i + 1} {i === 8 ? '(Padrão Matriz)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* ETAPA 2: Mapeamento Técnico & Inspeção de Tipagem */}
      {step === 2 && analysis && (
        <Card className="p-6 space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <div>
              <span className="text-[10px] font-mono font-bold text-blue-400 uppercase tracking-wider">
                ETAPA 02 · MAPEAMENTO ESTRUTURAL
              </span>
              <h3 className="text-lg font-bold text-white mt-0.5">
                Inspeção de Tipos e Associação de Colunas
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Aba ativa: <strong className="text-white">{analysis.selectedSheetName}</strong> · Linha de cabeçalho: <strong className="text-white">{analysis.headerRowIndex + 1}</strong>
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setStep(1)}>
                <ArrowLeft className="w-4 h-4 mr-1" /> Voltar
              </Button>
              <Button variant="primary" size="sm" onClick={handleProceedToValidation}>
                Avançar para Conflitos <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>

          {/* Metadados Corporativos da Cotação (A1:B7) */}
          {analysis.metadata && (analysis.metadata.quotation_number || analysis.metadata.project_name) && (
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <span className="text-[11px] font-mono font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" /> Metadados Corporativos Capturados (A1:B7):
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div><span className="text-slate-500 block">Número da Cotação</span><strong className="text-white font-mono">{analysis.metadata.quotation_number || 'N/A'}</strong></div>
                <div><span className="text-slate-500 block">Projeto Industrial</span><strong className="text-white truncate block">{analysis.metadata.project_name || 'N/A'}</strong></div>
                <div><span className="text-slate-500 block">Cliente Corporativo</span><strong className="text-white truncate block">{analysis.metadata.related_client || 'N/A'}</strong></div>
                <div><span className="text-slate-500 block">Comprador Responsável</span><strong className="text-white truncate block">{analysis.metadata.responsible_user_name || 'N/A'}</strong></div>
              </div>
            </div>
          )}

          {/* Colunas do Sistema de Suprimentos */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider text-slate-400">
              1. Campos Obrigatórios do Cadastro de Suprimentos
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              {/* MPR */}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-white">Código MPR (Identificador Único) *</label>
                  <span className="px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 text-[9px] font-bold">Obrigatório</span>
                </div>
                <select
                  value={columnMapping.mprCol}
                  onChange={(e) => setColumnMapping({ ...columnMapping, mprCol: parseInt(e.target.value) })}
                  className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg p-2 font-mono text-xs"
                >
                  {analysis.headers.map((h, i) => (
                    <option key={i} value={i}>Coluna {toColLetter(i)}: {h || `(Sem cabeçalho)`}</option>
                  ))}
                </select>
              </div>

              {/* Descrição */}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-white">Descrição Técnica do Material *</label>
                  <span className="px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 text-[9px] font-bold">Obrigatório</span>
                </div>
                <select
                  value={columnMapping.descCol}
                  onChange={(e) => setColumnMapping({ ...columnMapping, descCol: parseInt(e.target.value) })}
                  className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg p-2 font-mono text-xs"
                >
                  {analysis.headers.map((h, i) => (
                    <option key={i} value={i}>Coluna {toColLetter(i)}: {h || `(Sem cabeçalho)`}</option>
                  ))}
                </select>
              </div>

              {/* Qtd Barras */}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-white">Demanda em Barras *</label>
                  <span className="px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 text-[9px] font-bold">Obrigatório</span>
                </div>
                <select
                  value={columnMapping.barsCol}
                  onChange={(e) => setColumnMapping({ ...columnMapping, barsCol: parseInt(e.target.value) })}
                  className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg p-2 font-mono text-xs"
                >
                  {analysis.headers.map((h, i) => (
                    <option key={i} value={i}>Coluna {toColLetter(i)}: {h || `(Sem cabeçalho)`}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Colunas Complementares */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider text-slate-400">
              2. Dimensões, Peso e Premissas Complementares
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              {/* Metragem */}
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <label className="font-semibold text-slate-300">Metragem Total (Metros)</label>
                <select
                  value={columnMapping.metersCol}
                  onChange={(e) => setColumnMapping({ ...columnMapping, metersCol: parseInt(e.target.value) })}
                  className="w-full bg-slate-900 border border-slate-700 text-slate-300 rounded-lg p-2 text-xs"
                >
                  <option value={-1}>Calcular automaticamente (Barras × 6.00m)</option>
                  {analysis.headers.map((h, i) => (
                    <option key={i} value={i}>Coluna {toColLetter(i)}: {h}</option>
                  ))}
                </select>
              </div>

              {/* Peso kg */}
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <label className="font-semibold text-slate-300">Peso Total / Unitário (kg)</label>
                <select
                  value={columnMapping.weightCol}
                  onChange={(e) => setColumnMapping({ ...columnMapping, weightCol: parseInt(e.target.value) })}
                  className="w-full bg-slate-900 border border-slate-700 text-slate-300 rounded-lg p-2 text-xs"
                >
                  <option value={-1}>Calcular pelo catálogo padrão (16.76 kg/barra)</option>
                  {analysis.headers.map((h, i) => (
                    <option key={i} value={i}>Coluna {toColLetter(i)}: {h}</option>
                  ))}
                </select>
              </div>

              {/* Bitola / Dimensões */}
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <label className="font-semibold text-slate-300">Dimensões / Bitola do Perfil</label>
                <select
                  value={columnMapping.dimensionsCol}
                  onChange={(e) => setColumnMapping({ ...columnMapping, dimensionsCol: parseInt(e.target.value) })}
                  className="w-full bg-slate-900 border border-slate-700 text-slate-300 rounded-lg p-2 text-xs"
                >
                  <option value={-1}>Extrair da descrição técnica</option>
                  {analysis.headers.map((h, i) => (
                    <option key={i} value={i}>Coluna {toColLetter(i)}: {h}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Grupos de Fornecedores Detectados */}
          {analysis.detectedSupplierGroups.length > 0 && (
            <div className="p-4 rounded-xl bg-blue-950/20 border border-blue-500/30 space-y-2">
              <span className="text-xs font-bold text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" /> Fornecedores e Matrizes TCO Detectadas na Planilha:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                {analysis.detectedSupplierGroups.map((g, idx) => (
                  <div key={idx} className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800">
                    <strong className="text-white block">{g.supplierName}</strong>
                    <span className="text-[11px] text-slate-400">
                      Coluna Preço: {toColLetter(g.priceCol)} {g.tcoCol ? `· TCO: ${toColLetter(g.tcoCol)}` : ''}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Grade Técnica de Inspeção de Tipos */}
          <div className="space-y-2 pt-2">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider text-slate-400">
              3. Relatório de Tipagem de Colunas Identificadas
            </h4>
            <div className="overflow-x-auto border border-slate-800 rounded-xl">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800">
                    <th className="py-2.5 px-3">Coluna</th>
                    <th className="py-2.5 px-3">Cabeçalho da Planilha</th>
                    <th className="py-2.5 px-3">Tipo Inferido</th>
                    <th className="py-2.5 px-3">Completude</th>
                    <th className="py-2.5 px-3">Amostras de Dados (Linhas Iniciais)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {analysis.columnTypes.slice(0, 15).map((col) => (
                    <tr key={col.index} className="hover:bg-slate-800/30">
                      <td className="py-2 px-3 font-mono font-bold text-blue-400">{col.letter}</td>
                      <td className="py-2 px-3 text-white font-medium truncate max-w-[200px]">{col.header}</td>
                      <td className="py-2 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          col.inferredType === 'NUMÉRICO' ? 'bg-emerald-500/20 text-emerald-300' :
                          col.inferredType === 'MOEDA' ? 'bg-amber-500/20 text-amber-300' :
                          col.inferredType === 'PERCENTUAL' ? 'bg-purple-500/20 text-purple-300' :
                          col.inferredType === 'VAZIO' ? 'bg-slate-800 text-slate-400' :
                          'bg-blue-500/20 text-blue-300'
                        }`}>
                          {col.inferredType}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-slate-400 font-mono text-[11px]">{col.completenessPercent}%</td>
                      <td className="py-2 px-3 text-slate-300 font-mono text-[11px] truncate max-w-[280px]">
                        {col.sampleValues.join(' | ') || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Card>
      )}

      {/* ETAPA 3: Governança Cadastral & Resolução de Conflitos */}
      {step === 3 && (
        <Card className="p-6 space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <div>
              <span className="text-[10px] font-mono font-bold text-amber-400 uppercase tracking-wider">
                ETAPA 03 · GOVERNANÇA E CONFLITOS
              </span>
              <h3 className="text-lg font-bold text-white mt-0.5">
                Resolução Cadastral de Produtos e Higienização
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Defina as regras de atualização de itens já cadastrados e confira os padrões de sanitização.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setStep(2)}>
                <ArrowLeft className="w-4 h-4 mr-1" /> Voltar ao Mapeamento
              </Button>
              <Button variant="primary" size="sm" onClick={handleProceedToPreview}>
                Homologar Pré-Voo <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>

          <div className="space-y-4">
            {/* Política de Sobrescrita */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-start justify-between gap-4">
              <div className="space-y-1">
                <h4 className="font-bold text-white text-sm">Atualizar dados dos produtos existentes (Upsert por Código MPR)</h4>
                <p className="text-xs text-slate-400">
                  Caso o código MPR já conste no catálogo da organização, as especificações técnicas, dimensões e materiais serão atualizados com os valores desta planilha.
                </p>
              </div>
              <input
                type="checkbox"
                checked={updateExistingProducts}
                onChange={(e) => setUpdateExistingProducts(e.target.checked)}
                className="w-5 h-5 rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-blue-500 cursor-pointer mt-0.5"
              />
            </div>

            {/* Checklist de Higienização */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2.5">
              <h4 className="font-bold text-white text-xs uppercase tracking-wider text-slate-400">
                Regras Ativas do Motor de Higienização Numérica:
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-slate-300">
                <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-900/60 border border-slate-800">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Conversão de vírgula decimal brasileira (ex: 451,71 $\rightarrow$ 451.71)</span>
                </div>
                <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-900/60 border border-slate-800">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Remoção automática de cifrão e caracteres monetários (R$)</span>
                </div>
                <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-900/60 border border-slate-800">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Cálculo padrão de metragem linear para perfis de 6,00 metros</span>
                </div>
                <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-900/60 border border-slate-800">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Sanitização contra injeção e caracteres não-imprimíveis</span>
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* ETAPA 4: Homologação Pré-Voo & Prévia Executiva */}
      {step === 4 && (
        <div className="space-y-4">
          {/* Card Resumo de Impacto */}
          <Card className="p-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <span className="text-[10px] font-mono font-bold text-emerald-400 uppercase tracking-wider">
                  HOMOLOGAÇÃO PRÉ-VOO CONCLUÍDA
                </span>
                <h3 className="text-lg font-bold text-white mt-0.5">{analysis?.fileName}</h3>
                <div className="flex flex-wrap gap-4 text-xs text-slate-300 mt-2">
                  <span>Total de Itens: <strong className="text-white font-mono">{countTotal}</strong></span>
                  <span>Íntegros: <strong className="text-emerald-400 font-mono">{countValid}</strong></span>
                  <span>Avisos: <strong className="text-amber-400 font-mono">{countWarnings}</strong></span>
                  <span>Novos Cadastros: <strong className="text-blue-400 font-mono">{countNew}</strong></span>
                  <span>Atualizações: <strong className="text-purple-400 font-mono">{countExisting}</strong></span>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <Button variant="outline" size="sm" onClick={() => setStep(3)}>
                  <ArrowLeft className="w-4 h-4 mr-1" /> Voltar
                </Button>
                <Button
                  variant="primary"
                  icon={<Check className="w-4 h-4" />}
                  onClick={handleFinalImport}
                >
                  Homologar & Inserir Cotação
                </Button>
              </div>
            </div>
          </Card>

          {/* Filtros da Tabela */}
          <div className="flex flex-wrap gap-2 text-xs">
            {[
              { id: 'all', label: `Todos os Itens (${countTotal})` },
              { id: 'valid', label: `100% Válidos (${countValid})` },
              { id: 'warnings', label: `Com Advertências (${countWarnings})` },
              { id: 'new', label: `Novos no Catálogo (${countNew})` },
              { id: 'existing', label: `Itens Existentes (${countExisting})` }
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setPreviewFilter(f.id as any)}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                  previewFilter === f.id
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Tabela de Alta Densidade da Prévia */}
          <Card className="p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800">
                    <th className="py-2.5 px-3 font-mono">Linha</th>
                    <th className="py-2.5 px-3">Código MPR</th>
                    <th className="py-2.5 px-3">Descrição Técnica do Material</th>
                    <th className="py-2.5 px-3 text-center">Barras</th>
                    <th className="py-2.5 px-3 text-center">Metros</th>
                    <th className="py-2.5 px-3 text-center">Peso Total</th>
                    <th className="py-2.5 px-3 text-center">Propostas</th>
                    <th className="py-2.5 px-3 text-center">Ação Cadastral</th>
                    <th className="py-2.5 px-3 text-right">Diagnóstico</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {filteredPreviewRows.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-slate-500">
                        Nenhum item localizado no filtro selecionado.
                      </td>
                    </tr>
                  ) : (
                    filteredPreviewRows.map((r, idx) => (
                      <tr key={idx} className="hover:bg-slate-800/40">
                        <td className="py-2 px-3 font-mono text-slate-500">{r.rowNumber}</td>
                        <td className="py-2 px-3 font-mono font-bold text-blue-400">{r.codigo_mpr}</td>
                        <td className="py-2 px-3 text-white font-medium max-w-[280px] truncate">{r.description}</td>
                        <td className="py-2 px-3 text-center font-bold text-slate-200">{r.quantity_bars}</td>
                        <td className="py-2 px-3 text-center text-slate-400 font-mono">{r.quantity_meters.toFixed(2)} m</td>
                        <td className="py-2 px-3 text-center text-slate-400 font-mono">{r.estimated_weight_kg.toFixed(1)} kg</td>
                        <td className="py-2 px-3 text-center font-mono text-slate-300">
                          {r.supplierQuotes.length} cotados
                        </td>
                        <td className="py-2 px-3 text-center">
                          {r.isExisting ? (
                            <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 text-[10px] font-bold">
                              {updateExistingProducts ? 'Atualiza Cadastro' : 'Mantém Atual'}
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
                              Novo Produto
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-right">
                          {r.status === 'ERROR' ? (
                            <span className="text-[10px] text-rose-400 font-semibold">{r.validationErrors[0]}</span>
                          ) : r.status === 'WARNING' ? (
                            <span className="text-[10px] text-amber-400 font-semibold">{r.validationWarnings[0]}</span>
                          ) : (
                            <span className="text-[10px] text-emerald-400 font-semibold flex items-center justify-end gap-1">
                              <CheckCircle2 className="w-3 h-3" /> Válido
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};
