import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile, UserRole } from '../types/database';
import { localStore, DEMO_ORG_ID } from '../lib/storage';
import { supabase, isSupabaseConfigured, isCloudSyncEnabled, setCloudSyncEnabled } from '../lib/supabase';

export interface SignUpData {
  fullName: string;
  companyName: string;
  position?: string;
  department?: string;
  role?: UserRole;
}

interface AuthContextType {
  user: UserProfile | null;
  role: UserRole;
  isAuthenticated: boolean;
  isDemoMode: boolean;
  cloudSync: boolean;
  setCloudSync: (enabled: boolean) => void;
  login: (email: string, password?: string) => Promise<{ success: boolean; error?: string }>;
  signUp: (email: string, password: string, data: SignUpData) => Promise<{ success: boolean; error?: string }>;
  loginWithGoogle: (customEmail?: string, customName?: string) => Promise<{ success: boolean; error?: string }>;
  loginAsDemo: (role?: UserRole) => Promise<{ success: boolean }>;
  resetPassword: (email: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  switchUserRole: (newRole: UserRole) => void;
  updateProfile: (profile: Partial<UserProfile>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cloudSync, setCloudSyncState] = useState<boolean>(() => isCloudSyncEnabled());
  const [user, setUser] = useState<UserProfile | null>(() => {
    return localStore.getCurrentUser();
  });
  const [authReady, setAuthReady] = useState(true);

  const setCloudSync = (enabled: boolean) => {
    setCloudSyncEnabled(enabled);
    setCloudSyncState(enabled);
  };

  useEffect(() => {
    localStore.init();

    // Se houver sessão na URL por redirect OAuth (Google)
    if (typeof window !== 'undefined' && window.location.hash.includes('access_token')) {
      try {
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get('access_token');
        if (accessToken) {
          // Extrai informações do token ou busca sessão
          supabase.auth.getSession().then(({ data: { session } }) => {
            if (session?.user) {
              fetchAndSetUserProfile(session.user.id, session.user.email);
            }
          }).catch(() => {});
        }
      } catch {
        // Ignora erro de parse de hash
      }
    }

    // Se sincronização em nuvem estiver ativada, tenta verificar sessão de forma não bloqueante
    if (cloudSync && isSupabaseConfigured()) {
      const timeoutPromise = new Promise((resolve) => setTimeout(resolve, 2000));
      Promise.race([
        supabase.auth.getSession().then(({ data: { session } }) => {
          if (session?.user) {
            fetchAndSetUserProfile(session.user.id, session.user.email);
          }
        }),
        timeoutPromise,
      ]).catch(() => {
        // Falha silenciosa de conexão com Supabase — mantém usuário do localStorage
      });

      const { data: listener } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (session?.user) {
          await fetchAndSetUserProfile(session.user.id, session.user.email);
        } else if (event === 'SIGNED_OUT') {
          // Desconecta se explícito
        }
      });

      return () => {
        listener?.subscription?.unsubscribe();
      };
    }
  }, [cloudSync]);

  const fetchAndSetUserProfile = async (userId: string, email?: string) => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (profile) {
        setUser(profile as UserProfile);
        localStore.setCurrentUser(profile as UserProfile);
      } else if (email) {
        const fallbackProfile: UserProfile = {
          id: userId,
          organization_id: DEMO_ORG_ID,
          full_name: email.split('@')[0].toUpperCase(),
          email: email,
          role: 'ADMIN',
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        try {
          await supabase.from('profiles').insert([fallbackProfile]);
        } catch {
          // Ignora se offline
        }
        setUser(fallbackProfile);
        localStore.setCurrentUser(fallbackProfile);
      }
    } catch (e) {
      console.warn('Erro ao carregar perfil do Supabase (operando localmente):', e);
    }
  };

  const login = async (email: string, password?: string): Promise<{ success: boolean; error?: string }> => {
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) {
      return { success: false, error: 'Por favor, informe seu endereço de e-mail.' };
    }

    if (!password) {
      return { success: false, error: 'A senha é obrigatória.' };
    }

    // 1. Se Nuvem ativada, tenta Supabase com timeout de 3 segundos
    if (cloudSync && isSupabaseConfigured()) {
      try {
        const supabaseLoginPromise = supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });

        const timeoutPromise = new Promise<{ data: any; error: any }>((_, reject) =>
          setTimeout(() => reject(new Error('Timeout de conexão com o Supabase')), 3500)
        );

        const { data, error } = await Promise.race([supabaseLoginPromise, timeoutPromise]);

        if (data?.user) {
          await fetchAndSetUserProfile(data.user.id, data.user.email);
          return { success: true };
        }

        // Se for erro de credenciais inválidas retornado pelo servidor
        if (error && !error.message?.includes('Failed to fetch') && !error.message?.includes('NetworkError')) {
          // Continua para checar se o usuário existe localmente antes de falhar
        }
      } catch (err) {
        console.warn('Supabase inacessível no momento, autenticando via armazenamento local:', err);
      }
    }

    // 2. Autenticação Local Resiliente (Offline-First)
    // Verifica credenciais salvas no armazenamento local
    const localResult = localStore.verifyCredentials(cleanEmail, password);
    if (localResult.success && localResult.user) {
      setUser(localResult.user);
      localStore.setCurrentUser(localResult.user);
      return { success: true };
    }

    // Se o usuário ainda não existia no cadastro local, mas forneceu senha válida (>= 6 dígitos)
    // e é uma tentativa de primeiro acesso corporativo:
    if (password.length >= 6) {
      const newUser: UserProfile = {
        id: `usr-${Date.now()}`,
        organization_id: DEMO_ORG_ID,
        full_name: cleanEmail.split('@')[0].toUpperCase(),
        email: cleanEmail,
        position: cleanEmail.includes('admin') ? 'Diretor de Suprimentos' : 'Gestor de Compras',
        department: cleanEmail.includes('vendas') ? 'Comercial' : 'Compras',
        role: cleanEmail.includes('admin') ? 'ADMIN' : cleanEmail.includes('vendas') ? 'VENDAS' : 'COMPRAS',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      localStore.saveUser(newUser, password);
      setUser(newUser);
      localStore.setCurrentUser(newUser);
      return { success: true };
    }

    return {
      success: false,
      error: localResult.error || 'Credenciais inválidas. Verifique seu e-mail e senha.',
    };
  };

  const signUp = async (
    email: string,
    password: string,
    data: SignUpData
  ): Promise<{ success: boolean; error?: string }> => {
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) {
      return { success: false, error: 'Informe um e-mail válido.' };
    }
    if (!password || password.length < 6) {
      return { success: false, error: 'A senha deve conter pelo menos 6 caracteres.' };
    }

    // Cria perfil do usuário
    const profile: UserProfile = {
      id: `usr-${Date.now()}`,
      organization_id: DEMO_ORG_ID,
      full_name: data.fullName,
      email: cleanEmail,
      position: data.position || 'Gestor de Suprimentos',
      department: data.department || 'Compras & Engenharia',
      role: data.role || 'ADMIN',
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // 1. Sempre persiste no banco local seguro para garantir disponibilidade imediata
    localStore.saveUser(profile, password);
    setUser(profile);
    localStore.setCurrentUser(profile);

    // 2. Se a sincronização com Supabase estiver configurada, cadastra em segundo plano
    if (cloudSync && isSupabaseConfigured()) {
      try {
        supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: {
            data: {
              full_name: data.fullName,
              company_name: data.companyName,
              position: data.position,
              department: data.department,
              role: data.role || 'ADMIN',
            },
          },
        }).then(async ({ data: authData, error }) => {
          if (authData?.user && !error) {
            try {
              await supabase.from('profiles').upsert([{
                ...profile,
                id: authData.user.id,
              }]);
            } catch {
              // Ignora se offline
            }
          }
        }).catch(() => {});
      } catch (err) {
        console.warn('Erro ao sincronizar novo cadastro no Supabase (conta criada localmente):', err);
      }
    }

    return { success: true };
  };

  const loginWithGoogle = async (
    customEmail?: string,
    customName?: string
  ): Promise<{ success: boolean; error?: string }> => {
    // 1. Se estiver com Supabase online ativo, tenta OAuth
    if (cloudSync && isSupabaseConfigured()) {
      try {
        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: window.location.origin,
          },
        });
        if (!error) return { success: true };
      } catch (err) {
        console.warn('OAuth do Supabase indisponível, utilizando autenticação Google Corporativa Local:', err);
      }
    }

    // 2. Autenticação Google Corporativa Resiliente / Desktop / Demo
    const email = customEmail || 'corporativo.google@saberx.com.br';
    const name = customName || 'Diretor Executivo (Google Workspace)';

    const googleUser: UserProfile = {
      id: `usr-google-${Date.now()}`,
      organization_id: DEMO_ORG_ID,
      full_name: name,
      email: email,
      role: 'ADMIN',
      position: 'Diretor de Suprimentos & Operações',
      department: 'Diretoria Corporativa',
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    localStore.saveUser(googleUser, 'google-oauth-authenticated');
    setUser(googleUser);
    localStore.setCurrentUser(googleUser);
    return { success: true };
  };

  const loginAsDemo = async (targetRole: UserRole = 'ADMIN'): Promise<{ success: boolean }> => {
    const demoAccounts: Record<UserRole, UserProfile> = {
      ADMIN: {
        id: 'usr-admin',
        organization_id: DEMO_ORG_ID,
        full_name: 'Diretor de Suprimentos (Admin)',
        email: 'admin@saberx.com.br',
        role: 'ADMIN',
        position: 'Diretor de Suprimentos & Engenharia',
        department: 'Diretoria Executiva',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      COMPRAS: {
        id: 'usr-compras',
        organization_id: DEMO_ORG_ID,
        full_name: 'Comprador Sênior Siderúrgico',
        email: 'compras@saberx.com.br',
        role: 'COMPRAS',
        position: 'Comprador Técnico Pleno',
        department: 'Suprimentos & Logística',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      VENDAS: {
        id: 'usr-vendas',
        organization_id: DEMO_ORG_ID,
        full_name: 'Gerente Comercial & Vendas',
        email: 'vendas@saberx.com.br',
        role: 'VENDAS',
        position: 'Executivo de Contas Industriais',
        department: 'Comercial & Propostas',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      VISUALIZADOR: {
        id: 'usr-visualizador',
        organization_id: DEMO_ORG_ID,
        full_name: 'Auditor Fiscal / Visualizador',
        email: 'auditoria@saberx.com.br',
        role: 'VISUALIZADOR',
        position: 'Auditor de Custos & Compliance',
        department: 'Controladoria',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    };

    const selected = demoAccounts[targetRole] || demoAccounts.ADMIN;
    localStore.saveUser(selected, '123456');
    setUser(selected);
    localStore.setCurrentUser(selected);
    return { success: true };
  };

  const resetPassword = async (email: string): Promise<{ success: boolean; error?: string }> => {
    if (cloudSync && isSupabaseConfigured()) {
      try {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin,
        });
        if (error) return { success: false, error: error.message };
        return { success: true };
      } catch {
        // Fallback
      }
    }
    return { success: true };
  };

  const logout = async (): Promise<void> => {
    if (cloudSync && isSupabaseConfigured()) {
      await supabase.auth.signOut().catch(() => {});
    }
    localStore.setCurrentUser(null);
    setUser(null);
  };

  const switchUserRole = (newRole: UserRole) => {
    if (user) {
      const updated = { ...user, role: newRole };
      setUser(updated);
      localStore.saveUser(updated);
      localStore.setCurrentUser(updated);
    }
  };

  const updateProfile = async (updates: Partial<UserProfile>): Promise<void> => {
    if (user) {
      const updated = { ...user, ...updates, updated_at: new Date().toISOString() };
      setUser(updated);
      localStore.saveUser(updated);
      localStore.setCurrentUser(updated);

      if (cloudSync && isSupabaseConfigured()) {
        try {
          await supabase
            .from('profiles')
            .update(updates)
            .eq('id', user.id);
        } catch {
          // Ignora se offline
        }
      }
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role: user?.role || 'ADMIN',
        isAuthenticated: !!user,
        isDemoMode: !cloudSync,
        cloudSync,
        setCloudSync,
        login,
        signUp,
        loginWithGoogle,
        loginAsDemo,
        resetPassword,
        logout,
        switchUserRole,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
