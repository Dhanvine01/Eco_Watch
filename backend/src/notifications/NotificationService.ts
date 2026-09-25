import type { Alert } from '@prisma/client';
import { env } from '../config/env';
import { prisma } from '../config/prisma';
import { MockNotificationProvider } from './MockNotificationProvider';
import type { NotificationProvider } from './NotificationProvider';
import { TwilioWhatsAppProvider } from './TwilioWhatsAppProvider';
import { alertMessage } from './messageTemplates';

const provider: NotificationProvider =
  env.NOTIFICATION_PROVIDER === 'twilio' ? new TwilioWhatsAppProvider() : new MockNotificationProvider();

export async function notifyAlert(alert: Alert) {
  const result = await provider.sendAlert(alert, alertMessage(alert)).catch((error: unknown) => ({
    success: false,
    provider: provider.name,
    errorMsg: error instanceof Error ? error.message : 'Notification failed'
  }));

  await prisma.notificationLog.create({
    data: {
      alertId: alert.id,
      channel: 'whatsapp',
      provider: result.provider,
      success: result.success,
      errorMsg: result.errorMsg
    }
  });

  return result;
}
