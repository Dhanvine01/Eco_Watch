import type { Device } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../config/prisma';
import { evaluateReading } from './alertEngine';
import { AlertStatus, AlertType } from '@prisma/client';
import { publishEvent } from './events';
import { CO2_G_PER_WH, POWER_FACTOR, POWER_VOLTAGE, READING_INTERVAL_SECONDS } from '../config/constants';

const telemetrySchema = z
  .object({
    deviceId: z.string().min(1).optional(),
    zoneId: z.string().min(1).optional(),
    timestamp: z.string().datetime({ offset: true }).optional(),
    temperature: z.number().min(-40).max(150).optional(),
    humidity: z.number().min(0).max(100).optional(),
    airQuality: z.number().min(0).max(1000).optional(),
    current: z.number().min(0).max(100).optional(),
    noise: z.number().min(0).max(200).optional(),
    waterLeak: z.boolean().optional(),
    fireDetected: z.boolean().optional()
  })
  .refine(
    (payload) =>
      payload.temperature !== undefined ||
      payload.humidity !== undefined ||
      payload.airQuality !== undefined ||
      payload.current !== undefined ||
      payload.noise !== undefined ||
      payload.waterLeak !== undefined ||
      payload.fireDetected !== undefined,
    { message: 'At least one sensor field is required' }
  )
  .refine((payload) => !payload.timestamp || new Date(payload.timestamp).getTime() <= Date.now() + 5 * 60 * 1000, {
    message: 'timestamp cannot be more than five minutes in the future'
  });

export type TelemetryPayload = z.infer<typeof telemetrySchema>;

export async function storeTelemetryReading(input: unknown, authenticatedDevice: Device) {
  const payload = telemetrySchema.parse(input);
  const estimatedPowerW =
    payload.current === undefined ? undefined : payload.current * POWER_VOLTAGE * POWER_FACTOR;

  if (payload.deviceId && payload.deviceId !== authenticatedDevice.label && payload.deviceId !== authenticatedDevice.id) {
    throw new Error('Telemetry deviceId does not match authenticated device');
  }

  if (payload.zoneId) {
    const zone = await prisma.zone.findFirst({
      where: {
        OR: [{ id: payload.zoneId }, { name: payload.zoneId }]
      }
    });

    if (!zone || zone.id !== authenticatedDevice.zoneId) {
      throw new Error('Telemetry zoneId does not match authenticated device zone');
    }
  }

  const reading = await prisma.sensorReading.create({
    data: {
      deviceId: authenticatedDevice.id,
      temperature: payload.temperature,
      humidity: payload.humidity,
      airQuality: payload.airQuality,
      current: payload.current,
      noise: payload.noise,
      waterLeak: payload.waterLeak ?? false,
      fireDetected: payload.fireDetected ?? false,
      estimatedPowerW,
      estimatedEnergyWh: estimatedPowerW === undefined ? undefined : estimatedPowerW * READING_INTERVAL_SECONDS / 3600,
      estimatedCO2g: estimatedPowerW === undefined ? undefined : estimatedPowerW * READING_INTERVAL_SECONDS / 3600 * CO2_G_PER_WH,
      recordedAt: payload.timestamp ? new Date(payload.timestamp) : new Date()
    }
  });

  await prisma.device.update({
    where: { id: authenticatedDevice.id },
    data: { isOnline: true, lastSeenAt: new Date() }
  });

  const offlineAlerts = await prisma.alert.findMany({
    where: { deviceId: authenticatedDevice.id, type: AlertType.DEVICE_OFFLINE, status: AlertStatus.ACTIVE }
  });
  for (const alert of offlineAlerts) {
    const resolved = await prisma.alert.update({
      where: { id: alert.id }, data: { status: AlertStatus.RESOLVED, resolvedAt: new Date() }
    });
    publishEvent('alert', resolved);
  }

  const alerts = await evaluateReading(reading);
  publishEvent('reading', reading);

  return { reading, alerts };
}
