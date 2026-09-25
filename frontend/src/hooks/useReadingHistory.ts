import { useEffect, useRef, useState } from 'react';
import { readingsApi } from '../services/api';
import type { HistoryReading } from '../types';

export function useReadingHistory(deviceId: string, rangeMs = 3_600_000) {
  const [history, setHistory] = useState<HistoryReading[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [refreshVersion, setRefreshVersion] = useState(0);
  const requestId = useRef(0);

  // oxlint-disable-next-line react/set-state-in-effect -- load updates state after an API response.
  useEffect(() => {
    if (!deviceId) return;
    const load = async () => {
      const currentRequest = ++requestId.current;
      try {
        const to = new Date().toISOString();
        const from = new Date(Date.now() - rangeMs).toISOString();
        const data = await readingsApi.history(deviceId, from, to);
        if (currentRequest === requestId.current) { setHistory(data); setError(null); }
      } catch (reason) {
        if (currentRequest === requestId.current) setError(reason instanceof Error ? reason.message : 'Failed to load history');
      }
    };
    void load();
    const interval = window.setInterval(() => void load(), 15_000);
    return () => { requestId.current += 1; window.clearInterval(interval); };
  }, [deviceId, rangeMs, refreshVersion]);

  return { history, error, refetch: () => setRefreshVersion((version) => version + 1) };
}
