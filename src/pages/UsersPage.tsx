import React, { useState, useMemo } from 'react';
import {
  UserCheck,
  Shield,
  Plus,
  Mail,
  Phone,
  Briefcase,
  Search,
  Edit2,
  CheckCircle2,
  XCircle,
  Trash2,
  Lock,
  Building,
  AlertCircle,
  Users,
  ShieldCheck,
  Check,
  X
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { localStore, DEMO_ORG_ID } from '../lib/storage';
import { UserProfile, UserRole } from '../types/database';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';

export const UsersPage: React.FC = () => {
  const { user: currentUser } = useAuth();
  const { success, error, info } = useNotification();
  const [users, setUsers] = useState<UserProfile[]>(() => localStore.getUsers());

  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

  // Modal de Criação / Edição
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);

  // Form states
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPosition, setFormPosition] = useState('');
  const [formDepartment, setFormDepartment] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formRole, setFormRole] = useState<UserRole>('ADMIN');
  const [formPassword, setFormPassword] = useState('');
  const [formActive, setFormActive] = useState(true);

  const refreshUserList = () => {
    setUsers(localStore.getUsers());
  };

  const handleOpenCreateModal = () => {
    setEditingUser(null);
    setFormName('');
    setFormEmail('');
    setFormPosition('Comprador Técnico Pleno');
    setFormDepartment('Suprimentos & Logística');
    setFormPhone('');
    setFormRole('ADMIN');
    setFormPassword('');
    setFormActive(true);
    setModalOpen(true);
  };

  const handleOpenEditModal = (target: UserProfile) => {
    setEditingUser(target);
    setFormName(target.full_name);
    setFormEmail(target.email);
    setFormPosition(target.position || '');
    setFormDepartment(target.department || '');
    setFormPhone(target.phone || '');
    setFormRole(target.role);
    setFormPassword('');
    setFormActive(target.is_active);
    setModalOpen(true);
  };

  const handleSaveUser = () => {
    if (!formName.trim() || !formEmail.trim()) {
      error('Campos Obrigatórios', 'Nome completo e e-mail corporativo são obrigatórios.');
      return;
    }

    if (!formEmail.includes('@') || !formEmail.includes('.')) {
      error('E-mail Inválido', 'Informe um e-mail corporativo válido.');
      return;
    }

    if (editingUser) {
      // Atualização
      const updated: UserProfile = {
        ...editingUser,
        full_name: formName.trim(),
        email: formEmail.trim().toLowerCase(),
        position: formPosition.trim(),
        department: formDepartment.trim(),
        phone: formPhone.trim(),
        role: formRole,
        is_active: formActive,
        updated_at: new Date().toISOString()
      };

      localStore.saveUser(updated, formPassword ? formPassword : undefined);
      localStore.logAudit({
        organization_id: DEMO_ORG_ID,
        user_id: currentUser?.id,
        user_name: currentUser?.full_name,
        action: 'USUARIO_ATUALIZADO',
        entity: 'users',
        entity_id: updated.id,
        new_data: { full_name: updated.full_name, email: updated.email, role: updated.role, is_active: updated.is_active },
        reason: `Atualização de cadastro e permissões de ${updated.full_name}`
      });

      success('Usuário Atualizado', `${updated.full_name} foi salvo com sucesso.`);
    } else {
      // Novo Usuário
      const newUser: UserProfile = {
        id: `usr-${Date.now()}`,
        organization_id: DEMO_ORG_ID,
        full_name: formName.trim(),
        email: formEmail.trim().toLowerCase(),
        position: formPosition.trim() || 'Colaborador',
        department: formDepartment.trim() || 'Geral',
        phone: formPhone.trim(),
        role: formRole,
        is_active: formActive,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      localStore.saveUser(newUser, formPassword ? formPassword : 'password123');
      localStore.logAudit({
        organization_id: DEMO_ORG_ID,
        user_id: currentUser?.id,
        user_name: currentUser?.full_name,
        action: 'USUARIO_CRIADO',
        entity: 'users',
        entity_id: newUser.id,
        new_data: { full_name: newUser.full_name, email: newUser.email, role: newUser.role },
        reason: `Cadastro de novo usuário corporativo ${newUser.full_name}`
      });

      success('Usuário Cadastrado', `${newUser.full_name} foi adicionado à organização.`);
    }

    refreshUserList();
    setModalOpen(false);
  };

  const handleToggleStatus = (target: UserProfile) => {
    if (target.email === currentUser?.email) {
      error('Ação Não Permitida', 'Você não pode desativar seu próprio usuário em sessão.');
      return;
    }

    const updated = { ...target, is_active: !target.is_active, updated_at: new Date().toISOString() };
    localStore.saveUser(updated);
    localStore.logAudit({
      organization_id: DEMO_ORG_ID,
      user_id: currentUser?.id,
      user_name: currentUser?.full_name,
      action: updated.is_active ? 'USUARIO_ATIVADO' : 'USUARIO_DESATIVADO',
      entity: 'users',
      entity_id: updated.id,
      reason: `Alteração de status do usuário ${updated.full_name} para ${updated.is_active ? 'ATIVO' : 'INATIVO'}`
    });

    refreshUserList();
    info(`Status de ${target.full_name} alterado para ${updated.is_active ? 'Ativo' : 'Inativo'}.`);
  };

  const handleDeleteUser = (target: UserProfile) => {
    if (target.email === currentUser?.email) {
      error('Ação Não Permitida', 'Você não pode excluir seu próprio usuário logado.');
      return;
    }

    if (window.confirm(`Confirma a exclusão permanente do usuário "${target.full_name}"?`)) {
      localStore.deleteUser(target.id);
      localStore.logAudit({
        organization_id: DEMO_ORG_ID,
        user_id: currentUser?.id,
        user_name: currentUser?.full_name,
        action: 'USUARIO_EXCLUIDO',
        entity: 'users',
        entity_id: target.id,
        reason: `Exclusão permanente do usuário ${target.full_name} (${target.email})`
      });

      refreshUserList();
      success('Usuário Removido', `${target.full_name} foi removido com sucesso.`);
    }
  };

  // Filtragem
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const match =
          u.full_name.toLowerCase().includes(term) ||
          u.email.toLowerCase().includes(term) ||
          (u.position && u.position.toLowerCase().includes(term)) ||
          (u.department && u.department.toLowerCase().includes(term));
        if (!match) return false;
      }

      if (roleFilter !== 'ALL' && u.role !== roleFilter) return false;
      if (statusFilter === 'ACTIVE' && !u.is_active) return false;
      if (statusFilter === 'INACTIVE' && u.is_active) return false;

      return true;
    });
  }, [users, searchTerm, roleFilter, statusFilter]);

  // Contadores
  const totalUsers = users.length;
  const countActive = users.filter((u) => u.is_active).length;
  const countAdmins = users.filter((u) => u.role === 'ADMIN').length;
  const countCompras = users.filter((u) => u.role === 'COMPRAS').length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans">
      {/* Header Corporativo */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-blue-500/15 text-blue-400 font-mono text-[10px] font-bold border border-blue-500/30">
              GOVERNANÇA & RBAC
            </span>
            <span className="text-xs text-slate-400 font-mono">CONTROLE DE ACESSO CORPORATIVO</span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2.5 mt-1">
            <UserCheck className="w-6 h-6 text-blue-500" />
            Gestão de Usuários & Controle de Acesso
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Administração de operadores, papéis de suprimentos e matriz de permissões da organização.
          </p>
        </div>

        <Button
          variant="primary"
          icon={<Plus className="w-4 h-4" />}
          onClick={handleOpenCreateModal}
        >
          Novo Usuário Corporativo
        </Button>
      </div>

      {/* Indicadores de Usuários */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>Total Cadastrado</span>
            <Users className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-black text-white font-mono mt-1">{totalUsers}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">{countActive} colaboradores ativos</div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>Administradores</span>
            <Shield className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-black text-purple-400 font-mono mt-1">{countAdmins}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Acesso total irrestrito</div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>Equipe de Compras</span>
            <Briefcase className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400 font-mono mt-1">{countCompras}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Cotações e mapas de TCO</div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>Segurança no Banco</span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-sm font-bold text-emerald-400 mt-2 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4" /> Multi-Tenant RLS
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">Isolamento criptográfico</div>
        </div>
      </div>

      {/* Barra de Filtros */}
      <Card className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <Input
            placeholder="Buscar por nome, e-mail, cargo ou setor..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            leftIcon={<Search className="w-4 h-4 text-slate-400" />}
          />

          <div>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg p-2.5 text-xs font-medium focus:outline-none focus:border-blue-500"
            >
              <option value="ALL">Todos os Papéis de Acesso</option>
              <option value="ADMIN">ADMIN (Diretoria & Adm)</option>
              <option value="COMPRAS">COMPRAS (Comprador Técnico)</option>
              <option value="VENDAS">VENDAS (Executivo Comercial)</option>
              <option value="VISUALIZADOR">VISUALIZADOR (Auditor / Fiscal)</option>
            </select>
          </div>

          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg p-2.5 text-xs font-medium focus:outline-none focus:border-blue-500"
            >
              <option value="ALL">Todos os Status</option>
              <option value="ACTIVE">Apenas Ativos</option>
              <option value="INACTIVE">Apenas Inativos</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Tabela de Usuários de Alta Densidade */}
      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800">
                <th className="py-2.5 px-4">Usuário</th>
                <th className="py-2.5 px-4">Cargo & Setor</th>
                <th className="py-2.5 px-4">Papel de Acesso</th>
                <th className="py-2.5 px-4">Contato</th>
                <th className="py-2.5 px-4 text-center">Status</th>
                <th className="py-2.5 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    Nenhum usuário encontrado com os filtros informados.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const isCurrent = u.email === currentUser?.email;
                  return (
                    <tr key={u.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-xs text-white">
                            {u.full_name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold text-white flex items-center gap-1.5">
                              <span>{u.full_name}</span>
                              {isCurrent && (
                                <span className="px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-300 text-[9px] font-bold">
                                  Você
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-400">{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-300">
                        <div className="font-medium text-white">{u.position || 'Não informado'}</div>
                        <div className="text-[11px] text-slate-500">{u.department || 'Geral'}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold border font-mono ${
                          u.role === 'ADMIN'
                            ? 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                            : u.role === 'COMPRAS'
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                            : u.role === 'VENDAS'
                            ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
                            : 'bg-slate-800 text-slate-300 border-slate-700'
                        }`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">
                        {u.phone || '-'}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {u.is_active ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                            Ativo
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 text-[10px] font-bold">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                            Inativo
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(u)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                            title="Editar Dados e Acesso"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(u)}
                            disabled={isCurrent}
                            className={`p-1.5 rounded-lg transition-colors ${
                              isCurrent
                                ? 'opacity-20 cursor-not-allowed'
                                : u.is_active
                                ? 'text-amber-400 hover:bg-slate-800'
                                : 'text-emerald-400 hover:bg-slate-800'
                            }`}
                            title={u.is_active ? 'Desativar Usuário' : 'Reativar Usuário'}
                          >
                            {u.is_active ? <XCircle className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteUser(u)}
                            disabled={isCurrent}
                            className={`p-1.5 rounded-lg transition-colors ${
                              isCurrent ? 'opacity-20 cursor-not-allowed' : 'text-slate-400 hover:text-rose-400 hover:bg-slate-800'
                            }`}
                            title="Excluir Usuário"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Matriz Visual de Governança RBAC */}
      <Card className="p-5 space-y-4">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Shield className="w-4 h-4 text-purple-400" />
            Matriz de Governança e Permissões Corporativas (RBAC Matrix)
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Definição de privilégios de controle de acesso para auditoria e conformidade com normas de compras industriais.
          </p>
        </div>

        <div className="overflow-x-auto border border-slate-800 rounded-xl">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800">
                <th className="py-2.5 px-4">Operação / Módulo</th>
                <th className="py-2.5 px-4 text-center text-blue-400 font-mono">ADMIN</th>
                <th className="py-2.5 px-4 text-center text-emerald-400 font-mono">COMPRAS</th>
                <th className="py-2.5 px-4 text-center text-indigo-400 font-mono">VENDAS</th>
                <th className="py-2.5 px-4 text-center text-slate-400 font-mono">VISUALIZADOR</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {[
                { op: 'Criar e Importar Mapas de Cotação (.xlsx)', admin: true, compras: true, vendas: false, view: false },
                { op: 'Decisão Manual de Fornecedor (Alteração de Vencedor TCO)', admin: true, compras: true, vendas: false, view: false },
                { op: 'Emissão e Aprovação de Pedidos de Compra (PC)', admin: true, compras: true, vendas: false, view: false },
                { op: 'Orçamentos de Venda e Margem Comercial', admin: true, compras: false, vendas: true, view: false },
                { op: 'Inspeção da Trilha de Auditoria & Logs', admin: true, compras: false, vendas: false, view: true },
                { op: 'Gestão de Usuários & Parâmetros do Sistema', admin: true, compras: false, vendas: false, view: false },
              ].map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-800/30">
                  <td className="py-2.5 px-4 text-slate-300 font-medium">{row.op}</td>
                  <td className="py-2.5 px-4 text-center">
                    {row.admin ? <Check className="w-4 h-4 text-blue-400 mx-auto" /> : <X className="w-4 h-4 text-slate-600 mx-auto" />}
                  </td>
                  <td className="py-2.5 px-4 text-center">
                    {row.compras ? <Check className="w-4 h-4 text-emerald-400 mx-auto" /> : <X className="w-4 h-4 text-slate-600 mx-auto" />}
                  </td>
                  <td className="py-2.5 px-4 text-center">
                    {row.vendas ? <Check className="w-4 h-4 text-indigo-400 mx-auto" /> : <X className="w-4 h-4 text-slate-600 mx-auto" />}
                  </td>
                  <td className="py-2.5 px-4 text-center">
                    {row.view ? <Check className="w-4 h-4 text-slate-300 mx-auto" /> : <X className="w-4 h-4 text-slate-600 mx-auto" />}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modal de Criação / Edição de Usuário */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingUser ? `Editar Usuário: ${editingUser.full_name}` : 'Cadastrar Novo Usuário Corporativo'}
        subtitle="Controle de credenciais e permissões na organização"
        maxWidth="md"
        footer={
          <>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button variant="primary" onClick={handleSaveUser}>Salvar Colaborador</Button>
          </>
        }
      >
        <div className="space-y-3.5 text-xs font-sans">
          <Input
            label="Nome Completo *"
            placeholder="Ex: Amanda Silva"
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
            required
          />

          <Input
            label="E-mail Corporativo *"
            type="email"
            placeholder="amanda@empresa.com.br"
            value={formEmail}
            onChange={(e) => setFormEmail(e.target.value)}
            required
          />

          <div className="grid grid-cols-2 gap-2.5">
            <Input
              label="Cargo"
              placeholder="Ex: Comprador Sênior"
              value={formPosition}
              onChange={(e) => setFormPosition(e.target.value)}
            />
            <Input
              label="Departamento / Setor"
              placeholder="Ex: Suprimentos"
              value={formDepartment}
              onChange={(e) => setFormDepartment(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <Input
              label="Telefone / Ramal"
              placeholder="(11) 98888-0000"
              value={formPhone}
              onChange={(e) => setFormPhone(e.target.value)}
            />
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Papel de Acesso (RBAC) *
              </label>
              <select
                value={formRole}
                onChange={(e) => setFormRole(e.target.value as UserRole)}
                className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg p-2.5 text-xs font-medium focus:outline-none focus:border-blue-500"
              >
                <option value="ADMIN">ADMIN (Administrador Master)</option>
                <option value="COMPRAS">COMPRAS (Comprador Técnico)</option>
                <option value="VENDAS">VENDAS (Executivo Comercial)</option>
                <option value="VISUALIZADOR">VISUALIZADOR (Auditor / Fiscal)</option>
              </select>
            </div>
          </div>

          <Input
            label={editingUser ? 'Alterar Senha (Opcional)' : 'Senha Provisória (Mínimo 6 dígitos)'}
            type="password"
            placeholder="••••••••"
            value={formPassword}
            onChange={(e) => setFormPassword(e.target.value)}
          />

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="user-active-checkbox"
              checked={formActive}
              onChange={(e) => setFormActive(e.target.checked)}
              className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-blue-500 cursor-pointer"
            />
            <label htmlFor="user-active-checkbox" className="text-slate-300 cursor-pointer select-none">
              Conta de usuário ativa e autorizada a realizar login
            </label>
          </div>
        </div>
      </Modal>
    </div>
  );
};
