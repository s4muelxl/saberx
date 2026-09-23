import React, { useState } from 'react';
import { Menu, Database, LogOut, User } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { UserProfileModal } from './UserProfileModal';

interface HeaderProps {
  onMenuToggle: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onMenuToggle }) => {
  const { user, logout, isDemoMode } = useAuth();
  const [profileModalOpen, setProfileModalOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 h-16 bg-slate-900/95 backdrop-blur-md border-b border-slate-800/80 px-4 lg:px-8 flex items-center justify-between">
      {/* Left: Hamburger + Company info */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuToggle}
          className="lg:hidden text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>
        {/* Logo SaberX no header (mobile / visible) */}
        <div className="flex items-center gap-2.5">
          <svg viewBox="0 0 48 48" className="w-7 h-7 shrink-0 lg:hidden" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="48" height="48" rx="10" fill="#0f172a"/>
            <path d="M9 9 L24 24 L39 9 M9 9 L24 24 L9 39 M39 9 L24 24 L39 39 M9 39 L24 24 L39 39" stroke="#94a3b8" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M9 9 L39 39 M39 9 L9 39" stroke="#e2e8f0" strokeWidth="3.5" strokeLinecap="round"/>
          </svg>
          <div>
            <h2 className="text-sm font-bold text-white tracking-tight">
              {user?.organization_name || 'SaberX Suprimentos'}
            </h2>
            <p className="text-[11px] text-slate-500 hidden sm:block">
              Sistema Integrado de Cotação & Compras
            </p>
          </div>
        </div>
      </div>

      {/* Right: status + user */}
      <div className="flex items-center gap-2.5">
        {/* Connection status */}
        <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800/80 border border-slate-700/60 text-[11px]">
          <Database className={`w-3 h-3 ${isDemoMode ? 'text-amber-400' : 'text-emerald-400'}`} />
          <span className="text-slate-400 font-medium">
            {isDemoMode ? 'Modo Local' : 'Supabase'}
          </span>
          <span className={`w-1.5 h-1.5 rounded-full ${isDemoMode ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'}`} />
        </div>

        {/* User avatar + info + logout */}
        <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
          <button
            onClick={() => setProfileModalOpen(true)}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity p-1 rounded-lg hover:bg-slate-800"
            title="Ver meu perfil"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-slate-700 to-slate-600 flex items-center justify-center text-xs font-bold text-white border border-slate-600/40 shadow">
              {user?.full_name ? user.full_name.charAt(0).toUpperCase() : <User className="w-4 h-4" />}
            </div>
            <div className="hidden xl:block text-left text-xs">
              <div className="font-semibold text-slate-200 truncate max-w-[130px]">{user?.full_name}</div>
              <div className="text-[10px] text-slate-500 truncate max-w-[130px]">{user?.role}</div>
            </div>
          </button>
          <button
            onClick={() => logout()}
            title="Sair do sistema"
            className="text-slate-500 hover:text-rose-400 p-2 rounded-lg hover:bg-slate-800 transition-colors"
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
