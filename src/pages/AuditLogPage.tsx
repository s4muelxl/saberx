import React, { useState } from 'react';
import { ShieldAlert, Search, Filter, History, UserCheck, Clock } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { localStore } from '../lib/storage';
import { AuditLog } from '../types/audit';

export const AuditLogPage: React.FC = () => {
  const [logs] = useState<AuditLog[]>(() => localStore.getAuditLogs());
  const [search, setSearch] = useState('');

  const filteredLogs = logs.filter((l) => {
    const term = search.toLowerCase();
    return (
      l.action.toLowerCase().includes(term) ||
      (l.reason && l.reason.toLowerCase().includes(term)) ||
      (l.user_name && l.user_name.toLowerCase().includes(term)) ||
      l.entity.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
          <ShieldAlert className="w-6 h-6 text-purple-400" />
          Trilha de Auditoria & Conformidade
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Rastreabilidade completa de todas as alterações de preços, decisões manuais de menor preço, exclusões e aprovações
        </p>
      </div>

      <Card className="p-4">
        <Input
          placeholder="Pesquisar por ação, motivo, entidade ou usuário..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          leftIcon={<Search className="w-4 h-4" />}
        />
      </Card>

      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800">
                <th className="py-3 px-4">Data e Hora</th>
                <th className="py-3 px-4">Usuário</th>
                <th className="py-3 px-4">Ação</th>
                <th className="py-3 px-4">Entidade</th>
                <th className="py-3 px-4">Motivo / Justificativa</th>
                <th className="py-3 px-4 text-right">Dados Alterados</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    Nenhum log de auditoria encontrado.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/40">
                    <td className="py-3 px-4 font-mono text-slate-400">
                      {new Date(log.created_at).toLocaleString('pt-BR')}
                    </td>
                    <td className="py-3 px-4 font-medium text-white flex items-center gap-1.5">
                      <UserCheck className="w-3.5 h-3.5 text-blue-400" />
                      {log.user_name || 'Sistema'}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 font-bold border border-purple-500/30">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-300">
                      {log.entity}
                    </td>
                    <td className="py-3 px-4 text-slate-200">
                      {log.reason || '-'}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-[11px] text-slate-400">
                      {log.new_data ? JSON.stringify(log.new_data).substring(0, 45) + '...' : '-'}
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
