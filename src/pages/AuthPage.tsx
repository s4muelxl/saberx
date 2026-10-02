import React, { useState, useEffect } from 'react';
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
  Info,
  Check,
  Settings2,
  Database,
  ExternalLink
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { GoogleOAuthModal } from '../components/auth/GoogleOAuthModal';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import {
  evaluatePasswordStrength,
  sanitizeString,
  isValidEmail,
  normalizeEmail,
  formatFriendlyErrorMessage
} from '../lib/security';
import {
  getSupabaseUrl,
  getSupabaseAnonKey,
  saveSupabaseConfig,
  testSupabaseConnection,
  ConnectionTestResult
} from '../lib/supabase';

export const AuthPage: React.FC = () => {
  const { login, signUp, resetPassword, loginWithGoogle } = useAuth();
  const { success, error, info } = useNotification();

  const [mode, setMode] = useState<'signin' | 'signup' | 'forgot'>('signin');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutSeconds, setLockoutSeconds] = useState(0);
  const [formError, setFormError] = useState<string | null>(null);
  const [resetSuccessMessage, setResetSuccessMessage] = useState<string | null>(null);

  // Modal de Configuração do Supabase
  const [configModalOpen, setConfigModalOpen] = useState(false);
  const [googleModalOpen, setGoogleModalOpen] = useState(false);
  const [customUrl, setCustomUrl] = useState(() => getSupabaseUrl());
  const [customKey, setCustomKey] = useState(() => getSupabaseAnonKey());
  const [testingConnection, setTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState<ConnectionTestResult | null>(null);

  // Form fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [position, setPosition] = useState('');
  const [department, setDepartment] = useState('');

  // Contador regressivo de bloqueio por tentativas excessivas
  useEffect(() => {
    if (lockoutSeconds <= 0) return;
    const timer = setInterval(() => {
      setLockoutSeconds((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [lockoutSeconds]);

  // Limpa erros ao alternar de aba
  useEffect(() => {
    setFormError(null);
    setResetSuccessMessage(null);
  }, [mode]);

  const passwordStrength = evaluatePasswordStrength(password);

  const handleGoogleLogin = () => {
    setFormError(null);
    setGoogleModalOpen(true);
  };

  const handleTestConnection = async () => {
    setTestingConnection(true);
    setTestResult(null);
    try {
      const res = await testSupabaseConnection(customUrl, customKey);
      setTestResult(res);
      if (res.success) {
        success('Conexão Supabase OK', res.message);
      } else {
        error('Falha no Teste', res.message);
      }
    } catch (e: any) {
      setTestResult({ success: false, message: e.message || 'Erro inesperado' });
    } finally {
      setTestingConnection(false);
    }
  };

  const handleSaveSupabaseConfig = () => {
    if (!customUrl.trim() || !customKey.trim()) {
      error('Campos Incompletos', 'Informe tanto a URL quanto a Anon Key do Supabase.');
      return;
    }
    saveSupabaseConfig(customUrl, customKey);
    success('Configuração Salva!', 'Credenciais do Supabase registradas. Tentando autorização Google...');
    setConfigModalOpen(false);
    setFormError(null);
    handleGoogleLogin();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setResetSuccessMessage(null);

    // 1. Verificação de Bloqueio por Força Bruta
    if (lockoutSeconds > 0) {
      setFormError(`Acesso temporariamente bloqueado. Aguarde ${lockoutSeconds} segundos.`);
      return;
    }

    // 2. Sanitização e Normalização Estrita
    const cleanEmail = normalizeEmail(email);

    // 3. Validação de Preenchimento
    if (!cleanEmail) {
      setFormError('Por favor, informe seu endereço de e-mail corporativo.');
      return;
    }

    // 4. Validação de Formato de E-mail
    if (!isValidEmail(cleanEmail)) {
      setFormError('Digite um e-mail corporativo válido (exemplo: usuario@empresa.com.br).');
      return;
    }

    // 5. Fluxo de LOGIN (SIGN IN)
    if (mode === 'signin') {
      if (!password) {
        setFormError('Por favor, informe sua senha de acesso.');
        return;
      }

      setLoading(true);
      const res = await login(cleanEmail, password);
      setLoading(false);

      if (res.success) {
        setFailedAttempts(0);
        success('Acesso Autorizado', 'Bem-vindo ao SaberX.');
      } else {
        const nextAttempts = failedAttempts + 1;
        setFailedAttempts(nextAttempts);
        if (nextAttempts >= 5) {
          setLockoutSeconds(30);
          setFormError('Muitas tentativas sem sucesso. Por segurança, aguarde 30 segundos.');
        } else {
          setFormError(formatFriendlyErrorMessage(res.error));
        }
      }
    }

    // 6. Fluxo de CADASTRO (SIGN UP)
    else if (mode === 'signup') {
      const cleanName = sanitizeString(fullName);
      const cleanCompany = sanitizeString(companyName);

      if (!cleanName || cleanName.length < 3) {
        setFormError('Informe seu nome completo (mínimo de 3 caracteres).');
        return;
      }
      if (!cleanCompany || cleanCompany.length < 2) {
        setFormError('Informe a razão social ou nome da sua organização.');
        return;
      }
      if (!password || password.length < 6) {
        setFormError('A senha corporativa deve conter no mínimo 6 caracteres.');
        return;
      }
      if (password !== confirmPassword) {
        setFormError('A confirmação de senha não coincide com a senha informada.');
        return;
      }

      setLoading(true);
      const res = await signUp(cleanEmail, password, {
        fullName: cleanName,
        companyName: cleanCompany,
        position: sanitizeString(position) || 'Administrador de Suprimentos',
        department: sanitizeString(department) || 'Diretoria & Suprimentos',
        role: 'ADMIN',
      });
      setLoading(false);

      if (res.success) {
        setFailedAttempts(0);
        success('Organização Criada com Sucesso!', 'Ambiente corporativo inicializado com perfil de Administrador.');
      } else {
        setFormError(formatFriendlyErrorMessage(res.error));
      }
    }

    // 7. Fluxo de RECUPERAÇÃO DE SENHA (FORGOT)
    else if (mode === 'forgot') {
      setLoading(true);
      const res = await resetPassword(cleanEmail);
      setLoading(false);

      if (res.success) {
        setResetSuccessMessage(
          `Instruções de recuperação foram enviadas para ${cleanEmail}. Caso a conta exista em nosso diretório, você receberá o link para criar uma nova senha.`
        );
        success('Solicitação Processada', 'Verifique sua caixa de entrada.');
      } else {
        setFormError(formatFriendlyErrorMessage(res.error));
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#070b14] flex flex-col justify-center items-center p-4 relative overflow-hidden font-sans">
      {/* Background ambient gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0c1322] via-[#070b14] to-[#05080f]" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[450px] h-[250px] bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-[440px] relative z-10 space-y-4">
        {/* Brand Header */}
        <div className="flex flex-col items-center gap-2 mb-2">
          <div className="relative group">
            <svg viewBox="0 0 80 80" className="w-14 h-14 transition-transform group-hover:scale-105 duration-300" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="80" height="80" rx="18" fill="#0c1527" stroke="#1e293b" strokeWidth="1.5" />
              <path d="M20 20 L60 60" stroke="#e2e8f0" strokeWidth="5" strokeLinecap="round" />
              <path d="M60 20 L20 60" stroke="#e2e8f0" strokeWidth="5" strokeLinecap="round" />
              <path d="M20 20 L40 40 L20 60" stroke="#3b82f6" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
              <path d="M60 20 L40 40 L60 60" stroke="#3b82f6" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            </svg>
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-black text-white tracking-[0.2em]">SABERX</h1>
            <p className="text-[11px] text-slate-400 tracking-wider font-semibold uppercase">
              SISTEMA INTEGRADO DE COTAÇÃO & SUPRIMENTOS
            </p>
          </div>
        </div>

        {/* Mode Navigation Tabs */}
        <div className="flex bg-slate-900/90 border border-slate-800/90 rounded-xl p-1 gap-1 text-xs">
          {(['signin', 'signup', 'forgot'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`flex-1 py-2 font-semibold rounded-lg transition-all ${
                mode === m
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              {m === 'signin' ? 'Acessar' : m === 'signup' ? 'Criar Conta' : 'Recuperar'}
            </button>
          ))}
        </div>

        {/* Form Container Card */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-2xl backdrop-blur-md">
          {/* Error Banner */}
          {formError && (
            <div className="mb-4 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5 animate-fadeIn">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
              <div className="flex-1 leading-relaxed">
                <div>{formError}</div>
                {formError.includes('Google OAuth') && (
                  <div className="mt-3 pt-2.5 border-t border-rose-500/20 flex flex-wrap items-center justify-between gap-2">
                    <span className="text-[11px] text-slate-300">
                      Configure as chaves do Supabase ou acesse diretamente com e-mail/senha.
                    </span>
                    <button
                      type="button"
                      onClick={() => setConfigModalOpen(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-[11px] shadow transition-colors"
                    >
                      <Settings2 className="w-3.5 h-3.5" />
                      Configurar Supabase / Google OAuth
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Success Reset Banner */}
          {resetSuccessMessage && (
            <div className="mb-4 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-start gap-2.5 animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
              <div className="flex-1 leading-relaxed">
                <p className="font-bold text-emerald-200">E-mail de Recuperação Enviado</p>
                <p className="text-slate-300 mt-0.5">{resetSuccessMessage}</p>
                <button
                  type="button"
                  onClick={() => setMode('signin')}
                  className="mt-2 text-xs font-bold text-emerald-400 hover:underline flex items-center gap-1"
                >
                  Retornar ao Login <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          )}

          {/* Real Google OAuth Button (Sem Mocks) */}
          {mode !== 'forgot' && (
            <div className="mb-5">
              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-xl border border-slate-700/80 bg-slate-800/80 hover:bg-slate-800 hover:border-blue-500/50 text-white text-xs font-bold transition-all shadow-sm disabled:opacity-50"
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
                  ou acesse com e-mail corporativo
                </span>
                <div className="flex-1 border-t border-slate-800" />
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            {/* Campos de Criação de Conta */}
            {mode === 'signup' && (
              <>
                <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/25 text-[11px] text-blue-200 flex items-start gap-2.5">
                  <Sparkles className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <p className="font-bold text-white">Ambiente Corporativo Isolado</p>
                    <p className="text-slate-300">
                      Sua conta será provisionada com <strong>Acesso Total de Administrador (ADMIN)</strong> para gerenciar cotações, pedidos e equipe.
                    </p>
                  </div>
                </div>

                <Input
                  label="Nome Completo *"
                  placeholder="Ex: Carlos Eduardo Silva"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  leftIcon={<User className="w-4 h-4" />}
                  required
                />

                <Input
                  label="Empresa / Razão Social *"
                  placeholder="Ex: Indústria Metalúrgica Brasil S.A."
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  leftIcon={<Building className="w-4 h-4" />}
                  required
                />

                <div className="grid grid-cols-2 gap-2">
                  <Input
                    label="Cargo"
                    placeholder="Ex: Diretor / Gerente"
                    value={position}
                    onChange={(e) => setPosition(e.target.value)}
                    leftIcon={<Briefcase className="w-4 h-4" />}
                  />
                  <Input
                    label="Setor / Departamento"
                    placeholder="Ex: Suprimentos"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                  />
                </div>
              </>
            )}

            {/* Campo E-mail (Todos os Modos) */}
            <Input
              label="E-mail Corporativo *"
              type="email"
              placeholder="seu.nome@empresa.com.br"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              leftIcon={<Mail className="w-4 h-4" />}
              required
            />

            {/* Campo Senha (SignIn e SignUp) */}
            {mode !== 'forgot' && (
              <div>
                <div className="relative">
                  <Input
                    label="Senha de Acesso *"
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
                      <span className="text-slate-400">Complexidade da senha:</span>
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

            {/* Campo de Confirmação de Senha (Apenas SignUp) */}
            {mode === 'signup' && (
              <div className="relative">
                <Input
                  label="Confirmar Senha *"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  leftIcon={<Lock className="w-4 h-4" />}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-[34px] text-slate-400 hover:text-white transition-colors"
                  title={showConfirmPassword ? 'Ocultar senha' : 'Exibir senha'}
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
                {confirmPassword && password !== confirmPassword && (
                  <p className="text-[10px] text-rose-400 mt-1">As senhas digitadas não conferem.</p>
                )}
                {confirmPassword && password === confirmPassword && (
                  <p className="text-[10px] text-emerald-400 mt-1 flex items-center gap-1">
                    <Check className="w-3 h-3" /> Senhas coincidem
                  </p>
                )}
              </div>
            )}

            {/* Link de Ajuda no Login */}
            {mode === 'signin' && (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setMode('forgot')}
                  className="text-[11px] text-blue-400 hover:text-blue-300 font-semibold transition-colors"
                >
                  Esqueceu a senha?
                </button>
              </div>
            )}

            {/* Botão de Submissão Principal */}
            <Button
              type="submit"
              variant="primary"
              className="w-full mt-4"
              loading={loading}
              disabled={loading || lockoutSeconds > 0}
              icon={<ArrowRight className="w-4 h-4" />}
            >
              {lockoutSeconds > 0
                ? `Aguarde ${lockoutSeconds}s...`
                : mode === 'signin'
                ? 'Entrar na Plataforma'
                : mode === 'signup'
                ? 'Criar Conta e Acessar'
                : 'Enviar Link de Recuperação'}
            </Button>
          </form>

          {/* Botão de retorno na tela de recuperação */}
          {mode === 'forgot' && (
            <div className="mt-4 pt-3 border-t border-slate-800 text-center">
              <button
                type="button"
                onClick={() => setMode('signin')}
                className="text-xs text-slate-400 hover:text-white transition-colors font-medium"
              >
                Lembrou sua senha? Retornar ao login
              </button>
            </div>
          )}
        </div>

        {/* Rodapé de Conformidade & Segurança Corporativa */}
        <div className="flex items-center justify-center gap-2 text-[11px] text-slate-500">
          <Shield className="w-3.5 h-3.5 text-slate-400" />
          <span>Plataforma Segura · Criptografia AES-256 · TLS 1.3 · ISO 27001</span>
        </div>
      </div>

      {/* Modal Técnico de Configuração do Supabase & Google OAuth */}
      <Modal
        isOpen={configModalOpen}
        onClose={() => setConfigModalOpen(false)}
        title="Configuração do Supabase & Google OAuth"
        subtitle="Informe as credenciais do seu projeto para ativar o fluxo oficial OAuth"
        maxWidth="md"
        footer={
          <>
            <Button variant="outline" onClick={() => setConfigModalOpen(false)}>Cancelar</Button>
            <Button
              variant="secondary"
              loading={testingConnection}
              onClick={handleTestConnection}
            >
              Testar Conexão
            </Button>
            <Button variant="primary" onClick={handleSaveSupabaseConfig}>
              Salvar e Conectar
            </Button>
          </>
        }
      >
        <div className="space-y-4 text-xs font-sans">
          <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/25 text-blue-200 text-xs space-y-1">
            <strong className="text-white block font-bold">Por que esta configuração é necessária?</strong>
            <p className="text-slate-300 leading-relaxed">
              Em conformidade com a diretriz <strong>Zero Mocks</strong>, o botão Google agora realiza o redirecionamento OAuth oficial da Google Cloud via Supabase.
            </p>
          </div>

          <Input
            label="Supabase URL (VITE_SUPABASE_URL) *"
            placeholder="https://seu-projeto.supabase.co"
            value={customUrl}
            onChange={(e) => setCustomUrl(e.target.value)}
            leftIcon={<Database className="w-4 h-4" />}
          />

          <Input
            label="Supabase Anon Key (VITE_SUPABASE_ANON_KEY) *"
            type="password"
            placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
            value={customKey}
            onChange={(e) => setCustomKey(e.target.value)}
            leftIcon={<Lock className="w-4 h-4" />}
          />

          {testResult && (
            <div className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
              testResult.success
                ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300'
                : 'bg-rose-500/15 border border-rose-500/30 text-rose-300'
            }`}>
              {testResult.success ? <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" /> : <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />}
              <span>{testResult.message}</span>
            </div>
          )}

          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-[11px] text-slate-400 space-y-1.5">
            <span className="font-bold text-slate-200 block">Passos para obter suas credenciais:</span>
            <ol className="list-decimal list-inside space-y-0.5 leading-relaxed">
              <li>Acesse seu console em <strong className="text-white">supabase.com/dashboard</strong>.</li>
              <li>Em <strong className="text-white">Project Settings &gt; API</strong>, copie a Project URL e Anon Key.</li>
              <li>Em <strong className="text-white">Authentication &gt; Providers &gt; Google</strong>, habilite o Google e insira o Client ID/Secret do Google Cloud Console.</li>
            </ol>
          </div>
        </div>
      </Modal>

      {/* Modal Interativo de Autenticação Google Workspace */}
      <GoogleOAuthModal
        isOpen={googleModalOpen}
        onClose={() => setGoogleModalOpen(false)}
      />
    </div>
  );
};
