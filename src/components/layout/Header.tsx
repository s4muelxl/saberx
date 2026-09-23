import React, { useState } from 'react';
import { Menu, Database, Shield, LogOut, ChevronDown, Check, User, Sparkles } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types/database';
import { UserProfileModal } from './UserProfileModal';

interface HeaderProps {
  onMenuToggle: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onMenuToggle }) => {
  const { user, role, switchUserRole, logout, isDemoMode } = useAuth();
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);

  const rolesList: { role: UserRole; label: string; desc: string }[] = [
    { role: 'ADMIN', label: 'Administrador', desc: 'Acesso total a todas as áreas' },
    { role: 'COMPRAS', label: 'Compras', desc: 'Produtos, fornecedores, cotações e pedidos' },
    { role: 'VENDAS', label: 'Vendas', desc: 'Clientes, orçamentos e margem comercial' },
    { role: 'VISUALIZADOR', label: 'Visualizador', desc: 'Apenas visualização de relatórios' },
  ];

  return (
    <header className="sticky top-0 z-30 h-16 bg-slate-900/90 backdrop-blur-md border-b border-slate-800/80 px-4 lg:px-8 flex items-center justify-between">
      {/* Left side: Hamburger & Title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuToggle}
          className="lg:hidden text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-white tracking-tight">Indústria Metalúrgica SaberX</h2>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 font-mono">
              CNPJ: 12.345.678/0001-90
            </span>
          </div>
          <p className="text-[11px] text-slate-400 hidden sm:block">Plataforma Integrada de Suprimentos & Engenharia de Preços</p>
        </div>
      </div>

      {/* Right side: Database status, Role Selector & User */}
      <div className="flex items-center gap-3">
        {/* Connection status badge */}
        <div className="hidden md:flex items-center gap-2 px-2.5 py-1 rounded-full bg-slate-800 border border-slate-700/80 text-xs">
          <Database className={`w-3.5 h-3.5 ${isDemoMode ? 'text-amber-400' : 'text-emerald-400'}`} />
          <span className="text-slate-300 font-medium text-[11px]">
            {isDemoMode ? 'Modo Demo (Persistência Ativa)' : 'Supabase Conectado'}
          </span>
          <span className={`w-2 h-2 rounded-full ${isDemoMode ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'}`} />
        </div>

        {/* Role Switcher Pill */}
        <div className="relative">
          <button
            onClick={() => setRoleMenuOpen(!roleMenuOpen)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-600/10 hover:bg-blue-600/20 border border-blue-500/30 text-blue-400 text-xs font-semibold transition-colors"
          >
            <Shield className="w-3.5 h-3.5 text-blue-400" />
            <span>Perfil: <strong className="text-white font-bold">{role}</strong></span>
            <ChevronDown className="w-3.5 h-3.5 text-blue-400" />
          </button>

          {roleMenuOpen && (
            <>
              <div
                className="fixed inset-0 z-30"
                onClick={() => setRoleMenuOpen(false)}
              />
              <div className="absolute right-0 mt-2 w-64 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl py-2 z-40 animate-in fade-in zoom-in-95 duration-150">
                <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800">
                  Alternar Papel (Permissões)
                </div>
                {rolesList.map((r) => (
                  <button
                    key={r.role}
                    onClick={() => {
                      switchUserRole(r.role);
                      setRoleMenuOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 text-left hover:bg-slate-800 transition-colors ${
                      role === r.role ? 'bg-blue-600/15 text-blue-400' : 'text-slate-300'
                    }`}
                  >
                    <div>
                      <div className="text-xs font-bold text-white">{r.label}</div>
                      <div className="text-[10px] text-slate-400">{r.desc}</div>
                    </div>
                    {role === r.role && <Check className="w-4 h-4 text-blue-400 shrink-0" />}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* User Avatar & Logout */}
        <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
          <button
            onClick={() => setProfileModalOpen(true)}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity text-left p-1 rounded-lg hover:bg-slate-800"
            title="Ver e editar meu perfil"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-xs font-bold text-white border border-blue-400/30 shadow">
              {user?.full_name ? user.full_name.charAt(0).toUpperCase() : <User className="w-4 h-4" />}
            </div>
            <div className="hidden xl:block text-left text-xs">
              <div className="font-semibold text-slate-200 truncate max-w-[120px]">{user?.full_name}</div>
              <div className="text-[10px] text-slate-400 truncate max-w-[120px]">{user?.email}</div>
            </div>
          </button>
          <button
            onClick={() => logout()}
            title="Sair do sistema"
            className="text-slate-400 hover:text-rose-400 p-2 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      <UserProfileModal
        isOpen={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
      />
    </header>
  );
};
