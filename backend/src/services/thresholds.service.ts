import { prisma } from '../config/prisma';

export type Thresholds = Record<string, number>;

let cache: Thresholds | null = null;
let cachedAt = 0;
const cacheMs = 5_000;

export async function getThresholds() {
  const now = Date.now();

  if (cache && now - cachedAt < cacheMs) {
    return cache;
  }

  const rows = await prisma.thresholdConfig.findMany();
  cache = Object.fromEntries(rows.map((row) => [row.key, row.value]));
  cachedAt = now;
  return cache;
}

