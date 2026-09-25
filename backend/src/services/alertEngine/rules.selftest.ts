import assert from 'assert/strict';
import { AlertType, Severity, type SensorReading } from '@prisma/client';
import { checkReadingRules } from './rules';
import { decideAlertAction, shouldAutoResolve } from './index';
import { SimulatedSensorProvider } from '../../providers/SimulatedSensorProvider';

const baseReading = {
  id: 'reading-1',
  deviceId: 'device-1',
  temperature: 29,
  humidity: 55,
  airQuality: 80,
  current: 2,
  noise: 60,
  waterLeak: false,
  fireDetected: false,
  estimatedPowerW: 414,
  estimatedEnergyWh: 0.575,
  estimatedCO2g: 0.4715,
  recordedAt: new Date()
} satisfies SensorReading;

const thresholds = {
  AIR_QUALITY_WARNING: 150,
  AIR_QUALITY_CRITICAL: 250,
  CURRENT_WARNING: 6,
  CURRENT_CRITICAL: 8,
  NOISE_WARNING: 75,
  NOISE_CRITICAL: 90,
  TEMPERATURE_WARNING: 38,
  TEMPERATURE_CRITICAL: 45
};

const alerts = checkReadingRules(
  {
    ...baseReading,
    airQuality: 420,
    current: 11,
    noise: 94,
    temperature: 70,
    waterLeak: true,
    fireDetected: true
  },
  thresholds
);

assert.deepEqual(
  alerts.map((alert) => alert.type),
  [
    AlertType.AIR_QUALITY,
    AlertType.NOISE,
    AlertType.ENERGY_ANOMALY,
    AlertType.TEMPERATURE,
    AlertType.WATER_LEAK,
    AlertType.FIRE
  ]
);
assert.equal(alerts.every((alert) => alert.severity === Severity.CRITICAL), true);

const warningCandidate = { type: AlertType.NOISE, severity: Severity.WARNING, message: 'warning' };
const criticalCandidate = { ...warningCandidate, severity: Severity.CRITICAL };
assert.equal(decideAlertAction(null, warningCandidate), 'create');
assert.equal(decideAlertAction({ severity: Severity.WARNING }, criticalCandidate), 'escalate');
assert.equal(decideAlertAction({ severity: Severity.CRITICAL }, warningCandidate), 'skip');
assert.equal(shouldAutoResolve(70, 75, false), true);
assert.equal(shouldAutoResolve(72, 75, false), false);

let seed = 1;
const provider = new SimulatedSensorProvider(() => {
  seed = (seed * 16807) % 2147483647;
  return (seed - 1) / 2147483646;
});
for (let device = 0; device < 200; device += 1) {
  for (let tick = 0; tick < 1440; tick += 1) {
    const reading = provider.generateReading(`device-${device}`, 'zone-1');
    assert.ok(reading);
    assert.equal(
      checkReadingRules(
        {
          ...baseReading,
          ...reading,
          temperature: reading.temperature ?? null,
          humidity: reading.humidity ?? null,
          airQuality: reading.airQuality ?? null,
          current: reading.current ?? null,
          noise: reading.noise ?? null,
          recordedAt: new Date(reading.timestamp)
        },
        thresholds
      ).length,
      0
    );
  }
}

console.log('alert rules self-check passed');
