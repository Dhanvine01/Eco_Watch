import bcrypt from 'bcrypt';
import { AlertStatus, AlertType, Prisma, Severity, type Role } from '@prisma/client';
import type { Request } from 'express';
import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { env } from '../config/env';
import { CO2_G_PER_WH, POWER_FACTOR, POWER_VOLTAGE } from '../config/constants';
import { prisma } from '../config/prisma';
import { notifyAlert } from '../notifications/NotificationService';
import { publishEvent, subscribeEvent } from '../services/events';
import { triggerScenario, clearScenario, clearScenarios, type SimulationScenario } from '../simulation/scenarios';
import { getThresholds } from '../services/thresholds.service';
import { integrityService } from '../services/telemetryIntegrity';

type JwtPayload = { sub: string; role: Role };
type AuthenticatedRequest = Request & {
  user?: {
    id: string;
    name: string;
    email: string;
    role: Role;
    createdAt: Date;
  };
};

const router = Router();
const cookieName = 'ecowatch_token';
const loginLimiter = rateLimit({ windowMs: 60_000, limit: 10, standardHeaders: true, legacyHeaders: false });

function safeDecode(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function parseCookies(header?: string) {
  return Object.fromEntries(
    (header ?? '')
      .split(';')
      .map((part) => {
        const valueIndex = part.indexOf('=');
        return valueIndex === -1 ? [] : [part.slice(0, valueIndex).trim(), safeDecode(part.slice(valueIndex + 1))];
      })
      .filter(([key, value]) => key && value)
  );
}

function tokenFromRequest(req: Request) {
  return parseCookies(req.headers.cookie)[cookieName] ?? req.headers.authorization?.replace(/^Bearer\s+/i, '');
}

async function userFromRequest(req: Request) {
  const token = tokenFromRequest(req);
  if (!token) return null;

  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
    return prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, name: true, email: true, role: true, createdAt: true }
    });
  } catch {
    return null;
  }
}

router.post('/auth/login', loginLimiter, async (req, res) => {
  const { email, password } = (req.body ?? {}) as { email?: unknown; password?: unknown };
  if (typeof email !== 'string' || typeof password !== 'string' || !email || !password) {
    res.status(400).json({ error: 'Email and password are required' });
    return;
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    res.status(401).json({ error: 'Invalid email or password' });
    return;
  }

  const token = jwt.sign({ sub: user.id, role: user.role }, env.JWT_SECRET, { expiresIn: '8h' });
  res.cookie(cookieName, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.NODE_ENV === 'production',
    maxAge: 8 * 60 * 60 * 1000
  });
  res.json({
    token,
    user: { id: user.id, name: user.name, email: user.email, role: user.role, createdAt: user.createdAt }
  });
});

router.post('/auth/logout', (_req, res) => {
  res.clearCookie(cookieName);
  res.status(204).send();
});

router.get('/auth/me', async (req, res) => {
  const user = await userFromRequest(req);
  if (!user) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }

  res.json({ user });
});

router.use(async (req, res, next) => {
  const user = await userFromRequest(req);
  if (!user) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }

  (req as AuthenticatedRequest).user = user;
  next();
});

function requireAdmin(req: Request, res: import('express').Response, next: import('express').NextFunction) {
  if ((req as AuthenticatedRequest).user?.role !== 'ADMIN') {
    res.status(403).json({ error: 'Admin access required' });
    return;
  }

  next();
}

const requireSimulationEnabled: import('express').RequestHandler = (_req, res, next) => {
  if (!env.SIMULATION_ENABLED) {
    res.status(404).json({ error: 'Simulation is disabled' });
    return;
  }
  next();
};

router.get('/devices', requireAdmin, async (_req, res) => {
  res.json(
    await prisma.device.findMany({
      orderBy: { label: 'asc' },
      select: { id: true, label: true, zoneId: true, isOnline: true, lastSeenAt: true, createdAt: true }
    })
  );
});

router.get('/devices/status', async (_req, res) => {
  res.json(
    await prisma.device.findMany({
      orderBy: { label: 'asc' },
      select: { id: true, label: true, zoneId: true, isOnline: true, lastSeenAt: true }
    })
  );
});

router.get('/zones', async (_req, res) => {
  res.json(await prisma.zone.findMany({ orderBy: { name: 'asc' } }));
});

router.get('/thresholds', async (_req, res) => {
  res.json(await getThresholds());
});

router.get('/readings/latest', async (req, res) => {
  const zoneId = typeof req.query.zoneId === 'string' ? req.query.zoneId : undefined;
  const devices = await prisma.device.findMany({
    where: zoneId ? { zoneId } : undefined,
    include: {
      zone: { select: { id: true, name: true } },
      readings: { orderBy: { recordedAt: 'desc' }, take: 1 }
    },
    orderBy: { label: 'asc' }
  });

  res.json(
    devices.flatMap((device) =>
      device.readings.map((reading) => ({
        ...reading,
        device: {
          id: device.id,
          label: device.label,
          isOnline: device.isOnline,
          zone: device.zone
        }
      }))
    )
  );
});

router.get('/readings/history', requireAdmin, async (req, res) => {
  const parsed = z.object({
    deviceId: z.string().min(1), from: z.coerce.date(), to: z.coerce.date()
  }).safeParse(req.query);
  if (!parsed.success || parsed.data.from >= parsed.data.to || parsed.data.to.getTime() - parsed.data.from.getTime() > 7 * 24 * 60 * 60 * 1000) {
    res.status(400).json({ error: 'deviceId, valid from/to dates, a positive range, and a maximum range of seven days are required' });
    return;
  }
  const { deviceId, from, to } = parsed.data;
  const where = { deviceId, recordedAt: { gte: from, lte: to } };
  const count = await prisma.sensorReading.count({ where });
  if (count > 500) {
    const bucketSeconds = Math.max(5, Math.ceil((to.getTime() - from.getTime()) / 1000 / 500));
    const readings = await prisma.$queryRaw<Array<{ recordedAt: Date; temperature: number | null; humidity: number | null; airQuality: number | null; current: number | null; noise: number | null; estimatedPowerW: number | null }>>`
      SELECT to_timestamp(floor(extract(epoch FROM "recordedAt") / ${bucketSeconds}) * ${bucketSeconds}) AS "recordedAt",
        avg("temperature")::float AS "temperature", avg("humidity")::float AS "humidity",
        avg("airQuality")::float AS "airQuality", avg("current")::float AS "current",
        avg("noise")::float AS "noise", avg("estimatedPowerW")::float AS "estimatedPowerW"
      FROM "SensorReading"
      WHERE "deviceId" = ${deviceId}
        AND extract(epoch FROM "recordedAt") >= ${from.getTime() / 1000}
        AND extract(epoch FROM "recordedAt") <= ${to.getTime() / 1000}
      GROUP BY 1 ORDER BY 1`;
    res.json(readings);
    return;
  }

  res.json(
    await prisma.sensorReading.findMany({
      where,
      orderBy: { recordedAt: 'asc' },
      select: {
        recordedAt: true,
        temperature: true,
        humidity: true,
        airQuality: true,
        current: true,
        noise: true,
        estimatedPowerW: true
      }
    })
  );
});

router.get('/alerts', async (req, res) => {
  const status = req.query.status === 'ACTIVE' ? AlertStatus.ACTIVE : undefined;
  res.json(
    await prisma.alert.findMany({
      where: status ? { status } : undefined,
      include: { zone: { select: { id: true, name: true } }, device: { select: { id: true, label: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100
    })
  );
});

router.get('/alerts/history', requireAdmin, async (_req, res) => {
  res.json(
    await prisma.alert.findMany({
      include: { zone: { select: { id: true, name: true } }, device: { select: { id: true, label: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100
    })
  );
});

router.post('/alerts/:id/resolve', requireAdmin, async (req, res) => {
  const id = String(req.params.id);
  try {
  const alert = await prisma.alert.update({
      where: { id },
      data: { status: AlertStatus.RESOLVED, resolvedAt: new Date() }
    });
  const device = alert.deviceId ? await prisma.device.findUnique({ where: { id: alert.deviceId } }) : null;
  if (device) clearScenario(device.label);
  publishEvent('alert', alert);
  res.json(alert);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      res.status(404).json({ error: 'Alert not found' });
      return;
    }
    throw error;
  }
});

router.get('/energy/summary', requireAdmin, async (req, res) => {
  const zoneId = typeof req.query.zoneId === 'string' ? req.query.zoneId : undefined;
  const where = {
    ...(zoneId ? { device: { zoneId } } : {}),
    recordedAt: { gte: new Date(Date.now() - 60 * 60 * 1000) }
  };
  const [energy, peak, devices] = await Promise.all([
    prisma.sensorReading.aggregate({ where, _sum: { estimatedEnergyWh: true } }),
    prisma.sensorReading.aggregate({ where, _max: { estimatedPowerW: true } }),
    prisma.device.findMany({
      where: zoneId ? { zoneId } : undefined,
      select: { readings: { orderBy: { recordedAt: 'desc' }, take: 1, select: { current: true, estimatedPowerW: true } } }
    })
  ]);
  const latest = devices.flatMap((device) => device.readings);
  const currentA = latest.reduce((sum, reading) => sum + (reading.current ?? 0), 0);
  const estimatedPowerW = latest.reduce((sum, reading) => sum + (reading.estimatedPowerW ?? (reading.current ?? 0) * POWER_VOLTAGE * POWER_FACTOR), 0);
  const trendNow = new Date();
  const recentWhere = { ...(zoneId ? { device: { zoneId } } : {}), recordedAt: { gte: new Date(trendNow.getTime() - 5 * 60 * 1000) } };
  const previousWhere = { ...(zoneId ? { device: { zoneId } } : {}), recordedAt: { gte: new Date(trendNow.getTime() - 10 * 60 * 1000), lt: new Date(trendNow.getTime() - 5 * 60 * 1000) } };
  const [recent, previous] = await Promise.all([
    prisma.sensorReading.aggregate({ where: recentWhere, _avg: { estimatedPowerW: true } }),
    prisma.sensorReading.aggregate({ where: previousWhere, _avg: { estimatedPowerW: true } })
  ]);
  const recentPower = recent._avg.estimatedPowerW ?? 0;
  const previousPower = previous._avg.estimatedPowerW ?? recentPower;
  res.json({
    currentA,
    estimatedPowerW,
    estimatedEnergyWh: energy._sum.estimatedEnergyWh ?? 0,
    estimatedCO2g: (energy._sum.estimatedEnergyWh ?? 0) * CO2_G_PER_WH,
    peakPowerW: peak._max.estimatedPowerW ?? 0,
    trend: recentPower > previousPower * 1.05 ? 'UP' : recentPower < previousPower * 0.95 ? 'DOWN' : 'STABLE',
    ...(zoneId ? { zoneId } : {})
  });
});

router.post('/simulation/scenario', requireAdmin, requireSimulationEnabled, async (req, res) => {
  const parsed = z.object({
    scenario: z.enum(['FIRE', 'WATER_LEAK', 'ENERGY_SPIKE', 'NOISE_SPIKE', 'DEVICE_OFFLINE']),
    deviceId: z.string().uuid().optional()
  }).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues });
    return;
  }
  const { scenario, deviceId } = parsed.data;

  const device = deviceId
    ? await prisma.device.findUnique({ where: { id: deviceId } })
    : (await prisma.device.findFirst({ where: { label: 'ESP-002' } })) || (await prisma.device.findFirst({ orderBy: { label: 'desc' } }));
  if (!device) {
    res.status(404).json({ error: 'No device available for simulation' });
    return;
  }

  triggerScenario(device.label, scenario);
  if (scenario === 'DEVICE_OFFLINE') {
    await prisma.device.update({ where: { id: device.id }, data: { isOnline: false } });
    let alert = await prisma.alert.findFirst({
      where: { type: AlertType.DEVICE_OFFLINE, deviceId: device.id, status: AlertStatus.ACTIVE }
    });
    if (!alert) {
      alert = await prisma.alert.create({
        data: {
          type: AlertType.DEVICE_OFFLINE,
          severity: Severity.WARNING,
          message: `${device.label} offline (simulated node dropout)`,
          deviceId: device.id,
          zoneId: device.zoneId
        }
      });
      await notifyAlert(alert);
    }
    publishEvent('alert', alert);
  }
  res.json({ ok: true, device: device.label });
});

router.post('/simulation/reset', requireAdmin, requireSimulationEnabled, async (_req, res) => {
  clearScenarios();
  await prisma.device.updateMany({ where: { label: 'ESP-002' }, data: { isOnline: true } });
  await prisma.alert.updateMany({
    where: { type: AlertType.DEVICE_OFFLINE, status: AlertStatus.ACTIVE, device: { label: 'ESP-002' } },
    data: { status: AlertStatus.RESOLVED, resolvedAt: new Date() }
  });
  res.json({ ok: true });
});

// ─── Tamper-evident telemetry demo (Features 4 & 5) ─────────────────────────
router.get('/integrity/status', async (_req, res) => {
  const latest = await prisma.sensorReading.findFirst({ orderBy: { recordedAt: 'desc' } });
  const status = integrityService.status(latest);
  res.json(status);
});

router.post('/integrity/verify', requireAdmin, async (_req, res) => {
  const latest = await prisma.sensorReading.findFirst({ orderBy: { recordedAt: 'desc' } });
  res.json(integrityService.verify(latest));
});

router.post('/integrity/tamper', requireAdmin, async (req, res) => {
  const latest = await prisma.sensorReading.findFirst({ orderBy: { recordedAt: 'desc' } });
  const mode = req.body?.mode ?? 'direct';
  if (mode === 'rewrite') {
    res.json(integrityService.simulateChainRewrite(req.body?.blockIndex ?? 2, latest));
  } else {
    res.json(integrityService.simulateDirectTamper(req.body?.blockIndex ?? 2, latest));
  }
});

router.post('/integrity/tamper-direct', requireAdmin, async (req, res) => {
  const latest = await prisma.sensorReading.findFirst({ orderBy: { recordedAt: 'desc' } });
  res.json(integrityService.simulateDirectTamper(req.body?.blockIndex ?? 2, latest));
});

router.post('/integrity/tamper-rewrite', requireAdmin, async (req, res) => {
  const latest = await prisma.sensorReading.findFirst({ orderBy: { recordedAt: 'desc' } });
  res.json(integrityService.simulateChainRewrite(req.body?.blockIndex ?? 2, latest));
});

router.post('/integrity/reset', requireAdmin, async (_req, res) => {
  const latest = await prisma.sensorReading.findFirst({ orderBy: { recordedAt: 'desc' } });
  res.json(integrityService.reset(latest));
});

router.get('/stream', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no'
  });
  res.flushHeaders();
  res.write(': connected\n\n');
  const ping = setInterval(() => res.write(': ping\n\n'), 25_000);

  const offReading = subscribeEvent('reading', (reading) => {
    res.write(`event: reading\ndata: ${JSON.stringify({ reading })}\n\n`);
  });
  const offAlert = subscribeEvent('alert', (alert) => {
    res.write(`event: alert\ndata: ${JSON.stringify({ alert })}\n\n`);
  });

  req.on('close', () => {
    clearInterval(ping);
    offReading();
    offAlert();
    res.end();
  });
});

export const apiRouter = router;
