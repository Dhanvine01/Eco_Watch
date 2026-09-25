import { useContext } from 'react';
import { AuthStateContext } from '../context/authState';

export function useAuth() {
  const value = useContext(AuthStateContext);
  if (!value) throw new Error('useAuth must be used within AuthProvider');
  return value;
}
