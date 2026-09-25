// ─── Inspector / Inspection types ────────────────────────────────────────────

export type InspectionType =
  | 'ROUTINE'
  | 'CORROSION'
  | 'DAMAGE'
  | 'POSSIBLE_LEAK'
  | 'EQUIPMENT_ISSUE'
  | 'OTHER';

export type InspectionSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type InspectionStatus =
  | 'OPEN'
  | 'UNDER_REVIEW'
  | 'ACKNOWLEDGED'
  | 'RESOLVED';

export type PriorityLevel = 'HIGH' | 'MEDIUM' | 'LOW';

export interface InspectionImage {
  id: string;
  inspectionId: string;
  storagePath: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  caption: string | null;
  uploadedAt: string;
}

export interface Inspection {
  id: string;
  inspectorId: string;
  inspector: { id: string; name: string };
  zoneId: string;
  zone: { id: string; name: string };
  equipmentId: string | null;
  equipment: { id: string; label: string } | null;
  locationCode: string | null;
  component: string | null;
  inspectionType: InspectionType;
  severity: InspectionSeverity;
  message: string;
  status: InspectionStatus;
  /** AI analysis result — null until AI module populates it, or mock result present */
  aiResult: AIInspectionResult | null;
  createdAt: string;
  updatedAt: string;
  images: InspectionImage[];
  /** Only present on admin list endpoint */
  priority?: { score: number; level: PriorityLevel; label: string };
}

// ─── AI Result type (matches backend/src/ai/types.ts) ────────────────────────

export type AIRiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | 'UNKNOWN';

export type AIProvider = 'qwen' | 'openai' | 'mock' | 'fallback' | 'legacy-mock';

export type VisualIndicatorType =
  | 'suspected_corrosion' | 'surface_damage' | 'cracks'
  | 'unusual_discoloration' | 'damaged_insulation'
  | 'visible_leakage_indicator' | 'damaged_pipe_joint'
  | 'deterioration' | 'smoke_detected' | 'fire_detected'
  | 'burn_marks' | 'moisture_accumulation' | 'structural_deformation'
  | 'none_detected';

export interface VisualIndicator {
  type: VisualIndicatorType;
  description: string;
  confidence: number;
  region?: string;
}

export interface EvidenceItem {
  source: 'image' | 'inspector_notes' | 'sensor_data' | 'energy_trend' | 'historical_inspection';
  description: string;
  weight: 'low' | 'medium' | 'high';
}


export interface AIInspectionResult {
  riskLevel: AIRiskLevel;
  confidence: number;
  /** Array of specific findings from the analysis */
  findings: string[];
  /** Possible contributing causes (hedged language) */
  possibleCauses: string[];
  /** Actionable recommendations */
  recommendations: string[];
  /** Visual indicators detected via image analysis */
  visualIndicators: VisualIndicator[];
  /** Structured evidence contributing to this assessment */
  evidence: EvidenceItem[];
  /** Human-readable narrative combining all signals */
  narrative: string;
  /** Mandatory AI disclaimer */
  disclaimer: string;
  /** Provider that produced the result */
  provider: AIProvider;
  modelVersion: string;
  analyzedAt: string;
}

// ─── Equipment types ──────────────────────────────────────────────────────────

export interface Equipment {
  id: string;
  label: string;
  zoneId: string;
  zone: { id: string; name: string };
  description: string | null;
  baselinePowerW: number | null;
  createdAt: string;
  updatedAt: string;
}

// ─── Energy Degradation ───────────────────────────────────────────────────────

export type EnergyTrendClassification =
  | 'NORMAL'
  | 'EFFICIENCY_DEGRADATION_SUSPECTED'
  | 'ENERGY_ANOMALY'
  | 'INSPECTION_RECOMMENDED';

export interface EnergyDegradationResult {
  equipmentId: string;
  equipmentLabel: string;
  avgPowerShortW: number;
  avgPowerLongW: number;
  deviationPct: number;
  classification: EnergyTrendClassification;
  classificationLabel: string;
  isSudden: boolean;
  note: string;
}

// ─── Equipment History ────────────────────────────────────────────────────────

export interface EquipmentHistory {
  equipment: {
    id: string;
    label: string;
    description: string | null;
    zone: { id: string; name: string };
    baselinePowerW: number | null;
  };
  latestReadings: import('./reading').SensorReading[];
  activeAlerts: import('./alert').Alert[];
  inspections: Inspection[];
  energyTrend: EnergyDegradationResult | null;
}
