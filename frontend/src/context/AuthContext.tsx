import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { authApi, setUnauthorizedHandler } from '../services/api';
import { AuthStateContext } from './authState';
import type { User } from '../types';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try { setUser((await authApi.me()).user); setError(null); }
    catch { setUser(null); }
    finally { setLoading(false); }
  }, []);

  // oxlint-disable-next-line react/set-state-in-effect -- refresh is asynchronous external-state synchronization.
  useEffect(() => { void refresh(); }, [refresh]);
  useEffect(() => {
    setUnauthorizedHandler(() => {
      setUser(null);
      setLoading(false);
      window.location.assign('/login');
    });
    return () => setUnauthorizedHandler(null);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setLoading(true); setError(null);
    try { const nextUser = (await authApi.login(email, password)).user; setUser(nextUser); return nextUser; }
    catch (reason) { const message = reason instanceof Error ? reason.message : 'Login failed'; setError(message); throw reason; }
    finally { setLoading(false); }
  }, []);
  const logout = useCallback(async () => {
    try { await authApi.logout(); } catch { /* local logout still succeeds */ }
    setUser(null); setError(null); setLoading(false);
  }, []);

  return <AuthStateContext.Provider value={{ user, loading, error, login, logout, refresh }}>{children}</AuthStateContext.Provider>;
}
