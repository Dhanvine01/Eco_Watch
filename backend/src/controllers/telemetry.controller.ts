import type { Device } from '@prisma/client';
import type { Request, Response } from 'express';
import { ZodError } from 'zod';
import { storeTelemetryReading } from '../services/telemetry.service';

type DeviceRequest = Request & { device?: Device };

export async function ingestTelemetry(req: Request, res: Response) {
  const device = (req as DeviceRequest).device;
  if (!device) {
    res.status(401).json({ error: 'Device authentication required' });
    return;
  }

  try {
    const result = await storeTelemetryReading(req.body, device);
    res.status(201).json(result);
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json({ error: error.issues });
      return;
    }

    res.status(400).json({ error: error instanceof Error ? error.message : 'Invalid telemetry' });
  }
}
