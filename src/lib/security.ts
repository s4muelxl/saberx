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
