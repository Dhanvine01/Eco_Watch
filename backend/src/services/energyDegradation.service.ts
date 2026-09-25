/**
 * EnergyDegradationService
 *
 * Deterministic algorithm — NO AI.
 *
 * Analyses historical current/power readings for a piece of equipment and
 * classifies the energy consumption pattern using simple statistics.
 *
 * Terminology:
 *   "Energy Consumption Degradation Trend" — a gradual increase suggests
 *   efficiency degradation (friction, wear, fouling).
 *   "Energy Anomaly" — a sudden spike suggests a possible electrical fault.
 *
 * NOTE: The SCT-013 current sensor does NOT directly diagnose electrical leaks
 * or measure true mechanical efficiency. These classifications are based solely
 * on changes in power consumption as measured by current draw and are clearly
 * labelled as indicators, not diagnoses.
 */

import { EnergyTrendClassification } from '@prisma/client';
import { prisma } from '../config/prisma';
import { POWER_FACTOR, POWER_VOLTAGE } from '../config/constants';

export { EnergyTrendClassification };

export interface EnergyDegradationResult {
  equipmentId: string;
  equipmentLabel: string;
  /** Short-term average power (Watts) — mean of the last SHORT_WINDOW_MINUTES minutes */
  avgPowerShortW: number;
  /** Long-term baseline average power (Watts) — mean of last LONG_WINDOW_MINUTES minutes */
  avgPowerLongW: number;
  /** % deviation of short-term from baseline (positive = higher consumption) */
  deviationPct: number;
  classification: EnergyTrendClassification;
  /** Human-readable label for the UI */
  classificationLabel: string;
  /** True when the increase appears sudden rather than gradual */
  isSudden: boolean;
  note: string;
}

// ─── Tuning parameters ────────────────────────────────────────────────────────
/** Short-term window: compare this against the baseline */
const SHORT_WINDOW_MINUTES = 15;
/** Long-term window: rolling baseline */
const LONG_WINDOW_MINUTES = 120;
/** Threshold for "gradual efficiency degradation" (%) */
const DEGRADATION_THRESHOLD_PCT = 10;
/** Threshold for "sudden energy anomaly" (%) — must also be accompanied by a
 *  step-change, not a gradual drift */
const ANOMALY_THRESHOLD_PCT = 30;
/** Mid-window used to detect whether the increase is gradual or sudden */
const MID_WINDOW_MINUTES = 30;

const CLASSIFICATION_LABELS: Record<EnergyTrendClassification, string> = {
  NORMAL: 'Normal',
  EFFICIENCY_DEGRADATION_SUSPECTED: 'Efficiency Degradation Suspected',
  ENERGY_ANOMALY: 'Energy Anomaly Detected',
  INSPECTION_RECOMMENDED: 'Inspection Recommended',
};

/**
 * Analyse energy consumption for a single piece of equipment.
 *
 * Uses devices that belong to the same zone as the equipment.
 * Current readings are converted to estimated power using the shared
 * POWER_VOLTAGE × POWER_FACTOR constants (same as the rest of EcoWatch).
 */
export async function analyseEquipmentEnergy(equipmentId: string): Promise<EnergyDegradationResult | null> {
  const equipment = await prisma.equipment.findUnique({
    where: { id: equipmentId },
    include: { zone: { include: { devices: true } } }
  });
  if (!equipment) return null;

  const deviceIds = equipment.zone.devices.map((d) => d.id);
  if (deviceIds.length === 0) return null;

  const now = new Date();
  const longStart = new Date(now.getTime() - LONG_WINDOW_MINUTES * 60_000);
  const shortStart = new Date(now.getTime() - SHORT_WINDOW_MINUTES * 60_000);
  const midStart = new Date(now.getTime() - MID_WINDOW_MINUTES * 60_000);

  // Fetch aggregated averages from the database
  const [longAgg, shortAgg, midAgg] = await Promise.all([
    prisma.sensorReading.aggregate({
      where: { deviceId: { in: deviceIds }, recordedAt: { gte: longStart }, current: { not: null } },
      _avg: { estimatedPowerW: true, current: true }
    }),
    prisma.sensorReading.aggregate({
      where: { deviceId: { in: deviceIds }, recordedAt: { gte: shortStart }, current: { not: null } },
      _avg: { estimatedPowerW: true, current: true }
    }),
    prisma.sensorReading.aggregate({
      where: { deviceId: { in: deviceIds }, recordedAt: { gte: midStart, lt: shortStart }, current: { not: null } },
      _avg: { estimatedPowerW: true, current: true }
    }),
  ]);

  // Fall back to baseline from equipment record if no historical data
  const fallbackW = equipment.baselinePowerW ?? 0;

  function resolveAvg(agg: { _avg: { estimatedPowerW: number | null; current: number | null } }): number {
    if (agg._avg.estimatedPowerW !== null) return agg._avg.estimatedPowerW;
    if (agg._avg.current !== null) return agg._avg.current * POWER_VOLTAGE * POWER_FACTOR;
    return fallbackW;
  }

  const avgPowerLongW = resolveAvg(longAgg);
  const avgPowerShortW = resolveAvg(shortAgg);
  const avgPowerMidW = resolveAvg(midAgg);

  if (avgPowerLongW === 0) {
    return {
      equipmentId: equipment.id,
      equipmentLabel: equipment.label,
      avgPowerShortW,
      avgPowerLongW,
      deviationPct: 0,
      classification: EnergyTrendClassification.NORMAL,
      classificationLabel: CLASSIFICATION_LABELS.NORMAL,
      isSudden: false,
      note: 'Insufficient baseline data. Using equipment baseline if available.',
    };
  }

  const deviationPct = ((avgPowerShortW - avgPowerLongW) / avgPowerLongW) * 100;

  // Detect whether the change is sudden (big jump recently) or gradual (spread over time)
  const midDeviationPct = avgPowerMidW > 0
    ? ((avgPowerShortW - avgPowerMidW) / avgPowerMidW) * 100
    : deviationPct;
  // "Sudden" = most of the deviation occurred in the shorter window
  const isSudden = Math.abs(midDeviationPct) > Math.abs(deviationPct) * 0.6;

  let classification: EnergyTrendClassification;
  let note: string;

  if (deviationPct >= ANOMALY_THRESHOLD_PCT && isSudden) {
    classification = EnergyTrendClassification.ENERGY_ANOMALY;
    note = `Sudden increase of ${deviationPct.toFixed(1)}% in power consumption detected. Possible electrical fault or load change. An inspection is recommended.`;
  } else if (deviationPct >= ANOMALY_THRESHOLD_PCT) {
    classification = EnergyTrendClassification.INSPECTION_RECOMMENDED;
    note = `Power consumption is ${deviationPct.toFixed(1)}% above baseline. Persistent high consumption — inspection recommended.`;
  } else if (deviationPct >= DEGRADATION_THRESHOLD_PCT) {
    classification = EnergyTrendClassification.EFFICIENCY_DEGRADATION_SUSPECTED;
    note = `Gradual increase of ${deviationPct.toFixed(1)}% in power consumption. Possible efficiency degradation (e.g. friction, fouling, wear).`;
  } else {
    classification = EnergyTrendClassification.NORMAL;
    note = `Power consumption within expected range (${deviationPct.toFixed(1)}% from baseline).`;
  }

  // Persist snapshot for trend history
  await prisma.energyBaseline.create({
    data: {
      equipmentId: equipment.id,
      avgPowerShortW,
      avgPowerLongW,
      deviationPct,
      classification,
    }
  });

  return {
    equipmentId: equipment.id,
    equipmentLabel: equipment.label,
    avgPowerShortW,
    avgPowerLongW,
    deviationPct,
    classification,
    classificationLabel: CLASSIFICATION_LABELS[classification],
    isSudden,
    note,
  };
}

/**
 * Analyse energy for all equipment and return results.
 * Used by the equipment history and correlation endpoints.
 */
export async function analyseAllEquipmentEnergy(): Promise<EnergyDegradationResult[]> {
  const allEquipment = await prisma.equipment.findMany({ select: { id: true } });
  const results = await Promise.all(allEquipment.map((e) => analyseEquipmentEnergy(e.id)));
  return results.filter((r): r is EnergyDegradationResult => r !== null);
}
