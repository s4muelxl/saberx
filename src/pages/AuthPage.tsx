import React, { useState } from 'react';
import { Layers, Shield, Mail, Lock, Sparkles, ArrowRight, Database } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';

export const AuthPage: React.FC = () => {
  const { login, isDemoMode } = useAuth();
  const { success, error } = useNotification();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      error('Informe seu e-mail.');
      return;
    }
    setLoading(true);
    const ok = await login(email, password);
    setLoading(false);
    if (ok) {
      success('Login realizado com sucesso!');
    } else {
      error('Não foi possível realizar o login.', 'Verifique suas credenciais.');
    }
  };

  const handleQuickLogin = async (demoEmail: string) => {
    setEmail(demoEmail);
    setLoading(true);
    await login(demoEmail);
    setLoading(false);
    success(`Conectado como ${demoEmail.split('@')[0].toUpperCase()}!`);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/3 w-80 h-80 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10 space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 items-center justify-center text-white shadow-xl shadow-blue-500/25 mb-1">
            <Layers className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            SABER<span className="text-blue-500">X</span>
          </h1>
          <p className="text-xs text-slate-400">
            Sistema Integrado de Cotação, Compras e Vendas Siderúrgicas
          </p>
        </div>

        {/* Login Card */}
        <Card className="p-6 border-slate-800 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="E-mail Corporativo"
              type="email"
              placeholder="seu.email@empresa.com.br"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              leftIcon={<Mail className="w-4 h-4" />}
              required
            />

            <Input
              label="Senha de Acesso"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              leftIcon={<Lock className="w-4 h-4" />}
            />

            <Button
              type="submit"
              variant="primary"
              className="w-full"
              loading={loading}
              icon={<ArrowRight className="w-4 h-4" />}
            >
              Acessar Sistema
            </Button>
          </form>

          {/* Quick Demo Access Buttons */}
          <div className="mt-6 pt-5 border-t border-slate-800/80">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-3">
              <span className="font-semibold text-slate-300">Acesso Rápido de Teste (Demo):</span>
              <span className="flex items-center gap-1 text-[11px] text-amber-400">
                <Database className="w-3 h-3" /> {isDemoMode ? 'Modo Local' : 'Supabase'}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleQuickLogin('admin@demo.local')}
                className="p-2 rounded-lg bg-slate-900 border border-slate-700/80 hover:border-blue-500 text-left transition-all group"
              >
                <div className="text-[11px] font-bold text-white group-hover:text-blue-400">Admin</div>
                <div className="text-[9px] text-slate-400">Acesso Total</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('compras@demo.local')}
                className="p-2 rounded-lg bg-slate-900 border border-slate-700/80 hover:border-blue-500 text-left transition-all group"
              >
                <div className="text-[11px] font-bold text-white group-hover:text-blue-400">Compras</div>
                <div className="text-[9px] text-slate-400">Cotações & POs</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('vendas@demo.local')}
                className="p-2 rounded-lg bg-slate-900 border border-slate-700/80 hover:border-blue-500 text-left transition-all group"
              >
                <div className="text-[11px] font-bold text-white group-hover:text-blue-400">Vendas</div>
                <div className="text-[9px] text-slate-400">Margem Comercial</div>
              </button>
            </div>
          </div>
        </Card>

        {/* Footer info */}
        <p className="text-center text-[11px] text-slate-500">
          Dados segregados por organização através de Supabase Row Level Security (RLS).
        </p>
      </div>
    </div>
  );
};
