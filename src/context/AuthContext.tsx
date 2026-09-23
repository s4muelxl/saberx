import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile, UserRole } from '../types/database';
import { localStore, DEMO_ORG_ID } from '../lib/storage';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

interface SignUpData {
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
  login: (email: string, password?: string) => Promise<{ success: boolean; error?: string }>;
  signUp: (email: string, password: string, data: SignUpData) => Promise<{ success: boolean; error?: string }>;
  loginWithGoogle: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  switchUserRole: (newRole: UserRole) => void;
  updateProfile: (profile: Partial<UserProfile>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isDemo = !isSupabaseConfigured();

  const [user, setUser] = useState<UserProfile | null>(() => {
    // Se Supabase configurado: nunca auto-loga, aguarda getSession()
    // Se modo demo (sem Supabase): usa sessão salva no localStorage
    if (isSupabaseConfigured()) return null;
    return localStore.getCurrentUser();
  });

  const [authReady, setAuthReady] = useState(!isSupabaseConfigured());

  useEffect(() => {
    localStore.init();

    if (isSupabaseConfigured()) {
      // 1. Obtém sessão atual do Supabase
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) {
          fetchAndSetUserProfile(session.user.id, session.user.email);
        }
        setAuthReady(true);
      });

      // 2. Escuta mudanças de autenticação (Login, Logout, OAuth redirect)
      const { data: listener } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (session?.user) {
          await fetchAndSetUserProfile(session.user.id, session.user.email);
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
        }
      });

      return () => {
        listener.subscription.unsubscribe();
      };
    }
  }, []);

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
        // Se perfil ainda não foi criado (ex: primeiro login OAuth do Google)
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
          // Ignora conflitos ou erro de rede se offline
        }
        setUser(fallbackProfile);
        localStore.setCurrentUser(fallbackProfile);
      }
    } catch (e) {
      console.error('Erro ao buscar perfil:', e);
    }
  };

  const login = async (email: string, password?: string): Promise<{ success: boolean; error?: string }> => {
    if (isSupabaseConfigured() && password) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          return { success: false, error: error.message };
        }
        if (data.user) {
          await fetchAndSetUserProfile(data.user.id, data.user.email);
          return { success: true };
        }
      } catch (err: any) {
        return { success: false, error: err.message || 'Erro de conexão com o Supabase' };
      }
    }

    // Modo Demonstração / Local
    const users = localStore.getUsers();
    const found = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (found) {
      setUser(found);
      localStore.setCurrentUser(found);
      return { success: true };
    }

    const newUser: UserProfile = {
      id: `usr-${Date.now()}`,
      organization_id: DEMO_ORG_ID,
      full_name: email.split('@')[0].toUpperCase(),
      email,
      role: email.includes('admin') ? 'ADMIN' : email.includes('vendas') ? 'VENDAS' : 'COMPRAS',
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    setUser(newUser);
    localStore.setCurrentUser(newUser);
    return { success: true };
  };

  const signUp = async (
    email: string,
    password: string,
    data: SignUpData
  ): Promise<{ success: boolean; error?: string }> => {
    if (isSupabaseConfigured()) {
      try {
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: data.fullName,
              company_name: data.companyName,
              position: data.position,
              department: data.department,
              role: data.role || 'ADMIN'
            }
          }
        });

        if (authError) {
          return { success: false, error: authError.message };
        }

        if (authData.user) {
          const profile: UserProfile = {
            id: authData.user.id,
            organization_id: DEMO_ORG_ID,
            full_name: data.fullName,
            email,
            position: data.position || 'Gestor de Suprimentos',
            department: data.department || 'Compras & Engenharia',
            role: data.role || 'ADMIN',
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };

          try {
            await supabase.from('profiles').upsert([profile]);
          } catch {
            // Ignora erro se offline
          }
          setUser(profile);
          localStore.setCurrentUser(profile);
          return { success: true };
        }
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }

    // Local / Demo registration
    const profile: UserProfile = {
      id: `usr-${Date.now()}`,
      organization_id: DEMO_ORG_ID,
      full_name: data.fullName,
      email,
      position: data.position || 'Gestor de Suprimentos',
      department: data.department || 'Compras & Engenharia',
      role: data.role || 'ADMIN',
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const users = localStore.getUsers();
    users.push(profile);
    setUser(profile);
    localStore.setCurrentUser(profile);
    return { success: true };
  };

  const loginWithGoogle = async (): Promise<void> => {
    if (isSupabaseConfigured()) {
      await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin
        }
      });
    } else {
      // Simulação rápida para demo
      const googleUser: UserProfile = {
        id: 'usr-google-demo',
        organization_id: DEMO_ORG_ID,
        full_name: 'Usuário Google Corporativo',
        email: 'usuario.google@saberx.com.br',
        role: 'ADMIN',
        position: 'Diretor de Suprimentos',
        department: 'Operações Industriais',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      setUser(googleUser);
      localStore.setCurrentUser(googleUser);
    }
  };

  const resetPassword = async (email: string): Promise<{ success: boolean; error?: string }> => {
    if (isSupabaseConfigured()) {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin
      });
      if (error) return { success: false, error: error.message };
      return { success: true };
    }
    return { success: true };
  };

  const logout = async (): Promise<void> => {
    if (isSupabaseConfigured()) {
      await supabase.auth.signOut().catch(() => {});
    }
    // Limpa sessão salva — próximo acesso exige login
    localStorage.removeItem('saberx_current_user');
    setUser(null);
  };

  const switchUserRole = (newRole: UserRole) => {
    if (user) {
      const updated = { ...user, role: newRole };
      setUser(updated);
      localStore.setCurrentUser(updated);
    }
  };

  const updateProfile = async (updates: Partial<UserProfile>): Promise<void> => {
    if (user) {
      const updated = { ...user, ...updates, updated_at: new Date().toISOString() };
      setUser(updated);
      localStore.setCurrentUser(updated);

      if (isSupabaseConfigured()) {
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

  // Aguarda Supabase verificar sessão antes de renderizar a app
  if (!authReady) {
    return (
      <div className="min-h-screen bg-[#080d18] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <svg viewBox="0 0 80 80" className="w-14 h-14 animate-pulse" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="80" height="80" rx="16" fill="#0d1424"/>
            <path d="M18 18 L62 62" stroke="#475569" strokeWidth="5" strokeLinecap="round"/>
            <path d="M62 18 L18 62" stroke="#475569" strokeWidth="5" strokeLinecap="round"/>
          </svg>
          <p className="text-slate-600 text-xs tracking-widest font-semibold">SABERX</p>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        role: user?.role || 'VISUALIZADOR',
        isAuthenticated: !!user,
        isDemoMode: isDemo,
        login,
        signUp,
        loginWithGoogle,
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
