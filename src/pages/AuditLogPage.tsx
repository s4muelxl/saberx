import React, { useState, useMemo } from 'react';
import {
  ShieldAlert,
  Search,
  Filter,
  History,
  UserCheck,
  Clock,
  Download,
  Eye,
  X,
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Layers,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowUpDown,
  RefreshCw,
  Code
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { localStore } from '../lib/storage';
import { AuditLog } from '../types/audit';
import { useNotification } from '../context/NotificationContext';
import * as XLSX from 'xlsx';

export const AuditLogPage: React.FC = () => {
  const { success, info } = useNotification();
  const [logs, setLogs] = useState<AuditLog[]>(() => localStore.getAuditLogs());

  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState('ALL');
  const [entityFilter, setEntityFilter] = useState('ALL');
  const [userFilter, setUserFilter] = useState('ALL');
  const [periodFilter, setPeriodFilter] = useState<'ALL' | 'TODAY' | '7DAYS' | '30DAYS'>('ALL');
  const [severityFilter, setSeverityFilter] = useState<'ALL' | 'INFO' | 'WARNING' | 'CRITICAL'>('ALL');

  // Paginação Real
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  // Modal de Inspeção de Diff
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [diffTab, setDiffTab] = useState<'visual' | 'json'>('visual');

  const refreshLogs = () => {
    setLogs(localStore.getAuditLogs());
    success('Trilha de auditoria sincronizada.');
  };

  // Helper para determinar criticidade do evento
  const getEventSeverity = (action: string): 'INFO' | 'WARNING' | 'CRITICAL' => {
    const act = action.toUpperCase();
    if (act.includes('EXCLUSAO') || act.includes('DELET') || act.includes('CANCEL') || act.includes('RESET')) {
      return 'CRITICAL';
    }
    if (act.includes('ALTERA') || act.includes('MODIFICA') || act.includes('MANUAL') || act.includes('RECUPERA')) {
      return 'WARNING';
    }
    return 'INFO';
  };

  // Extrai listas de opções para filtros
  const uniqueActions = useMemo(() => {
    return Array.from(new Set(logs.map((l) => l.action))).sort();
  }, [logs]);

  const uniqueEntities = useMemo(() => {
    return Array.from(new Set(logs.map((l) => l.entity))).sort();
  }, [logs]);

  const uniqueUsers = useMemo(() => {
    return Array.from(new Set(logs.map((l) => l.user_name || 'Sistema'))).sort();
  }, [logs]);

  // Filtragem multi-critério
  const filteredLogs = useMemo(() => {
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;

    return logs.filter((log) => {
      // 1. Busca textual
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchesTerm =
          log.action.toLowerCase().includes(term) ||
          (log.reason && log.reason.toLowerCase().includes(term)) ||
          (log.user_name && log.user_name.toLowerCase().includes(term)) ||
          log.entity.toLowerCase().includes(term) ||
          log.entity_id.toLowerCase().includes(term) ||
          (log.ip_address && log.ip_address.includes(term));
        if (!matchesTerm) return false;
      }

      // 2. Filtro por Ação
      if (actionFilter !== 'ALL' && log.action !== actionFilter) {
        return false;
      }

      // 3. Filtro por Entidade
      if (entityFilter !== 'ALL' && log.entity !== entityFilter) {
        return false;
      }

      // 4. Filtro por Usuário
      if (userFilter !== 'ALL' && (log.user_name || 'Sistema') !== userFilter) {
        return false;
      }

      // 5. Filtro por Criticidade
      if (severityFilter !== 'ALL' && getEventSeverity(log.action) !== severityFilter) {
        return false;
      }

      // 6. Filtro por Período
      if (periodFilter !== 'ALL') {
        const logTime = new Date(log.created_at).getTime();
        if (periodFilter === 'TODAY' && now - logTime > dayMs) return false;
        if (periodFilter === '7DAYS' && now - logTime > 7 * dayMs) return false;
        if (periodFilter === '30DAYS' && now - logTime > 30 * dayMs) return false;
      }

      return true;
    });
  }, [logs, searchTerm, actionFilter, entityFilter, userFilter, severityFilter, periodFilter]);

  // Paginação
  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * pageSize;
  const paginatedLogs = filteredLogs.slice(startIndex, startIndex + pageSize);

  // KPIs de Auditoria
  const countTotal = logs.length;
  const countCritical = logs.filter((l) => getEventSeverity(l.action) === 'CRITICAL').length;
  const countWarnings = logs.filter((l) => getEventSeverity(l.action) === 'WARNING').length;
  const countOperators = uniqueUsers.length;

  const handleExportExcel = () => {
    if (filteredLogs.length === 0) {
      info('Nenhum dado para exportar');
      return;
    }

    const exportRows = filteredLogs.map((l) => ({
      'ID Auditoria': l.id,
      'Data e Hora': new Date(l.created_at).toLocaleString('pt-BR'),
      'Operador': l.user_name || 'Sistema',
      'Ação Registrada': l.action,
      'Entidade': l.entity,
      'ID da Entidade': l.entity_id,
      'Justificativa de Conformidade': l.reason || '-',
      'Endereço IP': l.ip_address || '127.0.0.1',
      'Criticidade': getEventSeverity(l.action),
      'Dados Anteriores': l.previous_data ? JSON.stringify(l.previous_data) : '',
      'Dados Novos': l.new_data ? JSON.stringify(l.new_data) : ''
    }));

    const ws = XLSX.utils.json_to_sheet(exportRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'TRILHA_AUDITORIA');
    XLSX.writeFile(wb, `SaberX_Trilha_Auditoria_${new Date().toISOString().split('T')[0]}.xlsx`);
    success('Relatório de auditoria exportado com sucesso.');
  };

  const handleExportJson = () => {
    const jsonStr = JSON.stringify(filteredLogs, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SaberX_Trilha_Auditoria_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    success('Exportação JSON de conformidade concluída.');
  };

  const clearFilters = () => {
    setSearchTerm('');
    setActionFilter('ALL');
    setEntityFilter('ALL');
    setUserFilter('ALL');
    setPeriodFilter('ALL');
    setSeverityFilter('ALL');
    setCurrentPage(1);
  };

  // Comparador de Diff chave a chave
  const renderDiffTable = (log: AuditLog) => {
    const prev = log.previous_data || {};
    const next = log.new_data || {};
    const allKeys = Array.from(new Set([...Object.keys(prev), ...Object.keys(next)]));

    if (allKeys.length === 0) {
      return (
        <div className="p-6 text-center text-slate-400 text-xs">
          Nenhum detalhe de payload estruturado disponível para este evento.
        </div>
      );
    }

    return (
      <div className="overflow-x-auto border border-slate-800 rounded-xl">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800">
              <th className="py-2.5 px-3">Campo / Propriedade</th>
              <th className="py-2.5 px-3">Valor Anterior (Before)</th>
              <th className="py-2.5 px-3">Valor Novo (After)</th>
              <th className="py-2.5 px-3 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {allKeys.map((key) => {
              const valPrev = prev[key];
              const valNext = next[key];
              const hasChanged = JSON.stringify(valPrev) !== JSON.stringify(valNext);
              const isAdded = valPrev === undefined && valNext !== undefined;
              const isRemoved = valPrev !== undefined && valNext === undefined;

              return (
                <tr key={key} className={hasChanged ? 'bg-blue-950/20' : ''}>
                  <td className="py-2 px-3 font-mono font-bold text-slate-300">{key}</td>
                  <td className="py-2 px-3 font-mono text-slate-400 max-w-[220px] truncate">
                    {valPrev !== undefined ? (typeof valPrev === 'object' ? JSON.stringify(valPrev) : String(valPrev)) : <span className="text-slate-600">-</span>}
                  </td>
                  <td className="py-2 px-3 font-mono text-white max-w-[220px] truncate">
                    {valNext !== undefined ? (typeof valNext === 'object' ? JSON.stringify(valNext) : String(valNext)) : <span className="text-slate-600">-</span>}
                  </td>
                  <td className="py-2 px-3 text-center">
                    {isAdded ? (
                      <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold text-[10px]">Adicionado</span>
                    ) : isRemoved ? (
                      <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 font-bold text-[10px]">Removido</span>
                    ) : hasChanged ? (
                      <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold text-[10px]">Modificado</span>
                    ) : (
                      <span className="text-slate-500 text-[10px]">Inalterado</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans">
      {/* Header Corporativo */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-purple-500/15 text-purple-400 font-mono text-[10px] font-bold border border-purple-500/30">
              AUDIT TRAIL & COMPLIANCE
            </span>
            <span className="text-xs text-slate-400 font-mono">ISO 27001 · GOVERNANÇA SIDERÚRGICA</span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2.5 mt-1">
            <ShieldAlert className="w-6 h-6 text-purple-400" />
            Trilha de Auditoria & Conformidade
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Registro imutável de todas as transações, alterações manuais de menor preço TCO, homologações e exclusões.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" icon={<RefreshCw className="w-4 h-4" />} onClick={refreshLogs}>
            Atualizar
          </Button>
          <Button
            variant="outline"
            size="sm"
            icon={<FileSpreadsheet className="w-4 h-4 text-emerald-400" />}
            onClick={handleExportExcel}
          >
            Exportar XLSX
          </Button>
          <Button
            variant="secondary"
            size="sm"
            icon={<Code className="w-4 h-4 text-blue-400" />}
            onClick={handleExportJson}
          >
            Exportar JSON
          </Button>
        </div>
      </div>

      {/* Painel de Indicadores Analíticos */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>Total de Registros</span>
            <History className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-black text-white font-mono mt-1">{countTotal}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Eventos retidos no livro-caixa</div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>Eventos Críticos</span>
            <AlertTriangle className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-black text-rose-400 font-mono mt-1">{countCritical}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Exclusões e alterações restritas</div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>Modificações / Avisos</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-400 font-mono mt-1">{countWarnings}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Ajustes manuais e redefinições</div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>Operadores Ativos</span>
            <UserCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400 font-mono mt-1">{countOperators}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Usuários com atividade auditada</div>
        </div>
      </div>

      {/* Barra de Ferramentas de Filtros Avançados */}
      <Card className="p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
          {/* Busca Global */}
          <div className="md:col-span-2">
            <Input
              placeholder="Buscar por operador, justificativa, ação, entidade ou IP..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              leftIcon={<Search className="w-4 h-4 text-slate-400" />}
            />
          </div>

          {/* Filtro por Ação */}
          <div>
            <select
              value={actionFilter}
              onChange={(e) => {
                setActionFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg p-2.5 text-xs font-medium focus:outline-none focus:border-blue-500"
            >
              <option value="ALL">Todas as Ações ({uniqueActions.length})</option>
              {uniqueActions.map((act) => (
                <option key={act} value={act}>{act}</option>
              ))}
            </select>
          </div>

          {/* Filtro por Entidade */}
          <div>
            <select
              value={entityFilter}
              onChange={(e) => {
                setEntityFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg p-2.5 text-xs font-medium focus:outline-none focus:border-blue-500"
            >
              <option value="ALL">Todas as Entidades ({uniqueEntities.length})</option>
              {uniqueEntities.map((ent) => (
                <option key={ent} value={ent}>{ent}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            {/* Filtro de Período */}
            <span className="text-slate-400 font-semibold flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-blue-400" /> Período:
            </span>
            {[
              { id: 'ALL', label: 'Todo Período' },
              { id: 'TODAY', label: 'Hoje (24h)' },
              { id: '7DAYS', label: 'Últimos 7 dias' },
              { id: '30DAYS', label: 'Últimos 30 dias' }
            ].map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  setPeriodFilter(p.id as any);
                  setCurrentPage(1);
                }}
                className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                  periodFilter === p.id
                    ? 'bg-blue-600 text-white font-bold shadow-sm'
                    : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {p.label}
              </button>
            ))}

            {/* Filtro de Criticidade */}
            <span className="text-slate-400 font-semibold ml-2">Criticidade:</span>
            {[
              { id: 'ALL', label: 'Todas' },
              { id: 'INFO', label: 'Info' },
              { id: 'WARNING', label: 'Avisos' },
              { id: 'CRITICAL', label: 'Críticos' }
            ].map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => {
                  setSeverityFilter(s.id as any);
                  setCurrentPage(1);
                }}
                className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                  severityFilter === s.id
                    ? 'bg-purple-600 text-white font-bold shadow-sm'
                    : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <span className="text-slate-400">
              Registros por página:
            </span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(parseInt(e.target.value));
                setCurrentPage(1);
              }}
              className="bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-2 py-1 text-xs"
            >
              <option value={10}>10</option>
              <option value={15}>15</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>

            {(searchTerm || actionFilter !== 'ALL' || entityFilter !== 'ALL' || userFilter !== 'ALL' || periodFilter !== 'ALL' || severityFilter !== 'ALL') && (
              <button
                type="button"
                onClick={clearFilters}
                className="text-[11px] text-rose-400 hover:text-rose-300 font-bold underline"
              >
                Limpar Filtros
              </button>
            )}
          </div>
        </div>
      </Card>

      {/* Tabela de Auditoria de Alto Desempenho */}
      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800">
                <th className="py-2.5 px-4 font-mono">Timestamp</th>
                <th className="py-2.5 px-4">Operador</th>
                <th className="py-2.5 px-4">Ação Auditada</th>
                <th className="py-2.5 px-4">Entidade</th>
                <th className="py-2.5 px-4">Justificativa / Motivo</th>
                <th className="py-2.5 px-4">IP / Origem</th>
                <th className="py-2.5 px-4 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {paginatedLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    Nenhum log de auditoria encontrado com os filtros aplicados.
                  </td>
                </tr>
              ) : (
                paginatedLogs.map((log) => {
                  const severity = getEventSeverity(log.action);
                  return (
                    <tr key={log.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-2.5 px-4 font-mono text-slate-400 whitespace-nowrap">
                        {new Date(log.created_at).toLocaleString('pt-BR')}
                      </td>
                      <td className="py-2.5 px-4 font-medium text-white whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-[10px] text-blue-400">
                            {(log.user_name || 'S').charAt(0).toUpperCase()}
                          </div>
                          <span>{log.user_name || 'Sistema'}</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border font-mono ${
                          severity === 'CRITICAL'
                            ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                            : severity === 'WARNING'
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                            : 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                        }`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 font-mono text-slate-300 whitespace-nowrap">
                        <span className="text-slate-400">{log.entity}:</span>
                        <span className="text-blue-400 font-bold ml-1">{log.entity_id.substring(0, 16)}</span>
                      </td>
                      <td className="py-2.5 px-4 text-slate-300 max-w-[280px] truncate" title={log.reason}>
                        {log.reason || '-'}
                      </td>
                      <td className="py-2.5 px-4 font-mono text-slate-400 text-[11px] whitespace-nowrap">
                        {log.ip_address || '127.0.0.1'}
                      </td>
                      <td className="py-2.5 px-4 text-center whitespace-nowrap">
                        <Button
                          variant="ghost"
                          size="sm"
                          icon={<Eye className="w-3.5 h-3.5 text-blue-400" />}
                          onClick={() => setSelectedLog(log)}
                        >
                          Inspecionar
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Rodapé de Paginação Real */}
        <div className="p-3 bg-slate-950 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-400">
          <div>
            Mostrando <strong>{filteredLogs.length > 0 ? startIndex + 1 : 0}</strong> a{' '}
            <strong>{Math.min(startIndex + pageSize, filteredLogs.length)}</strong> de{' '}
            <strong>{filteredLogs.length}</strong> eventos auditados
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={safeCurrentPage === 1}
              onClick={() => setCurrentPage(1)}
              className="p-1 rounded-md border border-slate-800 text-slate-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none"
              title="Primeira Página"
            >
              <ChevronsLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              disabled={safeCurrentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="p-1 rounded-md border border-slate-800 text-slate-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none"
              title="Página Anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="px-3 font-mono text-white">
              Página <strong>{safeCurrentPage}</strong> de <strong>{totalPages}</strong>
            </span>

            <button
              type="button"
              disabled={safeCurrentPage === totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="p-1 rounded-md border border-slate-800 text-slate-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none"
              title="Próxima Página"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              disabled={safeCurrentPage === totalPages}
              onClick={() => setCurrentPage(totalPages)}
              className="p-1 rounded-md border border-slate-800 text-slate-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none"
              title="Última Página"
            >
              <ChevronsRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </Card>

      {/* Modal Técnico de Inspeção de Diff (Before vs After) */}
      {selectedLog && (
        <Modal
          isOpen={!!selectedLog}
          onClose={() => setSelectedLog(null)}
          title={`Inspeção de Auditoria: ${selectedLog.action}`}
          subtitle={`Registro ${selectedLog.id} · Executado em ${new Date(selectedLog.created_at).toLocaleString('pt-BR')}`}
          maxWidth="lg"
          footer={
            <Button variant="outline" onClick={() => setSelectedLog(null)}>
              Fechar Inspeção
            </Button>
          }
        >
          <div className="space-y-4 text-xs font-sans">
            {/* Metadados do Evento */}
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div>
                  <span className="text-slate-500 block">Operador Responsável</span>
                  <strong className="text-white font-mono">{selectedLog.user_name || 'Sistema'}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block">Endereço IP</span>
                  <strong className="text-white font-mono">{selectedLog.ip_address || '127.0.0.1'}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block">Entidade Afetada</span>
                  <strong className="text-white font-mono">{selectedLog.entity}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block">ID do Registro</span>
                  <strong className="text-blue-400 font-mono truncate block">{selectedLog.entity_id}</strong>
                </div>
              </div>

              {selectedLog.reason && (
                <div className="pt-2 border-t border-slate-800/80">
                  <span className="text-slate-500 block font-semibold">Justificativa Corporativa / Motivo de Auditoria:</span>
                  <p className="text-slate-200 mt-0.5 leading-relaxed">{selectedLog.reason}</p>
                </div>
              )}
            </div>

            {/* Alternador de Abas do Modal */}
            <div className="flex border-b border-slate-800 gap-4">
              <button
                type="button"
                onClick={() => setDiffTab('visual')}
                className={`pb-2 text-xs font-bold border-b-2 transition-all ${
                  diffTab === 'visual'
                    ? 'border-blue-500 text-white'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                Visão Comparativa (Diff)
              </button>
              <button
                type="button"
                onClick={() => setDiffTab('json')}
                className={`pb-2 text-xs font-bold border-b-2 transition-all ${
                  diffTab === 'json'
                    ? 'border-blue-500 text-white'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                Payload Bruto (JSON)
              </button>
            </div>

            {/* Conteúdo da Aba */}
            {diffTab === 'visual' ? (
              renderDiffTable(selectedLog)
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <span className="text-[11px] font-bold text-slate-400">Dados Anteriores (Before):</span>
                  <pre className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-[10px] text-slate-300 font-mono overflow-auto max-h-[220px]">
                    {selectedLog.previous_data ? JSON.stringify(selectedLog.previous_data, null, 2) : 'null'}
                  </pre>
                </div>
                <div className="space-y-1">
                  <span className="text-[11px] font-bold text-slate-400">Dados Novos (After):</span>
                  <pre className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-[10px] text-emerald-300 font-mono overflow-auto max-h-[220px]">
                    {selectedLog.new_data ? JSON.stringify(selectedLog.new_data, null, 2) : 'null'}
                  </pre>
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
};
