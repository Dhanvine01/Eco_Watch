import { useState, type FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { LeafCanvas } from '../components/LeafCanvas';
import { Eye, EyeOff, Mail, Lock, AlertTriangle, ArrowRight, ShieldCheck } from 'lucide-react';

export function LoginPage() {
  const { login, loading, user } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  if (user) {
    const home = user.role === 'ADMIN' ? '/admin' : user.role === 'INSPECTOR' ? '/inspector' : '/worker';
    return <Navigate to={home} replace />;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    try {
      const loggedIn = await login(email, password);
      const home = loggedIn.role === 'ADMIN' ? '/admin' : loggedIn.role === 'INSPECTOR' ? '/inspector' : '/worker';
      navigate(home);
    } catch (error) {
      setErr(error instanceof Error ? error.message : 'Authentication failed');
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#fbfbf9] px-4">
      {/* Interactive floating leaf canvas background */}
      <LeafCanvas />

      {/* Subtle radial background warmth */}
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          background: 'radial-gradient(circle at 50% 15%, rgba(143,196,106,0.18), transparent 65%)',
        }}
      />

      {/* Card */}
      <div className="relative z-10 w-full max-w-[420px] rounded-2xl border border-[rgba(111,163,80,0.25)] bg-white/95 p-8 shadow-xl backdrop-blur-md">
        
        {/* Top accent line */}
        <div className="absolute inset-x-0 top-0 h-1 rounded-t-2xl bg-gradient-to-r from-[#6fa350] via-[#8fc46a] to-[#4f7a38]" />

        {/* System status pill */}
        <div className="mb-6 flex items-center justify-center gap-2 rounded-full border border-[var(--line)] bg-[#fbfbf9] px-3.5 py-1.5 shadow-sm">
          <span className="h-2 w-2 rounded-full bg-[#6fa350] animate-pulse" />
          <span className="font-sans text-[11px] font-semibold tracking-wider text-[#4f7a38] uppercase">
            Verdant Platform · Secure Gateway
          </span>
        </div>

        {/* Logo mark */}
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-[rgba(111,163,80,0.25)] bg-white shadow-md p-1.5">
            <img src="/logo.png" alt="Verdant Logo" className="h-full w-full object-contain" />
          </div>
          <div>
            <h1 className="font-serif text-3xl font-bold text-[#25352b] tracking-tight">EcoWatch</h1>
            <p className="mt-0.5 text-xs font-semibold uppercase tracking-[0.18em] text-[#6fa350]">
              Green Technology &amp; Sustainability
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email */}
          <div>
            <label
              htmlFor="email"
              className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[#25352b]"
            >
              Work Email
            </label>
            <div className="relative">
              <Mail
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6d7d70] pointer-events-none"
              />
              <input
                id="email"
                type="email"
                required
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="operator@facility.io"
                className="w-full rounded-xl border border-[var(--line)] bg-[#fbfbf9] pl-9 pr-3 py-2.5 text-sm text-[#25352b] placeholder-[#6d7d70]/60 outline-none transition focus:border-[#6fa350] focus:ring-2 focus:ring-[#6fa350]/20"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label
              htmlFor="password"
              className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[#25352b]"
            >
              Password
            </label>
            <div className="relative">
              <Lock
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6d7d70] pointer-events-none"
              />
              <input
                id="password"
                type={showPw ? 'text' : 'password'}
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full rounded-xl border border-[var(--line)] bg-[#fbfbf9] pl-9 pr-10 py-2.5 text-sm text-[#25352b] placeholder-[#6d7d70]/60 outline-none transition focus:border-[#6fa350] focus:ring-2 focus:ring-[#6fa350]/20"
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                aria-label={showPw ? 'Hide password' : 'Show password'}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6d7d70] hover:text-[#25352b] transition-colors"
              >
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Error */}
          {err && (
            <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-red-700">
              <AlertTriangle size={15} className="text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs leading-relaxed">{err}</p>
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-[#6fa350] hover:bg-[#4f7a38] py-3 font-semibold text-sm text-white shadow-md transition-all active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <span className="h-4 w-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                Authenticating…
              </>
            ) : (
              <>
                Sign In
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        {/* Demo Fast Fill */}
        <div className="mt-6 border-t border-[var(--line)] pt-5">
          <p className="mb-2.5 text-center text-[10px] font-bold uppercase tracking-[0.16em] text-[#6d7d70]">
            Demo Quick Login
          </p>
          <div className="grid grid-cols-3 gap-2">
            {[
              { role: 'Admin', email: 'admin@ecowatch.local', border: 'border-[var(--line)] hover:border-[#6fa350]', text: 'text-[#4f7a38]' },
              { role: 'Inspector', email: 'inspector@ecowatch.local', border: 'border-[var(--line)] hover:border-[#6fa350]', text: 'text-[#6fa350]' },
              { role: 'Worker', email: 'worker@ecowatch.local', border: 'border-[var(--line)] hover:border-[#6fa350]', text: 'text-[#25352b]' },
            ].map(({ role, email: demoEmail, border, text }) => (
              <button
                key={role}
                type="button"
                onClick={() => {
                  setEmail(demoEmail);
                  setPassword('password123');
                }}
                className={`rounded-lg border bg-[#fbfbf9] px-2 py-2 text-xs font-semibold transition-all hover:bg-[#dcedc9]/40 ${border} ${text} shadow-sm`}
              >
                {role}
              </button>
            ))}
          </div>
        </div>

        {/* Prototype footnote */}
        <div className="mt-5 flex items-center justify-center gap-1.5 text-[10px] text-[#6d7d70]">
          <ShieldCheck size={12} className="text-[#6fa350]" />
          <span>SHA-256 Telemetry Hash-Chain Guarded</span>
        </div>
      </div>
    </div>
  );
}
