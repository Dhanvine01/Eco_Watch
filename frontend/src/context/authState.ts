import { createContext } from 'react';
import type { User } from '../types';

export type AuthContextValue = {
  user: User | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
};

export const AuthStateContext = createContext<AuthContextValue | null>(null);
