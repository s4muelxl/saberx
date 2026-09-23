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
  Settings2,
  Table,
  Check,
  RefreshCw,
  Sliders,
  Filter,
  Layers
} from 'lucide-react';
import { Card, CardHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import {
  analyzeExcelWorkbook,
  processMappedExcelRows,
  downloadOfficialQuotationTemplate,
  EnterpriseWorkbookAnalysis,
  EnterpriseImportRow,
  ColumnMapping
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

  // Wizard Step: 1 = Upload, 2 = Mapeamento, 3 = Higienização & Conflito, 4 = Prévia & Conclusão
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<EnterpriseWorkbookAnalysis | null>(null);
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

  // Estratégia de Duplicação
  const [updateExistingProducts, setUpdateExistingProducts] = useState(true);

  // Linhas Processadas
  const [processedRows, setProcessedRows] = useState<EnterpriseImportRow[]>([]);
  const [previewFilter, setPreviewFilter] = useState<'all' | 'new' | 'existing' | 'warnings'>('all');

  const existingProducts = localStore.getProducts();
  const existingSuppliers = localStore.getSuppliers();

  // 1. Processa upload inicial
  const handleFileUpload = async (file: File) => {
    try {
      setLoading(true);
      const res = await analyzeExcelWorkbook(file);
      setAnalysis(res);
      setColumnMapping(res.suggestedMapping);
      setStep(2); // Avança para etapa de mapeamento
      success('Arquivo lido com sucesso!', 'Verifique as colunas sugeridas pelo assistente inteligente.');
    } catch (err: any) {
      error('Erro ao ler a planilha Excel', err.message || 'Verifique o formato.');
    } finally {
      setLoading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  // Carrega planilha modelo oficial SaberX com os 5 Pilares Corporativos
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

    // Aba de BI Dashboard
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

  // 2. Conclui Mapeamento e Avança para Validação
  const handleProceedToValidation = () => {
    if (!analysis) return;
    const rows = processMappedExcelRows(analysis, columnMapping, existingProducts);
    setProcessedRows(rows);
    setStep(3);
  };

  // 3. Conclui Higienização e Avança para Prévia
  const handleProceedToPreview = () => {
    setStep(4);
  };

  // 4. Confirmação Final da Importação
  const handleFinalImport = () => {
    if (!analysis || processedRows.length === 0) return;

    let newProdsCount = 0;
    let updatedProdsCount = 0;

    // 1. Cadastra ou atualiza os produtos
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
          dimensions: row.dimensions || 'Conforme projeto',
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

    // 2. Gera nova Cotação com os fornecedores mapeados
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

    // Vincula os fornecedores da planilha ou parceiros cadastrados
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
      notes: `Importado via Assistente Corporativo SaberX com Matriz TCO (${processedRows.length} itens)`,
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
      new_data: { file: analysis.fileName, newProducts: newProdsCount, updatedProducts: updatedProdsCount },
      reason: 'Importação profissional multi-etapas com mapeamento personalizado'
    });

    success(
      'Importação concluída com sucesso!',
      `${newProdsCount} novos produtos cadastrados, ${updatedProdsCount} atualizados e Mapa de Cotação gerado.`
    );

    onSelectQuotation(quotationId);
    onNavigate('quotation-detail');
  };

  const filteredPreviewRows = processedRows.filter((r) => {
    if (previewFilter === 'new') return !r.isExisting;
    if (previewFilter === 'existing') return r.isExisting;
    if (previewFilter === 'warnings') return r.validationWarnings.length > 0 || r.validationErrors.length > 0;
    return true;
  });

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <UploadCloud className="w-6 h-6 text-emerald-400" />
            Assistente Corporativo de Importação Excel
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Motor inteligente com reconhecimento de abas, mapeamento de colunas e validação antes da gravação
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          icon={<Download className="w-4 h-4 text-blue-400" />}
          onClick={downloadOfficialQuotationTemplate}
        >
          Baixar Planilha Modelo (.xlsx)
        </Button>
      </div>

      {/* Visual Stepper */}
      <div className="grid grid-cols-4 gap-2 text-xs font-semibold">
        {[
          { num: 1, label: '1. Arquivo & Aba' },
          { num: 2, label: '2. Mapeamento' },
          { num: 3, label: '3. Higienização' },
          { num: 4, label: '4. Prévia & Impacto' }
        ].map((s) => (
          <div
            key={s.num}
            className={`p-3 rounded-xl border text-center transition-all ${
              step === s.num
                ? 'bg-blue-600/20 border-blue-500 text-blue-300 shadow-lg shadow-blue-500/10'
                : step > s.num
                ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-400'
                : 'bg-slate-900 border-slate-800 text-slate-500'
            }`}
          >
            <div className="text-[10px] uppercase font-bold text-slate-400">Passo {s.num}</div>
            <div className="truncate font-bold text-white mt-0.5">{s.label.split('. ')[1]}</div>
          </div>
        ))}
      </div>

      {/* PASSO 1: Upload de Arquivo */}
      {step === 1 && (
        <Card className="p-8">
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            className="border-2 border-dashed border-slate-700 hover:border-blue-500 transition-colors rounded-2xl p-10 text-center flex flex-col items-center justify-center cursor-pointer bg-slate-900/50"
            onClick={() => document.getElementById('file-upload-input')?.click()}
          >
            <input
              id="file-upload-input"
              type="file"
              accept=".xlsx, .xls, .csv"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleFileUpload(e.target.files[0]);
                }
              }}
            />
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-4 shadow-lg shadow-emerald-500/10">
              <FileSpreadsheet className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-white">Arraste seu arquivo Excel (.xlsx) ou clique para procurar</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-md">
              Compatível com planilhas de mapa de cotação de qualquer fornecedor ou modelo interno da empresa.
            </p>
          </div>

          <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl bg-slate-950 border border-slate-800">
            <div className="flex items-center gap-2.5">
              <Sparkles className="w-5 h-5 text-blue-400 shrink-0" />
              <div className="text-xs">
                <strong className="text-white">Deseja simular o fluxo com dados reais?</strong>
                <p className="text-slate-400">Carregue a planilha modelo de referência com 1 clique.</p>
              </div>
            </div>
            <Button variant="secondary" size="sm" onClick={handleLoadDemoTemplate}>
              Carregar Planilha Exemplo
            </Button>
          </div>
        </Card>
      )}

      {/* PASSO 2: Mapeamento Inteligente de Colunas */}
      {step === 2 && analysis && (
        <Card className="p-6 space-y-6">
          <CardHeader
            title="Mapeamento Inteligente de Colunas"
            subtitle="Confirme ou altere quais colunas da sua planilha correspondem aos campos do sistema"
          />

          <div className="p-3.5 rounded-xl bg-blue-950/30 border border-blue-500/30 text-xs text-blue-300 flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-blue-400" />
            <span>
              O assistente detectou <strong>{analysis.headers.length} colunas</strong> no arquivo <strong>{analysis.fileName}</strong>.
            </span>
          </div>

          {analysis.metadata && (analysis.metadata.quotation_number || analysis.metadata.project_name) && (
            <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/30 space-y-2">
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-4 h-4" /> Metadados Corporativos Identificados (A1:B7):
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div><span className="text-slate-400">Cotação:</span> <strong className="text-white block">{analysis.metadata.quotation_number || 'N/A'}</strong></div>
                <div><span className="text-slate-400">Projeto:</span> <strong className="text-white block">{analysis.metadata.project_name || 'N/A'}</strong></div>
                <div><span className="text-slate-400">Cliente:</span> <strong className="text-white block">{analysis.metadata.related_client || 'N/A'}</strong></div>
                <div><span className="text-slate-400">Responsável:</span> <strong className="text-white block">{analysis.metadata.responsible_user_name || 'N/A'}</strong></div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {/* Código MPR */}
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
              <label className="font-bold text-white block">Código MPR (Identificador Único) *</label>
              <select
                value={columnMapping.mprCol}
                onChange={(e) => setColumnMapping({ ...columnMapping, mprCol: parseInt(e.target.value) })}
                className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg p-2"
              >
                {analysis.headers.map((h, i) => (
                  <option key={i} value={i}>Coluna {String.fromCharCode(65 + i)}: {h || `(Sem cabeçalho - Col ${i + 1})`}</option>
                ))}
              </select>
            </div>

            {/* Descrição */}
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
              <label className="font-bold text-white block">Descrição Técnica do Produto *</label>
              <select
                value={columnMapping.descCol}
                onChange={(e) => setColumnMapping({ ...columnMapping, descCol: parseInt(e.target.value) })}
                className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg p-2"
              >
                {analysis.headers.map((h, i) => (
                  <option key={i} value={i}>Coluna {String.fromCharCode(65 + i)}: {h || `(Col ${i + 1})`}</option>
                ))}
              </select>
            </div>

            {/* Quantidade em Barras */}
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
              <label className="font-bold text-white block">Quantidade Necessária (Barras) *</label>
              <select
                value={columnMapping.barsCol}
                onChange={(e) => setColumnMapping({ ...columnMapping, barsCol: parseInt(e.target.value) })}
                className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg p-2"
              >
                {analysis.headers.map((h, i) => (
                  <option key={i} value={i}>Coluna {String.fromCharCode(65 + i)}: {h || `(Col ${i + 1})`}</option>
                ))}
              </select>
            </div>

            {/* Metragem */}
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
              <label className="font-bold text-white block">Metragem Necessária (Metros)</label>
              <select
                value={columnMapping.metersCol}
                onChange={(e) => setColumnMapping({ ...columnMapping, metersCol: parseInt(e.target.value) })}
                className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg p-2"
              >
                <option value={-1}>Calcular automaticamente (Barras × 6.00m)</option>
                {analysis.headers.map((h, i) => (
                  <option key={i} value={i}>Coluna {String.fromCharCode(65 + i)}: {h}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-800">
            <Button variant="outline" onClick={() => setStep(1)}>
              <ArrowLeft className="w-4 h-4 mr-1" /> Voltar
            </Button>
            <Button variant="primary" onClick={handleProceedToValidation}>
              Avançar para Higienização <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </Card>
      )}

      {/* PASSO 3: Higienização & Estratégia de Conflito */}
      {step === 3 && (
        <Card className="p-6 space-y-6">
          <CardHeader
            title="Higienização de Dados & Resolução de Conflitos"
            subtitle="Defina como o sistema deve tratar produtos que já constam no banco de dados"
          />

          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-start justify-between gap-4">
              <div>
                <h4 className="font-bold text-white text-sm">Atualizar dados dos produtos existentes</h4>
                <p className="text-xs text-slate-400 mt-1">
                  Se um produto com o mesmo Código MPR já existir no sistema, suas especificações e dimensões serão atualizadas com os dados mais recentes desta planilha.
                </p>
              </div>
              <input
                type="checkbox"
                checked={updateExistingProducts}
                onChange={(e) => setUpdateExistingProducts(e.target.checked)}
                className="w-5 h-5 rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
            </div>

            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
              <h4 className="font-bold text-white text-sm mb-2">Higienização Numérica Automática Ativada</h4>
              <ul className="text-xs text-slate-300 space-y-1 list-disc list-inside">
                <li>Conversão de vírgulas decimais brasileiras (ex: 451,71 $\rightarrow$ 451.71).</li>
                <li>Remoção de prefixos monetários (R$, R$ 120,00).</li>
                <li>Sanitização contra injeção de scripts e caracteres perigosos.</li>
              </ul>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-800">
            <Button variant="outline" onClick={() => setStep(2)}>
              <ArrowLeft className="w-4 h-4 mr-1" /> Voltar ao Mapeamento
            </Button>
            <Button variant="primary" onClick={handleProceedToPreview}>
              Ver Prévia Executiva <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </Card>
      )}

      {/* PASSO 4: Prévia & Confirmação */}
      {step === 4 && (
        <div className="space-y-6">
          <Card className="p-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
                  Impacto da Importação
                </span>
                <h3 className="text-lg font-bold text-white mt-0.5">{analysis?.fileName}</h3>
                <div className="flex flex-wrap gap-4 text-xs text-slate-300 mt-2">
                  <span>Total de Itens: <strong className="text-white">{processedRows.length}</strong></span>
                  <span>Novos Cadastros: <strong className="text-emerald-400">{processedRows.filter(r => !r.isExisting).length}</strong></span>
                  <span>Produtos Existentes: <strong className="text-blue-400">{processedRows.filter(r => r.isExisting).length}</strong></span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Button variant="outline" onClick={() => setStep(3)}>
                  Voltar
                </Button>
                <Button variant="primary" icon={<Check className="w-4 h-4" />} onClick={handleFinalImport}>
                  Confirmar & Gerar Cotação
                </Button>
              </div>
            </div>
          </Card>

          {/* Filtros da Tabela de Prévia */}
          <div className="flex gap-2">
            {[
              { id: 'all', label: `Todos (${processedRows.length})` },
              { id: 'new', label: `Novos (${processedRows.filter(r => !r.isExisting).length})` },
              { id: 'existing', label: `Existentes (${processedRows.filter(r => r.isExisting).length})` },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setPreviewFilter(f.id as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  previewFilter === f.id
                    ? 'bg-blue-600 text-white shadow'
                    : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Tabela de Pré-visualização */}
          <Card className="p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800">
                    <th className="py-2.5 px-3">Linha</th>
                    <th className="py-2.5 px-3">Código MPR</th>
                    <th className="py-2.5 px-3">Descrição Técnica</th>
                    <th className="py-2.5 px-3 text-center">Barras</th>
                    <th className="py-2.5 px-3 text-center">Metros</th>
                    <th className="py-2.5 px-3 text-center">Cotações</th>
                    <th className="py-2.5 px-3 text-center">Ação no Banco</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {filteredPreviewRows.map((r, idx) => (
                    <tr key={idx} className="hover:bg-slate-800/40">
                      <td className="py-2.5 px-3 font-mono text-slate-500">{r.rowNumber}</td>
                      <td className="py-2.5 px-3 font-mono font-bold text-blue-400">{r.codigo_mpr}</td>
                      <td className="py-2.5 px-3 text-white font-medium">{r.description}</td>
                      <td className="py-2.5 px-3 text-center font-bold text-slate-200">{r.quantity_bars}</td>
                      <td className="py-2.5 px-3 text-center text-slate-400">{r.quantity_meters} m</td>
                      <td className="py-2.5 px-3 text-center font-mono text-slate-300">
                        {r.supplierQuotes.length} fornecedor(es)
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {r.isExisting ? (
                          <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-[10px] font-bold">
                            {updateExistingProducts ? 'Atualiza Cadastro' : 'Mantém Atual'}
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
                            Novo Produto
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};
