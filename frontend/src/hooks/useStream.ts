import { useContext } from 'react';
import { StreamStateContext } from '../context/streamState';

export function useStream() {
  const value = useContext(StreamStateContext);
  if (!value) throw new Error('useStream must be used within StreamProvider');
  return value;
}
