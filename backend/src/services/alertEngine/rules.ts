import { AlertType, Severity, type SensorReading } from '@prisma/client';
import type { Thresholds } from '../thresholds.service';

export type AlertCandidate = {
  type: AlertType;
  severity: Severity;
  message: string;
  value?: number;
  threshold?: number;
};

function tieredRule(
  reading: SensorReading,
  value: number | null,
  warning: number | undefined,
  critical: number | undefined,
  type: AlertType,
  label: string
): AlertCandidate | null {
  if (value === null || warning === undefined || critical === undefined || value < warning) {
    return null;
  }

  const severity = value >= critical ? Severity.CRITICAL : Severity.WARNING;
  const threshold = severity === Severity.CRITICAL ? critical : warning;

  return {
    type,
    severity,
    message: `${label} crossed ${severity.toLowerCase()} threshold`,
    value,
    threshold
  };
}

export function checkReadingRules(reading: SensorReading, thresholds: Thresholds) {
  return [
    tieredRule(
      reading,
      reading.airQuality,
      thresholds.AIR_QUALITY_WARNING,
      thresholds.AIR_QUALITY_CRITICAL,
      AlertType.AIR_QUALITY,
      'Air quality'
    ),
    tieredRule(
      reading,
      reading.noise,
      thresholds.NOISE_WARNING,
      thresholds.NOISE_CRITICAL,
      AlertType.NOISE,
      'Noise'
    ),
    tieredRule(
      reading,
      reading.current,
      thresholds.CURRENT_WARNING,
      thresholds.CURRENT_CRITICAL,
      AlertType.ENERGY_ANOMALY,
      'Energy current'
    ),
    tieredRule(
      reading,
      reading.temperature,
      thresholds.TEMPERATURE_WARNING,
      thresholds.TEMPERATURE_CRITICAL,
      AlertType.TEMPERATURE,
      'Temperature'
    ),
    reading.waterLeak
      ? {
          type: AlertType.WATER_LEAK,
          severity: Severity.CRITICAL,
          message: 'Water leak detected'
        }
      : null,
    reading.fireDetected
      ? {
          type: AlertType.FIRE,
          severity: Severity.CRITICAL,
          message: 'Fire detected'
        }
      : null
  ].filter((candidate): candidate is AlertCandidate => candidate !== null);
}
