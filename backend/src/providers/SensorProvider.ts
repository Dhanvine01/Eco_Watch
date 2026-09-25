export type SensorReadingPayload = {
  deviceId: string;
  zoneId: string;
  timestamp: string;
  temperature?: number;
  humidity?: number;
  airQuality?: number;
  current?: number;
  noise?: number;
  waterLeak?: boolean;
  fireDetected?: boolean;
};

export interface SensorProvider {
  generateReading(deviceId: string, zoneId: string): SensorReadingPayload | null;
}
