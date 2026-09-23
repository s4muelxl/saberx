import React, { useState } from 'react';
import {
  ArrowLeft,
  FileSpreadsheet,
  Clock,
  CheckCircle2,
  XCircle,
  FileText,
  Paperclip,
  History,
  Upload
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Card } from '../components/ui/Card';
import { ActivePage } from '../components/layout/Sidebar';
import { localStore } from '../lib/storage';
import { QuotationFull } from '../types/quotation';
import { QuotationComparisonMatrix } from '../components/quotation/QuotationComparisonMatrix';
import { useNotification } from '../context/NotificationContext';

interface QuotationDetailPageProps {
  quotationId: string;
  onNavigate: (page: ActivePage) => void;
  onGeneratePurchaseOrder: (supplierId: string) => void;
}

export const QuotationDetailPage: React.FC<QuotationDetailPageProps> = ({
  quotationId,
  onNavigate,
  onGeneratePurchaseOrder
}) => {
  const { success } = useNotification();
  const [quotation, setQuotation] = useState<QuotationFull | undefined>(() =>
    localStore.getQuotationById(quotationId)
  );

  const [activeTab, setActiveTab] = useState<'matrix' | 'audit' | 'attachments'>('matrix');

  if (!quotation) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-xl font-bold text-white">Cotação não encontrada.</h2>
        <Button variant="primary" className="mt-4" onClick={() => onNavigate('quotations')}>
          Voltar para Cotações
        </Button>
      </div>
    );
  }

  const handleUpdate = (updated: QuotationFull) => {
    setQuotation(updated);
  };

  const auditLogs = localStore.getAuditLogs().filter((l) => l.entity_id === quotation.id || quotation.items.some(i => i.id === l.entity_id));

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Actions */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => onNavigate('quotations')}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Voltar para Lista
        </Button>

        {/* Tab Switcher */}
        <div className="flex bg-slate-900 border border-slate-800 rounded-xl p-1 gap-1 text-xs">
          <button
            onClick={() => setActiveTab('matrix')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-colors ${
              activeTab === 'matrix' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" /> Mapa Comparativo
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-colors ${
              activeTab === 'audit' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            <History className="w-3.5 h-3.5" /> Auditoria ({auditLogs.length})
          </button>
          <button
            onClick={() => setActiveTab('attachments')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-colors ${
              activeTab === 'attachments' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Paperclip className="w-3.5 h-3.5" /> Anexos & PDFs
          </button>
        </div>
      </div>

      {activeTab === 'matrix' && (
        <QuotationComparisonMatrix
          quotation={quotation}
          onUpdate={handleUpdate}
          onGeneratePurchaseOrder={(supplierId) => {
            onGeneratePurchaseOrder(supplierId);
            onNavigate('purchases');
          }}
        />
      )}

      {activeTab === 'audit' && (
        <Card>
          <div className="mb-4">
            <h3 className="text-lg font-bold text-white tracking-tight">Trilha de Auditoria Desta Cotação</h3>
            <p className="text-xs text-slate-400">Histórico de todas as edições, decisões manuais e aprovações</p>
          </div>

          <div className="divide-y divide-slate-800">
            {auditLogs.length === 0 ? (
              <div className="p-6 text-center text-slate-400 text-xs">Nenhum evento registrado até o momento.</div>
            ) : (
              auditLogs.map((log) => (
                <div key={log.id} className="py-3 flex items-start justify-between text-xs">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white">{log.action}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
                        {log.entity}
                      </span>
                    </div>
                    <p className="text-slate-300 mt-1">{log.reason || 'Alteração realizada pelo usuário'}</p>
                    <div className="text-[10px] text-slate-500 mt-0.5">Por: {log.user_name || 'Sistema'}</div>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">{new Date(log.created_at).toLocaleString('pt-BR')}</span>
                </div>
              ))
            )}
          </div>
        </Card>
      )}

      {activeTab === 'attachments' && (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold text-white tracking-tight">Documentos & Propostas dos Fornecedores</h3>
              <p className="text-xs text-slate-400">Armazenamento em Supabase Storage com vínculo por fornecedor</p>
            </div>
            <Button variant="outline" size="sm" icon={<Upload className="w-4 h-4" />}>
              Anexar Arquivo (PDF / Imagem)
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {quotation.supplier_quotes.map((sq) => (
              <div key={sq.id} className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="w-5 h-5 text-blue-400" />
                  <div className="font-bold text-sm text-white">{sq.supplier?.trade_name}</div>
                </div>
                <div className="text-xs text-slate-400 font-mono">
                  {sq.proposal_number ? `Proposta: ${sq.proposal_number}.pdf` : 'Nenhum PDF vinculado'}
                </div>
                <div className="mt-3 flex gap-2">
                  <Button variant="ghost" size="sm">Download</Button>
                  <Button variant="ghost" size="sm">Substituir</Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};
