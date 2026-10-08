import { useMemo, useState } from 'react';
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, BarChart, Bar, Cell,
  LineChart, Line, Legend,
} from 'recharts';
import { TrendingUp, TrendingDown, Minus, AlertTriangle, Info } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { toNumber } from '@/features/diff/numericDiff';
import type { CellValue } from '@/types';

// ── helpers ────────────────────────────────────────────────────────────────

function toNum(v: CellValue): number | null {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  return toNumber(v);
}

function stats(values: number[]) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;
  const mean = values.reduce((s, v) => s + v, 0) / n;
  const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / n;
  const std = Math.sqrt(variance);
  const median = n % 2 === 0 ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2 : sorted[Math.floor(n / 2)];
  const q1 = sorted[Math.floor(n * 0.25)];
  const q3 = sorted[Math.floor(n * 0.75)];
  const min = sorted[0];
  const max = sorted[n - 1];
  const sum = values.reduce((s, v) => s + v, 0);
  return { mean, std, median, q1, q3, min, max, sum, n };
}

function histogram(values: number[], bins = 20) {
  if (values.length === 0) return [];
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (min === max) return [{ bin: min, count: values.length }];
  const width = (max - min) / bins;
  const counts = Array.from({ length: bins }, (_, i) => ({
    bin: min + i * width + width / 2,
    count: 0,
  }));
  for (const v of values) {
    const idx = Math.min(Math.floor((v - min) / width), bins - 1);
    counts[idx].count++;
  }
  return counts;
}

function fmt(n: number | null | undefined, decimals = 4): string {
  if (n === null || n === undefined) return '—';
  if (Math.abs(n) >= 1e9) return (n / 1e9).toFixed(2) + 'B';
  if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(2) + 'M';
  if (Math.abs(n) >= 1e3) return (n / 1e3).toFixed(2) + 'K';
  return n.toFixed(decimals).replace(/\.?0+$/, '');
}

function pct(n: number | null | undefined): string {
  if (n === null || n === undefined) return '—';
  return (n >= 0 ? '+' : '') + n.toFixed(4) + '%';
}

// ── main component ─────────────────────────────────────────────────────────

export function ColumnAnalyticsView() {
  const result = useStore((s) => s.result);
  const workbookA = useStore((s) => s.workbookA);
  const workbookB = useStore((s) => s.workbookB);
  const config = useStore((s) => s.config);

  // All numeric columns common to both files
  const numericColumns = useMemo(() => {
    if (!result) return [];
    const cols = new Set<string>();
    for (const row of result.rows) {
      for (const f of row.fields) {
        const a = toNum(f.oldValue);
        const b = toNum(f.newValue);
        if (a !== null || b !== null) cols.add(f.field);
      }
    }
    return Array.from(cols).sort();
  }, [result]);

  const [colA, setColA] = useState<string>('');
  const [colB, setColB] = useState<string>('');

  // Auto-select first two numeric columns
  const effectiveColA = colA || numericColumns[0] || '';
  const effectiveColB = colB || numericColumns[1] || numericColumns[0] || '';

  // Build paired data from matched rows
  const pairedData = useMemo(() => {
    if (!result || !effectiveColA || !effectiveColB) return [];
    return result.rows
      .filter((r) => r.status !== 'ADDED' && r.status !== 'REMOVED')
      .map((row) => {
        const fA = row.fields.find((f) => f.field === effectiveColA);
        const fB = row.fields.find((f) => f.field === effectiveColB);
        const vA_old = toNum(fA?.oldValue);
        const vA_new = toNum(fA?.newValue);
        const vB_old = toNum(fB?.oldValue);
        const vB_new = toNum(fB?.newValue);
        if (vA_old === null || vA_new === null) return null;
        return {
          key: row.key,
          fileA: vA_old,
          fileB: vA_new,
          colB_fileA: vB_old,
          colB_fileB: vB_new,
          diff: vA_new - vA_old,
          pctDiff: vA_old !== 0 ? ((vA_new - vA_old) / Math.abs(vA_old)) * 100 : null,
          changed: row.status === 'CHANGED',
        };
      })
      .filter(Boolean) as {
        key: string; fileA: number; fileB: number;
        colB_fileA: number | null; colB_fileB: number | null;
        diff: number; pctDiff: number | null; changed: boolean;
      }[];
  }, [result, effectiveColA, effectiveColB]);

  const valuesA = pairedData.map((d) => d.fileA);
  const valuesB = pairedData.map((d) => d.fileB);
  const diffs = pairedData.map((d) => d.diff);
  const statsA = stats(valuesA);
  const statsB = stats(valuesB);
  const statsDiff = stats(diffs);

  const histA = histogram(valuesA);
  const histB = histogram(valuesB);
  const histDiff = histogram(diffs);

  // Top movers by absolute diff
  const topMovers = [...pairedData]
    .sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff))
    .slice(0, 15);

  // Scatter: File A vs File B for selected column
  const scatterData = pairedData.map((d) => ({
    x: d.fileA, y: d.fileB, key: d.key, changed: d.changed,
  }));

  // Line: sorted by File A value — shows drift
  const lineData = [...pairedData]
    .sort((a, b) => a.fileA - b.fileA)
    .map((d, i) => ({ i, fileA: d.fileA, fileB: d.fileB, key: d.key }));

  if (!result) return null;

  if (numericColumns.length === 0) {
    return (
      <div className="mx-auto max-w-5xl px-6 py-16 text-center">
        <AlertTriangle className="mx-auto mb-3 h-8 w-8 text-warning" />
        <p className="text-sm font-medium">No numeric columns found in the comparison result.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 space-y-6">
      {/* Header + column pickers */}
      <div className="flex flex-wrap items-end gap-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Column Analytics</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {workbookA?.fileName} vs {workbookB?.fileName} · key: <span className="font-mono">{config?.keyColumn}</span>
          </p>
        </div>
        <div className="ml-auto flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Primary column</Label>
            <Select value={effectiveColA} onValueChange={setColA}>
              <SelectTrigger className="h-8 w-56 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {numericColumns.map((c) => (
                  <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Secondary column</Label>
            <Select value={effectiveColB} onValueChange={setColB}>
              <SelectTrigger className="h-8 w-56 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {numericColumns.map((c) => (
                  <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* ── KPI cards ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
        <KpiCard label="Instruments" value={String(pairedData.length)} />
        <KpiCard label="Sum A" value={fmt(statsA?.sum)} />
        <KpiCard label="Sum B" value={fmt(statsB?.sum)} />
        <KpiCard
          label="Sum Δ"
          value={fmt(statsDiff?.sum)}
          tone={statsDiff && statsDiff.sum > 0 ? 'up' : statsDiff && statsDiff.sum < 0 ? 'down' : 'flat'}
        />
        <KpiCard
          label="Mean Δ"
          value={fmt(statsDiff?.mean)}
          tone={statsDiff && statsDiff.mean > 0 ? 'up' : statsDiff && statsDiff.mean < 0 ? 'down' : 'flat'}
        />
        <KpiCard label="Std Dev Δ" value={fmt(statsDiff?.std)} />
      </div>

      {/* ── Stats table ───────────────────────────────────────── */}
      <div className="rounded-lg border bg-card overflow-x-auto">
        <div className="border-b px-4 py-3 flex items-center gap-2">
          <Info className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-semibold">Descriptive Statistics — {effectiveColA}</span>
        </div>
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b text-muted-foreground">
              <th className="px-4 py-2 text-left font-medium">Metric</th>
              <th className="px-4 py-2 text-right font-medium">File A</th>
              <th className="px-4 py-2 text-right font-medium">File B</th>
              <th className="px-4 py-2 text-right font-medium">Δ (B − A)</th>
              <th className="px-4 py-2 text-right font-medium">Δ%</th>
            </tr>
          </thead>
          <tbody>
            {([
              ['Count', statsA?.n, statsB?.n],
              ['Sum', statsA?.sum, statsB?.sum],
              ['Mean', statsA?.mean, statsB?.mean],
              ['Median', statsA?.median, statsB?.median],
              ['Std Dev', statsA?.std, statsB?.std],
              ['Min', statsA?.min, statsB?.min],
              ['Q1 (25%)', statsA?.q1, statsB?.q1],
              ['Q3 (75%)', statsA?.q3, statsB?.q3],
              ['Max', statsA?.max, statsB?.max],
            ] as [string, number | undefined, number | undefined][]).map(([label, a, b]) => {
              const delta = a !== undefined && b !== undefined ? b - a : null;
              const deltaPct = delta !== null && a !== undefined && a !== 0 ? (delta / Math.abs(a)) * 100 : null;
              return (
                <tr key={label} className="border-b last:border-0 hover:bg-muted/20">
                  <td className="px-4 py-2 font-medium text-foreground">{label}</td>
                  <td className="px-4 py-2 text-right font-mono tabular-nums text-muted-foreground">{fmt(a)}</td>
                  <td className="px-4 py-2 text-right font-mono tabular-nums text-foreground">{fmt(b)}</td>
                  <td className={cn('px-4 py-2 text-right font-mono tabular-nums font-semibold',
                    delta === null ? '' : delta > 0 ? 'text-success' : delta < 0 ? 'text-destructive' : 'text-muted-foreground'
                  )}>{fmt(delta)}</td>
                  <td className={cn('px-4 py-2 text-right font-mono tabular-nums',
                    deltaPct === null ? 'text-muted-foreground' : deltaPct > 0 ? 'text-success' : deltaPct < 0 ? 'text-destructive' : 'text-muted-foreground'
                  )}>{pct(deltaPct)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── Charts row 1: Scatter + Drift line ────────────────── */}
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title={`Scatter: File A vs File B — ${effectiveColA}`} subtitle="Each dot = one instrument. Perfect match = diagonal line.">
          <ResponsiveContainer width="100%" height={280}>
            <ScatterChart margin={{ top: 10, right: 10, bottom: 20, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="x" name="File A" tick={{ fontSize: 10 }} tickFormatter={(v) => fmt(v, 2)}
                label={{ value: 'File A', position: 'insideBottom', offset: -10, fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
              <YAxis dataKey="y" name="File B" tick={{ fontSize: 10 }} tickFormatter={(v) => fmt(v, 2)}
                label={{ value: 'File B', angle: -90, position: 'insideLeft', fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
              <Tooltip
                cursor={{ strokeDasharray: '3 3' }}
                content={({ payload }) => {
                  const d = payload?.[0]?.payload;
                  if (!d) return null;
                  return (
                    <div className="rounded border bg-popover px-3 py-2 text-xs shadow-lg">
                      <p className="font-mono font-semibold">{d.key}</p>
                      <p>A: <span className="font-mono">{fmt(d.x, 6)}</span></p>
                      <p>B: <span className="font-mono">{fmt(d.y, 6)}</span></p>
                      <p className={d.y - d.x > 0 ? 'text-success' : d.y - d.x < 0 ? 'text-destructive' : ''}>
                        Δ: {fmt(d.y - d.x, 6)}
                      </p>
                    </div>
                  );
                }}
              />
              {/* Perfect match reference line */}
              {statsA && <ReferenceLine
                segment={[{ x: statsA.min, y: statsA.min }, { x: statsA.max, y: statsA.max }]}
                stroke="hsl(var(--muted-foreground))" strokeDasharray="4 4" strokeWidth={1}
              />}
              <Scatter
                data={scatterData}
                fill="hsl(var(--primary))"
                fillOpacity={0.6}
                shape={(props: any) => {
                  const { cx, cy, payload } = props;
                  return <circle cx={cx} cy={cy} r={payload.changed ? 4 : 3}
                    fill={payload.changed ? 'hsl(var(--changed))' : 'hsl(var(--primary))'}
                    fillOpacity={0.7} />;
                }}
              />
            </ScatterChart>
          </ResponsiveContainer>
          <p className="mt-1 text-center text-xs text-muted-foreground">
            <span className="inline-block h-2 w-2 rounded-full bg-changed mr-1" />changed
            <span className="inline-block h-2 w-2 rounded-full bg-primary ml-3 mr-1" />unchanged
          </p>
        </ChartCard>

        <ChartCard title={`Drift: File A vs File B sorted by value — ${effectiveColA}`} subtitle="Shows systematic shift across the distribution.">
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={lineData} margin={{ top: 10, right: 10, bottom: 30, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="i" tick={false}
                label={{ value: 'Instruments (sorted by File A)', position: 'insideBottom', offset: -10, fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => fmt(v, 2)} />
              <Tooltip
                content={({ payload }) => {
                  const d = payload?.[0]?.payload;
                  if (!d) return null;
                  return (
                    <div className="rounded border bg-popover px-3 py-2 text-xs shadow-lg">
                      <p className="font-mono font-semibold">{d.key}</p>
                      <p>A: <span className="font-mono">{fmt(d.fileA, 6)}</span></p>
                      <p>B: <span className="font-mono">{fmt(d.fileB, 6)}</span></p>
                    </div>
                  );
                }}
              />
              <Legend verticalAlign="top" wrapperStyle={{ fontSize: 11, paddingBottom: 8 }} />
              <Line type="monotone" dataKey="fileA" stroke="hsl(var(--info))" dot={false} strokeWidth={1.5} name="File A" />
              <Line type="monotone" dataKey="fileB" stroke="hsl(var(--changed))" dot={false} strokeWidth={1.5} name="File B" />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* ── Charts row 2: Distributions ───────────────────────── */}
      <div className="grid gap-4 lg:grid-cols-3">
        <ChartCard title="Distribution — File A" subtitle={`${effectiveColA}`}>
          <HistChart data={histA} color="hsl(var(--info))" />
        </ChartCard>
        <ChartCard title="Distribution — File B" subtitle={`${effectiveColA}`}>
          <HistChart data={histB} color="hsl(var(--changed))" />
        </ChartCard>
        <ChartCard title="Distribution of Δ (B − A)" subtitle="Centred at 0 = no drift">
          <HistChart data={histDiff} color="hsl(var(--success))" refLine={0} />
        </ChartCard>
      </div>

      {/* ── Top movers ────────────────────────────────────────── */}
      <div className="rounded-lg border bg-card">
        <div className="border-b px-4 py-3">
          <span className="text-sm font-semibold">Top 15 Movers — {effectiveColA}</span>
          <span className="ml-2 text-xs text-muted-foreground">by absolute Δ</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b text-muted-foreground">
                <th className="px-4 py-2 text-left font-medium">#</th>
                <th className="px-4 py-2 text-left font-medium">Key</th>
                <th className="px-4 py-2 text-right font-medium">File A</th>
                <th className="px-4 py-2 text-right font-medium">File B</th>
                <th className="px-4 py-2 text-right font-medium">Δ</th>
                <th className="px-4 py-2 text-right font-medium">Δ%</th>
                <th className="px-4 py-2 text-left font-medium">Bar</th>
              </tr>
            </thead>
            <tbody>
              {topMovers.map((d, i) => {
                const maxAbs = Math.max(...topMovers.map((m) => Math.abs(m.diff)));
                const barW = maxAbs > 0 ? Math.abs(d.diff) / maxAbs * 100 : 0;
                const isPos = d.diff > 0;
                return (
                  <tr key={d.key} className="border-b last:border-0 hover:bg-muted/20">
                    <td className="px-4 py-2 text-muted-foreground">{i + 1}</td>
                    <td className="px-4 py-2 font-mono font-medium text-foreground">{d.key}</td>
                    <td className="px-4 py-2 text-right font-mono tabular-nums text-muted-foreground">{fmt(d.fileA, 6)}</td>
                    <td className="px-4 py-2 text-right font-mono tabular-nums text-foreground">{fmt(d.fileB, 6)}</td>
                    <td className={cn('px-4 py-2 text-right font-mono tabular-nums font-semibold',
                      isPos ? 'text-success' : 'text-destructive'
                    )}>
                      {isPos ? '+' : ''}{fmt(d.diff, 6)}
                    </td>
                    <td className={cn('px-4 py-2 text-right font-mono tabular-nums',
                      isPos ? 'text-success' : 'text-destructive'
                    )}>
                      {pct(d.pctDiff)}
                    </td>
                    <td className="px-4 py-2 w-32">
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className={cn('h-full rounded-full', isPos ? 'bg-success' : 'bg-destructive')}
                          style={{ width: `${barW}%` }}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Diff bar chart ────────────────────────────────────── */}
      <ChartCard
        title={`Δ per instrument — ${effectiveColA}`}
        subtitle="Sorted by magnitude. Green = B > A, Red = B < A."
      >
        <ResponsiveContainer width="100%" height={260}>
          <BarChart
            data={[...pairedData].sort((a, b) => b.diff - a.diff).slice(0, 50)}
            margin={{ top: 10, right: 10, bottom: 30, left: 10 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis dataKey="key" tick={false}
              label={{ value: `Top 50 instruments by Δ`, position: 'insideBottom', offset: -10, fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
            <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => fmt(v, 2)} />
            <ReferenceLine y={0} stroke="hsl(var(--border))" strokeWidth={1.5} />
            <Tooltip
              content={({ payload }) => {
                const d = payload?.[0]?.payload;
                if (!d) return null;
                return (
                  <div className="rounded border bg-popover px-3 py-2 text-xs shadow-lg">
                    <p className="font-mono font-semibold">{d.key}</p>
                    <p>Δ: <span className={cn('font-mono font-semibold', d.diff > 0 ? 'text-success' : 'text-destructive')}>{fmt(d.diff, 6)}</span></p>
                    <p>Δ%: {pct(d.pctDiff)}</p>
                  </div>
                );
              }}
            />
            <Bar dataKey="diff" radius={[2, 2, 0, 0]}>
              {[...pairedData].sort((a, b) => b.diff - a.diff).slice(0, 50).map((d, i) => (
                <Cell key={i} fill={d.diff >= 0 ? 'hsl(var(--success))' : 'hsl(var(--destructive))'} fillOpacity={0.8} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
}

// ── sub-components ─────────────────────────────────────────────────────────

function KpiCard({ label, value, tone }: { label: string; value: string; tone?: 'up' | 'down' | 'flat' }) {
  const Icon = tone === 'up' ? TrendingUp : tone === 'down' ? TrendingDown : Minus;
  const color = tone === 'up' ? 'text-success' : tone === 'down' ? 'text-destructive' : 'text-muted-foreground';
  return (
    <div className="rounded-lg border bg-card p-3">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{label}</span>
        {tone && <Icon className={cn('h-3.5 w-3.5', color)} />}
      </div>
      <p className={cn('mt-1 font-mono text-lg font-bold tabular-nums', tone ? color : 'text-foreground')}>
        {value}
      </p>
    </div>
  );
}

function ChartCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <p className="text-sm font-semibold text-foreground">{title}</p>
      {subtitle && <p className="mb-3 text-xs text-muted-foreground">{subtitle}</p>}
      {children}
    </div>
  );
}

function HistChart({ data, color, refLine }: { data: { bin: number; count: number }[]; color: string; refLine?: number }) {
  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
        <XAxis dataKey="bin" tick={{ fontSize: 9 }} tickFormatter={(v) => fmt(v, 1)} />
        <YAxis tick={{ fontSize: 9 }} />
        {refLine !== undefined && <ReferenceLine x={refLine} stroke="hsl(var(--muted-foreground))" strokeDasharray="4 4" />}
        <Tooltip
          content={({ payload }) => {
            const d = payload?.[0];
            if (!d) return null;
            return (
              <div className="rounded border bg-popover px-2 py-1 text-xs shadow">
                <p>~{fmt(d.payload.bin, 3)}: <span className="font-semibold">{d.payload.count}</span></p>
              </div>
            );
          }}
        />
        <Bar dataKey="count" fill={color} fillOpacity={0.75} radius={[2, 2, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
