/**
 * InspectionPriority
 *
 * Deterministic algorithm — NOT AI.
 *
 * Calculates an integer priority score and label for an inspection record
 * using only:
 *   - Inspector-assigned severity
 *   - Inspection type
 *   - Inspection status (unresolved = higher urgency)
 *   - Whether sensor anomalies exist for the same equipment zone
 *   - Whether an energy degradation issue was flagged for the equipment
 *
 * The result is labelled explicitly as a SYSTEM PRIORITY — not an AI prediction.
 */

import { InspectionSeverity, InspectionStatus, InspectionType, EnergyTrendClassification } from '@prisma/client';

export type PriorityLevel = 'HIGH' | 'MEDIUM' | 'LOW';

export interface InspectionPriorityResult {
  score: number;          // Higher = more urgent
  level: PriorityLevel;
  label: string;          // Display label for the UI
}

// ─── Scoring weights ──────────────────────────────────────────────────────────

const SEVERITY_SCORE: Record<InspectionSeverity, number> = {
  CRITICAL: 40,
  HIGH: 30,
  MEDIUM: 15,
  LOW: 5,
};

const TYPE_SCORE: Record<InspectionType, number> = {
  POSSIBLE_LEAK: 20,
  CORROSION: 15,
  DAMAGE: 15,
  EQUIPMENT_ISSUE: 10,
  ROUTINE: 0,
  OTHER: 0,
};

const STATUS_SCORE: Record<InspectionStatus, number> = {
  OPEN: 10,
  UNDER_REVIEW: 5,
  ACKNOWLEDGED: 2,
  RESOLVED: 0,
};

const ENERGY_CLASSIFICATION_SCORE: Record<EnergyTrendClassification, number> = {
  ENERGY_ANOMALY: 15,
  INSPECTION_RECOMMENDED: 10,
  EFFICIENCY_DEGRADATION_SUSPECTED: 5,
  NORMAL: 0,
};

/** Extra score when active sensor alerts exist for the same zone */
const SENSOR_ALERT_BONUS = 10;

export function calculateInspectionPriority(params: {
  severity: InspectionSeverity;
  inspectionType: InspectionType;
  status: InspectionStatus;
  hasActiveSensorAlert: boolean;
  energyClassification: EnergyTrendClassification | null;
}): InspectionPriorityResult {
  const { severity, inspectionType, status, hasActiveSensorAlert, energyClassification } = params;

  const score =
    SEVERITY_SCORE[severity] +
    TYPE_SCORE[inspectionType] +
    STATUS_SCORE[status] +
    (hasActiveSensorAlert ? SENSOR_ALERT_BONUS : 0) +
    (energyClassification ? ENERGY_CLASSIFICATION_SCORE[energyClassification] : 0);

  const level: PriorityLevel = score >= 45 ? 'HIGH' : score >= 20 ? 'MEDIUM' : 'LOW';
  const label = `${level} PRIORITY`;

  return { score, level, label };
}
