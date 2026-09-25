/**
 * EcoGen AI — Inspection Prompt Builder
 * ─────────────────────────────────────────────────────────────────────────────
 * Builds structured prompts for VLM providers (Qwen3-VL / GPT-4o).
 * Configured to explicitly scan equipment photographs for:
 * 1. Corrosion & Oxidation
 * 2. Water & Fluid Leakage
 * 3. Gas, Chemical & Fire Hazards
 * 4. Equipment & Structural Damage
 *
 * Each finding is formatted with explicit category labels and severity tags.
 */

import type { AIInspectionInput } from '../types';

// ─── System Prompt ────────────────────────────────────────────────────────────

export const SYSTEM_PROMPT = `You are an expert AI industrial equipment inspection and reliability analyst integrated into the EcoWatch platform.

Your primary objective is to inspect uploaded equipment photographs in high detail, cross-referencing visual features with ambient sensor data, equipment records, and inspector notes.

CORE VISUAL SCANNING MANDATE:
You MUST systematically scan the uploaded image(s) for the following four failure domains:

1. CORROSION & OXIDATION:
   - Identify surface rust, pitting, scaling, galvanic corrosion, or metal wall thinning on pipes, flanges, fasteners, and casings.
2. WATER & FLUID LEAKAGE:
   - Identify moisture accumulation, liquid droplets, puddle residue, weeping gaskets, valve packing leaks, or coolant stains.
3. GAS, CHEMICAL & FIRE HAZARDS:
   - Identify flange seal separation / micro-gaps, pressurized gas leak indicators, toxic chemical staining, soot, thermal burn marks, or melted insulation.
4. EQUIPMENT & STRUCTURAL DAMAGE:
   - Identify hairline cracks, structural fractures, mechanical denting, flange misalignment, loose bolts, and vibration fatigue.

FINDINGS FORMATTING REQUIREMENT:
Every item in the "findings" array MUST be formatted with an explicit category label and severity tag:
Format: "[CATEGORY - SEVERITY]: Detailed observation with specific visual evidence, location on component, and risk implications."
Valid CATEGORY values:
- CORROSION
- WATER_LEAK
- GAS_HAZARD
- FIRE_HAZARD
- EQUIPMENT_DAMAGE
- SENSOR_CORRELATION
Valid SEVERITY values:
- LOW (minor surface issue, no immediate operational hazard)
- MEDIUM (requires scheduled preventive maintenance)
- HIGH (urgent risk of leak, failure, or safety threshold breach)
- CRITICAL (immediate danger of containment loss, thermal runaway, or explosion)

IMPORTANT CONSTRAINTS:
- Use professional, hedged technical language ("suspected", "possible", "visible indicators show", "risk of").
- Do NOT fabricate image details if not visible; note clear visual features.
- Cross-reference with environmental sensor telemetry (Air Quality / MQ-135 ppm, Temperature °C, Current A, Moisture).
- Output MUST be a single valid JSON object strictly matching the schema below.

OUTPUT FORMAT:
Return ONLY a valid JSON object with this exact structure:
{
  "riskLevel": "LOW|MEDIUM|HIGH|CRITICAL",
  "confidence": 0.00,
  "findings": [
    "[CATEGORY - SEVERITY]: Finding description...",
    ...
  ],
  "possibleCauses": ["string", ...],
  "recommendations": ["string", ...],
  "visualIndicators": [
    {
      "type": "suspected_corrosion|visible_leakage_indicator|burn_marks|damaged_pipe_joint|cracks|surface_damage|damaged_insulation|deterioration|moisture_accumulation",
      "description": "string",
      "confidence": 0.00,
      "region": "string or null"
    }
  ],
  "evidence": [
    {
      "source": "image|inspector_notes|sensor_data|energy_trend|historical_inspection",
      "description": "string",
      "weight": "low|medium|high"
    }
  ],
  "narrative": "string"
}`;

// ─── User prompt builder ──────────────────────────────────────────────────────

export function buildUserPrompt(input: AIInspectionInput): string {
  const sensorSummary = input.recentSensorData.length > 0
    ? input.recentSensorData.map((r) => {
        const parts: string[] = [`Device: ${r.deviceLabel} | Zone: ${r.zoneName}`];
        if (r.temperature    != null) parts.push(`Temp: ${r.temperature}°C`);
        if (r.humidity       != null) parts.push(`Humidity: ${r.humidity}%`);
        if (r.airQuality     != null) parts.push(`Air Quality: ${r.airQuality} ppm`);
        if (r.current        != null) parts.push(`Current: ${r.current}A`);
        if (r.noise          != null) parts.push(`Noise: ${r.noise}dB`);
        if (r.estimatedPowerW!= null) parts.push(`Power: ${r.estimatedPowerW}W`);
        if (r.waterLeak)              parts.push('⚠ WATER LEAK DETECTED');
        if (r.fireDetected)           parts.push('🔥 FIRE DETECTED');
        return '  • ' + parts.join(' | ');
      }).join('\n')
    : '  • No recent sensor data available.';

  const historySummary = input.historicalInspectionData.length > 0
    ? input.historicalInspectionData.slice(-5).map((h) =>
        `  • [${h.createdAt.slice(0,10)}] ${h.inspectionType} | Severity: ${h.severity} | Status: ${h.status} | ${h.message.slice(0, 100)}`
      ).join('\n')
    : '  • No previous inspections recorded.';

  const energySummary = input.energyTrend
    ? `Direction: ${input.energyTrend.classification} | Short avg: ${input.energyTrend.avgPowerShortW.toFixed(1)}W | Baseline: ${input.energyTrend.avgPowerLongW.toFixed(1)}W | Deviation: ${input.energyTrend.deviationPct.toFixed(1)}%`
    : 'No energy trend data available.';

  return `INSPECTION AUDIT CONTEXT:
Inspection ID: ${input.inspectionId}
Equipment: ${input.equipmentLabel ?? 'General Industrial Unit'}
Equipment ID: ${input.equipmentId ?? 'N/A'}
Location Code: ${input.locationCode ?? 'N/A'}
Component Target: ${input.component ?? 'N/A'}
Photographs Attached: ${input.imageReferences.length}

INSPECTOR FIELD OBSERVATIONS:
${input.inspectorNotes || 'No initial inspector text notes provided.'}

REAL-TIME ENVIRONMENTAL SENSOR TELEMETRY:
${sensorSummary}

ENERGY & POWER TELEMETRY:
${energySummary}

HISTORICAL INSPECTION TIMELINE:
${historySummary}

TASK INSTRUCTIONS:
1. Scan the attached photograph(s) thoroughly for:
   - Corrosion / rust on flanges, pipes, valves, structural members
   - Water / fluid leaks, pooling, residue, dripping, condensation
   - Gas / CO2 / chemical leakage indicators, flange seal separation, burn marks, heat discoloration, fire hazards
   - Physical equipment damage, cracks, dents, loose joints, degraded gaskets
2. Cross-reference visual indicators with live sensor data (e.g. MQ-135 air quality / CO2 ppm, moisture sensors, temperature).
3. Produce labeled findings in the format "[CATEGORY - SEVERITY]: ..." for each identified risk vector.
4. Suggest root causes and prioritized preventive maintenance actions.
5. Return ONLY the structured JSON response according to the schema.`;
}

// ─── Message builder for Qwen3-VL / OpenAI-compatible APIs ───────────────────

export interface QwenMessage {
  role: 'system' | 'user' | 'assistant';
  content:
    | string
    | Array<
        | { type: 'text'; text: string }
        | { type: 'image_url'; image_url: { url: string } }
      >;
}

/**
 * Builds the message array for VLM providers.
 * If images are available they are injected as base64 data URIs.
 * Falls back to text-only if no images.
 */
export function buildVLMMessages(
  input: AIInspectionInput,
  imageDataUris: string[]
): QwenMessage[] {
  const userText = buildUserPrompt(input);

  let userContent: QwenMessage['content'];

  if (imageDataUris.length > 0) {
    const contentParts: Array<{ type: 'text'; text: string } | { type: 'image_url'; image_url: { url: string } }> = [];
    for (const uri of imageDataUris) {
      contentParts.push({ type: 'image_url', image_url: { url: uri } });
    }
    contentParts.push({ type: 'text', text: userText });
    userContent = contentParts;
  } else {
    userContent = userText;
  }

  return [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: userContent },
  ];
}
