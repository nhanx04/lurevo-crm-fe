import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { QueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { authStorage } from '@/api/authStorage';
import { onSessionExpired } from '@/api/client';
import { authApi } from '@/api/services';
import type { AuthUser, LoginRequest, Role, User } from '@/types/api';

type AuthContextValue = {
  user: User | AuthUser | null;
  role: Role | null;
  isAuthenticated: boolean;
  isInitializing: boolean;
  isOwner: boolean;
  login: (body: LoginRequest) => Promise<void>;
  logout: () => Promise<void>;
  logoutAll: () => Promise<void>;
  refreshMe: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children, queryClient }: { children: ReactNode; queryClient: QueryClient }) {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | AuthUser | null>(() => authStorage.get()?.user ?? null);
  const [isInitializing, setInitializing] = useState(true);

  const clearSession = useCallback(() => {
    authStorage.clear();
    setUser(null);
    queryClient.clear();
  }, [queryClient]);

  const refreshMe = useCallback(async () => {
    const me = await authApi.me();
    setUser(me);
  }, []);

  useEffect(() => {
    onSessionExpired(() => {
      clearSession();
      navigate('/login', { replace: true });
    });
  }, [clearSession, navigate]);

  useEffect(() => {
    const boot = async () => {
      const session = authStorage.get();
      if (!session) {
        setInitializing(false);
        return;
      }
      try {
        await refreshMe();
      } catch {
        clearSession();
      } finally {
        setInitializing(false);
      }
    };
    void boot();
  }, [clearSession, refreshMe]);

  const login = useCallback(
    async (body: LoginRequest) => {
      const tokens = await authApi.login(body);
      authStorage.set(tokens);
      setUser(tokens.user);
      await refreshMe();
    },
    [refreshMe],
  );

  const logout = useCallback(async () => {
    const session = authStorage.get();
    try {
      if (session?.refreshToken) await authApi.logout(session.refreshToken);
    } finally {
      clearSession();
      navigate('/login', { replace: true });
    }
  }, [clearSession, navigate]);

  const logoutAll = useCallback(async () => {
    try {
      await authApi.logoutAll();
    } finally {
      clearSession();
      navigate('/login', { replace: true });
    }
  }, [clearSession, navigate]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      role: user?.role ?? null,
      isAuthenticated: Boolean(user),
      isInitializing,
      isOwner: user?.role === 'owner',
      login,
      logout,
      logoutAll,
      refreshMe,
    }),
    [isInitializing, login, logout, logoutAll, refreshMe, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
