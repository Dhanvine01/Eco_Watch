/**
 * EcoGen AI — Input Validator
 * ─────────────────────────────────────────────────────────────────────────────
 * Validates AIInspectionInput before passing to any AI provider.
 * Returns typed validation errors rather than throwing.
 * Ported from teammate's inputValidator.ts, adapted to EcoGen's input shape.
 */

import type { AIInspectionInput } from '../types';

export interface InputValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateInspectionInput(input: AIInspectionInput): InputValidationResult {
  const errors:   string[] = [];
  const warnings: string[] = [];

  if (!input) {
    return { valid: false, errors: ['Input is null or undefined'], warnings: [] };
  }

  // Required string fields
  if (!input.inspectionId || input.inspectionId.trim() === '') {
    errors.push('inspectionId is required');
  }

  // Optional but warn if missing
  if (!input.inspectorNotes || input.inspectorNotes.trim().length === 0) {
    warnings.push('inspectorNotes is empty — AI analysis quality may be reduced.');
  }

  if (input.imageReferences.length === 0) {
    warnings.push('No images attached — AI visual analysis will be skipped.');
  }

  if (input.recentSensorData.length === 0) {
    warnings.push('No sensor data available — sensor-based risk correlation will be skipped.');
  }

  if (!input.energyTrend) {
    warnings.push('No energy trend data — energy-based correlation will be skipped.');
  }

  if (input.historicalInspectionData.length === 0) {
    warnings.push('No historical inspection data — historical correlation will be skipped.');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
