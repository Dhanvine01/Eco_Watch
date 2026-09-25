// ─── Alerts ───────────────────────────────────────────────────────────────────
export type AlertType =
  | 'AIR_QUALITY'
  | 'ENERGY_ANOMALY'
  | 'WATER_LEAK'
  | 'FIRE'
  | 'NOISE'
  | 'TEMPERATURE'
  | 'DEVICE_OFFLINE';

export type Severity = 'INFO' | 'WARNING' | 'CRITICAL';
export type AlertStatus = 'ACTIVE' | 'RESOLVED';

export interface Alert {
  id: string;
  type: AlertType;
  severity: Severity;
  message: string;
  zoneId: string | null;
  deviceId: string | null;
  value: number | null;
  threshold: number | null;
  status: AlertStatus;
  createdAt: string;
  resolvedAt: string | null;
  zone?: { id: string; name: string };
  device?: { id: string; label: string };
}

// ─── Energy Summary ───────────────────────────────────────────────────────────
export interface EnergySummary {
  currentA: number;
  estimatedPowerW: number;
  estimatedEnergyWh: number;
  estimatedCO2g: number;
  peakPowerW: number;
  trend: 'UP' | 'DOWN' | 'STABLE';
  zoneId?: string;
}
