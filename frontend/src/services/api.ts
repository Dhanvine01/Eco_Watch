/**
 * api.ts — Centralised fetch wrapper.
 * All requests use credentials:'include' so the backend's httpOnly JWT cookie
 * is sent automatically. The Vite dev-server proxy forwards /api/* → localhost:4000.
 */

const BASE = '/api/v1';
let onUnauthorized: (() => void) | null = null;

export function setUnauthorizedHandler(handler: (() => void) | null) {
  onUnauthorized = handler;
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const isBinaryBody = typeof Blob !== 'undefined' && options.body instanceof Blob;
  const res = await fetch(`${BASE}${path}`, {
    credentials: 'include',
    ...options,
    headers: isBinaryBody
      ? { ...options.headers } // let the browser skip/omit Content-Type for raw file bodies
      : { 'Content-Type': 'application/json', ...options.headers },
  });

  if (!res.ok) {
    if (res.status === 401 && path !== '/auth/login' && path !== '/auth/me') onUnauthorized?.();
    const body = await res.json().catch(() => ({}));
    const errMsg =
      typeof body?.error === 'string'
        ? body.error
        : body?.error?.message
        ? body.error.message
        : body?.message
        ? body.message
        : `HTTP ${res.status}`;
    throw new Error(errMsg);
  }

  // 204 No Content
  if (res.status === 204) return undefined as unknown as T;
  return res.json() as Promise<T>;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────
export const authApi = {
  login: (email: string, password: string) =>
    request<{ user: import('../types').User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  logout: () => request<void>('/auth/logout', { method: 'POST' }),
  me: () => request<{ user: import('../types').User }>('/auth/me'),
};

// ─── Readings ─────────────────────────────────────────────────────────────────
export const readingsApi = {
  latest: (zoneId?: string) =>
    request<import('../types').LatestReading[]>(
      `/readings/latest${zoneId ? `?zoneId=${zoneId}` : ''}`
    ),
  history: (deviceId: string, from: string, to: string) =>
    request<import('../types').HistoryReading[]>(
      `/readings/history?deviceId=${encodeURIComponent(deviceId)}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`
    ),
};

// ─── Devices & Zones ─────────────────────────────────────────────────────────
export const devicesApi = {
  list: () => request<import('../types').Device[]>('/devices'),
  status: () => request<import('../types').Device[]>('/devices/status'),
};

export const zonesApi = {
  list: () => request<import('../types').Zone[]>('/zones'),
};

export const thresholdsApi = {
  list: () => request<Record<string, number>>('/thresholds'),
};

// ─── Alerts ───────────────────────────────────────────────────────────────────
export const alertsApi = {
  active: () => request<import('../types').Alert[]>('/alerts?status=ACTIVE'),
  history: () => request<import('../types').Alert[]>('/alerts/history'),
  resolve: (id: string) =>
    request<import('../types').Alert>(`/alerts/${id}/resolve`, { method: 'POST' }),
};

// ─── Energy ───────────────────────────────────────────────────────────────────
export const energyApi = {
  summary: (zoneId?: string) =>
    request<import('../types').EnergySummary>(
      `/energy/summary${zoneId ? `?zoneId=${encodeURIComponent(zoneId)}` : ''}`
    ),
};

// ─── Simulation (admin/dev only) ──────────────────────────────────────────────
export type ScenarioType =
  | 'FIRE'
  | 'WATER_LEAK'
  | 'ENERGY_SPIKE'
  | 'NOISE_SPIKE'
  | 'DEVICE_OFFLINE';

export const simulationApi = {
  trigger: (scenario: ScenarioType, deviceId?: string) =>
    request<{ ok: boolean }>('/simulation/scenario', {
      method: 'POST',
      body: JSON.stringify({ scenario, deviceId }),
    }),
  reset: () =>
    request<{ ok: boolean }>('/simulation/reset', { method: 'POST' }),
};

export interface IntegrityBlockItem {
  index: number;
  startTime: string;
  endTime: string;
  sampleCount: number;
  hash: string;
  shortHash: string;
  previousHash: string;
  shortPreviousHash: string;
  anchorHash: string | null;
  shortAnchorHash: string | null;
  tampered: boolean;
  tamperType: 'direct_edit' | 'chain_rewrite' | 'metadata_mismatch' | null;
  isPayloadAltered: boolean;
  isAnchorMismatch: boolean;
  payload: {
    timestamp: string;
    airQuality: number | null;
    current: number | null;
    noise: number | null;
    estimatedPowerW: number | null;
    waterLeak: boolean;
    fireDetected: boolean;
  };
  originalValue: number | null;
}

export interface IntegrityStatus {
  feature: string;
  chain: string;
  epoch: string;
  anchor: string;
  blockCount: number;
  lastBlock: number;
  tampered: boolean;
  lastTamperType: string | null;
  verified: boolean;
  message: string;
  blocks: IntegrityBlockItem[];
}

export interface TamperResponse {
  ok: boolean;
  verified: boolean;
  reason?: string;
  details?: string;
  attackName?: string;
  simulatedEdit?: string;
  blockIndex?: number;
  currentValue?: number;
  originalValue?: number;
  storedHash?: string;
  anchorHash?: string | null;
}

export interface VerifyResponse {
  verified: boolean;
  reason: string;
  details?: string;
  blockIndex?: number;
}

export const integrityApi = {
  status: () => request<IntegrityStatus>('/integrity/status'),
  verify: () => request<VerifyResponse>('/integrity/verify', { method: 'POST' }),
  tamperDirect: (blockIndex = 2) =>
    request<TamperResponse>('/integrity/tamper-direct', {
      method: 'POST',
      body: JSON.stringify({ blockIndex }),
    }),
  tamperRewrite: (blockIndex = 2) =>
    request<TamperResponse>('/integrity/tamper-rewrite', {
      method: 'POST',
      body: JSON.stringify({ blockIndex }),
    }),
  tamper: (mode: 'direct' | 'rewrite' = 'direct', blockIndex = 2) =>
    request<TamperResponse>('/integrity/tamper', {
      method: 'POST',
      body: JSON.stringify({ mode, blockIndex }),
    }),
  reset: () => request<IntegrityStatus>('/integrity/reset', { method: 'POST' }),
};

// ─── Equipment ────────────────────────────────────────────────────────────────
export const equipmentApi = {
  list: () => request<import('../types').Equipment[]>('/equipment'),
  history: (id: string) => request<import('../types').EquipmentHistory>(`/equipment/${id}/history`),
};

// ─── Inspections ──────────────────────────────────────────────────────────────
export const inspectionApi = {
  list: () => request<import('../types').Inspection[]>('/inspections'),
  get: (id: string) => request<import('../types').Inspection>(`/inspections/${id}`),
  create: (data: {
    zoneId: string;
    equipmentId?: string | null;
    locationCode?: string | null;
    component?: string | null;
    inspectionType: import('../types').InspectionType;
    severity: import('../types').InspectionSeverity;
    message: string;
    hasImages?: boolean;
  }) => request<import('../types').Inspection>('/inspections', { method: 'POST', body: JSON.stringify(data) }),
  updateStatus: (id: string, status: import('../types').InspectionStatus) =>
    request<import('../types').Inspection>(`/inspections/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),
  uploadImage: (inspectionId: string, file: File, caption?: string) => {
    const headers: HeadersInit = {
      'x-file-name': encodeURIComponent(file.name),
      'x-file-mime': file.type,
      ...(caption ? { 'x-caption': encodeURIComponent(caption) } : {}),
    };
    return request<import('../types').InspectionImage>(`/inspections/${inspectionId}/images`, {
      method: 'POST',
      headers,
      body: file,
    });
  },
  imageUrl: (imageId: string) => `/api/v1/inspections/images/${imageId}/file`,
};