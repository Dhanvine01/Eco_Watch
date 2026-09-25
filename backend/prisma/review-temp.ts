import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const device = await prisma.device.findFirst({ where: { label: 'ESP-001' } });
  if (!device) throw new Error('ESP-001 not found');
  const start = new Date('2026-09-24T07:07:40.227Z');
  const to = new Date('2026-09-24T08:14:15.227Z');
  const rows = await prisma.$queryRaw<Array<{ recordedAt: Date }>>`
    SELECT to_timestamp(floor(extract(epoch FROM "recordedAt") / ${8}) * ${8}) AS "recordedAt"
    FROM "SensorReading"
    WHERE "deviceId" = ${device.id}
      AND extract(epoch FROM "recordedAt") >= ${start.getTime() / 1000}
      AND extract(epoch FROM "recordedAt") <= ${to.getTime() / 1000}
    GROUP BY 1 ORDER BY 1`;
  console.log(rows.length);
}

main().finally(() => prisma.$disconnect());
