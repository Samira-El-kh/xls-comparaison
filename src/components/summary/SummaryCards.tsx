import { TrendingUp, TrendingDown, Plus, Minus, Equal, BarChart3 } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { cn } from '@/lib/utils';

export function SummaryCards() {
  const result = useStore((s) => s.result);
  if (!result) return null;

  const { summary } = result;

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
      <SummaryCard
        label="Total Matched"
        value={summary.totalMatched}
        icon={<BarChart3 className="h-4 w-4" />}
        tone="neutral"
      />
      <SummaryCard
        label="Changed"
        value={summary.changed}
        icon={<TrendingUp className="h-4 w-4" />}
        tone="changed"
      />
      <SummaryCard
        label="Added"
        value={summary.added}
        icon={<Plus className="h-4 w-4" />}
        tone="added"
      />
      <SummaryCard
        label="Removed"
        value={summary.removed}
        icon={<Minus className="h-4 w-4" />}
        tone="removed"
      />
      <SummaryCard
        label="Unchanged"
        value={summary.unchanged}
        icon={<Equal className="h-4 w-4" />}
        tone="neutral"
      />
    </div>
  );
}

function SummaryCard({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  tone: 'neutral' | 'changed' | 'added' | 'removed';
}) {
  const toneClasses = {
    neutral: 'text-foreground',
    changed: 'text-changed',
    added: 'text-added',
    removed: 'text-removed',
  };

  const bgClasses = {
    neutral: 'bg-muted/50',
    changed: 'bg-changed/5 border-changed/20',
    added: 'bg-added/5 border-added/20',
    removed: 'bg-removed/5 border-removed/20',
  };

  return (
    <div className={cn('rounded-lg border p-4', bgClasses[tone])}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <span className={cn('opacity-60', toneClasses[tone])}>{icon}</span>
      </div>
      <p className={cn('mt-2 font-mono text-2xl font-bold tabular-nums', toneClasses[tone])}>
        {value.toLocaleString()}
      </p>
    </div>
  );
}
