import React, { useState } from 'react';
import {
  FileSpreadsheet,
  Plus,
  Search,
  Eye,
  Trash2,
  FileText,
  Filter,
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { ActivePage } from '../components/layout/Sidebar';
import { localStore } from '../lib/storage';
import { QuotationFull } from '../types/quotation';
import { exportQuotationToExcel } from '../lib/excel-exporter';
import { exportQuotationToPdf } from '../../src/lib/pdf-exporter';
import { useNotification } from '../context/NotificationContext';

interface QuotationsPageProps {
  onNavigate: (page: ActivePage) => void;
  onSelectQuotation: (id: string) => void;
}

export const QuotationsPage: React.FC<QuotationsPageProps> = ({ onNavigate, onSelectQuotation }) => {
  const { success, info } = useNotification();
  const [quotations, setQuotations] = useState<QuotationFull[]>(() => localStore.getQuotations());
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('TODAS');

  const filteredQuotations = quotations.filter((q) => {
    const matchesSearch =
      q.quotation_number.toLowerCase().includes(search.toLowerCase()) ||
      q.project_name.toLowerCase().includes(search.toLowerCase()) ||
      (q.related_client && q.related_client.toLowerCase().includes(search.toLowerCase()));

    const matchesStatus = statusFilter === 'TODAS' || q.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Deseja realmente remover esta cotação?')) {
      localStore.deleteQuotation(id);
      setQuotations(localStore.getQuotations());
      success('Cotação excluída com sucesso.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <FileSpreadsheet className="w-6 h-6 text-blue-500" />
            Cotações de Compras (Mapas)
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Gerenciamento de tomadas de preço e concorrências de suprimentos
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            icon={<Sparkles className="w-4 h-4 text-emerald-400" />}
            onClick={() => onNavigate('excel-import')}
          >
            Importar Excel (.xlsx)
          </Button>
          <Button
            variant="primary"
            icon={<Plus className="w-4 h-4" />}
            onClick={() => onNavigate('new-quotation')}
          >
            + Nova Cotação
          </Button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row items-center gap-4">
          <div className="flex-1 w-full">
            <Input
              placeholder="Pesquisar por número, projeto ou cliente..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              leftIcon={<Search className="w-4 h-4" />}
            />
          </div>

          <div className="w-full md:w-auto flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400 shrink-0" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 w-full md:w-48"
            >
              <option value="TODAS">Todos os Status</option>
              <option value="RASCUNHO">Rascunho</option>
              <option value="EM_COTACAO">Em Cotação</option>
              <option value="AGUARDANDO_APROVACAO">Aguardando Aprovação</option>
              <option value="APROVADA">Aprovada</option>
              <option value="FINALIZADA">Finalizada</option>
              <option value="CANCELADA">Cancelada</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Table List */}
      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-950/80 text-slate-400 font-semibold border-b border-slate-800">
                <th className="py-3 px-4">Número</th>
                <th className="py-3 px-4">Projeto & Demanda</th>
                <th className="py-3 px-4">Cliente / Obra</th>
                <th className="py-3 px-4 text-center">Itens</th>
                <th className="py-3 px-4 text-center">Fornecedores</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Data</th>
                <th className="py-3 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {filteredQuotations.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    Nenhuma cotação encontrada. Crie uma nova cotação ou importe um arquivo Excel.
                  </td>
                </tr>
              ) : (
                filteredQuotations.map((q) => (
                  <tr
                    key={q.id}
                    onClick={() => {
                      onSelectQuotation(q.id);
                      onNavigate('quotation-detail');
                    }}
                    className="hover:bg-slate-800/50 transition-colors cursor-pointer group"
                  >
                    <td className="py-3 px-4 font-mono font-bold text-blue-400">
                      {q.quotation_number}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-white group-hover:text-blue-300 transition-colors">
                        {q.project_name}
                      </div>
                      <div className="text-[10px] text-slate-400">Resp: {q.responsible_user_name || 'Comprador'}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-300">
                      {q.related_client || 'Geral'}
                    </td>
                    <td className="py-3 px-4 text-center font-mono">
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-bold">
                        {q.items.length}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center font-mono">
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-bold">
                        {q.supplier_quotes.length}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <Badge status={q.status} size="sm" />
                    </td>
                    <td className="py-3 px-4 text-right text-slate-400">
                      {q.quotation_date}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => {
                            onSelectQuotation(q.id);
                            onNavigate('quotation-detail');
                          }}
                          title="Abrir Mapa Comparativo"
                          className="p-1.5 rounded-lg bg-blue-600/10 text-blue-400 hover:bg-blue-600/20 transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => exportQuotationToExcel(q)}
                          title="Exportar Excel"
                          className="p-1.5 rounded-lg bg-emerald-600/10 text-emerald-400 hover:bg-emerald-600/20 transition-colors"
                        >
                          <FileSpreadsheet className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => exportQuotationToPdf(q)}
                          title="Exportar PDF"
                          className="p-1.5 rounded-lg bg-rose-600/10 text-rose-400 hover:bg-rose-600/20 transition-colors"
                        >
                          <FileText className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => handleDelete(q.id, e)}
                          title="Excluir Cotação"
                          className="p-1.5 rounded-lg bg-rose-600/10 text-rose-400 hover:bg-rose-600/20 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
