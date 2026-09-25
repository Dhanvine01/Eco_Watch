import { SimulatedSensorProvider } from '../providers/SimulatedSensorProvider';
import type { SensorReadingPayload } from '../providers/SensorProvider';

type SimulatedDevice = {
  deviceId: string;
  zoneId: string;
};

export class SimulationScheduler {
  private timer?: NodeJS.Timeout;
  private inFlight = false;

  constructor(
    private readonly devices: SimulatedDevice[],
    private readonly onReading: (reading: SensorReadingPayload) => void | Promise<void>,
    private readonly provider = new SimulatedSensorProvider(),
    private readonly intervalMs = 5000
  ) {}

  start() {
    if (this.timer) {
      return;
    }

    this.timer = setInterval(() => void this.tick().catch((error) => console.error('Simulation tick failed', error)), this.intervalMs);
  }

  stop() {
    if (!this.timer) {
      return;
    }

    clearInterval(this.timer);
    this.timer = undefined;
  }

  async tick() {
    if (this.inFlight) return;
    this.inFlight = true;
    try {
    for (const device of this.devices) {
      try {
        const reading = this.provider.generateReading(device.deviceId, device.zoneId);
        if (reading) await this.onReading(reading);
      } catch (error) {
        console.error(`Simulation reading failed for ${device.deviceId}`, error);
      }
    }
    } finally {
      this.inFlight = false;
    }
  }
}
