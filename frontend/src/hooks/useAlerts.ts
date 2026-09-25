import { useCallback, useEffect, useState } from 'react';
import { alertsApi } from '../services/api';
import { useStream } from './useStream';
import type { Alert } from '../types';

export function useAlerts() {
  const { alertVersion } = useStream();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAlerts = useCallback(async () => {
    try {
      setAlerts(await alertsApi.active());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load alerts');
    } finally {
      setLoading(false);
    }
  }, []);

  // oxlint-disable-next-line react/set-state-in-effect -- fetchAlerts updates state after an API response.
  useEffect(() => {
    queueMicrotask(() => void fetchAlerts());
  }, [fetchAlerts, alertVersion]);

  const resolve = useCallback(
    async (id: string) => {
      try {
        await alertsApi.resolve(id);
        setAlerts((prev) => prev.filter((a) => a.id !== id));
        setError(null);
      } catch (reason) {
        setError(reason instanceof Error ? reason.message : 'Failed to resolve alert');
      }
    },
    []
  );

  return { alerts, loading, error, resolve, refetch: fetchAlerts };
}
