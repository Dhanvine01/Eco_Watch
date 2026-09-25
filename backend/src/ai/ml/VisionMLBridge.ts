/**
 * EcoGen AI — VisionMLBridge
 * ─────────────────────────────────────────────────────────────────────────────
 * Bridges the Node.js backend to the Python Vision ML prediction service
 * (ml/vision/predict_vision.py). Runs real scikit-learn + OpenCV models:
 *   1. corrosion_patch_model.pkl (88.5% acc, 4x4 spatial grid localization)
 *   2. water_leak_image_model.pkl (96.1% acc, moisture/leak detector)
 */

import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import { EventEmitter } from 'events';

export interface VisionModelResult {
  model: string;
  prediction: string;
  confidence: number;
  risk: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  probabilities?: Record<string, number>;
  affected_surface_area_pct?: number;
  hottest_cell?: {
    row: number;
    col: number;
    bbox: [number, number, number, number];
    corrosion_prob: number;
  };
  grid_cells?: Array<{
    row: number;
    col: number;
    bbox: [number, number, number, number];
    corrosion_prob: number;
  }>;
  predictive_prognosis?: {
    future_hazard: string;
    estimated_time_to_failure_days: number;
    time_to_failure_range: string;
    risk_trajectory: 'ACCELERATING' | 'PROGRESSIVE' | 'MODERATE' | 'STABLE';
    degradation_mechanism?: string;
    critical_intervention_deadline: string;
    timeline: Array<{
      timeframe: string;
      projected_risk: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
      estimated_probability_pct: number;
      expected_condition: string;
    }>;
  };
  error?: string;
}

export interface VisionAnalysisResult {
  corrosion: VisionModelResult;
  waterLeak: VisionModelResult;
}

export class VisionMLBridge extends EventEmitter {
  private proc: ChildProcess | null = null;
  private buffer = '';
  private pending: Array<{
    resolve: (v: VisionModelResult) => void;
    reject:  (e: Error) => void;
  }> = [];
  private ready = false;
  private readonly scriptPath: string;
  private readonly timeoutMs: number;

  constructor(timeoutMs = 15000) {
    super();
    this.scriptPath = path.resolve(__dirname, '../../../../ml/vision/predict_vision.py');
    this.timeoutMs  = timeoutMs;
  }

  start(): void {
    if (this.proc) return;

    try {
      this.proc = spawn('python', [this.scriptPath], {
        stdio: ['pipe', 'pipe', 'pipe'],
      });
    } catch {
      console.warn('[VisionML-Bridge] Failed to spawn Python process.');
      this.ready = false;
      return;
    }

    this.proc.stdout?.on('data', (data: Buffer) => {
      this.buffer += data.toString();
      const lines = this.buffer.split('\n');
      this.buffer = lines.pop() ?? '';
      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const response = JSON.parse(line);
          const handler  = this.pending.shift();
          if (handler) {
            response.error
              ? handler.reject(new Error(response.error))
              : handler.resolve(response as VisionModelResult);
          }
        } catch {
          // ignore partial parse errors
        }
      }
    });

    this.proc.stderr?.on('data', (data: Buffer) => {
      const msg = data.toString().trim();
      if (msg) console.warn('[VisionML-Bridge] stderr:', msg);
    });

    this.proc.on('error', (err) => {
      console.warn('[VisionML-Bridge] Process error:', err.message);
      this.ready = false;
      this.proc  = null;
    });

    this.proc.on('exit', () => {
      this.proc  = null;
      this.ready = false;
      this.emit('exit');
    });

    this.ready = true;
    console.log('[VisionML-Bridge] Vision ML service started:', this.scriptPath);
  }

  stop(): void {
    this.proc?.kill();
    this.proc  = null;
    this.ready = false;
  }

  get isReady(): boolean { return this.ready && this.proc !== null; }

  private send(payload: object): Promise<VisionModelResult> {
    if (!this.isReady) {
      this.start();
    }
    if (!this.isReady) {
      return Promise.reject(new Error('Vision ML service is not running.'));
    }
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        const idx = this.pending.findIndex((p) => p.reject === reject);
        if (idx !== -1) this.pending.splice(idx, 1);
        reject(new Error(`Vision ML prediction timed out after ${this.timeoutMs}ms`));
      }, this.timeoutMs);

      this.pending.push({
        resolve: (v) => { clearTimeout(timer); resolve(v); },
        reject:  (e) => { clearTimeout(timer); reject(e);  },
      });

      this.proc!.stdin!.write(JSON.stringify(payload) + '\n');
    });
  }

  async predictCorrosion(imagePath: string, grid = 4): Promise<VisionModelResult> {
    return this.send({ model: 'corrosion_patch', image_path: imagePath, grid });
  }

  async predictWaterLeak(imagePath: string): Promise<VisionModelResult> {
    return this.send({ model: 'water_leak_image', image_path: imagePath });
  }

  async analyzeImage(imagePath: string): Promise<VisionAnalysisResult> {
    const [corrosion, waterLeak] = await Promise.all([
      this.predictCorrosion(imagePath, 4).catch((err) => ({
        model: 'corrosion_patch',
        prediction: 'clean',
        confidence: 0.5,
        risk: 'LOW' as const,
        error: err.message,
      })),
      this.predictWaterLeak(imagePath).catch((err) => ({
        model: 'water_leak_image',
        prediction: 'no_leak',
        confidence: 0.5,
        risk: 'LOW' as const,
        error: err.message,
      })),
    ]);
    return { corrosion, waterLeak };
  }
}

export const visionMLBridge = new VisionMLBridge();
