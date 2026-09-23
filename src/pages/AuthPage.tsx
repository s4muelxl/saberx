import React, { useState } from 'react';
import {
  Layers,
  Shield,
  Mail,
  Lock,
  ArrowRight,
  Database,
  Building,
  User,
  Briefcase,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { evaluatePasswordStrength, sanitizeString } from '../lib/security';

export const AuthPage: React.FC = () => {
  const { login, signUp, loginWithGoogle, resetPassword, isDemoMode } = useAuth();
  const { success, error } = useNotification();

  const [mode, setMode] = useState<'signin' | 'signup' | 'forgot'>('signin');
  const [loading, setLoading] = useState(false);

  // Form Fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [position, setPosition] = useState('');
  const [department, setDepartment] = useState('');

  const passwordStrength = evaluatePasswordStrength(password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) {
      error('Por favor, informe seu e-mail corporativo.');
      return;
    }

    setLoading(true);

    if (mode === 'signin') {
      const res = await login(sanitizeString(email), password);
      setLoading(false);
      if (res.success) {
        success('Login efetuado com sucesso!', 'Bem-vindo ao SaberX.');
      } else {
        error('Falha na autenticação', res.error || 'Credenciais inválidas.');
      }
    } else if (mode === 'signup') {
      if (!fullName.trim() || !companyName.trim()) {
        setLoading(false);
        error('Preencha seu nome e a razão social da empresa.');
        return;
      }
      if (password.length < 6) {
        setLoading(false);
        error('A senha deve conter no mínimo 6 caracteres.');
        return;
      }

      const res = await signUp(sanitizeString(email), password, {
        fullName: sanitizeString(fullName),
        companyName: sanitizeString(companyName),
        position: sanitizeString(position),
        department: sanitizeString(department),
        role: 'ADMIN'
      });
      setLoading(false);
      if (res.success) {
        success('Conta criada com sucesso!', 'Você já está conectado.');
      } else {
        error('Não foi possível criar a conta', res.error);
      }
    } else if (mode === 'forgot') {
      const res = await resetPassword(sanitizeString(email));
      setLoading(false);
      if (res.success) {
        success('E-mail enviado!', 'Instruções de redefinição foram enviadas para seu e-mail.');
        setMode('signin');
      } else {
        error('Erro ao solicitar redefinição', res.error);
      }
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      await loginWithGoogle();
      success('Conectando via Google...', 'Aguarde o redirecionamento seguro.');
    } catch (err: any) {
      error('Erro ao conectar com Google', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemo = async (demoEmail: string) => {
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
            Plataforma Corporativa de Cotações, Compras & Engenharia de Preços
          </p>
        </div>

        {/* Tabs Switcher */}
        <div className="flex bg-slate-900 border border-slate-800 rounded-xl p-1 gap-1 text-xs">
          <button
            type="button"
            onClick={() => setMode('signin')}
            className={`flex-1 py-2 font-bold rounded-lg transition-all ${
              mode === 'signin' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            Acessar Conta
          </button>
          <button
            type="button"
            onClick={() => setMode('signup')}
            className={`flex-1 py-2 font-bold rounded-lg transition-all ${
              mode === 'signup' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            Criar Conta
          </button>
          <button
            type="button"
            onClick={() => setMode('forgot')}
            className={`flex-1 py-2 font-bold rounded-lg transition-all ${
              mode === 'forgot' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            Recuperar
          </button>
        </div>

        {/* Main Form Card */}
        <Card className="p-6 border-slate-800 shadow-2xl">
          {/* Google OAuth Button */}
          {mode !== 'forgot' && (
            <div className="mb-4">
              <button
                type="button"
                onClick={handleGoogleLogin}
                className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-xl border border-slate-700 bg-slate-900/90 hover:bg-slate-800 text-white text-xs font-bold transition-all shadow hover:border-slate-500 active:scale-[0.99] cursor-pointer"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.65v3h3.86c2.26-2.09 3.68-5.17 3.68-9.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.26v3.09C3.26 21.36 7.37 24 12 24z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.13-1.57.38-2.29V6.61H1.26C.46 8.23 0 10.06 0 12s.46 3.77 1.26 5.39l4.01-3.1z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.37 0 3.26 2.64 1.26 6.61l4.01 3.1c.95-2.85 3.6-4.96 6.73-4.96z"
                  />
                </svg>
                <span>Continuar com o Google</span>
              </button>

              <div className="relative my-4 flex items-center justify-center">
                <div className="border-t border-slate-800 w-full" />
                <span className="bg-slate-900 px-3 text-[10px] text-slate-500 font-semibold uppercase tracking-wider absolute">
                  ou use e-mail corporativo
                </span>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            {/* Campos adicionais para Cadastro (Sign Up) */}
            {mode === 'signup' && (
              <>
                <Input
                  label="Nome Completo *"
                  placeholder="Carlos Alberto Santos"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  leftIcon={<User className="w-4 h-4" />}
                  required
                />
                <Input
                  label="Empresa / Razão Social *"
                  placeholder="Mineração & Aço S.A."
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  leftIcon={<Building className="w-4 h-4" />}
                  required
                />
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    label="Cargo"
                    placeholder="Comprador Sênior"
                    value={position}
                    onChange={(e) => setPosition(e.target.value)}
                    leftIcon={<Briefcase className="w-4 h-4" />}
                  />
                  <Input
                    label="Setor"
                    placeholder="Suprimentos"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                  />
                </div>
              </>
            )}

            <Input
              label="E-mail Corporativo *"
              type="email"
              placeholder="seu.email@empresa.com.br"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              leftIcon={<Mail className="w-4 h-4" />}
              required
            />

            {mode !== 'forgot' && (
              <div>
                <Input
                  label="Senha de Acesso *"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  leftIcon={<Lock className="w-4 h-4" />}
                  required
                />

                {/* Password Strength Meter no Cadastro */}
                {mode === 'signup' && password.length > 0 && (
                  <div className="mt-2 space-y-1">
                    <div className="flex justify-between text-[10px]">
                      <span className="text-slate-400">Segurança da Senha:</span>
                      <span style={{ color: passwordStrength.color }} className="font-bold">
                        {passwordStrength.label}
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden flex gap-1">
                      {[1, 2, 3, 4].map((step) => (
                        <div
                          key={step}
                          className="h-full flex-1 transition-all rounded-full"
                          style={{
                            backgroundColor: step <= passwordStrength.score ? passwordStrength.color : '#1e293b'
                          }}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <Button
              type="submit"
              variant="primary"
              className="w-full mt-2"
              loading={loading}
              icon={<ArrowRight className="w-4 h-4" />}
            >
              {mode === 'signin' && 'Acessar Plataforma'}
              {mode === 'signup' && 'Criar Conta e Organização'}
              {mode === 'forgot' && 'Enviar Link de Redefinição'}
            </Button>
          </form>

          {/* Quick Demo Access Buttons */}
          <div className="mt-5 pt-4 border-t border-slate-800/80">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2.5">
              <span className="font-semibold text-slate-300">Acesso Rápido de Teste (Demo):</span>
              <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-mono">
                <Database className="w-3 h-3" /> Supabase Ativo
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleQuickDemo('admin@demo.local')}
                className="p-2 rounded-lg bg-slate-900 border border-slate-700/80 hover:border-blue-500 text-left transition-all group"
              >
                <div className="text-[11px] font-bold text-white group-hover:text-blue-400">Admin</div>
                <div className="text-[9px] text-slate-400">Diretoria</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickDemo('compras@demo.local')}
                className="p-2 rounded-lg bg-slate-900 border border-slate-700/80 hover:border-blue-500 text-left transition-all group"
              >
                <div className="text-[11px] font-bold text-white group-hover:text-blue-400">Compras</div>
                <div className="text-[9px] text-slate-400">Cotações</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickDemo('vendas@demo.local')}
                className="p-2 rounded-lg bg-slate-900 border border-slate-700/80 hover:border-blue-500 text-left transition-all group"
              >
                <div className="text-[11px] font-bold text-white group-hover:text-blue-400">Vendas</div>
                <div className="text-[9px] text-slate-400">Orçamentos</div>
              </button>
            </div>
          </div>
        </Card>

        {/* Security badge footer */}
        <div className="flex items-center justify-center gap-2 text-[11px] text-slate-500">
          <Shield className="w-3.5 h-3.5 text-blue-500" />
          <span>Isolamento seguro de dados multi-tenant via Supabase RLS & Criptografia TLS 1.3</span>
        </div>
      </div>
    </div>
  );
};
