import React, { useState } from 'react';
import {
  Shield,
  Mail,
  Lock,
  ArrowRight,
  User,
  Building,
  Briefcase,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Sparkles,
  Zap,
  Database,
  CloudOff,
  Cloud
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { evaluatePasswordStrength, sanitizeString, isValidEmail, normalizeEmail, formatFriendlyErrorMessage } from '../lib/security';
import { GoogleOAuthModal } from '../components/auth/GoogleOAuthModal';
import { isSupabaseConfigured } from '../lib/supabase';

export const AuthPage: React.FC = () => {
  const { login, signUp, loginAsDemo, resetPassword, cloudSync, setCloudSync } = useAuth();
  const { success, error } = useNotification();

  const [mode, setMode] = useState<'signin' | 'signup' | 'forgot'>('signin');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutSeconds, setLockoutSeconds] = useState(0);
  const [googleModalOpen, setGoogleModalOpen] = useState(false);

  // Form fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [position, setPosition] = useState('');
  const [department, setDepartment] = useState('');

  // Contador regressivo de bloqueio por tentativas
  React.useEffect(() => {
    if (lockoutSeconds <= 0) return;
    const timer = setInterval(() => {
      setLockoutSeconds((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [lockoutSeconds]);

  const passwordStrength = evaluatePasswordStrength(password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 1. Verificação de Bloqueio por Força Bruta
    if (lockoutSeconds > 0) {
      error('Acesso Temporariamente Bloqueado', `Aguarde ${lockoutSeconds} segundos para tentar novamente.`);
      return;
    }

    // 2. Sanitização e Normalização Estrita
    const cleanEmail = normalizeEmail(email);

    // 3. Validação de Preenchimento
    if (!cleanEmail) {
      error('Campo Obrigatório', 'Por favor, informe seu endereço de e-mail.');
      return;
    }

    // 4. Validação de Formato de E-mail
    if (!isValidEmail(cleanEmail)) {
      error('Formato de E-mail Inválido', 'Digite um e-mail válido com @ e domínio completo (ex: nome@empresa.com).');
      return;
    }

    // 5. Validação de Senha Obrigatória no Login
    if (mode === 'signin') {
      if (!password) {
        error('Campo Obrigatório', 'Por favor, informe sua senha para acessar.');
        return;
      }

      setLoading(true);
      const res = await login(cleanEmail, password);
      setLoading(false);

      if (res.success) {
        setFailedAttempts(0);
        success('Acesso Autorizado!', 'Bem-vindo ao SaberX.');
      } else {
        const nextAttempts = failedAttempts + 1;
        setFailedAttempts(nextAttempts);
        if (nextAttempts >= 5) {
          setLockoutSeconds(30);
          error('Tentativas Excedidas', 'Muitas tentativas sem sucesso. Aguarde 30 segundos.');
        } else {
          error('Falha na Autenticação', formatFriendlyErrorMessage(res.error));
        }
      }
    } else if (mode === 'signup') {
      const cleanName = sanitizeString(fullName);
      const cleanCompany = sanitizeString(companyName);

      if (!cleanName || !cleanCompany) {
        error('Dados Incompletos', 'Preencha seu nome completo e a razão social da empresa.');
        return;
      }
      if (!password || password.length < 6) {
        error('Senha Muito Curta', 'A senha corporativa deve conter no mínimo 6 caracteres.');
        return;
      }

      setLoading(true);
      const res = await signUp(cleanEmail, password, {
        fullName: cleanName,
        companyName: cleanCompany,
        position: sanitizeString(position),
        department: sanitizeString(department),
        role: 'ADMIN',
      });
      setLoading(false);

      if (res.success) {
        setFailedAttempts(0);
        success('Conta Criada com Sucesso!', 'Você já está conectado ao sistema SaberX.');
      } else {
        error('Não foi possível cadastrar', formatFriendlyErrorMessage(res.error));
      }
    } else if (mode === 'forgot') {
      setLoading(true);
      const res = await resetPassword(cleanEmail);
      setLoading(false);

      if (res.success) {
        success('Instruções Enviadas!', 'Verifique sua caixa de entrada para redefinir a senha.');
        setMode('signin');
      } else {
        error('Erro ao redefinir', formatFriendlyErrorMessage(res.error));
      }
    }
  };

  const handleQuickDemoLogin = async (_role: 'ADMIN' | 'COMPRAS' | 'VENDAS' = 'ADMIN') => {
    setLoading(true);
    await loginAsDemo('ADMIN');
    setLoading(false);
    success('Acesso Autorizado', 'Conectado ao SaberX com Acesso Total de Administrador!');
  };

  return (
    <div className="min-h-screen bg-[#080d18] flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Background radial effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0d1424] via-[#080d18] to-[#0a0f1e]" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[450px] h-[250px] bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-[430px] relative z-10 space-y-4">

        {/* Logo and Brand Header */}
        <div className="flex flex-col items-center gap-2 mb-1">
          <div className="relative group">
            <svg viewBox="0 0 80 80" className="w-16 h-16 transition-transform group-hover:scale-105 duration-300" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="80" height="80" rx="18" fill="#0d1424"/>
              <rect width="80" height="80" rx="18" fill="url(#authGrad)" fillOpacity="0.2"/>
              <path d="M18 18 L62 62" stroke="#e2e8f0" strokeWidth="5" strokeLinecap="round"/>
              <path d="M62 18 L18 62" stroke="#e2e8f0" strokeWidth="5" strokeLinecap="round"/>
              <path d="M18 18 L40 40 L18 62" stroke="#60a5fa" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
              <path d="M62 18 L40 40 L62 62" stroke="#60a5fa" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
              <defs>
                <linearGradient id="authGrad" x1="0" y1="0" x2="80" y2="80">
                  <stop offset="0%" stopColor="#3b82f6"/>
                  <stop offset="100%" stopColor="#6366f1"/>
                </linearGradient>
              </defs>
            </svg>
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-black text-white tracking-[0.2em]">SABERX</h1>
            <p className="text-[11px] text-slate-400 tracking-wider font-medium">
              SISTEMA INTEGRADO DE COTAÇÃO & SUPRIMENTOS
            </p>
          </div>
        </div>

        {/* Engine mode status badge */}
        <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-800 text-[11px]">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-slate-300 font-medium">
              {cloudSync && isSupabaseConfigured() ? 'Conectado à Nuvem (Supabase)' : 'Motor Local Resiliente (Ativo & Seguro)'}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setCloudSync(!cloudSync)}
            className="text-[10px] text-blue-400 hover:text-blue-300 underline font-semibold transition-colors"
          >
            {cloudSync ? 'Usar Local' : 'Ativar Nuvem'}
          </button>
        </div>

        {/* Mode Tabs */}
        <div className="flex bg-slate-900/90 border border-slate-800 rounded-xl p-1 gap-1 text-xs">
          {(['signin', 'signup', 'forgot'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`flex-1 py-2 font-semibold rounded-lg transition-all ${
                mode === m
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {m === 'signin' ? 'Entrar' : m === 'signup' ? 'Criar Conta' : 'Recuperar Senha'}
            </button>
          ))}
        </div>

        {/* Main Card */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-2xl backdrop-blur-md">

          {/* Google Sign In Button */}
          {mode !== 'forgot' && (
            <div className="mb-5">
              <button
                type="button"
                onClick={() => setGoogleModalOpen(true)}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-white text-[13px] font-semibold transition-all hover:border-blue-500/50 shadow-sm disabled:opacity-50"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.65v3h3.86c2.26-2.09 3.68-5.17 3.68-9.09z"/>
                  <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.26v3.09C3.26 21.36 7.37 24 12 24z"/>
                  <path fill="#FBBC05" d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.13-1.57.38-2.29V6.61H1.26C.46 8.23 0 10.06 0 12s.46 3.77 1.26 5.39l4.01-3.1z"/>
                  <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.37 0 3.26 2.64 1.26 6.61l4.01 3.1c.95-2.85 3.6-4.96 6.73-4.96z"/>
                </svg>
                <span>Continuar com o Google</span>
              </button>

              <div className="relative my-4 flex items-center">
                <div className="flex-1 border-t border-slate-800" />
                <span className="px-3 text-[10px] text-slate-500 font-bold uppercase tracking-widest shrink-0">
                  ou acesse com e-mail
                </span>
                <div className="flex-1 border-t border-slate-800" />
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            {/* Campos extras para cadastro */}
            {mode === 'signup' && (
              <>
                <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/30 text-[11px] text-blue-200 flex items-start gap-2.5">
                  <Sparkles className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <p className="font-bold text-white">Ambiente Exclusivo & Limpo</p>
                    <p className="text-slate-300">
                      Ao criar sua conta, todas as informações de cotações e compras são zeradas para sua empresa iniciar do zero com <strong>Acesso Total de Administrador (ADMIN)</strong>.
                    </p>
                  </div>
                </div>
                <Input
                  label="Nome Completo"
                  placeholder="Seu nome"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  leftIcon={<User className="w-4 h-4" />}
                  required
                />
                <Input
                  label="Empresa / Razão Social"
                  placeholder="Razão social da empresa"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  leftIcon={<Building className="w-4 h-4" />}
                  required
                />
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    label="Cargo"
                    placeholder="Administrador / Comprador"
                    value={position}
                    onChange={(e) => setPosition(e.target.value)}
                    leftIcon={<Briefcase className="w-4 h-4" />}
                  />
                  <Input
                    label="Setor"
                    placeholder="Suprimentos / Diretoria"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                  />
                </div>
              </>
            )}

            <Input
              label="E-mail Corporativo"
              type="email"
              placeholder="seu@empresa.com.br"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              leftIcon={<Mail className="w-4 h-4" />}
              required
            />

            {mode !== 'forgot' && (
              <div>
                <div className="relative">
                  <Input
                    label="Senha"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    leftIcon={<Lock className="w-4 h-4" />}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-[34px] text-slate-400 hover:text-white transition-colors"
                    title={showPassword ? 'Ocultar senha' : 'Exibir senha'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {/* Medidor de força da senha no cadastro */}
                {mode === 'signup' && password.length > 0 && (
                  <div className="mt-2 space-y-1">
                    <div className="flex justify-between text-[10px]">
                      <span className="text-slate-400">Segurança da senha:</span>
                      <span style={{ color: passwordStrength.color }} className="font-semibold">
                        {passwordStrength.label}
                      </span>
                    </div>
                    <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden flex gap-0.5">
                      {[1, 2, 3, 4].map((step) => (
                        <div
                          key={step}
                          className="h-full flex-1 rounded-full transition-all"
                          style={{
                            backgroundColor: step <= passwordStrength.score ? passwordStrength.color : '#1e293b',
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
              className="w-full mt-3"
              loading={loading}
              disabled={loading || lockoutSeconds > 0}
              icon={<ArrowRight className="w-4 h-4" />}
            >
              {lockoutSeconds > 0
                ? `Aguarde ${lockoutSeconds}s...`
                : mode === 'signin'
                ? 'Entrar no SaberX'
                : mode === 'signup'
                ? 'Criar Conta e Acessar'
                : 'Recuperar Acesso'}
            </Button>
          </form>

          {/* Quick Demo Access Buttons */}
          {mode === 'signin' && (
            <div className="mt-6 pt-5 border-t border-slate-800">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300 mb-2.5">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>Acesso Imediato de Demonstração (1 Clique):</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => handleQuickDemoLogin('ADMIN')}
                  className="py-2 px-2 rounded-lg bg-blue-600/15 border border-blue-500/30 hover:bg-blue-600/30 text-blue-300 text-[11px] font-bold transition-all text-center"
                >
                  Admin Master
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickDemoLogin('COMPRAS')}
                  className="py-2 px-2 rounded-lg bg-emerald-600/15 border border-emerald-500/30 hover:bg-emerald-600/30 text-emerald-300 text-[11px] font-bold transition-all text-center"
                >
                  Compras
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickDemoLogin('VENDAS')}
                  className="py-2 px-2 rounded-lg bg-indigo-600/15 border border-indigo-500/30 hover:bg-indigo-600/30 text-indigo-300 text-[11px] font-bold transition-all text-center"
                >
                  Vendas
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Security & enterprise badge */}
        <div className="flex items-center justify-center gap-2 text-[11px] text-slate-500">
          <Shield className="w-3.5 h-3.5 text-slate-400" />
          <span>Plataforma Segura · Criptografia AES-256 · TLS 1.3</span>
        </div>
      </div>

      {/* Google OAuth Modal */}
      <GoogleOAuthModal
        isOpen={googleModalOpen}
        onClose={() => setGoogleModalOpen(false)}
      />
    </div>
  );
};
