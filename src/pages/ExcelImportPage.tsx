import React, { useState } from 'react';
import {
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  RefreshCw,
  Sparkles,
  Info,
  Check
} from 'lucide-react';
import { Card, CardHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { parseQuotationExcel, ExcelImportPreview } from '../lib/excel-importer';
import { localStore, DEMO_ORG_ID } from '../lib/storage';
import { Product } from '../types/product';
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
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<ExcelImportPreview | null>(null);

  const existingProducts = localStore.getProducts();
  const existingSuppliers = localStore.getSuppliers();

  const handleFileUpload = async (file: File) => {
    try {
      setLoading(true);
      const parsed = await parseQuotationExcel(file, existingProducts, existingSuppliers);
      setPreview(parsed);
      success('Arquivo processado com sucesso!', 'Revise a pré-visualização abaixo antes de confirmar.');
    } catch (err: any) {
      error('Erro ao ler a planilha Excel.', err.message || 'Verifique o formato do arquivo.');
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

  // Cria uma planilha sintética idêntica ao Mapa de Cotação para teste rápido
  const handleLoadDemoSpreadsheet = () => {
    const ws_data = [
      ['ITEM', 'CÓDIGO MPR', 'DESCRIÇÃO', 'QTD. BARRAS', 'METROS', 'JD AÇO (QTD)', 'PESO', 'PREÇO', 'UNID', 'IPI', 'ICMS', 'PAULISTEEL (QTD)', 'PESO', 'PREÇO', 'UNID', 'IPI', 'ICMS'],
      [1, 'MPR-CAI-1500-0188-1020', 'CANTONEIRA ABAS IGUAIS 1.1/2" x 3/16" - AISI 1020', 26.94, 161.64, 26.94, 451.71, 7.39, 'kg', 5, 18, 2, 33.52, 120, 'pç', 0, 18],
      [2, 'MPR-CAI-2000-0188-1020', 'CANTONEIRA ABAS IGUAIS 2" x 3/16" - AISI 1020', 30.90, 185.40, 30.90, 702.98, 7.42, 'kg', 5, 18, 30, 682.50, 7.30, 'kg', 5, 18],
      [3, 'MPR-TIR-1000-0400-0048-1020', 'TUBO INDUSTRIAL RETANGULAR 100,00 X 40,00 X 4,75', 10.00, 60.00, 10.00, 572.00, 7.95, 'kg', 5, 18, 0, 0, 0, 'kg', 0, 18]
    ];
    const ws = XLSX.utils.aoa_to_sheet(ws_data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Mapa_Cotacao');
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const file = new File([blob], 'Mapa_Cotacao_Plataforma_Acesso_-_Aco_Carbono_ATUALIZADO.xlsx', { type: blob.type });

    handleFileUpload(file);
  };

  const handleConfirmImport = () => {
    if (!preview) return;

    // 1. Cadastra produtos que ainda não existem pelo Código MPR
    let newlyAddedProducts = 0;
    preview.identifiedProducts.forEach((row) => {
      const exists = existingProducts.some(
        (p) => p.codigo_mpr.trim().toUpperCase() === row.codigo_mpr.trim().toUpperCase()
      );
      if (!exists) {
        localStore.saveProduct({
          id: `prod-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          organization_id: DEMO_ORG_ID,
          codigo_mpr: row.codigo_mpr,
          description: row.description,
          category: 'Aço Carbono',
          dimensions: row.dimensions || 'Conforme especificação',
          material: row.material || 'AISI 1020',
          stock_unit: 'barra',
          purchase_unit: 'kg',
          weight_unit_kg: row.estimated_weight_kg ? row.estimated_weight_kg / row.quantity_bars : 16.76,
          length_unit_meters: 6.0,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
        newlyAddedProducts++;
      }
    });

    // 2. Cria uma nova Cotação automaticamente preenchida com os dados importados
    const quotationId = `cot-import-${Date.now()}`;
    const refreshedProducts = localStore.getProducts();

    const items: QuotationItem[] = preview.identifiedProducts.map((row, idx) => {
      const prod = refreshedProducts.find(
        (p) => p.codigo_mpr.trim().toUpperCase() === row.codigo_mpr.trim().toUpperCase()
      );

      return {
        id: `qitem-${quotationId}-${idx + 1}`,
        quotation_id: quotationId,
        product_id: prod?.id || `temp-prod-${idx}`,
        item_order: idx + 1,
        quantity_bars: row.quantity_bars,
        quantity_meters: row.quantity_meters,
        estimated_weight_kg: row.estimated_weight_kg || row.quantity_bars * 16.76,
        created_at: new Date().toISOString(),
        product: prod
      };
    });

    // Vincula os fornecedores encontrados
    const supplierQuotes: SupplierQuote[] = existingSuppliers.slice(0, 3).map((sup, sIdx) => {
      const sqId = `sq-${quotationId}-${sup.id}`;
      const sqItems = items.map((it, itIdx) => {
        const rowData = preview.identifiedProducts[itIdx];
        const quoteForSup = rowData?.supplierQuotes?.[sIdx];

        return {
          id: `sqi-${sqId}-${it.id}`,
          supplier_quote_id: sqId,
          quotation_item_id: it.id,
          quoted_quantity: quoteForSup?.quotedQty ?? it.quantity_bars,
          weight_kg: quoteForSup?.weightKg ?? it.estimated_weight_kg,
          unit_price: quoteForSup?.unitPrice ?? 7.45,
          price_unit: (quoteForSup?.priceUnit as any) || 'kg',
          ipi_percent: quoteForSup?.ipiPercent ?? 5,
          icms_percent: quoteForSup?.icmsPercent ?? 18,
          calculated_total: quoteForSup?.calculatedTotal ?? (it.estimated_weight_kg * 7.45),
          validation_status: (quoteForSup?.quotedQty && quoteForSup.quotedQty < it.quantity_bars ? 'QUANTIDADE_INSUFICIENTE' : 'VALIDA') as any,
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
        proposal_number: `IMP-${sup.trade_name?.substring(0, 3).toUpperCase()}-01`,
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
      quotation_number: `COT-IMP-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
      project_name: preview.fileName.replace(/\.[^/.]+$/, '').replace(/_/g, ' '),
      responsible_user_id: user?.id,
      responsible_user_name: user?.full_name,
      quotation_date: new Date().toISOString().split('T')[0],
      notes: `Importado do arquivo ${preview.fileName} em ${new Date().toLocaleDateString('pt-BR')}`,
      status: 'EM_COTACAO',
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
      action: 'IMPORTACAO_EXCEL_CONCLUIDA',
      entity: 'quotations',
      entity_id: quotationId,
      new_data: { file: preview.fileName, products: preview.identifiedProducts.length },
      reason: 'Importação inteligente do Mapa de Cotação'
    });

    success(
      'Importação concluída com sucesso!',
      `${newlyAddedProducts} novos produtos cadastrados e cotação gerada.`
    );

    onSelectQuotation(quotationId);
    onNavigate('quotation-detail');
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
          <UploadCloud className="w-6 h-6 text-emerald-500" />
          Importação da Planilha de Cotação (.xlsx)
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Importe a planilha oficial "Mapa_Cotacao_Plataforma_Acesso_-_Aco_Carbono_ATUALIZADO.xlsx" com reconhecimento automático de colunas e validação
        </p>
      </div>

      {/* Upload Zone */}
      {!preview && (
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
              accept=".xlsx, .xls"
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
            <h3 className="text-base font-bold text-white">Arraste seu arquivo .xlsx ou clique para procurar</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-md">
              O sistema detectará automaticamente as colunas de Código MPR, Descrição, Qtd em Barras e os blocos de cotação dos fornecedores.
            </p>
          </div>

          <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl bg-slate-950 border border-slate-800">
            <div className="flex items-center gap-2.5">
              <Sparkles className="w-5 h-5 text-blue-400 shrink-0" />
              <div className="text-xs">
                <strong className="text-white">Deseja testar sem arquivo agora?</strong>
                <p className="text-slate-400">Carregue a planilha modelo de referência com 1 clique.</p>
              </div>
            </div>
            <Button variant="secondary" size="sm" onClick={handleLoadDemoSpreadsheet}>
              Carregar Planilha Modelo
            </Button>
          </div>
        </Card>
      )}

      {/* Preview Section */}
      {preview && (
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* Summary Box */}
          <Card className="p-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
                  Pré-visualização da Importação
                </span>
                <h3 className="text-lg font-bold text-white mt-0.5">{preview.fileName}</h3>
                <div className="flex flex-wrap gap-4 text-xs text-slate-300 mt-2">
                  <span>Itens identificados: <strong className="text-white">{preview.totalRows}</strong></span>
                  <span>Novos produtos: <strong className="text-emerald-400">{preview.newProductsCount}</strong></span>
                  <span>Já cadastrados: <strong className="text-blue-400">{preview.existingProductsCount}</strong></span>
                  <span>Fornecedores detectados: <strong className="text-white">{preview.identifiedSuppliers.length}</strong></span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Button variant="outline" onClick={() => setPreview(null)}>
                  Cancelar
                </Button>
                <Button variant="primary" icon={<Check className="w-4 h-4" />} onClick={handleConfirmImport}>
                  Confirmar Importação
                </Button>
              </div>
            </div>
          </Card>

          {/* Table Preview */}
          <Card className="p-0 overflow-hidden">
            <div className="p-4 border-b border-slate-800">
              <h4 className="text-sm font-bold text-white">Produtos e Cotações Mapeados</h4>
              <p className="text-xs text-slate-400">Verifique se as colunas e quantidades correspondem ao esperado</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800">
                    <th className="py-2.5 px-3">Linha</th>
                    <th className="py-2.5 px-3">Código MPR</th>
                    <th className="py-2.5 px-3">Descrição</th>
                    <th className="py-2.5 px-3 text-center">Barras</th>
                    <th className="py-2.5 px-3 text-center">Metros</th>
                    <th className="py-2.5 px-3 text-center">Cotações Lançadas</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {preview.identifiedProducts.map((row, idx) => {
                    const isNew = !existingProducts.some(
                      (p) => p.codigo_mpr.trim().toUpperCase() === row.codigo_mpr.trim().toUpperCase()
                    );

                    return (
                      <tr key={idx} className="hover:bg-slate-800/40">
                        <td className="py-2.5 px-3 font-mono text-slate-500">{row.rowNumber}</td>
                        <td className="py-2.5 px-3 font-mono font-bold text-blue-400">{row.codigo_mpr}</td>
                        <td className="py-2.5 px-3 text-white font-medium">{row.description}</td>
                        <td className="py-2.5 px-3 text-center font-bold text-slate-200">{row.quantity_bars}</td>
                        <td className="py-2.5 px-3 text-center text-slate-400">{row.quantity_meters} m</td>
                        <td className="py-2.5 px-3 text-center font-mono">
                          {row.supplierQuotes.length} fornecedor(es)
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {isNew ? (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
                              Novo Cadastro
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-[10px] font-bold">
                              Existente (Vincula)
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};
