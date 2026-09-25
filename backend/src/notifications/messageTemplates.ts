import type { Alert } from '@prisma/client';

export function alertMessage(alert: Alert) {
  const value = alert.value === null ? '' : ` Value: ${alert.value.toFixed(2)}.`;
  const threshold = alert.threshold === null ? '' : ` Threshold: ${alert.threshold.toFixed(2)}.`;
  return `[EcoWatch] ${alert.severity} ${alert.type}: ${alert.message}.${value}${threshold}`;
}
