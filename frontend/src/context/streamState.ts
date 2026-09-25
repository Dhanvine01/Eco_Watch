import { createContext } from 'react';
import type { SensorReading } from '../types';

export type StreamState = {
  latestReadings: Record<string, SensorReading>;
  connected: boolean;
  alertVersion: number;
};

export const StreamStateContext = createContext<StreamState | null>(null);
