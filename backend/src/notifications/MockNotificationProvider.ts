import type { Alert } from '@prisma/client';
import type { NotificationProvider, NotificationResult } from './NotificationProvider';

export class MockNotificationProvider implements NotificationProvider {
  readonly name = 'mock';

  async sendAlert(alert: Alert, message: string): Promise<NotificationResult> {
    console.log(`[mock-whatsapp] ${alert.id}: ${message}`);
    return { success: true, provider: this.name };
  }
}
