import type { SensorProvider, SensorReadingPayload } from './SensorProvider';
import { applyScenario } from '../simulation/scenarios';

type SensorState = Omit<SensorReadingPayload, 'deviceId' | 'zoneId' | 'timestamp'>;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const meanRevert = (value: number, baseline: number, noise: number, rng: () => number) =>
  value + (baseline - value) * 0.15 + (rng() * 2 - 1) * noise;

const EQUIPMENT_CURRENT_BASELINE_A: Record<string, number> = {
  'ESP-001': 3.1,
  'ESP-002': 2.4,
};

export class SimulatedSensorProvider implements SensorProvider {
  private readonly states = new Map<string, SensorState>();

  constructor(private readonly rng: () => number = Math.random) {}

  generateReading(deviceId: string, zoneId: string): SensorReadingPayload | null {
    const currentBaseline = EQUIPMENT_CURRENT_BASELINE_A[deviceId] ?? 2.6;
    const previous = this.states.get(deviceId) ?? {
      temperature: 29,
      humidity: 58,
      airQuality: 80,
      current: currentBaseline,
      noise: deviceId === 'ESP-001' ? 64 : 60,
      waterLeak: false,
      fireDetected: false
    };

    const next: SensorState = {
      // Real sensor fields — tight variance mimicking actual DHT22 / MQ-135 precision
      temperature: clamp(meanRevert(previous.temperature ?? 29, 29, 0.12, this.rng), 20, 36),
      humidity:    clamp(meanRevert(previous.humidity    ?? 58, 58, 0.25, this.rng), 30, 85),
      airQuality:  clamp(meanRevert(previous.airQuality  ?? 80, 80, 0.40, this.rng), 30, 140),
      // Derived / simulated fields — very tight variance, looks like stable equipment readings
      current:     clamp(meanRevert(previous.current     ?? 2.2, 2.2, 0.03, this.rng), 0.5, 5),
      noise:       clamp(meanRevert(previous.noise       ?? 62,  62,  0.15, this.rng), 35, 72),
      waterLeak:   false,
      fireDetected: false
    };

    this.states.set(deviceId, next);

    const reading = {
      deviceId,
      zoneId,
      timestamp: new Date().toISOString(),
      ...next
    };

    return applyScenario(deviceId, reading);
  }
}
