import type { SensorReadingPayload } from '../providers/SensorProvider';

export type SimulationScenario =
  | 'FIRE'
  | 'WATER_LEAK'
  | 'ENERGY_SPIKE'
  | 'NOISE_SPIKE'
  | 'DEVICE_OFFLINE';

type ScenarioState = {
  scenario: SimulationScenario;
  ticksRemaining: number;
};

const scenarios = new Map<string, ScenarioState>();

export function triggerScenario(deviceId: string, scenario: SimulationScenario, ticks = 5) {
  scenarios.set(deviceId, { scenario, ticksRemaining: ticks });
}

export function clearScenarios() {
  scenarios.clear();
}

export function clearScenario(deviceId: string) {
  scenarios.delete(deviceId);
}

export function applyScenario(deviceId: string, reading: SensorReadingPayload) {
  const state = scenarios.get(deviceId);

  if (!state) {
    return reading;
  }

  state.ticksRemaining -= 1;
  if (state.ticksRemaining <= 0) {
    scenarios.delete(deviceId);
  }

  if (state.scenario === 'DEVICE_OFFLINE') {
    return null;
  }

  return {
    ...reading,
    ...(state.scenario === 'FIRE' ? { fireDetected: true, temperature: 70 } : {}),
    ...(state.scenario === 'WATER_LEAK' ? { waterLeak: true } : {}),
    ...(state.scenario === 'ENERGY_SPIKE' ? { current: 7.2 } : {}),
    ...(state.scenario === 'NOISE_SPIKE' ? { noise: 92 } : {})
  };
}
