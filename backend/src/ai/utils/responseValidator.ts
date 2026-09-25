/**
 * EcoGen AI — Response Validator
 * ─────────────────────────────────────────────────────────────────────────────
 * Validates raw LLM output against AIInspectionResult schema.
 * Handles malformed JSON, missing fields, and out-of-range values gracefully.
 * Directly ported from teammate's responseValidator.ts.
 */

import type {
  AIInspectionResult,
  AIAnalysisError,
  AIErrorCode,
  AIRiskLevel,
  VisualIndicatorType,
} from '../types';

// ─── Valid sets ────────────────────────────────────────────────────────────────

const VALID_RISK_LEVELS: AIRiskLevel[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL', 'UNKNOWN'];

const VALID_VISUAL_INDICATORS: VisualIndicatorType[] = [
  'suspected_corrosion', 'surface_damage', 'cracks',
  'unusual_discoloration', 'damaged_insulation',
  'visible_leakage_indicator', 'damaged_pipe_joint',
  'deterioration', 'smoke_detected', 'fire_detected',
  'burn_marks', 'moisture_accumulation', 'structural_deformation',
  'none_detected',
];

const VALID_EVIDENCE_SOURCES = [
  'image', 'inspector_notes', 'sensor_data', 'energy_trend', 'historical_inspection',
] as const;

const VALID_EVIDENCE_WEIGHTS = ['low', 'medium', 'high'] as const;

// ─── JSON extraction ──────────────────────────────────────────────────────────

/**
 * Extracts a JSON object from LLM output that may contain
 * markdown fences or surrounding text.
 */
export function extractJSON(raw: string): string {
  const fenceMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) return fenceMatch[1].trim();
  const start = raw.indexOf('{');
  const end   = raw.lastIndexOf('}');
  if (start !== -1 && end !== -1 && end > start) return raw.substring(start, end + 1);
  return raw.trim();
}

// ─── Validation ────────────────────────────────────────────────────────────────

export interface ValidationResult {
  valid: boolean;
  output?: Partial<AIInspectionResult>;
  errors: string[];
}

export function validateRawResponse(raw: string): ValidationResult {
  const errors: string[] = [];
  let parsed: Record<string, unknown>;

  try {
    parsed = JSON.parse(extractJSON(raw));
  } catch {
    return { valid: false, errors: ['Failed to parse JSON from model response'] };
  }

  const output: Partial<AIInspectionResult> = {};

  // riskLevel — LLMs may return LOW/MEDIUM/HIGH/CRITICAL (no UNKNOWN)
  const rl = (parsed.riskLevel as string | undefined)?.toUpperCase();
  if (!rl || !VALID_RISK_LEVELS.includes(rl as AIRiskLevel)) {
    errors.push(`Invalid riskLevel: ${parsed.riskLevel}`);
    output.riskLevel = 'UNKNOWN';
  } else {
    output.riskLevel = rl as AIRiskLevel;
  }

  // confidence
  const confidence = Number(parsed.confidence);
  if (isNaN(confidence) || confidence < 0 || confidence > 1) {
    errors.push(`Invalid confidence: ${parsed.confidence}`);
    output.confidence = 0.5;
  } else {
    output.confidence = Math.round(confidence * 100) / 100;
  }

  // findings
  if (!Array.isArray(parsed.findings)) {
    errors.push('findings must be an array of strings');
    output.findings = [];
  } else {
    output.findings = (parsed.findings as unknown[])
      .filter((f) => typeof f === 'string' && f.trim().length > 0)
      .map((f) => String(f));
  }

  // possibleCauses
  if (!Array.isArray(parsed.possibleCauses)) {
    output.possibleCauses = [];
  } else {
    output.possibleCauses = (parsed.possibleCauses as unknown[])
      .filter((c) => typeof c === 'string').map(String);
  }

  // recommendations (teammates used recommendedActions — accept either)
  const recs = parsed.recommendations ?? parsed.recommendedActions;
  if (!Array.isArray(recs)) {
    output.recommendations = [];
  } else {
    output.recommendations = (recs as unknown[])
      .filter((r) => typeof r === 'string').map(String);
  }

  // visualIndicators
  if (!Array.isArray(parsed.visualIndicators)) {
    output.visualIndicators = [];
  } else {
    output.visualIndicators = (parsed.visualIndicators as Record<string, unknown>[])
      .filter((vi) => vi && typeof vi === 'object')
      .map((vi) => ({
        type: VALID_VISUAL_INDICATORS.includes(vi.type as VisualIndicatorType)
          ? (vi.type as VisualIndicatorType)
          : 'none_detected',
        description: typeof vi.description === 'string' ? vi.description : 'No description',
        confidence:  typeof vi.confidence  === 'number' ? Math.min(1, Math.max(0, vi.confidence)) : 0.5,
        region:      typeof vi.region      === 'string' ? vi.region : undefined,
      }));
  }

  // evidence
  if (!Array.isArray(parsed.evidence)) {
    output.evidence = [];
  } else {
    output.evidence = (parsed.evidence as Record<string, unknown>[])
      .filter((e) => e && typeof e === 'object')
      .map((e) => ({
        source: VALID_EVIDENCE_SOURCES.includes(e.source as typeof VALID_EVIDENCE_SOURCES[number])
          ? (e.source as AIInspectionResult['evidence'][number]['source'])
          : 'image',
        description: typeof e.description === 'string' ? e.description : '',
        weight: VALID_EVIDENCE_WEIGHTS.includes(e.weight as typeof VALID_EVIDENCE_WEIGHTS[number])
          ? (e.weight as 'low' | 'medium' | 'high')
          : 'medium',
      }));
  }

  // narrative
  output.narrative = typeof parsed.narrative === 'string' && parsed.narrative.trim().length > 0
    ? parsed.narrative
    : 'AI analysis completed. Please review findings above.';

  return { valid: errors.length === 0, output, errors };
}

// ─── Error factory ─────────────────────────────────────────────────────────────

export function buildError(
  code: AIErrorCode,
  message: string,
  retryable = false
): AIAnalysisError {
  return { success: false, error: { code, message, retryable } };
}
