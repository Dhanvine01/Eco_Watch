/**
 * EcoGen AI — SensorMLBridge
 * ─────────────────────────────────────────────────────────────────────────────
 * Bridges the Node.js backend to the Python ML prediction service.
 * Spawns ml/service/predict.py as a persistent child process and communicates
 * via newline-delimited JSON on stdin/stdout.
 *
 * IMPORTANT CONSTRAINTS:
 * - EcoGen MUST start and remain functional if Python is unavailable.
 * - Only call start() if ML_ENABLED=true in the environment.
 * - ML predictions are ADVISORY only. Deterministic safety rules take priority.
 *
 * Features available from EcoGen's actual hardware:
 *   co2_ppm      — MQ-135 (raw analogue reading mapped to ppm equivalent)
 *   gas_ppm      — same MQ-135 value
 *   temperature_c — DHT22
 *   humidity_pct  — DHT22
 *   current_amps  — SCT-013
 *   power_kw      — calculated from SCT-013
 *   moisture_raw  — capacitive moisture sensor
 *   moisture_pct  — derived
 *   sound_db      — KY-038 mapped
 *
 * Features NOT currently available (marked as unavailable):
 *   pressure_bar, flow_rate_lpm, voltage_v (direct),
 *   thd_pct, vibration_rms, nh3_ppm, co_ppm, voc_ppm
 *
 * Ported from teammate's SensorMLBridge.ts with EcoGen path awareness.
 */

import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import { EventEmitter } from 'events';
import type { SensorFeatures, MLPredictionResult, MLAllResult, SensorModelName } from '../types';

// ─── Bridge ───────────────────────────────────────────────────────────────────

export class SensorMLBridge extends EventEmitter {
  private proc: ChildProcess | null = null;
  private buffer = '';
  private pending: Array<{
    resolve: (v: unknown) => void;
    reject:  (e: Error)   => void;
  }> = [];
  private ready = false;
  private readonly scriptPath: string;
  private readonly timeoutMs: number;

  constructor(timeoutMs = 10000) {
    super();
    // EcoGen project root / ml / service / predict.py
    this.scriptPath = path.resolve(__dirname, '../../../../ml/service/predict.py');
    this.timeoutMs  = timeoutMs;
  }

  /** Start the Python child process. Non-throwing — sets ready=false on failure. */
  start(): void {
    if (this.proc) return;

    try {
      this.proc = spawn('python', [this.scriptPath, 'service'], {
        stdio: ['pipe', 'pipe', 'pipe'],
      });
    } catch {
      console.warn('[ML-Bridge] Failed to spawn Python process — ML unavailable.');
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
            response.ok
              ? handler.resolve(response.result)
              : handler.reject(new Error(response.error ?? 'ML prediction error'));
          }
        } catch {
          // ignore parse errors on partial lines
        }
      }
    });

    this.proc.stderr?.on('data', (data: Buffer) => {
      const msg = data.toString().trim();
      if (msg) console.warn('[ML-Bridge] stderr:', msg);
    });

    this.proc.on('error', (err) => {
      console.warn('[ML-Bridge] Process error:', err.message);
      this.ready = false;
      this.proc  = null;
    });

    this.proc.on('exit', () => {
      this.proc  = null;
      this.ready = false;
      this.emit('exit');
    });

    this.ready = true;
    console.log('[ML-Bridge] Python ML service started:', this.scriptPath);
  }

  /** Stop the Python child process. */
  stop(): void {
    this.proc?.kill();
    this.proc  = null;
    this.ready = false;
  }

  get isReady(): boolean { return this.ready && this.proc !== null; }

  private send(payload: object): Promise<unknown> {
    if (!this.isReady) {
      return Promise.reject(new Error('ML service is not running.'));
    }
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        const idx = this.pending.findIndex((p) => p.reject === reject);
        if (idx !== -1) this.pending.splice(idx, 1);
        reject(new Error(`ML prediction timed out after ${this.timeoutMs}ms`));
      }, this.timeoutMs);

      this.pending.push({
        resolve: (v) => { clearTimeout(timer); resolve(v); },
        reject:  (e) => { clearTimeout(timer); reject(e);  },
      });

      this.proc!.stdin!.write(JSON.stringify(payload) + '\n');
    });
  }

  async predict(model: SensorModelName, features: SensorFeatures): Promise<MLPredictionResult> {
    return this.send({ model, features }) as Promise<MLPredictionResult>;
  }

  async predictAll(features: SensorFeatures): Promise<MLAllResult> {
    return this.send({ model: 'all', features }) as Promise<MLAllResult>;
  }
}

/** Singleton bridge — started conditionally in server.ts */
export const mlBridge = new SensorMLBridge(
  parseInt(process.env.ML_PREDICTION_TIMEOUT_MS ?? '10000', 10)
);
