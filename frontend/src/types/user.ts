// ─── User / Auth ──────────────────────────────────────────────────────────────
export type Role = 'ADMIN' | 'WORKER' | 'INSPECTOR';


export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  createdAt: string;
}

// ─── Zones & Devices ─────────────────────────────────────────────────────────
export interface Zone {
  id: string;
  name: string;
  createdAt: string;
}

export interface Device {
  id: string;
  label: string;
  zoneId: string;
  isOnline: boolean;
  lastSeenAt: string | null;
  createdAt: string;
}
