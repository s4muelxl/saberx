/**
 * Módulo de Segurança Corporativa e Higienização de Dados (Enterprise Hardening)
 */

/**
 * Sanitiza strings contra XSS e injeção de tags maliciosas
 */
export function sanitizeString(input: string): string {
  if (!input || typeof input !== 'string') return '';
  return input
    .trim()
    .replace(/[<>]/g, '') // remove chevron tags
    .substring(0, 1000); // limita tamanho para evitar buffer overflow
}

/**
 * Validação estrita de formato de e-mail corporativo (RFC 5322)
 * Bloqueia entradas sem @ (ex: samuel8877alves.gmail.com), domínios incompletos (samuel@.com) ou TLDs inválidos (samuel@com)
 */
export function isValidEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  const trimmed = email.trim();
  if (trimmed.length < 5 || trimmed.length > 254) return false;

  // Regex robusto que exige:
  // 1. Nome de usuário válido sem espaços ou caracteres de controle
  // 2. Um único '@'
  // 3. Domínio composto por letras/números/hífens
  // 4. Ao menos um ponto com TLD de 2 ou mais letras
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  if (!emailRegex.test(trimmed)) return false;

  const parts = trimmed.split('@');
  if (parts.length !== 2) return false;

  const domain = parts[1];
  if (domain.startsWith('.') || domain.endsWith('.') || domain.includes('..')) return false;

  const domainParts = domain.split('.');
  if (domainParts.length < 2) return false;
  if (domainParts.some(p => p.length === 0)) return false;

  const tld = domainParts[domainParts.length - 1];
  if (tld.length < 2) return false;

  return true;
}

/**
 * Normaliza e-mail corporativo cortando espaços e convertendo para minúsculas
 */
export function normalizeEmail(email: string): string {
  if (!email || typeof email !== 'string') return '';
  return email.trim().toLowerCase();
}

/**
 * Converte erros técnicos de banco/API (PostgrestError, network, etc.) em mensagens amigáveis
 */
export function formatFriendlyErrorMessage(err: any): string {
  if (!err) return 'Ocorreu um erro inesperado. Tente novamente.';
  const msg = typeof err === 'string' ? err : err.message || err.error_description || String(err);

  if (msg.includes('Invalid login credentials') || msg.includes('invalid_grant')) {
    return 'E-mail ou senha incorretos. Verifique suas credenciais.';
  }
  if (msg.includes('Email not confirmed')) {
    return 'E-mail ainda não confirmado. Verifique sua caixa de entrada.';
  }
  if (msg.includes('User already registered') || msg.includes('already exists')) {
    return 'Este endereço de e-mail já está cadastrado no sistema.';
  }
  if (msg.includes('Password should be at least')) {
    return 'A senha deve conter no mínimo 6 caracteres.';
  }
  if (msg.includes('NetworkError') || msg.includes('Failed to fetch') || msg.includes('timeout')) {
    return 'Falha na conexão com o servidor. Verifique sua internet ou tente mais tarde.';
  }
  if (msg.includes('PostgrestError') || msg.includes('relation') || msg.includes('violates') || msg.includes('column')) {
    return 'Não foi possível concluir a operação no banco de dados. Tente novamente mais tarde.';
  }

  return msg;
}

/**
 * Converte com precisão formatos numéricos brasileiros e internacionais para float seguro
 * Ex: "R$ 3.338,14" -> 3338.14
 * Ex: "451,71" -> 451.71
 */
export function parseSafeFloat(value: any, fallback: number = 0): number {
  if (typeof value === 'number') {
    return isNaN(value) ? fallback : value;
  }
  if (!value || typeof value !== 'string') {
    return fallback;
  }

  // Remove moeda, espaços e caracteres indesejados
  let cleaned = value.replace(/[R$\s]/g, '').trim();

  // Se possui ponto e vírgula (ex: 1.234,56)
  if (cleaned.includes('.') && cleaned.includes(',')) {
    cleaned = cleaned.replace(/\./g, '').replace(',', '.');
  } else if (cleaned.includes(',')) {
    // Se possui apenas vírgula (ex: 451,71)
    cleaned = cleaned.replace(',', '.');
  }

  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? fallback : parsed;
}

export interface PasswordStrength {
  score: number; // 0 a 4
  label: 'Fraca' | 'Razoável' | 'Boa' | 'Forte';
  color: string;
  hasLength: boolean;
  hasUpper: boolean;
  hasLower: boolean;
  hasNumber: boolean;
  hasSpecial: boolean;
}

/**
 * Avaliador de entropia e força de senhas corporativas
 */
export function evaluatePasswordStrength(password: string): PasswordStrength {
  const hasLength = password.length >= 8;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);

  let score = 0;
  if (hasLength) score++;
  if (hasUpper && hasLower) score++;
  if (hasNumber) score++;
  if (hasSpecial) score++;

  const labels: PasswordStrength['label'][] = ['Fraca', 'Fraca', 'Razoável', 'Boa', 'Forte'];
  const colors = ['#ef4444', '#ef4444', '#f59e0b', '#3b82f6', '#10b981'];

  return {
    score,
    label: labels[score] || 'Fraca',
    color: colors[score] || '#ef4444',
    hasLength,
    hasUpper,
    hasLower,
    hasNumber,
    hasSpecial
  };
}
