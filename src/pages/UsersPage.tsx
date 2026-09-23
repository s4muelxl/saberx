import React, { useState } from 'react';
import { UserCheck, Shield, Plus, Mail, Phone, Briefcase } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { localStore } from '../lib/storage';
import { UserProfile, UserRole } from '../types/database';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';

export const UsersPage: React.FC = () => {
  const { user, switchUserRole } = useAuth();
  const { success } = useNotification();
  const [users] = useState<UserProfile[]>(() => localStore.getUsers());

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
          <UserCheck className="w-6 h-6 text-blue-500" />
          Usuários & Controle de Acesso (RBAC)
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Perfis de acesso: ADMIN, COMPRAS, VENDAS e VISUALIZADOR com isolamento de dados por organização
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {users.map((u) => (
          <Card key={u.id} className="space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-600/20 text-blue-400 flex items-center justify-center font-bold text-base border border-blue-500/30">
                  {u.full_name.charAt(0)}
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">{u.full_name}</h3>
                  <p className="text-xs text-slate-400">{u.position}</p>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-600/20 text-blue-400 border border-blue-500/30">
                {u.role}
              </span>
            </div>

            <div className="space-y-1.5 text-xs text-slate-300 pt-2 border-t border-slate-800">
              <div className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                <span>{u.email}</span>
              </div>
              <div className="flex items-center gap-2">
                <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                <span>{u.department}</span>
              </div>
            </div>

            <div className="pt-2">
              <Button
                variant={user?.email === u.email ? 'secondary' : 'outline'}
                size="sm"
                className="w-full"
                onClick={() => {
                  switchUserRole(u.role);
                  success(`Alternado para o perfil ${u.role}!`);
                }}
              >
                {user?.email === u.email ? 'Perfil Ativo' : `Alternar para ${u.role}`}
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};
