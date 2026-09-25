import bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { PrismaClient, Role } from '@prisma/client';

const prisma = new PrismaClient();

const thresholds = {
  AIR_QUALITY_WARNING: 200,
  AIR_QUALITY_CRITICAL: 300,
  CURRENT_WARNING: 6,
  CURRENT_CRITICAL: 8,
  NOISE_WARNING: 75,
  NOISE_CRITICAL: 90,
  TEMPERATURE_WARNING: 38,
  TEMPERATURE_CRITICAL: 45,
  DEVICE_OFFLINE_SECONDS: 120,
  ENERGY_ANOMALY_PERCENT: 40
};

async function ensureDevice(label: string, deviceKey: string, zoneId: string) {
  const existing = await prisma.device.findFirst({ where: { label } });
  if (existing) {
    return { device: await prisma.device.update({ where: { id: existing.id }, data: { zoneId } }), created: false };
  }
  return { device: await prisma.device.create({ data: { label, deviceKey, zoneId } }), created: true };
}

async function main() {
  const production = process.env.NODE_ENV === 'production';
  if (production && (!process.env.SEED_ADMIN_PASSWORD || !process.env.SEED_WORKER_PASSWORD)) {
    throw new Error('SEED_ADMIN_PASSWORD and SEED_WORKER_PASSWORD are required in production');
  }
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? 'password123';
  const workerPassword = process.env.SEED_WORKER_PASSWORD ?? 'password123';
  const inspectorPassword = process.env.SEED_INSPECTOR_PASSWORD ?? 'password123';
  const [adminPasswordHash, workerPasswordHash, inspectorPasswordHash] = await Promise.all([
    bcrypt.hash(adminPassword, 10),
    bcrypt.hash(workerPassword, 10),
    bcrypt.hash(inspectorPassword, 10),
  ]);
  const deviceKeys = production
    ? [randomBytes(24).toString('hex'), randomBytes(24).toString('hex')]
    : ['dev-key-esp-001', 'dev-key-esp-002'];

  await prisma.user.upsert({
    where: { email: 'admin@ecowatch.local' },
    update: {},
    create: { name: 'EcoWatch Admin', email: 'admin@ecowatch.local', passwordHash: adminPasswordHash, role: Role.ADMIN }
  });

  await prisma.user.upsert({
    where: { email: 'worker@ecowatch.local' },
    update: {},
    create: { name: 'EcoWatch Worker', email: 'worker@ecowatch.local', passwordHash: workerPasswordHash, role: Role.WORKER }
  });

  // INSPECTOR role — seeded for development/demo
  await prisma.user.upsert({
    where: { email: 'inspector@ecowatch.local' },
    update: {},
    create: { name: 'Site Inspector', email: 'inspector@ecowatch.local', passwordHash: inspectorPasswordHash, role: Role.INSPECTOR }
  });

  const assembly = await prisma.zone.upsert({
    where: { name: 'Assembly Floor' },
    update: {},
    create: { name: 'Assembly Floor' }
  });

  const storage = await prisma.zone.upsert({
    where: { name: 'Storage Bay' },
    update: {},
    create: { name: 'Storage Bay' }
  });

  const seededDevices = await Promise.all([
    ensureDevice('ESP-001', deviceKeys[0], assembly.id),
    ensureDevice('ESP-002', deviceKeys[1], storage.id)
  ]);

  // ─── Equipment master list ────────────────────────────────────────────────────
  // Equipment labels are the shared identifiers used across sensor readings,
  // alerts, inspection reports, and future AI results.
  await prisma.equipment.upsert({
    where: { label: 'PUMP-01' },
    update: {},
    create: { label: 'PUMP-01', zoneId: assembly.id, description: 'Primary coolant pump', baselinePowerW: 1800 }
  });
  await prisma.equipment.upsert({
    where: { label: 'PUMP-02' },
    update: {},
    create: { label: 'PUMP-02', zoneId: assembly.id, description: 'Secondary coolant pump', baselinePowerW: 1750 }
  });
  await prisma.equipment.upsert({
    where: { label: 'COMPRESSOR-01' },
    update: {},
    create: { label: 'COMPRESSOR-01', zoneId: assembly.id, description: 'Air compressor unit', baselinePowerW: 3200 }
  });
  await prisma.equipment.upsert({
    where: { label: 'CONVEYOR-01' },
    update: {},
    create: { label: 'CONVEYOR-01', zoneId: storage.id, description: 'Main conveyor belt motor', baselinePowerW: 950 }
  });
  await prisma.equipment.upsert({
    where: { label: 'FAN-EXHAUST-01' },
    update: {},
    create: { label: 'FAN-EXHAUST-01', zoneId: storage.id, description: 'Exhaust ventilation fan', baselinePowerW: 420 }
  });

  await Promise.all(
    Object.entries(thresholds).map(([key, value]) =>
      prisma.thresholdConfig.upsert({
        where: { key },
        update: { value },
        create: { key, value }
      })
    )
  );

  if (production) {
    const createdKeys = seededDevices
      .map((result, index) => (result.created ? `ESP-00${index + 1}=${deviceKeys[index]}` : null))
      .filter((value): value is string => value !== null);
    if (createdKeys.length) console.log(`Seeded device keys: ${createdKeys.join(' ')}`);
  }
}

main()
  .finally(async () => { await prisma.$disconnect(); })
  .catch(async (error) => { console.error(error); process.exit(1); });
