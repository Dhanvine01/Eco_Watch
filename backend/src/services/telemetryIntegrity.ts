import { createHash } from 'node:crypto';
import type { SensorReading } from '@prisma/client';

export type AuditablePayload = {
  timestamp: string;
  airQuality: number | null;
  current: number | null;
  noise: number | null;
  estimatedPowerW: number | null;
  waterLeak: boolean;
  fireDetected: boolean;
};

export type IntegrityBlock = {
  index: number;
  startTime: string;
  endTime: string;
  sampleCount: number;
  previousHash: string;
  payload: AuditablePayload;
  hash: string;
  tampered?: boolean;
  tamperType?: 'direct_edit' | 'chain_rewrite' | 'metadata_mismatch';
  originalValue?: number | null;
};

export type Anchor = {
  blockIndex: number;
  anchoredHash: string;
  anchoredAt: string;
};

const GENESIS = 'ECOWATCH-GENESIS-V1';

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

function sha256(value: unknown): string {
  return createHash('sha256').update(canonical(value)).digest('hex');
}

class TelemetryIntegrityService {
  private blocks: IntegrityBlock[] = [];
  private anchors: Anchor[] = [];
  private tampered = false;
  private lastTamperType: string | null = null;

  private payload(reading: SensorReading, offsetMs: number): AuditablePayload {
    return {
      timestamp: new Date(reading.recordedAt.getTime() - offsetMs).toISOString(),
      airQuality: reading.airQuality ?? 68,
      current: reading.current ?? 1.45,
      noise: reading.noise ?? 45,
      estimatedPowerW: reading.estimatedPowerW ?? 330,
      waterLeak: reading.waterLeak,
      fireDetected: reading.fireDetected,
    };
  }

  private seed(reading?: SensorReading | null) {
    if (this.blocks.length > 0) return;

    let previousHash = sha256(GENESIS);
    const baseTime = reading ? reading.recordedAt.getTime() : Date.now();

    const mockReading: SensorReading = reading ?? {
      id: 'seed-0',
      deviceId: 'dev-01',
      temperature: 26.5,
      humidity: 58.2,
      airQuality: 72,
      current: 1.5,
      noise: 48,
      waterLeak: false,
      fireDetected: false,
      estimatedPowerW: 345,
      estimatedEnergyWh: 5.75,
      estimatedCO2g: 2.3,
      recordedAt: new Date(baseTime),
    };

    for (let index = 1; index <= 4; index += 1) {
      const end = new Date(baseTime - (4 - index) * 5 * 60_000);
      const start = new Date(end.getTime() - 5 * 60_000);
      const payload = this.payload(mockReading, (4 - index) * 5 * 60_000);
      
      const base = {
        index,
        startTime: start.toISOString(),
        endTime: end.toISOString(),
        sampleCount: 60,
        previousHash,
        payload,
      };
      const hash = sha256(base);
      this.blocks.push({ ...base, hash });
      // Feature 5: protected append-only anchor
      this.anchors.push({ blockIndex: index, anchoredHash: hash, anchoredAt: new Date().toISOString() });
      previousHash = hash;
    }
  }

  status(reading?: SensorReading | null) {
    this.seed(reading);
    const verification = this.verify(reading);
    return {
      feature: 'Tamper-Evident Telemetry Integrity (Features 4 & 5)',
      chain: 'SHA-256 Hash Chain (Feature 4)',
      epoch: '5-Minute Cryptographic Epochs',
      anchor: 'Simulated Append-Only Anchor Store (Feature 5)',
      blockCount: this.blocks.length,
      lastBlock: this.blocks.at(-1)?.index ?? 0,
      tampered: this.tampered,
      lastTamperType: this.lastTamperType,
      verified: verification.verified,
      message: verification.verified ? 'INTEGRITY VERIFIED' : verification.reason,
      blocks: this.blocks.map((block) => {
        const anchor = this.anchors.find((a) => a.blockIndex === block.index);
        const expectedHash = sha256({
          index: block.index,
          startTime: block.startTime,
          endTime: block.endTime,
          sampleCount: block.sampleCount,
          previousHash: block.previousHash,
          payload: block.payload,
        });
        const isPayloadAltered = block.hash !== expectedHash;
        const isAnchorMismatch = !anchor || anchor.anchoredHash !== block.hash;

        return {
          index: block.index,
          startTime: block.startTime,
          endTime: block.endTime,
          sampleCount: block.sampleCount,
          hash: block.hash,
          shortHash: block.hash.slice(0, 16),
          previousHash: block.previousHash,
          shortPreviousHash: block.previousHash.slice(0, 16),
          anchorHash: anchor ? anchor.anchoredHash : null,
          shortAnchorHash: anchor ? anchor.anchoredHash.slice(0, 16) : null,
          tampered: block.tampered ?? false,
          tamperType: block.tamperType ?? null,
          isPayloadAltered,
          isAnchorMismatch,
          payload: block.payload,
          originalValue: block.originalValue ?? null,
        };
      }),
    };
  }

  verify(reading?: SensorReading | null) {
    this.seed(reading);
    if (!this.blocks.length) return { verified: false, reason: 'WAITING_FOR_TELEMETRY' };

    let previousHash = sha256(GENESIS);
    for (const block of this.blocks) {
      const expectedHash = sha256({
        index: block.index,
        startTime: block.startTime,
        endTime: block.endTime,
        sampleCount: block.sampleCount,
        previousHash: block.previousHash,
        payload: block.payload,
      });
      const anchor = this.anchors.find((item) => item.blockIndex === block.index);

      // Check Feature 4 internal previous-hash chain linkage
      if (block.previousHash !== previousHash) {
        return {
          verified: false,
          reason: `CHAIN_BREAK_BLOCK_${block.index}`,
          details: `Block #${block.index} previous_hash does not match hash of Block #${block.index - 1}`,
          blockIndex: block.index,
        };
      }

      // Check Feature 4 direct payload alteration
      if (block.hash !== expectedHash) {
        return {
          verified: false,
          reason: `HISTORICAL_TELEMETRY_ALTERED_BLOCK_${block.index}`,
          details: `Block #${block.index} payload recomputed SHA-256 (${expectedHash.slice(0, 12)}…) does not match stored block hash (${block.hash.slice(0, 12)}…)`,
          blockIndex: block.index,
        };
      }

      // Check Feature 5 protected append-only anchor
      if (!anchor || anchor.anchoredHash !== block.hash) {
        return {
          verified: false,
          reason: `CHAIN_REWRITE_ANCHOR_MISMATCH_BLOCK_${block.index}`,
          details: `Block #${block.index} internal hash matches recalculated chain, but conflicts with protected append-only anchor (${anchor?.anchoredHash.slice(0, 12) ?? 'missing'}…)`,
          blockIndex: block.index,
        };
      }

      previousHash = block.hash;
    }

    return {
      verified: true,
      reason: 'INTEGRITY_VERIFIED',
      details: 'All SHA-256 block linkages, payload hashes, and append-only anchors verified successfully.',
    };
  }

  /**
   * Demo 1: Direct edit of historical telemetry (e.g., modifying historical air quality/RAQI).
   * Feature 4 detection: Recalculated hash != stored block hash.
   */
  simulateDirectTamper(targetIndex = 2, reading?: SensorReading | null) {
    this.seed(reading);
    const target = this.blocks.find((b) => b.index === targetIndex) ?? this.blocks[1];
    if (!target) return { ok: false, verified: false, message: 'WAITING_FOR_TELEMETRY' };

    const originalVal = target.payload.airQuality ?? 70;
    target.originalValue = originalVal;
    target.payload.airQuality = Number((originalVal + 180).toFixed(1)); // Altered to toxic spike
    target.tampered = true;
    target.tamperType = 'direct_edit';
    this.tampered = true;
    this.lastTamperType = 'Direct Edit (Historical Telemetry Altered)';

    const verification = this.verify(reading);
    return {
      ok: true,
      attackName: 'Demo 1: Direct Historical Data Modification',
      simulatedEdit: `Historical Block #${target.index} air-quality modified (${originalVal} -> ${target.payload.airQuality}) without updating stored block hash`,
      blockIndex: target.index,
      currentValue: target.payload.airQuality,
      originalValue: originalVal,
      storedHash: target.hash.slice(0, 16),
      anchorHash: this.anchors.find((a) => a.blockIndex === target.index)?.anchoredHash.slice(0, 16) ?? null,
      ...verification,
    };
  }

  /**
   * Demo 2: Chain rewrite attack where an attacker modifies data AND recomputes hashes down the chain.
   * Feature 4 check passes internally, but Feature 5 Anchor detection catches the mismatch!
   */
  simulateChainRewrite(targetIndex = 2, reading?: SensorReading | null) {
    this.seed(reading);
    const target = this.blocks.find((b) => b.index === targetIndex) ?? this.blocks[1];
    if (!target) return { ok: false, verified: false, message: 'WAITING_FOR_TELEMETRY' };

    const originalVal = target.payload.airQuality ?? 70;
    target.originalValue = originalVal;
    target.payload.airQuality = 25; // Attacker lowers emission reading to 25
    target.tampered = true;
    target.tamperType = 'chain_rewrite';

    // Recalculate hash for target and all subsequent blocks so internal chain is consistent
    let prevHash = target.previousHash;
    for (let i = target.index - 1; i < this.blocks.length; i++) {
      const b = this.blocks[i];
      b.previousHash = prevHash;
      b.hash = sha256({
        index: b.index,
        startTime: b.startTime,
        endTime: b.endTime,
        sampleCount: b.sampleCount,
        previousHash: b.previousHash,
        payload: b.payload,
      });
      prevHash = b.hash;
    }

    this.tampered = true;
    this.lastTamperType = 'Chain Rewrite Attack (Bypasses Feature 4, Caught by Feature 5 Anchor)';

    const verification = this.verify(reading);
    return {
      ok: true,
      attackName: 'Demo 2: Full Chain-Rewrite Attack',
      simulatedEdit: `Block #${target.index} emission altered to 25 & chain hashes recalculated. Internal chain consistent, but anchor mismatches.`,
      blockIndex: target.index,
      currentValue: target.payload.airQuality,
      originalValue: originalVal,
      storedHash: target.hash.slice(0, 16),
      anchorHash: this.anchors.find((a) => a.blockIndex === target.index)?.anchoredHash.slice(0, 16) ?? null,
      ...verification,
    };
  }

  reset(reading?: SensorReading | null) {
    this.blocks = [];
    this.anchors = [];
    this.tampered = false;
    this.lastTamperType = null;
    this.seed(reading);
    return {
      ok: true,
      ...this.status(reading),
      message: 'Integrity hash chain and append-only anchors restored to clean baseline',
    };
  }
}

export const integrityService = new TelemetryIntegrityService();
