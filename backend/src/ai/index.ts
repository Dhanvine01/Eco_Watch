/**
 * EcoGen AI — Public Module Entry Point
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * HOW TO CHANGE THE AI PROVIDER
 * ─────────────────────────────
 * Set AI_PROVIDER in backend/.env:
 *   AI_PROVIDER=mock    — safe for development (no API key needed)
 *   AI_PROVIDER=qwen    — Qwen3-VL vision model (requires QWEN_API_KEY)
 *   AI_PROVIDER=openai  — GPT-4o (requires OPENAI_API_KEY)
 *   AI_PROVIDER=auto    — tries qwen → openai → mock automatically
 *
 * HOW TO ENABLE ML SENSOR PREDICTIONS
 * ─────────────────────────────────────
 * Set ML_ENABLED=true in backend/.env.
 * Python 3.8+ and dependencies in ml/requirements.txt must be installed.
 * If Python is unavailable, the backend still starts — ML is just skipped.
 *
 * ARCHITECTURE
 * ────────────
 * inspection.routes.ts
 *       ↓  AIInspectionInput (EcoGen shape)
 *   getAIProvider().analyzeInspection(input)
 *       ↓
 *   Active provider (mock / qwen / openai)
 *       ↓
 *   AIInspectionResult stored in Inspection.aiResult
 *
 * ML is an independent, optional signal:
 *   mlBridge (singleton) ← started at server.ts startup
 *   Used by inspection.routes.ts after VLM result, adds sensor evidence.
 *
 * DO NOT import providers directly in controllers/routes.
 * Always import through this barrel.
 */

import { MockAIInspectionProvider }  from './providers/MockAIInspectionProvider';
import { QwenAIInspectionProvider }  from './providers/QwenAIInspectionProvider';
import { OpenAIInspectionProvider }  from './providers/OpenAIInspectionProvider';
import type { AIInspectionProvider, AIServiceConfig } from './types';

// ─── Service config from env ──────────────────────────────────────────────────

const config: AIServiceConfig = {
  provider:       (process.env.AI_PROVIDER ?? 'auto') as AIServiceConfig['provider'],
  timeoutMs:      parseInt(process.env.AI_TIMEOUT_MS      ?? '30000', 10),
  maxRetries:     parseInt(process.env.AI_MAX_RETRIES      ?? '2',     10),
  fallbackToMock: process.env.AI_FALLBACK_TO_MOCK !== 'false',
};

// ─── Provider instances ────────────────────────────────────────────────────────

const qwenProvider   = new QwenAIInspectionProvider();
const openaiProvider = new OpenAIInspectionProvider();
const mockProvider   = new MockAIInspectionProvider();

// ─── Provider selection ────────────────────────────────────────────────────────

function selectProvider(): AIInspectionProvider {
  switch (config.provider) {
    case 'qwen':   return qwenProvider;
    case 'openai': return openaiProvider;
    case 'mock':   return mockProvider;
    case 'auto':
    default:
      if (qwenProvider.isAvailable())   return qwenProvider;
      if (openaiProvider.isAvailable()) return openaiProvider;
      return mockProvider;
  }
}

/**
 * getAIProvider — singleton accessor used throughout EcoGen backend.
 *
 * Supports retry + fallback to mock internally if configured.
 * Returns a thin wrapper that handles retries and fallback so that
 * callers (inspection.routes.ts) remain simple.
 */
export function getAIProvider(): AIInspectionProvider {
  const primary = selectProvider();

  // Return a wrapper that handles retry + fallback
  return {
    name: primary.name,
    isAvailable: () => primary.isAvailable(),
    async analyzeInspection(input) {
      let lastResult = null;
      const maxAttempts = config.maxRetries + 1;

      if (primary.isAvailable()) {
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
          const result = await primary.analyzeInspection(input);
          if (result.success) return result;

          const { retryable } = result.error;
          lastResult = result;

          if (!retryable || attempt >= maxAttempts) break;

          // Exponential backoff
          await new Promise((r) => setTimeout(r, Math.min(1000 * Math.pow(2, attempt - 1), 8000)));
        }
      }

      // Fallback to mock
      if (config.fallbackToMock && primary.name !== 'mock') {
        const mockResult = await mockProvider.analyzeInspection(input);
        if (mockResult.success) {
          mockResult.data.provider = 'fallback';
          mockResult.data.modelVersion = `fallback-mock-v1.0.0 (primary: ${primary.name} failed)`;
        }
        return mockResult;
      }

      // All failed
      return lastResult ?? {
        success: false,
        error: { code: 'UNKNOWN', message: 'All AI providers failed.', retryable: false },
      } as const;
    },
  };
}

// ─── Status introspection ─────────────────────────────────────────────────────

export function getAIStatus(): {
  configuredProvider: string;
  activeProvider:     string;
  availableProviders: string[];
  mlEnabled:          boolean;
  config:             AIServiceConfig;
} {
  const available: string[] = [];
  if (qwenProvider.isAvailable())   available.push('qwen');
  if (openaiProvider.isAvailable()) available.push('openai');
  available.push('mock');

  return {
    configuredProvider: config.provider,
    activeProvider:     selectProvider().name,
    availableProviders: available,
    mlEnabled:          process.env.ML_ENABLED === 'true',
    config,
  };
}

// ─── Re-exports ────────────────────────────────────────────────────────────────

export type {
  AIInspectionProvider,
  AIInspectionInput,
  AIInspectionResult,
  AIRiskLevel,
  AIAnalysisResponse,
  AIAnalysisSuccess,
  AIAnalysisError,
  SensorFeatures,
  MLPredictionResult,
  MLAllResult,
} from './types';

export { mlBridge } from './ml/SensorMLBridge';
