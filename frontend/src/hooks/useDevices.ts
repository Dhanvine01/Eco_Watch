import { useCallback, useEffect, useState } from 'react';
import { useStream } from './useStream';
import { devicesApi } from '../services/api';
import type { Device } from '../types';

export function useDevices(statusOnly = false) {
  const { alertVersion } = useStream();
  const [devices, setDevices] = useState<Device[]>([]);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    try {
      setDevices(statusOnly ? await devicesApi.status() : await devicesApi.list());
      setError(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Failed to load devices');
    }
  }, [statusOnly]);

  // oxlint-disable-next-line react/set-state-in-effect -- refetch updates state after an API response.
  useEffect(() => {
    queueMicrotask(() => void refetch());
    const interval = window.setInterval(() => void refetch(), 15_000);
    return () => window.clearInterval(interval);
  }, [refetch, alertVersion]);

  return { devices, error, refetch };
}
