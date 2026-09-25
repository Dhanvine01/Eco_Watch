import { prisma } from '../config/prisma';

async function main() {
  await prisma.thresholdConfig.upsert({
    where: { key: 'AIR_QUALITY_WARNING' },
    update: { value: 200 },
    create: { key: 'AIR_QUALITY_WARNING', value: 200 }
  });
  await prisma.thresholdConfig.upsert({
    where: { key: 'AIR_QUALITY_CRITICAL' },
    update: { value: 300 },
    create: { key: 'AIR_QUALITY_CRITICAL', value: 300 }
  });
  console.log('Air Quality Warning threshold set to 200, Critical set to 300.');
}

main().finally(async () => {
  await prisma.$disconnect();
});
