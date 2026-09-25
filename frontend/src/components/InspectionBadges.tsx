/**
 * InspectionBadges — reusable severity, status, type, and priority badges.
 * Used across inspector and admin pages (Verdant Theme).
 */
import type { InspectionSeverity, InspectionStatus, InspectionType, PriorityLevel } from '../types';

// ─── Severity Badge ───────────────────────────────────────────────────────────

const SEVERITY_STYLES: Record<InspectionSeverity, string> = {
  CRITICAL: 'bg-red-100 text-red-800 border border-red-300 font-bold',
  HIGH:     'bg-orange-100 text-orange-800 border border-orange-300 font-bold',
  MEDIUM:   'bg-amber-100 text-amber-800 border border-amber-300 font-bold',
  LOW:      'bg-slate-100 text-slate-700 border border-slate-300 font-medium',
};

const SEVERITY_LABELS: Record<InspectionSeverity, string> = {
  CRITICAL: '🔴 CRITICAL',
  HIGH:     '🟠 HIGH',
  MEDIUM:   '🟡 MEDIUM',
  LOW:      '⚪ LOW',
};

export function SeverityBadge({ severity }: { severity: InspectionSeverity }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wide ${SEVERITY_STYLES[severity]}`}>
      {SEVERITY_LABELS[severity]}
    </span>
  );
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<InspectionStatus, string> = {
  OPEN:         'bg-red-100 text-red-800 border border-red-300 font-bold',
  UNDER_REVIEW: 'bg-amber-100 text-amber-800 border border-amber-300 font-bold',
  ACKNOWLEDGED: 'bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold',
  RESOLVED:     'bg-[#dcfce7] text-[#15803d] border border-[#86efac] font-bold',
};

const STATUS_LABELS: Record<InspectionStatus, string> = {
  OPEN:         'Open',
  UNDER_REVIEW: 'Under Review',
  ACKNOWLEDGED: 'Acknowledged',
  RESOLVED:     'Resolved',
};

export function StatusBadge({ status }: { status: InspectionStatus }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-wide ${STATUS_STYLES[status]}`}>
      {STATUS_LABELS[status]}
    </span>
  );
}

// ─── Inspection Type Badge ────────────────────────────────────────────────────

const TYPE_STYLES: Record<InspectionType, string> = {
  ROUTINE:        'bg-[#f3f7f0] text-[#4f7a38] border border-[var(--line)]',
  CORROSION:      'bg-orange-100 text-orange-800 border border-orange-300',
  DAMAGE:         'bg-red-100 text-red-800 border border-red-300',
  POSSIBLE_LEAK:  'bg-amber-100 text-amber-800 border border-amber-300',
  EQUIPMENT_ISSUE:'bg-purple-100 text-purple-800 border border-purple-300',
  OTHER:          'bg-slate-100 text-slate-700 border border-slate-300',
};

const TYPE_ICONS: Record<InspectionType, string> = {
  ROUTINE:        '📋',
  CORROSION:      '🦠',
  DAMAGE:         '💥',
  POSSIBLE_LEAK:  '💧',
  EQUIPMENT_ISSUE:'⚙️',
  OTHER:          '📌',
};

export function TypeBadge({ type }: { type: InspectionType }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-wide font-medium ${TYPE_STYLES[type]}`}>
      <span>{TYPE_ICONS[type]}</span>
      {type.replace('_', ' ')}
    </span>
  );
}

// ─── Priority Badge ───────────────────────────────────────────────────────────

const PRIORITY_STYLES: Record<PriorityLevel, string> = {
  HIGH:   'bg-red-100 text-red-800 border border-red-300 font-bold',
  MEDIUM: 'bg-amber-100 text-amber-800 border border-amber-300 font-bold',
  LOW:    'bg-slate-100 text-slate-700 border border-slate-300 font-semibold',
};

export function PriorityBadge({ level, label }: { level: PriorityLevel; label: string }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wide ${PRIORITY_STYLES[level]}`}>
      {label}
    </span>
  );
}

// ─── Energy Classification Badge ─────────────────────────────────────────────

import type { EnergyTrendClassification } from '../types';

const ENERGY_STYLES: Record<EnergyTrendClassification, string> = {
  NORMAL:                         'bg-[#dcfce7] text-[#15803d] border border-[#86efac] font-bold',
  EFFICIENCY_DEGRADATION_SUSPECTED:'bg-amber-100 text-amber-800 border border-amber-300 font-bold',
  ENERGY_ANOMALY:                 'bg-red-100 text-red-800 border border-red-300 font-bold',
  INSPECTION_RECOMMENDED:         'bg-orange-100 text-orange-800 border border-orange-300 font-bold',
};

const ENERGY_LABELS: Record<EnergyTrendClassification, string> = {
  NORMAL:                         '✓ Normal',
  EFFICIENCY_DEGRADATION_SUSPECTED:'⚠ Degradation Suspected',
  ENERGY_ANOMALY:                 '🔴 Energy Anomaly',
  INSPECTION_RECOMMENDED:         '⚠ Inspection Recommended',
};

export function EnergyClassificationBadge({ classification }: { classification: EnergyTrendClassification }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-wide ${ENERGY_STYLES[classification]}`}>
      {ENERGY_LABELS[classification]}
    </span>
  );
}
