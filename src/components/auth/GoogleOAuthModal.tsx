import React, { useState } from 'react';
import { X, ShieldCheck, Mail, ArrowRight, UserCheck, Sparkles } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';

interface GoogleOAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GoogleOAuthModal: React.FC<GoogleOAuthModalProps> = ({ isOpen, onClose }) => {
  const { loginWithGoogle } = useAuth();
  const { success, error } = useNotification();
  const [customEmail, setCustomEmail] = useState('');
  const [customName, setCustomName] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedAccountEmail, setSelectedAccountEmail] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSelectAccount = async (email: string, name: string) => {
    setSelectedAccountEmail(email);
    setLoading(true);
    try {
      const res = await loginWithGoogle(email, name);
      if (res.success) {
        success('Autenticação Google Concluída', `Bem-vindo(a), ${name}! Conectado com acesso Administrador.`);
        onClose();
      } else {
        error('Falha no Login Google', res.error || 'Não foi possível conectar com o Google.');
      }
    } catch (e: any) {
      error('Erro ao conectar', e.message || 'Falha na comunicação com o provedor.');
    } finally {
      setLoading(false);
      setSelectedAccountEmail(null);
    }
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customEmail || !customEmail.includes('@')) {
      error('E-mail Inválido', 'Digite uma conta Google válida.');
      return;
    }
    const derivedName = customName.trim() || customEmail.split('@')[0].toUpperCase();
    handleSelectAccount(customEmail.trim().toLowerCase(), derivedName);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-md bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden p-6 relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          disabled={loading}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
          title="Fechar"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Google Header */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center shadow-md mb-3">
            <svg className="w-6 h-6" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.65v3h3.86c2.26-2.09 3.68-5.17 3.68-9.09z"/>
              <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.26v3.09C3.26 21.36 7.37 24 12 24z"/>
              <path fill="#FBBC05" d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.13-1.57.38-2.29V6.61H1.26C.46 8.23 0 10.06 0 12s.46 3.77 1.26 5.39l4.01-3.1z"/>
              <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.37 0 3.26 2.64 1.26 6.61l4.01 3.1c.95-2.85 3.6-4.96 6.73-4.96z"/>
            </svg>
          </div>
          <h2 className="text-lg font-bold text-white tracking-tight">Fazer login com o Google</h2>
          <p className="text-xs text-slate-400 mt-1 max-w-xs">
            Selecione uma conta Google Workspace corporativa para autenticar com perfil Administrador
          </p>
        </div>

        {!showCustomInput ? (
          <div className="space-y-2.5">
            {/* Account 1: Samuel Alves (Conta Principal) */}
            <button
              type="button"
              disabled={loading}
              onClick={() => handleSelectAccount('samuel8877alves@gmail.com', 'Samuel Alves')}
              className="w-full flex items-center justify-between p-3.5 rounded-xl border border-blue-500/40 bg-blue-950/20 hover:bg-blue-900/30 hover:border-blue-500/70 transition-all text-left group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-600/30 border border-blue-500/50 text-blue-300 flex items-center justify-center font-bold text-sm">
                  {selectedAccountEmail === 'samuel8877alves@gmail.com' ? (
                    <div className="w-4 h-4 border-2 border-blue-300/30 border-t-blue-300 rounded-full animate-spin" />
                  ) : (
                    'SA'
                  )}
                </div>
                <div>
                  <div className="text-sm font-semibold text-white group-hover:text-blue-300 transition-colors flex items-center gap-1.5">
                    <span>Samuel Alves</span>
                    <Sparkles className="w-3 h-3 text-amber-400" />
                  </div>
                  <div className="text-xs text-slate-400">samuel8877alves@gmail.com</div>
                </div>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 font-semibold border border-blue-500/30">
                Admin Master
              </span>
            </button>

            {/* Account 2: Diretoria Geral */}
            <button
              type="button"
              disabled={loading}
              onClick={() => handleSelectAccount('diretoria@saberx.com.br', 'Diretor Geral SaberX')}
              className="w-full flex items-center justify-between p-3.5 rounded-xl border border-slate-700/60 bg-slate-800/40 hover:bg-slate-800 hover:border-blue-500/50 transition-all text-left group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-700/50 border border-slate-600 text-slate-300 flex items-center justify-center font-bold text-sm">
                  {selectedAccountEmail === 'diretoria@saberx.com.br' ? (
                    <div className="w-4 h-4 border-2 border-slate-300/30 border-t-slate-300 rounded-full animate-spin" />
                  ) : (
                    'DG'
                  )}
                </div>
                <div>
                  <div className="text-sm font-semibold text-white group-hover:text-blue-400 transition-colors">
                    Diretor Geral SaberX
                  </div>
                  <div className="text-xs text-slate-400">diretoria@saberx.com.br</div>
                </div>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded bg-slate-700/60 text-slate-300 font-semibold">
                Admin Total
              </span>
            </button>

            {/* Account 3: Admin Google Workspace */}
            <button
              type="button"
              disabled={loading}
              onClick={() => handleSelectAccount('admin.google@saberx.com.br', 'Administrador Google Workspace')}
              className="w-full flex items-center justify-between p-3.5 rounded-xl border border-slate-700/60 bg-slate-800/40 hover:bg-slate-800 hover:border-emerald-500/50 transition-all text-left group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-600/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center font-bold text-sm">
                  {selectedAccountEmail === 'admin.google@saberx.com.br' ? (
                    <div className="w-4 h-4 border-2 border-emerald-300/30 border-t-emerald-300 rounded-full animate-spin" />
                  ) : (
                    'GW'
                  )}
                </div>
                <div>
                  <div className="text-sm font-semibold text-white group-hover:text-emerald-400 transition-colors">
                    Administrador Google Workspace
                  </div>
                  <div className="text-xs text-slate-400">admin.google@saberx.com.br</div>
                </div>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-semibold">
                Admin Total
              </span>
            </button>

            {/* Button to enter custom Google account */}
            <button
              type="button"
              disabled={loading}
              onClick={() => setShowCustomInput(true)}
              className="w-full py-2.5 px-4 rounded-xl border border-dashed border-slate-700 text-xs font-semibold text-slate-300 hover:text-white hover:border-slate-500 transition-colors flex items-center justify-center gap-2 mt-3"
            >
              <Mail className="w-3.5 h-3.5" />
              Usar outra conta Google (Gmail ou Corporativa)
            </button>
          </div>
        ) : (
          <form onSubmit={handleCustomSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                E-mail Google Corporativo ou Pessoal
              </label>
              <input
                type="email"
                placeholder="exemplo@gmail.com ou seu.nome@empresa.com.br"
                value={customEmail}
                onChange={(e) => setCustomEmail(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 bg-slate-950/80 border border-slate-700 rounded-xl text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Nome de Exibição (Opcional)
              </label>
              <input
                type="text"
                placeholder="Ex: Samuel Alves"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-950/80 border border-slate-700 rounded-xl text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowCustomInput(false)}
                className="flex-1 py-2.5 px-3 rounded-xl border border-slate-700 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
              >
                Voltar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white flex items-center justify-center gap-1.5 shadow-lg shadow-blue-600/30 transition-all disabled:opacity-50"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>Conectar Conta</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* Security badge */}
        <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-center gap-2 text-[11px] text-slate-500">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Autenticação Google corporativa com perfil ADMIN atribuído</span>
        </div>
      </div>
    </div>
  );
};
