import { useState } from 'react';
import { simulationApi, type ScenarioType } from '../services/api';
import { EvidenceIntegrityCenter } from './EvidenceIntegrityCenter';
import {
  Flame,
  Zap,
  Droplets,
  Radio,
  RotateCcw,
  Volume2,
  Activity,
  CheckCircle,
} from 'lucide-react';

const SCENARIOS: Array<{
  id: ScenarioType;
  label: string;
  sub: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  iconColor: string;
  bgColor: string;
  borderColor: string;
}> = [
  { id: 'FIRE', label: 'Fire Event', sub: 'Thermal safety breach', icon: Flame, iconColor: 'text-[#c94a44]', bgColor: 'bg-red-50 hover:bg-red-100/60', borderColor: 'border-red-200 hover:border-red-400' },
  { id: 'WATER_LEAK', label: 'Water Leak', sub: 'Moisture ingress alert', icon: Droplets, iconColor: 'text-[#0284c7]', bgColor: 'bg-sky-50 hover:bg-sky-100/60', borderColor: 'border-sky-200 hover:border-sky-400' },
  { id: 'NOISE_SPIKE', label: 'Noise Spike', sub: 'Acoustic anomaly', icon: Volume2, iconColor: 'text-[#7c3aed]', bgColor: 'bg-purple-50 hover:bg-purple-100/60', borderColor: 'border-purple-200 hover:border-purple-400' },
  { id: 'ENERGY_SPIKE', label: 'Energy Fault', sub: 'Overcurrent surge', icon: Zap, iconColor: 'text-[#d97706]', bgColor: 'bg-amber-50 hover:bg-amber-100/60', borderColor: 'border-amber-200 hover:border-amber-400' },
  { id: 'DEVICE_OFFLINE', label: 'Node Dropout', sub: 'Connectivity loss', icon: Radio, iconColor: 'text-[#475569]', bgColor: 'bg-slate-100 hover:bg-slate-200/60', borderColor: 'border-slate-300 hover:border-slate-400' },
];

export function SimulationControls() {
  const [busy, setBusy] = useState<string | null>(null);
  const [lastMsg, setLastMsg] = useState<string | null>(null);
  const [lastMsgType, setLastMsgType] = useState<'ok' | 'error'>('ok');

  async function triggerScenario(scenario: ScenarioType) {
    setBusy(scenario);
    setLastMsg(null);
    try {
      await simulationApi.trigger(scenario);
      setLastMsg(`Demo scenario injected: ${scenario.replace(/_/g, ' ')}. Live sensor stream updated.`);
      setLastMsgType('ok');
    } catch (err) {
      setLastMsg(err instanceof Error ? err.message : 'Trigger failed');
      setLastMsgType('error');
    } finally {
      setBusy(null);
    }
  }

  async function resetScenario() {
    setBusy('reset_scenario');
    setLastMsg(null);
    try {
      await simulationApi.reset();
      setLastMsg('All sensor simulation scenarios returned to nominal baseline');
      setLastMsgType('ok');
    } catch (err) {
      setLastMsg(err instanceof Error ? err.message : 'Reset failed');
      setLastMsgType('error');
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* ── SAFETY SCENARIO TESTING (LIVE INJECTION) ── */}
      <div className="rounded-2xl border border-[var(--line)] bg-white p-6 shadow-verdant space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[var(--line)]">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#6fa350]/15 border border-[#6fa350]/30 flex-shrink-0">
              <Activity size={20} className="text-[#4f7a38]" />
            </div>
            <div>
              <h3 className="font-serif text-lg font-bold text-[#25352b] tracking-wide">
                Safety Scenario Testing (Node ESP-002)
              </h3>
              <p className="font-sans text-xs text-[#6d7d70]">
                Inject environmental hazards &amp; faults into simulated stream (ESP-002), preserving real hardware telemetry on ESP-001
              </p>
            </div>
          </div>
          <span className="rounded-full border border-[#6fa350]/30 bg-[#6fa350]/12 px-3.5 py-1 text-xs font-bold text-[#4f7a38] uppercase tracking-wider flex items-center gap-1.5 shadow-sm">
            <span className="h-2 w-2 rounded-full bg-[#6fa350] animate-pulse" />
            Live Injection Active
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {SCENARIOS.map((s) => {
            const Icon = s.icon;
            const isRunning = busy === s.id;
            return (
              <button
                key={s.id}
                disabled={busy !== null}
                onClick={() => void triggerScenario(s.id)}
                className={`flex flex-col items-center gap-2 rounded-xl border ${s.borderColor} ${s.bgColor} px-3.5 py-4 transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-40 disabled:cursor-not-allowed group text-left`}
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-sm border border-black/5 group-hover:scale-105 transition-transform">
                  {isRunning ? (
                    <span className="h-4 w-4 rounded-full border-2 border-current/30 border-t-current animate-spin" />
                  ) : (
                    <Icon size={20} className={s.iconColor} />
                  )}
                </div>
                <div className="text-center leading-tight">
                  <p className="font-sans font-bold text-xs text-[#25352b]">{s.label}</p>
                  <p className="text-[#6d7d70] text-[10px] mt-0.5 font-medium">{s.sub}</p>
                </div>
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-[var(--line)]">
          <button
            disabled={busy !== null}
            onClick={() => void resetScenario()}
            className="flex items-center gap-2 rounded-xl border border-[var(--line)] bg-[#fbfbf9] hover:bg-[#f3f7f0] px-4 py-2 text-xs font-bold text-[#25352b] shadow-sm hover:border-[#6fa350] disabled:opacity-40 transition-all"
          >
            <RotateCcw size={14} className={busy === 'reset_scenario' ? 'animate-spin' : 'text-[#4f7a38]'} />
            <span>Reset All Scenarios to Baseline</span>
          </button>
          {lastMsg && (
            <span
              className={`flex items-center gap-1.5 font-mono text-xs font-semibold ${
                lastMsgType === 'ok' ? 'text-[#4f7a38]' : 'text-red-600'
              }`}
            >
              {lastMsgType === 'ok' && <CheckCircle size={14} className="text-[#6fa350]" />}
              {lastMsg}
            </span>
          )}
        </div>
      </div>

      {/* ── EVIDENCE & INTEGRITY CENTER ── */}
      <EvidenceIntegrityCenter />
    </div>
  );
}
