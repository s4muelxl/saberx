import { createClient, SupabaseClient } from '@supabase/supabase-js';

const STORAGE_CUSTOM_URL = 'saberx_custom_supabase_url';
const STORAGE_CUSTOM_KEY = 'saberx_custom_supabase_key';
const STORAGE_CLOUD_ENABLED = 'saberx_cloud_sync_enabled';

// Fallback padrão se não configurado pelo usuário
const DEFAULT_SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL as string) || '';
const DEFAULT_SUPABASE_ANON_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || '';

export const getSupabaseUrl = (): string => {
  if (typeof window !== 'undefined') {
    const custom = localStorage.getItem(STORAGE_CUSTOM_URL);
    if (custom && custom.trim().length > 0) return custom.trim();
  }
  const defaultUrl = DEFAULT_SUPABASE_URL.trim();
  if (defaultUrl.includes('mggkhnzdlpdbwlppbnud') || defaultUrl.includes('your-project-id')) {
    return '';
  }
  return defaultUrl;
};

export const getSupabaseAnonKey = (): string => {
  if (typeof window !== 'undefined') {
    const custom = localStorage.getItem(STORAGE_CUSTOM_KEY);
    if (custom && custom.trim().length > 0) return custom.trim();
  }
  const defaultKey = DEFAULT_SUPABASE_ANON_KEY.trim();
  if (defaultKey.includes('your-anon-public-key')) {
    return '';
  }
  return defaultKey;
};

export const isCloudSyncEnabled = (): boolean => {
  if (typeof window === 'undefined') return false;
  const flag = localStorage.getItem(STORAGE_CLOUD_ENABLED);
  // Requer flag 'true' explícita e URL válida configurada pelo usuário
  if (flag !== 'true') return false;
  return isSupabaseConfigured();
};

export const setCloudSyncEnabled = (enabled: boolean): void => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_CLOUD_ENABLED, enabled ? 'true' : 'false');
  }
};

export const isSupabaseConfigured = (): boolean => {
  const url = getSupabaseUrl();
  const key = getSupabaseAnonKey();
  return (
    typeof url === 'string' &&
    url.trim().length > 10 &&
    url.startsWith('https://') &&
    !url.includes('your-project-id') &&
    !url.includes('mggkhnzdlpdbwlppbnud') &&
    !url.includes('placeholder.supabase.co') &&
    typeof key === 'string' &&
    key.trim().length > 20 &&
    !key.includes('your-anon-public-key') &&
    !key.includes('placeholder-key')
  );
};

export const saveSupabaseConfig = (url: string, anonKey: string): void => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_CUSTOM_URL, url.trim());
    localStorage.setItem(STORAGE_CUSTOM_KEY, anonKey.trim());
    localStorage.setItem(STORAGE_CLOUD_ENABLED, 'true');
  }
};

export const clearSupabaseConfig = (): void => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(STORAGE_CUSTOM_URL);
    localStorage.removeItem(STORAGE_CUSTOM_KEY);
    localStorage.setItem(STORAGE_CLOUD_ENABLED, 'false');
  }
};

export interface ConnectionTestResult {
  success: boolean;
  message: string;
  latencyMs?: number;
}

export const testSupabaseConnection = async (
  customUrl?: string,
  customKey?: string
): Promise<ConnectionTestResult> => {
  const url = (customUrl || getSupabaseUrl()).trim();
  const key = (customKey || getSupabaseAnonKey()).trim();

  if (!url || !key) {
    return {
      success: false,
      message: 'URL e Anon Key do Supabase são obrigatórios para o teste.',
    };
  }

  const startTime = Date.now();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 4000);

  try {
    // Testa endpoint de health ou rest
    const res = await fetch(`${url}/auth/v1/health`, {
      method: 'GET',
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
      },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    const latencyMs = Date.now() - startTime;

    if (res.ok || res.status === 200 || res.status === 401) {
      return {
        success: true,
        message: `Conexão bem-sucedida com o Supabase! (${latencyMs}ms)`,
        latencyMs,
      };
    }

    return {
      success: false,
      message: `Servidor retornou status HTTP ${res.status}. Verifique se as credenciais estão ativas.`,
      latencyMs,
    };
  } catch (err: any) {
    clearTimeout(timeoutId);
    const latencyMs = Date.now() - startTime;
    if (err.name === 'AbortError') {
      return {
        success: false,
        message: 'Tempo limite esgotado (timeout de 4s). Servidor inacessível.',
        latencyMs,
      };
    }
    return {
      success: false,
      message: `Falha ao alcançar o servidor Supabase: ${err.message || 'DNS ou conexão recusada'}.`,
      latencyMs,
    };
  }
};

// Cria cliente Supabase resiliente
const url = getSupabaseUrl() || 'https://placeholder.supabase.co';
const key = getSupabaseAnonKey() || 'placeholder-key-000000000000000000000000';

export const supabase: SupabaseClient = createClient(url, key, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
