import { describe, it, expect } from 'vitest';
import {
  isValidEmail,
  normalizeEmail,
  sanitizeString,
  parseSafeFloat,
  evaluatePasswordStrength,
  formatFriendlyErrorMessage,
} from './security';

describe('Security & Data Normalization Module', () => {
  it('valida endereços de e-mail corporativos com RFC estrito', () => {
    expect(isValidEmail('admin@saberx.com.br')).toBe(true);
    expect(isValidEmail('compras.metal@industria.com.br')).toBe(true);
    expect(isValidEmail('user@gmail.com')).toBe(true);

    // E-mails inválidos
    expect(isValidEmail('')).toBe(false);
    expect(isValidEmail('invalid-email')).toBe(false);
    expect(isValidEmail('samuel8877alves.gmail.com')).toBe(false);
    expect(isValidEmail('user@.com')).toBe(false);
    expect(isValidEmail('user@domain')).toBe(false);
    expect(isValidEmail('user@domain.')).toBe(false);
  });

  it('normaliza e-mails cortando espaços e convertendo para minúsculas', () => {
    expect(normalizeEmail('  ADMIN@SABERX.COM.BR  ')).toBe('admin@saberx.com.br');
  });

  it('sanitiza strings removendo tags chevron (< >)', () => {
    expect(sanitizeString('<script>alert("xss")</script>Texto')).toBe('scriptalert("xss")/scriptTexto');
    expect(sanitizeString('   Nome Seguro   ')).toBe('Nome Seguro');
  });

  it('converte valores numéricos brasileiros e internacionais com precisão', () => {
    expect(parseSafeFloat('R$ 3.338,14')).toBe(3338.14);
    expect(parseSafeFloat('451,71')).toBe(451.71);
    expect(parseSafeFloat('1250.50')).toBe(1250.5);
    expect(parseSafeFloat('', 10)).toBe(10);
    expect(parseSafeFloat(null, 0)).toBe(0);
  });

  it('avalia entropia e pontuação de força de senhas', () => {
    const weak = evaluatePasswordStrength('123');
    expect(weak.score).toBeLessThanOrEqual(1);

    const strong = evaluatePasswordStrength('Admin#2026!SaberX');
    expect(strong.score).toBe(4);
    expect(strong.label).toBe('Forte');
    expect(strong.hasLength).toBe(true);
    expect(strong.hasUpper).toBe(true);
    expect(strong.hasLower).toBe(true);
    expect(strong.hasNumber).toBe(true);
    expect(strong.hasSpecial).toBe(true);
  });

  it('formata mensagens de erro técnicas em avisos amigáveis', () => {
    expect(formatFriendlyErrorMessage('Invalid login credentials')).toContain('E-mail ou senha incorretos');
    expect(formatFriendlyErrorMessage('Email not confirmed')).toContain('E-mail ainda não confirmado');
    expect(formatFriendlyErrorMessage('NetworkError when attempting to fetch resource')).toContain('Falha na conexão');
  });
});
