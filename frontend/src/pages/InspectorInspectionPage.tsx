/**
 * InspectorInspectionPage
 *
 * Unified inspection form with:
 * - Zone / Equipment / Component / Location Code
 * - Inspection type + severity
 * - Field observation notes
 * - Image upload IN-FORM (before submission) — images are attached right away
 * - After submit: inline AI prediction result panel
 */
import { useEffect, useRef, useState, type ComponentType } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { equipmentApi, inspectionApi, zonesApi } from '../services/api';
import type { Equipment, Inspection, InspectionSeverity, InspectionType, Zone } from '../types';
import type { AIInspectionResult } from '../types/inspection';
import {
  ClipboardCheck,
  AlertTriangle,
  Flame,
  Droplets,
  Wrench,
  Tag,
  UploadCloud,
  CheckCircle2,
  ArrowRight,
  FileText,
  MapPin,
  Camera,
  Layers,
  Sparkles,
  X,
  Brain,
  ShieldAlert,
  Info,
  ChevronRight,
  Loader2,
} from 'lucide-react';

interface InspectionTypeConfig {
  value: InspectionType;
  label: string;
  icon: ComponentType<{ className?: string; size?: number }>;
  color: string;
}

const INSPECTION_TYPES: InspectionTypeConfig[] = [
  { value: 'ROUTINE',        label: 'Routine',              icon: ClipboardCheck, color: 'text-[#4f7a38]' },
  { value: 'CORROSION',      label: 'Corrosion',            icon: AlertTriangle,  color: 'text-orange-600' },
  { value: 'DAMAGE',         label: 'Structural Damage',    icon: Flame,          color: 'text-red-600'    },
  { value: 'POSSIBLE_LEAK',  label: 'Fluid Leak',           icon: Droplets,       color: 'text-sky-600'    },
  { value: 'EQUIPMENT_ISSUE',label: 'Equipment Malfunction',icon: Wrench,         color: 'text-purple-600' },
  { value: 'OTHER',          label: 'General / Other',      icon: Tag,            color: 'text-[#6d7d70]'  },
];

const SEVERITIES: { value: InspectionSeverity; label: string; activeClass: string }[] = [
  { value: 'LOW',      label: 'Low',      activeClass: 'border-[#6fa350] bg-[#6fa350]/15 text-[#4f7a38] ring-2 ring-[#6fa350]/30 font-bold' },
  { value: 'MEDIUM',   label: 'Medium',   activeClass: 'border-amber-400 bg-amber-100 text-amber-900 ring-2 ring-amber-400/30 font-bold'  },
  { value: 'HIGH',     label: 'High',     activeClass: 'border-orange-400 bg-orange-100 text-orange-900 ring-2 ring-orange-400/30 font-bold' },
  { value: 'CRITICAL', label: 'Critical', activeClass: 'border-red-400 bg-red-100 text-red-900 ring-2 ring-red-400/30 font-bold'   },
];

const COMPONENT_SUGGESTIONS = [
  'INLET_PIPE','OUTLET_PIPE','SEAL','BEARING','MOTOR_HOUSING',
  'VALVE','COUPLING','BELT','FAN_BLADE','EXHAUST_PORT',
  'CONTROL_PANEL','WIRING','FOUNDATION','CASING','OTHER',
];

const RISK_STYLES: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  LOW:      { bg:'bg-[#6fa350]/15', text:'text-[#4f7a38]', border:'border-[#6fa350]/40', dot:'bg-[#6fa350]' },
  MEDIUM:   { bg:'bg-amber-100',   text:'text-amber-900',   border:'border-amber-400',   dot:'bg-amber-500'   },
  HIGH:     { bg:'bg-orange-100',  text:'text-orange-900',  border:'border-orange-400',  dot:'bg-orange-500'  },
  CRITICAL: { bg:'bg-red-100',    text:'text-red-900',    border:'border-red-400',    dot:'bg-red-600'    },
  UNKNOWN:  { bg:'bg-slate-100',   text:'text-slate-700',   border:'border-slate-300',   dot:'bg-slate-400'   },
};

export function InspectorInspectionPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const prefillType = (searchParams.get('type') as InspectionType | null) ?? 'ROUTINE';

  const [zones,    setZones]    = useState<Zone[]>([]);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [filteredEquipment, setFilteredEquipment] = useState<Equipment[]>([]);

  const [zoneId,         setZoneId]         = useState('');
  const [equipmentId,    setEquipmentId]    = useState('');
  const [component,      setComponent]      = useState('');
  const [locationCode,   setLocationCode]   = useState('');
  const [inspectionType, setInspectionType] = useState<InspectionType>(prefillType);
  const [severity,       setSeverity]       = useState<InspectionSeverity>('LOW');
  const [message,        setMessage]        = useState('');

  // Image selection (in-form, before submit)
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [previewUrls,  setPreviewUrls]  = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  // Submit state
  const [submitting, setSubmitting] = useState(false);
  const [error,      setError]      = useState<string | null>(null);

  // Post-creation state
  const [created,     setCreated]     = useState<Inspection | null>(null);
  const [uploading,   setUploading]   = useState(false);
  const [uploadDone,  setUploadDone]  = useState(false);
  const [aiResult,    setAiResult]    = useState<AIInspectionResult | null>(null);
  const [aiPolling,   setAiPolling]   = useState(false);

  useEffect(() => {
    Promise.all([zonesApi.list(), equipmentApi.list()])
      .then(([z, eq]) => { setZones(z); setEquipment(eq); })
      .catch(console.error);
  }, []);

  useEffect(() => {
    setFilteredEquipment(zoneId ? equipment.filter((e) => e.zoneId === zoneId) : equipment);
    setEquipmentId('');
  }, [zoneId, equipment]);

  useEffect(() => {
    // If equipment has a designated zone, auto-select it
    if (equipmentId) {
      const eq = equipment.find((e) => e.id === equipmentId);
      if (eq?.zoneId && eq.zoneId !== zoneId) {
        setZoneId(eq.zoneId);
      }
    }
  }, [equipmentId]);

  // Handle file picker selection
  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    const combined = [...pendingFiles, ...files].slice(0, 8); // max 8
    setPendingFiles(combined);
    const urls = combined.map((f) => URL.createObjectURL(f));
    setPreviewUrls(urls);
  }

  function removeFile(index: number) {
    const nextFiles = pendingFiles.filter((_, i) => i !== index);
    setPendingFiles(nextFiles);
    setPreviewUrls(nextFiles.map((f) => URL.createObjectURL(f)));
  }

  // Poll for AI result after submission
  async function pollAiResult(inspectionId: string) {
    setAiPolling(true);
    let attempts = 0;
    const maxAttempts = 15;
    const interval = setInterval(async () => {
      attempts++;
      try {
        const full = await inspectionApi.get(inspectionId);
        if (full.aiResult) {
          setAiResult(full.aiResult as AIInspectionResult);
          setAiPolling(false);
          clearInterval(interval);
        }
      } catch {
        // ignore poll errors
      }
      if (attempts >= maxAttempts) {
        setAiPolling(false);
        clearInterval(interval);
      }
    }, 1200);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!zoneId) {
      setError('Please select a facility zone.');
      return;
    }
    if (!message.trim()) {
      setError('Please enter field observation notes.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const inspection = await inspectionApi.create({
        zoneId,
        equipmentId: equipmentId || undefined,
        component: component.trim() || undefined,
        locationCode: locationCode.trim() || undefined,
        inspectionType,
        severity,
        message: message.trim(),
      });

      setCreated(inspection);

      // Upload pending images if any
      if (pendingFiles.length > 0) {
        setUploading(true);
        try {
          await Promise.all(pendingFiles.map((f) => inspectionApi.uploadImage(inspection.id, f)));
          setUploadDone(true);
        } catch (uploadErr) {
          console.error('Image upload failed:', uploadErr);
        } finally {
          setUploading(false);
        }
      }

      // Poll for AI analysis result
      void pollAiResult(inspection.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit inspection');
    } finally {
      setSubmitting(false);
    }
  }

  // ── Post-submit Success & AI View ───────────────────────────────────────────
  if (created) {
    const rs = RISK_STYLES[aiResult?.riskLevel ?? 'UNKNOWN'];
    const confidence = aiResult?.confidence ? Math.round(aiResult.confidence * 100) : null;
    const isMock = aiResult?.provider === 'mock';

    return (
      <div className="max-w-2xl mx-auto space-y-6 page-enter">
        {/* Success header */}
        <div className="rounded-2xl border border-[#6fa350]/40 bg-[#f4f9f0] p-6 shadow-verdant space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#6fa350]/20 border border-[#6fa350]/30 flex-shrink-0">
              <CheckCircle2 size={24} className="text-[#4f7a38]" />
            </div>
            <div>
              <h2 className="font-serif text-2xl font-bold text-[#25352b]">Inspection Submitted Successfully</h2>
              <p className="font-mono text-xs text-[#6fa350] mt-0.5 font-bold">
                Reference ID: <span className="text-[#25352b]">{created.id.slice(0, 8)}…</span>
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs font-mono bg-white rounded-xl border border-[var(--line)] p-4 shadow-sm">
            <div>
              <span className="text-[#6d7d70] block text-[10px] uppercase font-semibold">Zone</span>
              <span className="text-[#25352b] font-bold">{zones.find((z) => z.id === created.zoneId)?.name ?? created.zoneId}</span>
            </div>
            <div>
              <span className="text-[#6d7d70] block text-[10px] uppercase font-semibold">Category</span>
              <span className="text-[#25352b] font-bold">{created.inspectionType}</span>
            </div>
            <div>
              <span className="text-[#6d7d70] block text-[10px] uppercase font-semibold">Severity</span>
              <span className="text-[#25352b] font-bold">{created.severity}</span>
            </div>
            <div>
              <span className="text-[#6d7d70] block text-[10px] uppercase font-semibold">Location Code</span>
              <span className="text-[#4f7a38] font-bold">{created.locationCode ?? '—'}</span>
            </div>
          </div>

          {/* Upload progress */}
          <div className="flex items-center justify-between text-xs font-mono">
            {uploading && (
              <span className="flex items-center gap-2 text-amber-700 font-bold">
                <Loader2 size={13} className="animate-spin" />
                Uploading {pendingFiles.length} photo(s)…
              </span>
            )}
            {uploadDone && (
              <span className="flex items-center gap-1.5 text-[#4f7a38] font-bold">
                <CheckCircle2 size={13} />
                {pendingFiles.length} photo(s) attached to record
              </span>
            )}
          </div>
        </div>

        {/* Uploaded image thumbnails */}
        {previewUrls.length > 0 && (
          <div className="rounded-2xl border border-[var(--line)] bg-white p-5 space-y-3 shadow-verdant">
            <p className="font-mono text-xs uppercase tracking-widest text-[#4f7a38] font-bold flex items-center gap-1.5">
              <Camera size={13} />
              <span>Uploaded Evidence ({previewUrls.length})</span>
            </p>
            <div className="flex gap-2.5 flex-wrap">
              {previewUrls.map((url, i) => (
                <img
                  key={i}
                  src={url}
                  alt={pendingFiles[i]?.name}
                  className="h-20 w-28 object-cover rounded-xl border border-[var(--line)] bg-[#fbfbf9]"
                />
              ))}
            </div>
          </div>
        )}

        {/* AI Result Panel */}
        <div className={`rounded-2xl border p-6 space-y-4 shadow-verdant bg-white ${rs.border}`}>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Brain size={18} className="text-[#6fa350]" />
              <span className="font-mono text-xs uppercase tracking-widest text-[#4f7a38] font-bold">
                AI Triage Result
              </span>
            </div>
            {aiPolling && (
              <span className="flex items-center gap-1.5 font-mono text-xs text-amber-700 font-bold">
                <Loader2 size={13} className="animate-spin" />
                AI analysing…
              </span>
            )}
            {!aiPolling && !aiResult && (
              <span className="font-mono text-xs text-[#6d7d70]">Pending analysis…</span>
            )}
          </div>

          {aiResult ? (
            <div className="space-y-4">
              {/* Risk level + confidence */}
              <div className="flex items-center gap-3">
                <span className={`flex items-center gap-1.5 rounded-full border px-3 py-1 font-mono text-xs font-bold uppercase ${rs.bg} ${rs.text} ${rs.border}`}>
                  <span className={`h-2 w-2 rounded-full ${rs.dot}`} />
                  {aiResult.riskLevel}
                </span>
                {confidence !== null && confidence > 0 && (
                  <span className="font-mono text-xs text-[#6d7d70] font-semibold">
                    {confidence}% confidence
                  </span>
                )}
                {isMock && (
                  <span className="font-mono text-[10px] text-[#6d7d70] border border-[var(--line)] rounded-full px-2 py-0.5 bg-[#fbfbf9]">
                    Simulated Engine
                  </span>
                )}
              </div>

              {/* Narrative */}
              {aiResult.narrative && (
                <div className="rounded-xl bg-[#fbfbf9] border border-[var(--line)] p-4">
                  <p className="font-mono text-[10px] uppercase tracking-wider text-[#4f7a38] font-bold mb-1">Assessment Summary</p>
                  <p className="text-xs text-[#25352b] leading-relaxed font-medium">{aiResult.narrative}</p>
                </div>
              )}

              {/* Findings */}
              {aiResult.findings?.length > 0 && (
                <div className="space-y-1.5">
                  <p className="font-mono text-[10px] uppercase tracking-wider text-[#4f7a38] font-bold flex items-center gap-1.5">
                    <ShieldAlert size={12} /> Findings
                  </p>
                  {aiResult.findings.map((f, i) => (
                    <div key={i} className="flex items-start gap-2 rounded-xl bg-[#fbfbf9] border border-[var(--line)] px-3.5 py-2.5">
                      <ChevronRight size={13} className="text-[#6fa350] mt-0.5 flex-shrink-0" />
                      <p className="font-mono text-xs text-[#25352b] leading-relaxed font-medium">{f}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Recommendations */}
              {aiResult.recommendations?.length > 0 && (
                <div className="space-y-1.5">
                  <p className="font-mono text-[10px] uppercase tracking-wider text-[#4f7a38] font-bold flex items-center gap-1.5">
                    <Sparkles size={12} className="text-[#6fa350]" /> Recommended Actions
                  </p>
                  {aiResult.recommendations.map((r, i) => (
                    <div key={i} className="flex items-start gap-2 rounded-xl bg-[#fbfbf9] border border-[var(--line)] px-3.5 py-2.5">
                      <span className="text-[#6fa350] font-mono text-xs font-bold mt-0.5 flex-shrink-0">{i + 1}.</span>
                      <p className="font-mono text-xs text-[#25352b] leading-relaxed font-medium">{r}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Disclaimer */}
              {aiResult.disclaimer && (
                <div className="flex items-start gap-2 rounded-xl bg-slate-50 border border-slate-200 px-3.5 py-2.5">
                  <Info size={13} className="text-[#6fa350] mt-0.5 flex-shrink-0" />
                  <p className="font-mono text-[11px] text-[#6d7d70] leading-relaxed">{aiResult.disclaimer}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="py-6 flex flex-col items-center gap-3 text-center">
              <Brain size={36} className="text-[#6fa350]/40" />
              <p className="font-mono text-xs text-[#6d7d70]">
                {aiPolling
                  ? 'AI is analysing sensor data and inspection evidence…'
                  : 'AI analysis will appear here once processing completes.'}
              </p>
            </div>
          )}
        </div>

        {/* Navigation CTAs */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              setCreated(null);
              setAiResult(null);
              setPendingFiles([]);
              setPreviewUrls([]);
              setMessage('');
              setLocationCode('');
              setComponent('');
            }}
            className="flex-1 rounded-xl border border-[var(--line)] bg-white hover:bg-[#fbfbf9] py-3 text-xs font-bold text-[#25352b] shadow-sm transition-all text-center"
          >
            File Another Inspection
          </button>
          <button
            type="button"
            onClick={() => navigate('/inspector/history')}
            className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-[#6fa350] hover:bg-[#4f7a38] py-3 text-xs font-bold text-white shadow-md transition-all text-center"
          >
            <span>View in History</span>
            <ArrowRight size={14} />
          </button>
        </div>
      </div>
    );
  }

  // ── Form View ───────────────────────────────────────────────────────────────
  return (
    <div className="max-w-3xl mx-auto page-enter">
      {/* Page Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-[#6fa350] live-dot" />
          <span className="font-mono text-[10px] uppercase tracking-widest text-[#4f7a38] font-bold">Field Operations</span>
        </div>
        <h1 className="font-serif text-3xl font-bold text-[#25352b] tracking-tight mt-1">New Field Inspection Record</h1>
        <p className="mt-1 font-sans text-xs text-[#6d7d70]">
          Document plant conditions, attach photos, and initialise AI triage
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">

        {/* ── Inspection Type ── */}
        <div className="rounded-2xl border border-[var(--line)] bg-white p-6 shadow-verdant">
          <label className="flex items-center gap-2 font-mono text-xs uppercase tracking-[0.14em] text-[#4f7a38] mb-4 font-bold">
            <Layers size={14} />
            <span>Inspection Category *</span>
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {INSPECTION_TYPES.map((t) => {
              const IconComp = t.icon;
              const isSelected = inspectionType === t.value;
              return (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setInspectionType(t.value)}
                  className={`flex items-center gap-2.5 rounded-xl border p-3.5 text-left transition-all shadow-sm ${
                    isSelected
                      ? 'border-[#6fa350] bg-[#6fa350]/15 text-[#4f7a38] ring-2 ring-[#6fa350]/30 font-bold'
                      : 'border-[var(--line)] bg-[#fbfbf9] text-[#25352b] hover:bg-[#f3f7f0]'
                  }`}
                >
                  <IconComp size={18} className={isSelected ? 'text-[#4f7a38]' : t.color} />
                  <span className="font-sans text-xs font-semibold leading-none">{t.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Severity ── */}
        <div className="rounded-2xl border border-[var(--line)] bg-white p-6 shadow-verdant">
          <label className="flex items-center gap-2 font-mono text-xs uppercase tracking-[0.14em] text-[#4f7a38] mb-4 font-bold">
            <AlertTriangle size={14} />
            <span>Initial Severity Classification *</span>
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {SEVERITIES.map((s) => (
              <button
                key={s.value}
                type="button"
                onClick={() => setSeverity(s.value)}
                className={`rounded-xl border py-3 font-mono text-xs font-bold uppercase tracking-wider text-center transition-all shadow-sm ${
                  severity === s.value
                    ? s.activeClass
                    : 'border-[var(--line)] bg-[#fbfbf9] text-[#25352b] hover:bg-[#f3f7f0]'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Location / Equipment ── */}
        <div className="rounded-2xl border border-[var(--line)] bg-white p-6 space-y-4 shadow-verdant">
          <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-[0.14em] text-[#4f7a38] font-bold">
            <MapPin size={14} />
            <span>Facility Location &amp; Equipment Mapping *</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-mono text-[10px] uppercase tracking-wider text-[#6d7d70] mb-1.5 font-bold">Zone Allocation *</label>
              <select
                value={zoneId}
                onChange={(e) => setZoneId(e.target.value)}
                className="w-full rounded-xl bg-[#fbfbf9] border border-[var(--line)] px-3.5 py-2.5 font-sans text-xs text-[#25352b] font-medium focus:outline-none focus:border-[#6fa350]"
                required
              >
                <option value="">— Select facility zone —</option>
                {zones.map((z) => <option key={z.id} value={z.id}>{z.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block font-mono text-[10px] uppercase tracking-wider text-[#6d7d70] mb-1.5 font-bold">Specific Equipment Unit</label>
              <select
                value={equipmentId}
                onChange={(e) => setEquipmentId(e.target.value)}
                className="w-full rounded-xl bg-[#fbfbf9] border border-[var(--line)] px-3.5 py-2.5 font-sans text-xs text-[#25352b] font-medium focus:outline-none focus:border-[#6fa350]"
              >
                <option value="">— Select target unit (optional) —</option>
                {filteredEquipment.map((eq) => (
                  <option key={eq.id} value={eq.id}>{eq.label} — {eq.description}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-mono text-[10px] uppercase tracking-wider text-[#6d7d70] mb-1.5 font-bold">Component / Sub-assembly</label>
              <input
                type="text"
                value={component}
                onChange={(e) => setComponent(e.target.value.toUpperCase())}
                placeholder="e.g. INLET_VALVE"
                list="component-suggestions"
                className="w-full rounded-xl bg-[#fbfbf9] border border-[var(--line)] px-3.5 py-2.5 font-mono text-xs text-[#25352b] placeholder-[#6d7d70]/60 focus:outline-none focus:border-[#6fa350]"
              />
              <datalist id="component-suggestions">
                {COMPONENT_SUGGESTIONS.map((s) => <option key={s} value={s} />)}
              </datalist>
            </div>
            <div>
              <label className="block font-mono text-[10px] uppercase tracking-wider text-[#6d7d70] mb-1.5 font-bold">Telemetry Location Code</label>
              <input
                type="text"
                value={locationCode}
                onChange={(e) => setLocationCode(e.target.value.toUpperCase())}
                placeholder="e.g. ZONE-PUMP-INLT"
                className="w-full rounded-xl bg-[#fbfbf9] border border-[var(--line)] px-3.5 py-2.5 font-mono text-xs text-[#4f7a38] font-bold placeholder-[#6d7d70]/60 focus:outline-none focus:border-[#6fa350]"
              />
            </div>
          </div>
        </div>

        {/* ── Observation ── */}
        <div className="rounded-2xl border border-[var(--line)] bg-white p-6 shadow-verdant space-y-2">
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 font-mono text-xs uppercase tracking-[0.14em] text-[#4f7a38] font-bold">
              <FileText size={14} />
              <span>Field Engineering Observations *</span>
            </label>
            <span className="font-mono text-xs text-[#6d7d70]">{message.length}/2000</span>
          </div>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={5}
            maxLength={2000}
            placeholder="Record sensory observations: vibration, thermal gradient, abnormal acoustics, corrosion flakes, seepage patterns, gauge variance…"
            required
            className="w-full rounded-xl bg-[#fbfbf9] border border-[var(--line)] px-3.5 py-3 font-sans text-xs text-[#25352b] placeholder-[#6d7d70]/60 focus:outline-none focus:border-[#6fa350] resize-y"
          />
        </div>

        {/* ── Photo Upload (in-form) ── */}
        <div className="rounded-2xl border border-[var(--line)] bg-white p-6 shadow-verdant space-y-4">
          <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-[0.14em] text-[#4f7a38] font-bold">
            <Camera size={14} />
            <span>Photographic Evidence</span>
            <span className="text-[#6d7d70] normal-case tracking-normal font-normal text-xs">(optional — improves AI analysis)</span>
          </div>

          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            multiple
            className="hidden"
            onChange={handleFileSelect}
          />

          {/* Preview grid */}
          {previewUrls.length > 0 && (
            <div className="flex gap-3 flex-wrap">
              {previewUrls.map((url, i) => (
                <div key={i} className="relative group">
                  <img
                    src={url}
                    alt={pendingFiles[i]?.name}
                    className="h-20 w-28 object-cover rounded-xl border border-[var(--line)] bg-[#fbfbf9] shadow-sm"
                  />
                  <button
                    type="button"
                    onClick={() => removeFile(i)}
                    className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-red-600 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
                  >
                    <X size={11} />
                  </button>
                  <p className="font-mono text-[9px] text-[#6d7d70] mt-0.5 truncate w-28 font-medium">{pendingFiles[i]?.name}</p>
                </div>
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="w-full border-2 border-dashed border-[var(--line)] hover:border-[#6fa350] rounded-2xl p-6 text-center cursor-pointer transition-all bg-[#fbfbf9] hover:bg-[#f3f7f0] group"
          >
            <UploadCloud size={32} className="mx-auto text-[#6fa350] mb-2 transition-transform group-hover:scale-110" />
            <p className="text-xs font-bold text-[#25352b]">
              {previewUrls.length > 0 ? 'Add more photos' : 'Click to attach equipment photos'}
            </p>
            <p className="text-[11px] font-mono text-[#6d7d70] mt-1">PNG, JPG, WEBP — up to 8 MB each</p>
          </button>
        </div>

        {error && (
          <div className="rounded-xl border border-red-300 bg-red-50 p-4 font-mono text-xs text-red-700 shadow-sm">
            {error}
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={submitting}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#6fa350] hover:bg-[#4f7a38] py-3.5 font-bold text-sm text-white shadow-md transition-all active:scale-[0.99] disabled:opacity-50 cursor-pointer"
        >
          {submitting ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              <span>Submitting inspection record…</span>
            </>
          ) : (
            <>
              <ClipboardCheck size={16} />
              <span>Submit Field Inspection Record</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
}
