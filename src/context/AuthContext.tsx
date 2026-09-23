import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile, UserRole } from '../types/database';
import { localStore } from '../lib/storage';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

interface AuthContextType {
  user: UserProfile | null;
  role: UserRole;
  isAuthenticated: boolean;
  isDemoMode: boolean;
  login: (email: string, password?: string) => Promise<boolean>;
  logout: () => Promise<void>;
  switchUserRole: (newRole: UserRole) => void;
  updateProfile: (profile: Partial<UserProfile>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isDemo = !isSupabaseConfigured();
  const [user, setUser] = useState<UserProfile | null>(() => {
    return localStore.getCurrentUser();
  });

  useEffect(() => {
    localStore.init();
    if (isSupabaseConfigured()) {
      // Verifica sessão real do Supabase
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) {
          // Busca perfil no Supabase
          supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single()
            .then(({ data }) => {
              if (data) setUser(data as UserProfile);
            });
        }
      });

      const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
        if (!session) {
          setUser(null);
        }
      });

      return () => {
        listener.subscription.unsubscribe();
      };
    }
  }, []);

  const login = async (email: string, password?: string): Promise<boolean> => {
    if (isSupabaseConfigured() && password) {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error || !data.user) return false;
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single();
      if (profile) setUser(profile as UserProfile);
      return true;
    } else {
      // Local/Demo auth
      const users = localStore.getUsers();
      const found = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
      if (found) {
        setUser(found);
        localStore.setCurrentUser(found);
        return true;
      } else {
        // Cria usuário demo rapidamente se não existir
        const newUser: UserProfile = {
          id: `usr-${Date.now()}`,
          organization_id: '00000000-0000-0000-0000-000000000001',
          full_name: email.split('@')[0].toUpperCase(),
          email,
          role: email.includes('admin') ? 'ADMIN' : email.includes('vendas') ? 'VENDAS' : 'COMPRAS',
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        setUser(newUser);
        localStore.setCurrentUser(newUser);
        return true;
      }
    }
  };

  const logout = async (): Promise<void> => {
    if (isSupabaseConfigured()) {
      await supabase.auth.signOut();
    }
    setUser(null);
  };

  const switchUserRole = (newRole: UserRole) => {
    if (user) {
      const updated = { ...user, role: newRole };
      setUser(updated);
      localStore.setCurrentUser(updated);
      localStore.logAudit({
        organization_id: user.organization_id,
        user_id: user.id,
        user_name: user.full_name,
        action: 'PERFIL_ALTERADO',
        entity: 'profiles',
        entity_id: user.id,
        new_data: { role: newRole },
        reason: 'Alternância de papel para testes de permissão'
      });
    }
  };

  const updateProfile = (updates: Partial<UserProfile>) => {
    if (user) {
      const updated = { ...user, ...updates };
      setUser(updated);
      localStore.setCurrentUser(updated);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role: user?.role || 'VISUALIZADOR',
        isAuthenticated: !!user,
        isDemoMode: isDemo,
        login,
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
