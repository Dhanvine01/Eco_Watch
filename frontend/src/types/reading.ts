// ─── Sensor Readings ─────────────────────────────────────────────────────────
export interface SensorReading {
  id: string;
  deviceId: string;
  temperature: number | null;
  humidity: number | null;
  airQuality: number | null;
  current: number | null;
  noise: number | null;
  waterLeak: boolean;
  fireDetected: boolean;
  estimatedPowerW: number | null;
  estimatedEnergyWh: number | null;
  estimatedCO2g: number | null;
  recordedAt: string;
}

export interface LatestReading extends SensorReading {
  device?: {
    id: string;
    label: string;
    isOnline: boolean;
    zone?: { id: string; name: string };
  };
}

export interface HistoryReading {
  recordedAt: string;
  temperature: number | null;
  humidity: number | null;
  airQuality: number | null;
  current: number | null;
  noise: number | null;
  estimatedPowerW: number | null;
}
