import { useState, useEffect, createContext, useContext } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User } from '@supabase/supabase-js';

interface Usuario {
  id: string;
  auth_user_id: string;
  nome: string;
  tipo: string;
}

interface AuthContextType {
  user: User | null;
  usuario: Usuario | null;
  loading: boolean;
  isAdmin: boolean;
  signInByNome: (nome: string, senha: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUsuario = async (authUserId: string) => {
    const { data } = await supabase
      .from('usuarios')
      .select('*')
      .eq('auth_user_id', authUserId)
      .single();
    setUsuario(data as Usuario | null);
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setUser(session?.user ?? null);
        if (session?.user) {
          setTimeout(() => fetchUsuario(session.user.id), 0);
        } else {
          setUsuario(null);
        }
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUsuario(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signInByNome = async (nome: string, senha: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('login-por-nome', {
        body: { nome, senha },
      });

      if (error || data?.error) {
        return { error: error || new Error(data?.error) };
      }

      // Set the session from the edge function response
      if (data?.session) {
        await supabase.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        });
      }

      return { error: null };
    } catch (err) {
      return { error: err };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setUsuario(null);
  };

  const isAdmin = usuario?.tipo === 'admin';

  return (
    <AuthContext.Provider value={{ user, usuario, loading, isAdmin, signInByNome, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
