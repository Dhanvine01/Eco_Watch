import cors from 'cors';
import express from 'express';
import http from 'http';
import { env } from './config/env';
import { prisma } from './config/prisma';
import { apiRouter } from './routes/api.routes';
import { inspectionRouter } from './routes/inspection.routes';
import { telemetryRouter } from './routes/telemetry.routes';
import { SimulationScheduler } from './simulation/SimulationScheduler';
import { startDeviceOfflineJob } from './services/alertEngine/offlineJob';
import { storeTelemetryReading } from './services/telemetry.service';
import { errorHandler } from './middleware/errorHandler';
import { mlBridge } from './ai/ml/SensorMLBridge';

const app = express();

process.on('unhandledRejection', (reason) => console.error('Unhandled rejection', reason));

const allowedOrigins = env.CORS_ORIGIN?.split(',').map((origin) => origin.trim()).filter(Boolean);
app.use(cors({ origin: env.NODE_ENV === 'production' ? (allowedOrigins?.length ? allowedOrigins : false) : true, credentials: true }));
app.use(express.json({ limit: '100kb' }));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'ecowatch-api' });
});

app.use('/api/v1/telemetry', telemetryRouter);
app.use('/api/v1', apiRouter);
app.use('/api/v1', inspectionRouter);
app.use(errorHandler);

const server = http.createServer(app);
server.listen(env.PORT, '0.0.0.0', () => {
  console.log(`EcoWatch API listening on 0.0.0.0:${env.PORT}`);

  // ─── Optional ML bridge ─────────────────────────────────────────────────
  // Python ML service is started ONLY if ML_ENABLED=true.
  // EcoGen continues to function normally without it.
  if (process.env.ML_ENABLED === 'true') {
    try {
      mlBridge.start();
      console.log('[ML] Sensor ML service starting...');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[ML] Sensor ML service unavailable (${msg}). Continuing without ML.`);
    }
  } else {
    console.log('[ML] ML_ENABLED is not set — sensor ML predictions disabled.');
  }
});

async function startSimulation() {
  const devices = await prisma.device.findMany({ include: { zone: true }, orderBy: { label: 'asc' } });
  // ESP-001 receives real hardware sensor readings; ESP-002 runs simulated stream
  const simulatedDevices = devices.filter((device) => device.label !== 'ESP-001');
  const scheduler = new SimulationScheduler(
    simulatedDevices.map((device) => ({ deviceId: device.label, zoneId: device.zone.name })),
    async (reading) => {
      const device = devices.find((item) => item.label === reading.deviceId);
      if (device) await storeTelemetryReading(reading, device);
    }
  );

  await scheduler.tick();
  scheduler.start();
  console.log('[Simulation] Simulator active for:', simulatedDevices.map((d) => d.label).join(', ') || 'none', '(ESP-001 reserved for real sensor data)');
}

if (env.NODE_ENV !== 'test') {
  startDeviceOfflineJob();
  if (env.SIMULATION_ENABLED) {
    startSimulation().catch((error) => {
      console.warn('Simulation not started. Is the database migrated and seeded?', error.message);
    });
  }
}

async function shutdown(signal: string) {
  console.log(`${signal} received, shutting down`);
  mlBridge.stop();
  setTimeout(() => process.exit(1), 5000).unref();
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
  server.closeAllConnections();
}

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));
