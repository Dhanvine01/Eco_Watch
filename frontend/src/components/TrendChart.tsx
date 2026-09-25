import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

interface DataPoint {
  time: string;
  [key: string]: number | string | null;
}

interface Series {
  key: string;
  label: string;
  color: string;
  unit?: string;
}

interface Props {
  data: DataPoint[];
  series: Series[];
  height?: number;
  title?: string;
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { color: string; name: string; value: number; unit?: string }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-slate-700/60 bg-slate-900/95 px-3 py-2 shadow-xl backdrop-blur-sm">
      <p className="mb-1.5 font-mono text-[10px] uppercase tracking-widest text-slate-400">
        {label}
      </p>
      {payload.map((p) => (
        <p key={p.name} className="font-mono text-xs" style={{ color: p.color }}>
          {p.name}: {p.value != null ? p.value.toFixed(1) : '—'}
        </p>
      ))}
    </div>
  );
}

export function TrendChart({ data, series, height = 200, title }: Props) {
  return (
    <div className="rounded-lg border border-slate-700/40 bg-slate-900/70 backdrop-blur-md p-4">
      {title && (
        <p className="mb-3 font-mono text-[11px] uppercase tracking-widest text-slate-400">
          {title}
        </p>
      )}
      {data.length === 0 ? (
        <div
          className="flex items-center justify-center text-slate-600 font-mono text-xs"
          style={{ height }}
        >
          No data available
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={height}>
          <LineChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis
              dataKey="time"
              tick={{ fill: '#64748b', fontSize: 10, fontFamily: 'JetBrains Mono' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: '#64748b', fontSize: 10, fontFamily: 'JetBrains Mono' }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} />
            {series.map((s) => (
              <Line
                key={s.key}
                type="monotone"
                dataKey={s.key}
                name={s.label}
                stroke={s.color}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, strokeWidth: 0 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
