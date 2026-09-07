// PionG Hub: Auth Context - Global Authentication State Management
// Gerencia o estado global do usuário autenticado após resposta do PostgreSQL

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AuthUser, ApiResponse } from '../types/entities';

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  getPerfilLevel: () => number;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const checkAuth = async (): Promise<void> => {
    try {
      const token = localStorage.getItem('piong_token');
      if (!token) {
        setUser(null);
        setIsLoading(false);
        return;
      }

      const response = await fetch('/api/v1/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data: ApiResponse<AuthUser> = await response.json();
        if (data.success && data.data) {
          setUser(data.data);
        } else {
          localStorage.removeItem('piong_token');
          setUser(null);
        }
      } else {
        localStorage.removeItem('piong_token');
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });

      const data: ApiResponse<{ user: AuthUser; token: string }> = await response.json();

      if (data.success && data.data) {
        localStorage.setItem('piong_token', data.data.token);
        setUser(data.data.user);
        return { success: true };
      }

      return { success: false, error: data.error || 'Falha na autenticação' };
    } catch (error) {
      return { success: false, error: 'Erro de conexão com o servidor' };
    }
  };

  const logout = async (): Promise<void> => {
    try {
      const token = localStorage.getItem('piong_token');
      if (token) {
        await fetch('/api/v1/auth/logout', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
      }
    } finally {
      setUser(null);
      localStorage.removeItem('piong_token');
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const getPerfilLevel = (): number => {
    return user?.nivel_hierarquico ?? 0;
  };

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    logout,
    checkAuth,
    getPerfilLevel
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;