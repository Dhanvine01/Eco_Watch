import type { Alert } from '@prisma/client';

export type NotificationResult = {
  success: boolean;
  provider: string;
  errorMsg?: string;
};

export interface NotificationProvider {
  readonly name: string;
  sendAlert(alert: Alert, message: string): Promise<NotificationResult>;
}
