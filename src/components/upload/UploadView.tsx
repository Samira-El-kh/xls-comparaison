import { useEffect, useRef, useState } from 'react';
import {
  FileSpreadsheet, Lock, ArrowRight, ArrowLeftRight,
  History, Clock, GitCompare, ShieldCheck,
  BarChart3, Download, CheckCircle2,
} from 'lucide-react';
import { FileUploadCard } from './FileUploadCard';
import { useStore } from '@/store/useStore';
import { Button } from '@/components/ui/button';
import type { SessionEntry } from '@/store/useStore';

export function UploadView() {
  const workbookA = useStore((s) => s.workbookA);
  const workbookB = useStore((s) => s.workbookB);
  const setView = useStore((s) => s.setView);
  const sessionHistory = useStore((s) => s.sessionHistory);
  const bothLoaded = workbookA && workbookB;

  return (
    <div className="min-h-screen">
      {/* ── Hero ─────────────────────────────────────────────── */}
      <div className="relative overflow-hidden border-b bg-gradient-to-br from-background via-background to-muted/40">
        <GridPattern />
        <div className="relative mx-auto max-w-5xl px-6 pb-12 pt-16">
          <div className="mb-8 text-center">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border bg-muted/60 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur">
              <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
              100% browser-based · no uploads · no servers
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl">
              Excel Diff
              <span className="ml-3 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                for Finance
              </span>
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-base text-muted-foreground">
              Compare two Excel files row-by-row with full numeric precision, date-format awareness, and one-click export — built for financial data teams.
            </p>
          </div>

          {/* Upload zone */}
          <div className="flex items-stretch gap-4">
            <div className="flex-1">
              <FileUploadCard label="Original File" variant="A" />
            </div>
            <div className="flex items-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-border bg-background shadow-sm">
                <ArrowLeftRight className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>
            <div className="flex-1">
              <FileUploadCard label="New File" variant="B" />
            </div>
          </div>

          {/* CTA */}
          <div className="mt-8 flex flex-col items-center gap-3">
            {bothLoaded && (
              <Button size="lg" className="animate-slide-up gap-2 shadow-lg" onClick={() => setView('compare')}>
                Configure & Run Comparison
                <ArrowRight className="h-4 w-4" />
              </Button>
            )}
            {workbookA && !workbookB && <UploadHint>Upload the new file to continue</UploadHint>}
            {!workbookA && workbookB && <UploadHint>Upload the original file to continue</UploadHint>}
            {!workbookA && !workbookB && (
              <div className="flex items-center gap-2 rounded-lg border bg-muted/30 px-4 py-2 text-xs text-muted-foreground">
                <Lock className="h-3.5 w-3.5 text-success" />
                Your files never leave your browser
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Feature strip ────────────────────────────────────── */}
      <div className="border-b bg-muted/20">
        <div className="mx-auto grid max-w-5xl grid-cols-2 divide-x divide-y md:grid-cols-4 md:divide-y-0">
          {FEATURES.map((f) => (
            <FeatureTile key={f.label} icon={f.icon} label={f.label} desc={f.desc} />
          ))}
        </div>
      </div>

      {/* ── Session history ───────────────────────────────────── */}
      {sessionHistory.length > 0 && (
        <div className="mx-auto max-w-5xl px-6 py-10">
          <div className="mb-4 flex items-center gap-2">
            <History className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold text-foreground">Recent Comparisons</h2>
          </div>
          <div className="space-y-2">
            {sessionHistory.map((entry) => (
              <SessionCard key={entry.id} entry={entry} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function UploadHint({ children }: { children: React.ReactNode }) {
  return (
    <p className="animate-fade-in text-sm text-muted-foreground">{children}</p>
  );
}

const FEATURES = [
  { icon: <GitCompare className="h-5 w-5" />, label: 'Row-by-row diff', desc: 'Match on any key column' },
  { icon: <BarChart3 className="h-5 w-5" />, label: 'Numeric precision', desc: 'Exact, display or tolerance' },
  { icon: <ShieldCheck className="h-5 w-5" />, label: 'Date-format aware', desc: 'Same date, different format' },
  { icon: <Download className="h-5 w-5" />, label: 'Export ready', desc: 'Excel & PDF reports' },
];

function FeatureTile({ icon, label, desc }: { icon: React.ReactNode; label: string; desc: string }) {
  return (
    <div className="flex items-start gap-3 px-6 py-5">
      <span className="mt-0.5 shrink-0 text-primary opacity-70">{icon}</span>
      <div>
        <p className="text-sm font-semibold text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
    </div>
  );
}

function SessionCard({ entry }: { entry: SessionEntry }) {
  const total = entry.summary.changed + entry.summary.added + entry.summary.removed;
  return (
    <div className="group flex items-center justify-between rounded-lg border bg-card px-4 py-3 transition-colors hover:border-primary/30 hover:bg-muted/30">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted">
          <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground">
            <span className="text-info">{entry.fileNameA}</span>
            <span className="mx-1.5 text-muted-foreground">vs</span>
            <span className="text-success">{entry.fileNameB}</span>
          </p>
          <div className="mt-0.5 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {new Date(entry.timestamp).toLocaleString()}
            </span>
            <span className="font-mono">key: {entry.keyColumn}</span>
          </div>
        </div>
      </div>
      <div className="ml-4 flex shrink-0 items-center gap-2 text-xs">
        {total === 0 ? (
          <span className="flex items-center gap-1 text-success">
            <CheckCircle2 className="h-3.5 w-3.5" /> Identical
          </span>
        ) : (
          <>
            {entry.summary.changed > 0 && (
              <span className="rounded-full bg-changed/10 px-2 py-0.5 font-mono font-semibold text-changed">
                {entry.summary.changed} changed
              </span>
            )}
            {entry.summary.added > 0 && (
              <span className="rounded-full bg-added/10 px-2 py-0.5 font-mono font-semibold text-added">
                +{entry.summary.added}
              </span>
            )}
            {entry.summary.removed > 0 && (
              <span className="rounded-full bg-removed/10 px-2 py-0.5 font-mono font-semibold text-removed">
                -{entry.summary.removed}
              </span>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// Subtle animated grid background
function GridPattern() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 60);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const W = canvas.width = canvas.offsetWidth;
    const H = canvas.height = canvas.offsetHeight;
    ctx.clearRect(0, 0, W, H);

    const isDark = document.documentElement.classList.contains('dark');
    const lineColor = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)';
    const dotColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
    const GRID = 40;

    ctx.strokeStyle = lineColor;
    ctx.lineWidth = 1;
    for (let x = 0; x < W; x += GRID) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
    }
    for (let y = 0; y < H; y += GRID) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }

    // Animated travelling dot
    const t = (tick * 2) % (W + H);
    const dotX = t < W ? t : W;
    const dotY = t < W ? 0 : t - W;
    ctx.fillStyle = dotColor;
    ctx.beginPath();
    ctx.arc(Math.round(dotX / GRID) * GRID, Math.round(dotY / GRID) * GRID, 3, 0, Math.PI * 2);
    ctx.fill();
  }, [tick]);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 h-full w-full"
      aria-hidden
    />
  );
}
