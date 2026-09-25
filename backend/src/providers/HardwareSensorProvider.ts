import type { SensorProvider, SensorReadingPayload } from './SensorProvider';

export class HardwareSensorProvider implements SensorProvider {
  generateReading(_deviceId: string, _zoneId: string): SensorReadingPayload | null {
    throw new Error('HardwareSensorProvider will map ESP8266/ESP32 payloads in a later phase.');
  }
}
