import React from 'react';
import {
  LayoutDashboard,
  FileSpreadsheet,
  ShoppingCart,
  TrendingUp,
  Package,
  Truck,
  Users,
  BarChart3,
  UploadCloud,
  ShieldAlert,
  Settings,
  UserCheck,
  ChevronRight,
  Sparkles,
  Layers
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export type ActivePage =
  | 'dashboard'
  | 'quotations'
  | 'purchases'
  | 'sales'
  | 'products'
  | 'suppliers'
  | 'customers'
  | 'excel-import'
  | 'reports'
  | 'audit'
  | 'users'
  | 'settings'
  | 'quotation-detail'
  | 'new-quotation';

interface SidebarProps {
  activePage: ActivePage;
  setActivePage: (page: ActivePage) => void;
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activePage,
  setActivePage,
  mobileOpen,
  setMobileOpen
}) => {
  const { role } = useAuth();

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['ADMIN', 'COMPRAS', 'VENDAS', 'VISUALIZADOR'] },
    { id: 'quotations', label: 'Cotações', icon: FileSpreadsheet, badge: 'Principal', roles: ['ADMIN', 'COMPRAS', 'VISUALIZADOR'] },
    { id: 'purchases', label: 'Compras', icon: ShoppingCart, roles: ['ADMIN', 'COMPRAS', 'VISUALIZADOR'] },
    { id: 'sales', label: 'Vendas', icon: TrendingUp, roles: ['ADMIN', 'VENDAS', 'VISUALIZADOR'] },
    { id: 'products', label: 'Banco de Produtos', icon: Package, roles: ['ADMIN', 'COMPRAS', 'VENDAS', 'VISUALIZADOR'] },
    { id: 'suppliers', label: 'Fornecedores', icon: Truck, roles: ['ADMIN', 'COMPRAS', 'VISUALIZADOR'] },
    { id: 'customers', label: 'Clientes', icon: Users, roles: ['ADMIN', 'VENDAS', 'VISUALIZADOR'] },
    { id: 'excel-import', label: 'Importar Excel', icon: UploadCloud, highlight: true, roles: ['ADMIN', 'COMPRAS'] },
    { id: 'reports', label: 'Relatórios', icon: BarChart3, roles: ['ADMIN', 'COMPRAS', 'VENDAS', 'VISUALIZADOR'] },
    { id: 'audit', label: 'Trilha de Auditoria', icon: ShieldAlert, roles: ['ADMIN'] },
    { id: 'users', label: 'Usuários & Perfis', icon: UserCheck, roles: ['ADMIN'] },
    { id: 'settings', label: 'Configurações', icon: Settings, roles: ['ADMIN'] },
  ];

  const handleNavClick = (pageId: string) => {
    setActivePage(pageId as ActivePage);
    setMobileOpen(false);
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/80 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-64 bg-slate-950/95 border-r border-slate-800/80 flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="flex items-center gap-3 px-5 h-16 border-b border-slate-800/80">
          {/* Logo SaberX SVG */}
          <svg viewBox="0 0 48 48" className="w-9 h-9 shrink-0" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="48" height="48" rx="10" fill="#0f172a"/>
            <path d="M9 9 L24 24 L39 9 M9 9 L24 24 L9 39 M39 9 L24 24 L39 39 M9 39 L24 24 L39 39" stroke="#94a3b8" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M9 9 L39 39 M39 9 L9 39" stroke="#e2e8f0" strokeWidth="3.5" strokeLinecap="round"/>
          </svg>
          <div>
            <div className="flex items-center">
              <span className="font-extrabold text-white text-[17px] tracking-widest">SABERX</span>
            </div>
            <p className="text-[10px] text-slate-500 font-medium tracking-wide">Cotação & Compras Metal</p>
          </div>
        </div>

        {/* Navigation list */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Módulos do Sistema
          </div>
          {navItems.map((item) => {
            const hasAccess = item.roles.includes(role);
            if (!hasAccess && role !== 'ADMIN') return null;

            const isActive = activePage === item.id || (item.id === 'quotations' && (activePage === 'quotation-detail' || activePage === 'new-quotation'));
            const Icon = item.icon;

            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all group ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900/80'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 transition-colors ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-blue-400'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge && !isActive && (
                  <span className="px-1.5 py-0.5 text-[9px] rounded bg-blue-500/20 text-blue-300 font-bold">
                    {item.badge}
                  </span>
                )}
                {item.highlight && !isActive && (
                  <span className="flex items-center gap-1 px-1.5 py-0.5 text-[9px] rounded bg-emerald-500/20 text-emerald-300 font-bold">
                    <Sparkles className="w-2.5 h-2.5" /> XLSX
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Footer simples sem plano */}
        <div className="p-4 border-t border-slate-800/60">
          <p className="text-[10px] text-slate-600 text-center">SaberX © {new Date().getFullYear()}</p>
        </div>
      </aside>
    </>
  );
};
