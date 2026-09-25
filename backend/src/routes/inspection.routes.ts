/**
 * inspection.routes.ts
 *
 * All inspection-related API endpoints.
 * Mounted at /api/v1 (see server.ts).
 *
 * Authentication: same httpOnly JWT cookie as api.routes.ts
 * Role guards:
 *   INSPECTOR — create inspections, upload images, view own inspections
 *   ADMIN     — view all inspections, update status, view equipment history
 *   WORKER    — no access
 */

import path from 'path';
import { Router, type Request, type Response, type NextFunction } from 'express';
import { z } from 'zod';
import {
  InspectionType,
  InspectionSeverity,
  InspectionStatus,
  AlertStatus,
  EnergyTrendClassification,
  type Role,
} from '@prisma/client';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { prisma } from '../config/prisma';
import { uploadStore } from '../services/uploadStore';
import { analyseEquipmentEnergy } from '../services/energyDegradation.service';
import { calculateInspectionPriority } from '../services/inspectionPriority';
import { getAIProvider } from '../ai';
import type { AIHistoricalInspection, AIRecentSensorData } from '../ai/types';

const router = Router();

// ─── Auth helpers ─────────────────────────────────────────────────────────────
// These are intentionally self-contained so this router doesn't couple to api.routes internals.

type JwtPayload = { sub: string; role: Role };
type AuthenticatedRequest = Request & {
  user?: { id: string; name: string; email: string; role: Role; createdAt: Date };
};

function safeDecode(value: string) {
  try { return decodeURIComponent(value); } catch { return value; }
}

function parseCookies(header?: string): Record<string, string> {
  return Object.fromEntries(
    (header ?? '').split(';').map((part) => {
      const idx = part.indexOf('=');
      return idx === -1 ? [] : [part.slice(0, idx).trim(), safeDecode(part.slice(idx + 1))];
    }).filter(([k, v]) => k && v)
  );
}

async function userFromRequest(req: Request) {
  const token = parseCookies(req.headers.cookie)['ecowatch_token'] ?? req.headers.authorization?.replace(/^Bearer\s+/i, '');
  if (!token) return null;
  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
    return prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, name: true, email: true, role: true, createdAt: true }
    });
  } catch { return null; }
}

// ─── Middleware ───────────────────────────────────────────────────────────────

router.use(async (req, res, next) => {
  const user = await userFromRequest(req);
  if (!user) { res.status(401).json({ error: 'Not authenticated' }); return; }
  (req as AuthenticatedRequest).user = user;
  next();
});

function requireRole(...roles: Role[]) {
  return (_req: Request, res: Response, next: NextFunction) => {
    const user = (_req as AuthenticatedRequest).user;
    if (!user || !roles.includes(user.role)) {
      res.status(403).json({ error: `Access restricted to: ${roles.join(', ')}` });
      return;
    }
    next();
  };
}

// ─── Equipment endpoints ──────────────────────────────────────────────────────

/** GET /api/v1/equipment — list all equipment (ADMIN + INSPECTOR) */
router.get('/equipment', requireRole('ADMIN', 'INSPECTOR'), async (_req, res) => {
  const equipment = await prisma.equipment.findMany({
    include: { zone: { select: { id: true, name: true } } },
    orderBy: { label: 'asc' }
  });
  res.json(equipment);
});

/**
 * GET /api/v1/equipment/:id/history
 * Central equipment history: sensor status, alerts, inspections, energy trend.
 * ADMIN only.
 */
router.get('/equipment/:id/history', requireRole('ADMIN'), async (req, res) => {
  const equipmentId = String(req.params.id);

  // Fetch equipment with its zone and zone's devices
  const equipment = await prisma.equipment.findUnique({
    where: { id: equipmentId },
    include: { zone: { select: { id: true, name: true, devices: { select: { id: true } } } } }
  });
  if (!equipment) { res.status(404).json({ error: 'Equipment not found' }); return; }

  const deviceIds = equipment.zone.devices.map((d) => d.id);

  const [inspections, energyResult, latestReadings, activeAlerts] = await Promise.all([
    prisma.inspection.findMany({
      where: { equipmentId },
      include: {
        inspector: { select: { id: true, name: true } },
        images: { select: { id: true, originalName: true, storagePath: true, uploadedAt: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: 50
    }),
    analyseEquipmentEnergy(equipmentId),
    prisma.sensorReading.findMany({
      where: { deviceId: { in: deviceIds } },
      orderBy: { recordedAt: 'desc' },
      take: Math.max(deviceIds.length, 1)
    }),
    prisma.alert.findMany({
      where: { zoneId: equipment.zoneId, status: AlertStatus.ACTIVE },
      orderBy: { createdAt: 'desc' },
      take: 20
    })
  ]);

  res.json({
    equipment: {
      id: equipment.id,
      label: equipment.label,
      description: equipment.description,
      zone: { id: equipment.zone.id, name: equipment.zone.name },
      baselinePowerW: equipment.baselinePowerW,
    },
    latestReadings,
    activeAlerts,
    inspections,
    energyTrend: energyResult,
  });
});

// ─── Inspection CRUD ──────────────────────────────────────────────────────────

const createInspectionSchema = z.object({
  zoneId: z.string().uuid(),
  equipmentId: z.string().uuid().optional().nullable(),
  locationCode: z.string().max(50).optional().nullable(),
  component: z.string().max(100).optional().nullable(),
  inspectionType: z.nativeEnum(InspectionType),
  severity: z.nativeEnum(InspectionSeverity),
  message: z.string().min(1, 'Observation notes cannot be empty').max(2000),
  hasImages: z.boolean().optional(),
});

/**
 * POST /api/v1/inspections
 * Create a new inspection. INSPECTOR and ADMIN roles allowed.
 * If images are attached, AI analysis is deferred until the photo upload completes.
 */
router.post('/inspections', requireRole('ADMIN', 'INSPECTOR'), async (req, res) => {
  const parsed = createInspectionSchema.safeParse(req.body);
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? 'Invalid inspection parameters';
    res.status(400).json({ error: msg });
    return;
  }

  const user = (req as AuthenticatedRequest).user!;
  const { zoneId, equipmentId, locationCode, component, inspectionType, severity, message, hasImages } = parsed.data;

  const zone = await prisma.zone.findUnique({ where: { id: zoneId } });
  if (!zone) { res.status(400).json({ error: 'Zone not found' }); return; }

  if (equipmentId) {
    const eq = await prisma.equipment.findUnique({ where: { id: equipmentId } });
    if (!eq) { res.status(400).json({ error: 'Equipment not found' }); return; }
  }

  const inspection = await prisma.inspection.create({
    data: {
      inspectorId: user.id,
      zoneId,
      equipmentId: equipmentId ?? null,
      locationCode: locationCode ?? null,
      component: component ?? null,
      inspectionType,
      severity,
      message
    },
    include: {
      inspector: { select: { id: true, name: true } },
      zone: { select: { id: true, name: true } },
      equipment: { select: { id: true, label: true } },
      images: true,
    }
  });

  // Only trigger AI analysis immediately if there are NO images to upload.
  // When images are present, AI analysis is triggered in POST /inspections/:id/images
  // once the real photo is fully uploaded and saved to disk.
  if (!hasImages) {
    void triggerAIAnalysis(inspection.id).catch((err) =>
      console.error(`AI analysis failed for text-only inspection ${inspection.id}:`, err)
    );
  }

  res.status(201).json(inspection);
});

/** Internal: gather context and invoke the AI provider, then persist the result. */
async function triggerAIAnalysis(inspectionId: string): Promise<void> {
  const inspection = await prisma.inspection.findUnique({
    where: { id: inspectionId },
    include: {
      equipment: true,
      zone: { include: { devices: true } },
      images: true,
    }
  });
  if (!inspection) return;

  const deviceIds = inspection.zone.devices.map((d) => d.id);
  const recentStart = new Date(Date.now() - 30 * 60_000);

  const [recentReadings, historicalInspections, energyResult] = await Promise.all([
    prisma.sensorReading.findMany({
      where: { deviceId: { in: deviceIds }, recordedAt: { gte: recentStart } },
      include: { device: { select: { label: true } } },
      orderBy: { recordedAt: 'desc' },
      take: 100
    }),
    inspection.equipmentId
      ? prisma.inspection.findMany({
        where: { equipmentId: inspection.equipmentId, id: { not: inspectionId } },
        orderBy: { createdAt: 'desc' },
        take: 20
      })
      : Promise.resolve([]),
    inspection.equipmentId ? analyseEquipmentEnergy(inspection.equipmentId) : Promise.resolve(null),
  ]);

  const aiInput = {
    inspectionId: inspection.id,
    inspectionType: inspection.inspectionType as any,
    severity: inspection.severity as any,
    equipmentId: inspection.equipmentId,
    equipmentLabel: inspection.equipment?.label ?? null,
    locationCode: inspection.locationCode,
    component: inspection.component,
    inspectorNotes: inspection.message,
    imageReferences: inspection.images.map((img) => img.storagePath),
    recentSensorData: recentReadings.map((r): AIRecentSensorData => ({
      deviceLabel: r.device.label,
      zoneName: inspection.zone.name,
      temperature: r.temperature,
      humidity: r.humidity,
      airQuality: r.airQuality,
      current: r.current,
      noise: r.noise,
      waterLeak: r.waterLeak,
      fireDetected: r.fireDetected,
      estimatedPowerW: r.estimatedPowerW,
      recordedAt: r.recordedAt.toISOString(),
    })),
    historicalInspectionData: historicalInspections.map((h): AIHistoricalInspection => ({
      id: h.id,
      inspectionType: h.inspectionType,
      severity: h.severity,
      message: h.message,
      status: h.status,
      createdAt: h.createdAt.toISOString(),
      component: h.component,
      locationCode: h.locationCode,
    })),
    energyTrend: energyResult
      ? {
        equipmentLabel: energyResult.equipmentLabel,
        avgPowerShortW: energyResult.avgPowerShortW,
        avgPowerLongW: energyResult.avgPowerLongW,
        deviationPct: energyResult.deviationPct,
        classification: energyResult.classification,
      }
      : null,
  };

  const aiProvider = getAIProvider();
  const response = await aiProvider.analyzeInspection(aiInput);
  const dataToSave = response.success ? response.data : response;

  await prisma.inspection.update({
    where: { id: inspectionId },
    data: { aiResult: dataToSave as object }
  });
}

/**
 * GET /api/v1/inspections/images/:imageId/file
 * Serve an inspection photograph inline.
 * MUST be before /inspections/:id to avoid Express matching 'images' as a UUID.
 */
router.get('/inspections/images/:imageId/file', requireRole('ADMIN', 'INSPECTOR'), async (req, res) => {
  const image = await prisma.inspectionImage.findUnique({ where: { id: String(req.params.imageId) } });
  if (!image) { res.status(404).json({ error: 'Image not found' }); return; }

  if (!uploadStore.exists(image.storagePath)) {
    res.status(404).json({ error: 'File not found on storage' }); return;
  }

  const filePath = uploadStore.resolve(image.storagePath);
  res.setHeader('Content-Type', image.mimeType);
  res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(image.originalName)}"`);
  res.sendFile(path.resolve(filePath));
});

/**
 * GET /api/v1/inspections
 * ADMIN: all inspections enriched with deterministic priority scores.
 * INSPECTOR: only own inspections.
 */
router.get('/inspections', requireRole('ADMIN', 'INSPECTOR'), async (req, res) => {
  const user = (req as AuthenticatedRequest).user!;
  const isAdmin = user.role === 'ADMIN';

  const where = isAdmin ? {} : { inspectorId: user.id };
  const inspections = await prisma.inspection.findMany({
    where,
    include: {
      inspector: { select: { id: true, name: true } },
      zone: { select: { id: true, name: true } },
      equipment: { select: { id: true, label: true } },
      images: { select: { id: true, originalName: true, storagePath: true, uploadedAt: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 200
  });

  if (!isAdmin) { res.json(inspections); return; }

  // Enrich with deterministic priority score for the admin queue
  const enriched = await Promise.all(
    inspections.map(async (insp) => {
      const [alertCount, latestEnergyBaseline] = await Promise.all([
        prisma.alert.count({ where: { zoneId: insp.zoneId, status: AlertStatus.ACTIVE } }),
        insp.equipmentId
          ? prisma.energyBaseline.findFirst({
            where: { equipmentId: insp.equipmentId },
            orderBy: { recordedAt: 'desc' }
          })
          : Promise.resolve(null),
      ]);

      const priority = calculateInspectionPriority({
        severity: insp.severity,
        inspectionType: insp.inspectionType,
        status: insp.status,
        hasActiveSensorAlert: alertCount > 0,
        energyClassification: latestEnergyBaseline?.classification ?? null,
      });

      return { ...insp, priority };
    })
  );

  res.json(enriched);
});

/** GET /api/v1/inspections/:id — single inspection detail */
router.get('/inspections/:id', requireRole('ADMIN', 'INSPECTOR'), async (req, res) => {
  const user = (req as AuthenticatedRequest).user!;
  const inspectionId = String(req.params.id);

  const inspection = await prisma.inspection.findUnique({
    where: { id: inspectionId },
    include: {
      inspector: { select: { id: true, name: true } },
      zone: { select: { id: true, name: true } },
      equipment: { select: { id: true, label: true, description: true, baselinePowerW: true } },
      images: true,
    }
  });

  if (!inspection) { res.status(404).json({ error: 'Inspection not found' }); return; }
  if (user.role === 'INSPECTOR' && inspection.inspectorId !== user.id) {
    res.status(403).json({ error: 'Not authorised' }); return;
  }

  res.json(inspection);
});

/** PATCH /api/v1/inspections/:id/status — update status (ADMIN only) */
router.patch('/inspections/:id/status', requireRole('ADMIN'), async (req, res) => {
  const parsed = z.object({ status: z.nativeEnum(InspectionStatus) }).safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.issues }); return; }

  try {
    const updated = await prisma.inspection.update({
      where: { id: String(req.params.id) },
      data: { status: parsed.data.status },
    });
    res.json(updated);
  } catch {
    res.status(404).json({ error: 'Inspection not found' });
  }
});

// ─── Image upload ─────────────────────────────────────────────────────────────

const MAX_SIZE_BYTES = 8 * 1024 * 1024; // 8 MB

function normalizeMime(originalName: string, rawMime?: string | string[]): string {
  const raw = rawMime ? String(rawMime).toLowerCase().trim() : '';
  if (raw === 'image/jpeg' || raw === 'image/jpg' || raw === 'image/pjpeg') return 'image/jpeg';
  if (raw === 'image/png' || raw === 'image/x-png') return 'image/png';
  if (raw === 'image/webp') return 'image/webp';
  if (raw === 'image/gif') return 'image/gif';

  const ext = path.extname(originalName).toLowerCase();
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  if (ext === '.png') return 'image/png';
  if (ext === '.webp') return 'image/webp';
  if (ext === '.gif') return 'image/gif';

  return 'image/jpeg';
}

/**
 * POST /api/v1/inspections/:id/images
 * Upload a photograph for an inspection.
 *
 * Accepts raw binary via application/octet-stream or image mime.
 * Set request headers:
 *   x-file-name   : URI-encoded original filename
 *   x-file-mime   : MIME type (image/jpeg, image/png, image/webp, image/gif)
 *   x-caption     : (optional) URI-encoded caption text
 */
router.post('/inspections/:id/images', requireRole('ADMIN', 'INSPECTOR'), async (req, res) => {
  const user = (req as AuthenticatedRequest).user!;
  const inspectionId = String(req.params.id);

  const inspection = await prisma.inspection.findUnique({ where: { id: inspectionId } });
  if (!inspection) { res.status(404).json({ error: 'Inspection not found' }); return; }
  if (user.role === 'INSPECTOR' && inspection.inspectorId !== user.id) {
    res.status(403).json({ error: 'Not authorised' }); return;
  }

  const rawName = req.headers['x-file-name'];
  const rawMime = req.headers['x-file-mime'];
  const rawCaption = req.headers['x-caption'];

  let originalName = 'upload.jpg';
  try {
    originalName = rawName ? decodeURIComponent(String(rawName)) : 'upload.jpg';
  } catch {
    originalName = String(rawName || 'upload.jpg');
  }

  const mimeType = normalizeMime(originalName, rawMime);
  const caption = rawCaption ? decodeURIComponent(String(rawCaption)) : undefined;

  let buffer: Buffer;
  if (Buffer.isBuffer(req.body) && req.body.length > 0) {
    buffer = req.body;
  } else {
    const chunks: Buffer[] = [];
    await new Promise<void>((resolve, reject) => {
      req.on('data', (chunk: Buffer) => chunks.push(chunk));
      req.on('end', resolve);
      req.on('error', reject);
    });
    buffer = Buffer.concat(chunks);
  }

  if (buffer.length === 0) { res.status(400).json({ error: 'Empty file' }); return; }
  if (buffer.length > MAX_SIZE_BYTES) { res.status(413).json({ error: 'File too large (max 8 MB)' }); return; }

  const stored = await uploadStore.save(inspectionId, originalName, mimeType, buffer);

  const image = await prisma.inspectionImage.create({
    data: {
      inspectionId,
      storagePath: stored.storagePath,
      originalName: stored.originalName,
      mimeType: stored.mimeType,
      sizeBytes: stored.sizeBytes,
      caption,
    }
  });

  // Trigger AI vision analysis now that the photograph is uploaded and saved
  void triggerAIAnalysis(inspectionId).catch((err) =>
    console.error(`AI analysis after photo upload failed for inspection ${inspectionId}:`, err)
  );

  res.status(201).json(image);
});

export const inspectionRouter = router;
