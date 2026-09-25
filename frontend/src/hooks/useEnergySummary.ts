import { useCallback, useEffect, useRef, useState } from 'react';
import { energyApi } from '../services/api';
import type { EnergySummary } from '../types';

export function useEnergySummary(zoneId?: string) {
  const [summary, setSummary] = useState<EnergySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasLoaded = useRef(false);

  const fetchSummary = useCallback(async () => {
    if (!hasLoaded.current) setLoading(true);
    try {
      const data = await energyApi.summary(zoneId);
      setSummary(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load energy summary');
    } finally {
      setLoading(false);
      hasLoaded.current = true;
    }
  }, [zoneId]);

  // oxlint-disable-next-line react/set-state-in-effect -- fetchSummary updates state after an API response.
  useEffect(() => {
    queueMicrotask(() => void fetchSummary());
    const interval = setInterval(fetchSummary, 10_000); // refresh every 10s
    return () => clearInterval(interval);
  }, [fetchSummary]);

  return { summary, loading, error, refetch: fetchSummary };
}
