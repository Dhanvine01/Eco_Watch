import type { Alert } from '@prisma/client';
import { env } from '../config/env';
import type { NotificationProvider, NotificationResult } from './NotificationProvider';

export class TwilioWhatsAppProvider implements NotificationProvider {
  readonly name = 'twilio';

  async sendAlert(_alert: Alert, message: string): Promise<NotificationResult> {
    const to = env.ALERT_WHATSAPP_TO;
    const from = env.TWILIO_WHATSAPP_FROM;
    const sid = env.TWILIO_ACCOUNT_SID;
    const token = env.TWILIO_AUTH_TOKEN;

    if (!to || !from || !sid || !token) {
      return { success: false, provider: this.name, errorMsg: 'Twilio WhatsApp env vars are incomplete' };
    }

    const body = new URLSearchParams({ From: from, To: to, Body: message });
    const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body,
      signal: AbortSignal.timeout(10_000)
    });

    if (!response.ok) {
      return { success: false, provider: this.name, errorMsg: await response.text() };
    }

    return { success: true, provider: this.name };
  }
}
