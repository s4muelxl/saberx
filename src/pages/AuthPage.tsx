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
  AlertCircle
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { evaluatePasswordStrength, sanitizeString, isValidEmail, normalizeEmail, formatFriendlyErrorMessage } from '../lib/security';

export const AuthPage: React.FC = () => {
  const { login, signUp, loginWithGoogle, resetPassword } = useAuth();
  const { success, error } = useNotification();

  const [mode, setMode] = useState<'signin' | 'signup' | 'forgot'>('signin');
  const [loading, setLoading] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutSeconds, setLockoutSeconds] = useState(0);

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

    // 4. Validação de Formato RFC (Bloqueia samuel8877alves.gmail.com, samuel@.com, etc.)
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
        success('Acesso autorizado!', 'Bem-vindo ao SaberX.');
      } else {
        const nextAttempts = failedAttempts + 1;
        setFailedAttempts(nextAttempts);
        if (nextAttempts >= 5) {
          setLockoutSeconds(30);
          error('Tentativas Excedidas', 'Muitas tentativas sem sucesso. Aguarde 30 segundos.');
        } else {
          error('Falha na autenticação', formatFriendlyErrorMessage(res.error));
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
        role: 'ADMIN'
      });
      setLoading(false);

      if (res.success) {
        setFailedAttempts(0);
        success('Conta criada com sucesso!', 'Você já pode acessar o sistema SaberX.');
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

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      await loginWithGoogle();
    } catch (err: any) {
      error('Erro ao conectar com Google', err.message);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#080d18] flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Subtle background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0d1424] via-[#080d18] to-[#0a0f1e]" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-blue-900/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-[400px] relative z-10 space-y-5">

        {/* Logo e nome */}
        <div className="flex flex-col items-center gap-3 mb-2">
          {/* Logo SaberX - estilo cruzado premium */}
          <div className="relative">
            <svg viewBox="0 0 80 80" className="w-16 h-16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="80" height="80" rx="16" fill="#0d1424"/>
              <rect width="80" height="80" rx="16" fill="url(#logoGrad)" fillOpacity="0.15"/>
              {/* Cruz diagonal estilizada */}
              <path d="M18 18 L62 62" stroke="#cbd5e1" strokeWidth="5" strokeLinecap="round"/>
              <path d="M62 18 L18 62" stroke="#cbd5e1" strokeWidth="5" strokeLinecap="round"/>
              {/* Diagonais laterais formando X*/}
              <path d="M18 18 L40 40 L18 62" stroke="#94a3b8" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
              <path d="M62 18 L40 40 L62 62" stroke="#94a3b8" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
              <defs>
                <linearGradient id="logoGrad" x1="0" y1="0" x2="80" y2="80">
                  <stop offset="0%" stopColor="#3b82f6"/>
                  <stop offset="100%" stopColor="#6366f1"/>
                </linearGradient>
              </defs>
            </svg>
          </div>
          <div className="text-center">
            <h1 className="text-[26px] font-black text-white tracking-[0.18em]">SABERX</h1>
            <p className="text-[11px] text-slate-500 tracking-wider mt-0.5">SISTEMA DE COTAÇÃO & COMPRAS</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex bg-slate-900/80 border border-slate-800/80 rounded-xl p-1 gap-1 text-xs">
          {(['signin', 'signup', 'forgot'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`flex-1 py-2 font-semibold rounded-lg transition-all ${
                mode === m
                  ? 'bg-slate-700/80 text-white shadow'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {m === 'signin' ? 'Entrar' : m === 'signup' ? 'Criar Conta' : 'Recuperar'}
            </button>
          ))}
        </div>

        {/* Card do formulário */}
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 shadow-2xl backdrop-blur-sm">

          {/* Google OAuth - apenas login e cadastro */}
          {mode !== 'forgot' && (
            <div className="mb-5">
              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-xl border border-slate-700/80 bg-slate-800/50 hover:bg-slate-800 text-white text-[13px] font-semibold transition-all hover:border-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
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
                <span className="px-3 text-[10px] text-slate-600 font-semibold uppercase tracking-widest shrink-0">ou</span>
                <div className="flex-1 border-t border-slate-800" />
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            {/* Campos extras para cadastro */}
            {mode === 'signup' && (
              <>
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
                  placeholder="Nome da empresa"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  leftIcon={<Building className="w-4 h-4" />}
                  required
                />
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    label="Cargo"
                    placeholder="Comprador"
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
              label="E-mail"
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              leftIcon={<Mail className="w-4 h-4" />}
              required
            />

            {mode !== 'forgot' && (
              <div>
                <Input
                  label="Senha"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  leftIcon={<Lock className="w-4 h-4" />}
                  required
                />
                {/* Medidor de força da senha no cadastro */}
                {mode === 'signup' && password.length > 0 && (
                  <div className="mt-2 space-y-1">
                    <div className="flex justify-between text-[10px]">
                      <span className="text-slate-500">Segurança:</span>
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
              className="w-full mt-3"
              loading={loading}
              disabled={loading || lockoutSeconds > 0}
              icon={<ArrowRight className="w-4 h-4" />}
            >
              {lockoutSeconds > 0
                ? `Aguarde ${lockoutSeconds}s...`
                : mode === 'signin'
                ? 'Acessar'
                : mode === 'signup'
                ? 'Criar conta'
                : 'Enviar link'}
            </Button>
          </form>
        </div>

        {/* Rodapé de segurança */}
        <div className="flex items-center justify-center gap-1.5 text-[10px] text-slate-600">
          <Shield className="w-3 h-3" />
          <span>Acesso protegido · Supabase RLS · TLS 1.3</span>
        </div>
      </div>
    </div>
  );
};
