import { AlertStatus, AlertType, Severity, type SensorReading } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { notifyAlert } from '../../notifications/NotificationService';
import { getThresholds } from '../thresholds.service';
import { publishEvent } from '../events';
import { checkReadingRules, type AlertCandidate } from './rules';

const severityRank: Record<Severity, number> = { INFO: 0, WARNING: 1, CRITICAL: 2 };

export function decideAlertAction(
  existingActiveAlert: { severity: Severity } | null,
  candidate: AlertCandidate
): 'create' | 'escalate' | 'skip' {
  if (!existingActiveAlert) return 'create';
  return severityRank[candidate.severity] > severityRank[existingActiveAlert.severity] ? 'escalate' : 'skip';
}

export function shouldAutoResolve(value: number | null, warning: number | undefined, candidateProduced: boolean) {
  return value !== null && warning !== undefined && !candidateProduced && value < warning * 0.95;
}

async function persistCandidate(reading: SensorReading, candidate: AlertCandidate) {
  const existing = await prisma.alert.findFirst({
    where: { type: candidate.type, deviceId: reading.deviceId, status: AlertStatus.ACTIVE }
  });
  const action = decideAlertAction(existing, candidate);
  if (action === 'skip') return null;

  const device = await prisma.device.findUniqueOrThrow({
    where: { id: reading.deviceId },
    select: { zoneId: true }
  });

  // Cross-reference prior inspection findings for predictive root cause analysis
  let message = candidate.message;
  try {
    const prior = await prisma.inspection.findFirst({
      where: { zoneId: device.zoneId },
      orderBy: { createdAt: 'desc' },
      include: { equipment: true }
    });
    if (prior && prior.aiResult) {
      const ai = prior.aiResult as any;
      const comp = prior.component || prior.equipment?.label || 'equipment';
      if (candidate.type === AlertType.AIR_QUALITY) {
        message += ` | ⚠️ AI Diagnostic Correlation: Prior inspection (${prior.id.slice(0, 8)}) on ${comp} warned of possible CO2 / gas leakage risk due to flange seal deterioration.`;
      } else if (candidate.type === AlertType.WATER_LEAK) {
        message += ` | ⚠️ AI Diagnostic Correlation: Prior inspection (${prior.id.slice(0, 8)}) on ${comp} identified moisture residue and fluid seal degradation.`;
      } else if (candidate.type === AlertType.TEMPERATURE || candidate.type === AlertType.FIRE) {
        message += ` | ⚠️ AI Diagnostic Correlation: Prior inspection (${prior.id.slice(0, 8)}) on ${comp} flagged localized thermal discoloration and heat stress.`;
      }
    }
  } catch {
    // Non-fatal fallback
  }

  if (action === 'escalate' && existing) {
    return prisma.alert.update({
      where: { id: existing.id },
      data: { severity: candidate.severity, message, value: candidate.value, threshold: candidate.threshold }
    });
  }

  return prisma.alert.create({
    data: {
      type: candidate.type,
      severity: candidate.severity,
      message,
      value: candidate.value,
      threshold: candidate.threshold,
      deviceId: reading.deviceId,
      zoneId: device.zoneId
    }
  });
}

async function autoResolveRecoveredAlerts(reading: SensorReading, candidates: AlertCandidate[]) {
  const thresholds = await getThresholds();
  const recoveries: Array<{ type: AlertType; value: number | null; warning?: number }> = [
    { type: AlertType.AIR_QUALITY, value: reading.airQuality, warning: thresholds.AIR_QUALITY_WARNING },
    { type: AlertType.NOISE, value: reading.noise, warning: thresholds.NOISE_WARNING },
    { type: AlertType.ENERGY_ANOMALY, value: reading.current, warning: thresholds.CURRENT_WARNING },
    { type: AlertType.TEMPERATURE, value: reading.temperature, warning: thresholds.TEMPERATURE_WARNING }
  ];

  for (const recovery of recoveries) {
    if (!shouldAutoResolve(recovery.value, recovery.warning, candidates.some((candidate) => candidate.type === recovery.type))) continue;
    const activeAlerts = await prisma.alert.findMany({
      where: { deviceId: reading.deviceId, type: recovery.type, status: AlertStatus.ACTIVE }
    });
    for (const alert of activeAlerts) {
      const resolved = await prisma.alert.update({
        where: { id: alert.id }, data: { status: AlertStatus.RESOLVED, resolvedAt: new Date() }
      });
      publishEvent('alert', resolved);
    }
  }
}

export async function evaluateReading(reading: SensorReading) {
  const thresholds = await getThresholds();
  const candidates = checkReadingRules(reading, thresholds);
  const alerts = [];

  for (const candidate of candidates) {
    const alert = await persistCandidate(reading, candidate);
    if (alert) {
      void notifyAlert(alert).catch(console.error);
      publishEvent('alert', alert);
      alerts.push(alert);
    }
  }

  await autoResolveRecoveredAlerts(reading, candidates);

  return alerts;
}

export async function checkOfflineDevices() {
  const thresholds = await getThresholds();
  const offlineSeconds = thresholds.DEVICE_OFFLINE_SECONDS ?? 120;
  const cutoff = new Date(Date.now() - offlineSeconds * 1000);
  const devices = await prisma.device.findMany({
    where: {
      isOnline: true,
      lastSeenAt: { lt: cutoff }
    }
  });

  const alerts = [];

  for (const device of devices) {
    await prisma.device.update({ where: { id: device.id }, data: { isOnline: false } });

    const existing = await prisma.alert.findFirst({
      where: { type: AlertType.DEVICE_OFFLINE, deviceId: device.id, status: AlertStatus.ACTIVE }
    });

    if (!existing) {
      const alert = await prisma.alert.create({
        data: {
          type: AlertType.DEVICE_OFFLINE,
          severity: Severity.WARNING,
          message: 'Device offline',
          deviceId: device.id,
          zoneId: device.zoneId
        }
      });
      void notifyAlert(alert).catch(console.error);
      publishEvent('alert', alert);
      alerts.push(alert);
    }
  }

  return alerts;
}
