import { useEffect, useState, type ReactNode } from 'react';
import { readingsApi } from '../services/api';
import { connectSSE } from '../services/sse';
import type { SensorReading } from '../types';
import { StreamStateContext } from './streamState';

export function StreamProvider({ children }: { children: ReactNode }) {
  const [latestReadings, setLatestReadings] = useState<Record<string, SensorReading>>({});
  const [connected, setConnected] = useState(false);
  const [alertVersion, setAlertVersion] = useState(0);

  useEffect(() => {
    let active = true;
    readingsApi.latest()
      .then((readings) => {
        if (active) setLatestReadings(Object.fromEntries(readings.map((reading) => [reading.deviceId, reading])));
      })
      .catch(() => undefined);

    return connectSSE({
      onOpen: () => setConnected(true),
      onReading: (reading) => setLatestReadings((current) => ({ ...current, [reading.deviceId]: reading })),
      onAlert: () => setAlertVersion((version) => version + 1),
      onError: () => setConnected(false),
    });
  }, []);

  return <StreamStateContext.Provider value={{ latestReadings, connected, alertVersion }}>{children}</StreamStateContext.Provider>;
}
