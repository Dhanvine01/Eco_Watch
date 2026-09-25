/**
 * EcoGen AI — Type Contracts
 * ─────────────────────────────────────────────────────────────────────────────
 * Single source of truth for all AI/ML types in EcoGen.
 * Adapted from the teammate's AIInspectionTypes.ts and merged with
 * EcoGen's original types.ts to maintain backward-compatibility
 * with inspection.routes.ts.
 *
 * DO NOT scatter AI types elsewhere in the codebase.
 * All AI code lives in backend/src/ai/.
 */

// ─── Enumerations ─────────────────────────────────────────────────────────────

export type AIRiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | 'UNKNOWN';
export type RiskLevel   = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type AIProvider = 'qwen' | 'openai' | 'mock' | 'fallback' | 'legacy-mock';

export type InspectionType =
  | 'ROUTINE' | 'CORROSION' | 'DAMAGE' | 'POSSIBLE_LEAK' | 'EQUIPMENT_ISSUE' | 'OTHER';

export type SeverityLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type EnergyTrendDirection = 'INCREASING' | 'DECREASING' | 'STABLE' | 'FLUCTUATING';

export type VisualIndicatorType =
  | 'suspected_corrosion' | 'surface_damage' | 'cracks'
  | 'unusual_discoloration' | 'damaged_insulation'
  | 'visible_leakage_indicator' | 'damaged_pipe_joint'
  | 'deterioration' | 'smoke_detected' | 'fire_detected'
  | 'burn_marks' | 'moisture_accumulation' | 'structural_deformation'
  | 'none_detected';

export type AIErrorCode =
  | 'PROVIDER_UNAVAILABLE' | 'TIMEOUT' | 'INVALID_IMAGE'
  | 'INVALID_INPUT' | 'MALFORMED_RESPONSE' | 'RATE_LIMITED'
  | 'CONTEXT_TOO_LARGE' | 'UNKNOWN';

// ─── Input — EcoGen-native shape ──────────────────────────────────────────────
// This is what inspection.routes.ts produces and passes to the AI boundary.

export interface AIRecentSensorData {
  deviceLabel: string;
  zoneName: string;
  temperature?: number | null;
  humidity?: number | null;
  airQuality?: number | null;      // ppm (MQ-135)
  current?: number | null;          // Amperes (SCT-013)
  noise?: number | null;            // dB (KY-038)
  waterLeak?: boolean;
  fireDetected?: boolean;
  estimatedPowerW?: number | null;  // W
  recordedAt: string;               // ISO-8601
}

export interface AIHistoricalInspection {
  id: string;
  inspectionType: string;
  severity: string;
  message: string;
  status: string;
  createdAt: string;                // ISO-8601
  component?: string | null;
  locationCode?: string | null;
}

export interface AIEnergyTrend {
  equipmentLabel: string;
  avgPowerShortW: number;           // last 15 min
  avgPowerLongW: number;            // baseline 2 h
  deviationPct: number;             // % deviation
  classification:
    | 'NORMAL'
    | 'EFFICIENCY_DEGRADATION_SUSPECTED'
    | 'ENERGY_ANOMALY'
    | 'INSPECTION_RECOMMENDED';
}

/**
 * AIInspectionInput — EcoGen's canonical AI input type.
 * Built by inspection.routes.ts and consumed by the AI provider.
 */
export interface AIInspectionInput {
  inspectionId: string;
  inspectionType?: InspectionType;
  severity?: SeverityLevel;
  equipmentId: string | null;
  equipmentLabel: string | null;
  locationCode: string | null;
  component: string | null;
  inspectorNotes: string;
  /** Relative storage paths inside uploads/inspections/ */
  imageReferences: string[];
  recentSensorData: AIRecentSensorData[];
  historicalInspectionData: AIHistoricalInspection[];
  energyTrend: AIEnergyTrend | null;
}

// ─── Output ───────────────────────────────────────────────────────────────────

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

export interface FailureProgressionStage {
  timeframe: string;
  projected_risk: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  estimated_probability_pct: number;
  expected_condition: string;
}

export interface PredictivePrognosis {
  future_hazard: string;
  estimated_time_to_failure_days: number;
  time_to_failure_range: string;
  risk_trajectory: 'ACCELERATING' | 'PROGRESSIVE' | 'MODERATE' | 'STABLE';
  degradation_mechanism?: string;
  critical_intervention_deadline: string;
  timeline: FailureProgressionStage[];
}

/**
 * AIInspectionResult — what is stored in Inspection.aiResult (Prisma Json).
 * The frontend reads these exact keys — coordinate any additions.
 */
export interface AIInspectionResult {
  riskLevel: AIRiskLevel;
  confidence: number;               // 0.0–1.0
  findings: string[];
  possibleCauses: string[];
  recommendations: string[];
  visualIndicators: VisualIndicator[];
  evidence: EvidenceItem[];
  narrative: string;
  disclaimer: string;
  provider: AIProvider;
  modelVersion: string;
  analyzedAt: string;               // ISO-8601
  predictivePrognosis?: PredictivePrognosis;
}

// ─── Service-level wrappers ───────────────────────────────────────────────────

export interface AIAnalysisSuccess {
  success: true;
  data: AIInspectionResult;
}

export interface AIAnalysisError {
  success: false;
  error: {
    code: AIErrorCode;
    message: string;
    retryable: boolean;
  };
}

export type AIAnalysisResponse = AIAnalysisSuccess | AIAnalysisError;

// ─── Provider interface ───────────────────────────────────────────────────────

/**
 * AIInspectionProvider — the ONLY integration point for AI in EcoGen.
 *
 * To add a new provider:
 * 1. Create a class implementing this interface in backend/src/ai/providers/
 * 2. Register it in backend/src/ai/index.ts
 * 3. Do NOT modify any controller, route, or repository.
 */
export interface AIInspectionProvider {
  readonly name: string;
  /** Returns true only when the required env vars / credentials are set. */
  isAvailable(): boolean;
  /** Must never throw — all errors returned as AIAnalysisError. */
  analyzeInspection(input: AIInspectionInput): Promise<AIAnalysisResponse>;
}

// ─── Service config ───────────────────────────────────────────────────────────

export interface AIServiceConfig {
  provider: 'qwen' | 'openai' | 'mock' | 'auto';
  timeoutMs: number;
  maxRetries: number;
  fallbackToMock: boolean;
}

// ─── ML types (SensorMLBridge) ────────────────────────────────────────────────

export type SensorModelName =
  | 'gas_co2' | 'energy' | 'temperature' | 'water_leakage' | 'multisensor' | 'all';

export interface SensorFeatures {
  co2_ppm?: number;
  co_ppm?: number;
  nh3_ppm?: number;
  voc_ppm?: number;
  sensor_drift?: number;
  current_amps?: number;
  voltage_v?: number;
  power_kw?: number;
  power_factor?: number;
  thd_pct?: number;
  consumption_kwh?: number;
  frequency_hz?: number;
  load_variance?: number;
  temperature_c?: number;
  humidity_pct?: number;
  heat_index_c?: number;
  temp_rate_change?: number;
  ambient_temp_c?: number;
  delta_temp_c?: number;
  cycles_since_maint?: number;
  moisture_raw?: number;
  moisture_pct?: number;
  pressure_bar?: number;
  flow_rate_lpm?: number;
  pressure_drop_bar?: number;
  vibration_hz?: number;
  vibration_rms?: number;
  gas_ppm?: number;
  sound_db?: number;
  uptime_hrs?: number;
}

export interface MLPredictionResult {
  model: string;
  prediction_label: string;
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  confidence: number;
  anomaly_score: number | null;
  probabilities: Record<string, number>;
  is_anomalous: boolean;
  description: string;
  missing_features: string[];
}

export interface MLAllResult {
  overall_risk_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  overall_confidence: number;
  anomalous_sensors: string[];
  individual_results: Record<string, MLPredictionResult>;
}
