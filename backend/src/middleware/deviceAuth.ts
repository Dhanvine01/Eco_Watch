import type { Device } from '@prisma/client';
import type { NextFunction, Request, Response } from 'express';
import { prisma } from '../config/prisma';

type DeviceRequest = Request & { device?: Device };

export async function deviceAuth(req: Request, res: Response, next: NextFunction) {
  const bodyKey = typeof req.body === 'object' && req.body !== null ? (req.body.deviceKey || req.body.device_key || req.body.apiKey) : undefined;
  const deviceKey = req.header('x-device-key') || req.header('device-key') || bodyKey || (req.query?.deviceKey as string) || (req.query?.device_key as string);

  if (!deviceKey) {
    // If only one device exists or default dev key
    const defaultDev = await prisma.device.findFirst({ where: { label: 'ESP-001' } });
    if (defaultDev) {
      (req as DeviceRequest).device = defaultDev;
      next();
      return;
    }
    res.status(401).json({ error: 'Missing x-device-key header or deviceKey in payload' });
    return;
  }

  const device = await prisma.device.findFirst({
    where: {
      OR: [
        { deviceKey: String(deviceKey) },
        { label: String(deviceKey) }
      ]
    }
  });

  if (!device) {
    res.status(401).json({ error: 'Invalid device key: ' + deviceKey });
    return;
  }

  (req as DeviceRequest).device = device;
  next();
}
