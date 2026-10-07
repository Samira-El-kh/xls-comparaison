import { useState, useMemo } from 'react';
import { BarChart3, ChevronRight, ArrowUp, ArrowDown } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { cn } from '@/lib/utils';
import { formatNumber, formatDiff, formatPercentage, isNumeric } from '@/features/diff/numericDiff';
import type { CellValue } from '@/types';

export function FieldChangesView() {
  const fieldChangeSummaries = useStore((s) => s.fieldChangeSummaries);
  const [selectedField, setSelectedField] = useState<string | null>(null);

  const selectedSummary = useMemo(
    () => fieldChangeSummaries.find((f) => f.field === selectedField),
    [fieldChangeSummaries, selectedField]
  );

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <div className="mb-6 flex items-center gap-3">
        <BarChart3 className="h-5 w-5 text-foreground" />
        <h2 className="text-lg font-semibold text-foreground">Field Changes</h2>
        <span className="text-sm text-muted-foreground">
          — changes grouped by field
        </span>
      </div>

      {fieldChangeSummaries.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
          <p className="text-sm font-medium text-foreground">No field changes detected</p>
          <p className="mt-1 text-xs text-muted-foreground">
            The datasets are identical according to your comparison settings.
          </p>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
          {/* Field list */}
          <div className="space-y-1">
            {fieldChangeSummaries.map((summary) => (
              <button
                key={summary.field}
                onClick={() => setSelectedField(summary.field)}
                className={cn(
                  'flex w-full items-center justify-between rounded-md border px-3 py-2.5 text-left transition-colors',
                  selectedField === summary.field
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:bg-muted/50'
                )}
              >
                <span className="truncate text-sm font-medium text-foreground">
                  {summary.field}
                </span>
                <span className="ml-2 flex shrink-0 items-center gap-2">
                  <span className="font-mono text-xs font-semibold text-changed">
                    {summary.changeCount}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {summary.changeCount === 1 ? 'change' : 'changes'}
                  </span>
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                </span>
              </button>
            ))}
          </div>

          {/* Detail view */}
          <div className="rounded-lg border bg-card p-5">
            {selectedSummary ? (
              <FieldDetail summary={selectedSummary} />
            ) : (
              <div className="flex h-full min-h-[200px] flex-col items-center justify-center text-center text-muted-foreground">
                <BarChart3 className="mb-2 h-8 w-8 opacity-40" />
                <p className="text-sm">Select a field to see its changes</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function FieldDetail({
  summary,
}: {
  summary: { field: string; changeCount: number; changes: { key: string; oldValue: CellValue; newValue: CellValue; absolute: number; percentage: number | null }[] };
}) {
  const hasNumeric = summary.changes.some((c) => isNumeric(c.oldValue) && isNumeric(c.newValue));

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">{summary.field}</h3>
        <span className="font-mono text-xs text-muted-foreground">
          {summary.changeCount} {summary.changeCount === 1 ? 'change' : 'changes'}
        </span>
      </div>

      <div className="overflow-x-auto scrollbar-thin">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-xs text-muted-foreground">
              <th className="py-2 pr-4 text-left font-medium">KEY</th>
              <th className="px-4 py-2 text-right font-medium">OLD</th>
              <th className="px-4 py-2 text-right font-medium">NEW</th>
              {hasNumeric && <th className="px-4 py-2 text-right font-medium">Δ</th>}
              {hasNumeric && <th className="py-2 pl-4 text-right font-medium">Δ%</th>}
            </tr>
          </thead>
          <tbody>
            {summary.changes.map((change) => {
              const isPositive = change.absolute > 0;
              const isNegative = change.absolute < 0;
              const color = isPositive ? 'text-success' : isNegative ? 'text-destructive' : 'text-muted-foreground';
              return (
                <tr key={change.key} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="py-2 pr-4 font-mono text-xs font-medium text-foreground">
                    {change.key}
                  </td>
                  <td className="px-4 py-2 text-right font-mono text-xs tabular-nums text-muted-foreground">
                    {formatValue(change.oldValue)}
                  </td>
                  <td className="px-4 py-2 text-right font-mono text-xs tabular-nums text-foreground">
                    {formatValue(change.newValue)}
                  </td>
                  {hasNumeric && (
                    <td className={cn('px-4 py-2 text-right font-mono text-xs font-semibold tabular-nums', color)}>
                      {isNumeric(change.oldValue) && isNumeric(change.newValue) ? (
                        <span className="inline-flex items-center gap-1">
                          {isPositive ? <ArrowUp className="h-3 w-3" /> : isNegative ? <ArrowDown className="h-3 w-3" /> : null}
                          {formatDiff(change.absolute)}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                  )}
                  {hasNumeric && (
                    <td className={cn('py-2 pl-4 text-right font-mono text-xs tabular-nums', color)}>
                      {change.percentage !== null ? formatPercentage(change.percentage) : '—'}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function formatValue(value: CellValue): string {
  if (value === null || value === undefined) return '—';
  if (value instanceof Date) return value.toLocaleDateString();
  if (typeof value === 'number') return formatNumber(value);
  if (typeof value === 'boolean') return String(value);
  return String(value);
}
