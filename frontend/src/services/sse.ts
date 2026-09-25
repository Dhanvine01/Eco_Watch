/**
 * sse.ts — Thin wrapper around the browser's native EventSource.
 * The backend pushes two event types:
 *   - "reading"  { reading: SensorReading }
 *   - "alert"    { alert: Alert }
 *
 * Returns a cleanup function to close the connection.
 */

import type { Alert, SensorReading } from '../types';

export interface SSEHandlers {
  onOpen?: () => void;
  onReading?: (reading: SensorReading) => void;
  onAlert?: (alert: Alert) => void;
  onError?: (err: Event) => void;
}

export function connectSSE(handlers: SSEHandlers): () => void {
  const source = new EventSource('/api/v1/stream', { withCredentials: true });
  source.onopen = () => handlers.onOpen?.();

  source.addEventListener('reading', (e: MessageEvent) => {
    try {
      const data = JSON.parse(e.data) as { reading: SensorReading };
      handlers.onReading?.(data.reading);
    } catch {
      // ignore malformed frames
    }
  });

  source.addEventListener('alert', (e: MessageEvent) => {
    try {
      const data = JSON.parse(e.data) as { alert: Alert };
      handlers.onAlert?.(data.alert);
    } catch {
      // ignore malformed frames
    }
  });

  if (handlers.onError) {
    source.onerror = handlers.onError;
  }

  return () => source.close();
}
