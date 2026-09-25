import { useEffect, useState } from 'react';
import { thresholdsApi } from '../services/api';

export type Thresholds = Record<string, number>;

export function useThresholds() {
  const [thresholds, setThresholds] = useState<Thresholds>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    thresholdsApi.list()
      .then((data) => { setThresholds(data); setError(null); })
      .catch((reason) => setError(reason instanceof Error ? reason.message : 'Failed to load thresholds'));
  }, []);

  return { thresholds, error };
}
