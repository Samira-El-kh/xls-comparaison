import { Info, Check, ArrowUp, ArrowDown, Minus } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { isNumeric, formatNumber, computeNumericDiff, formatDiff, formatPercentage } from '@/features/diff/numericDiff';
import { cn } from '@/lib/utils';
import type { CellValue, MetadataEntry } from '@/types';

export function MetadataComparison() {
  const result = useStore((s) => s.result);
  if (!result || result.metadataEntries.length === 0) return null;

  return (
    <div className="rounded-lg border bg-card p-5">
      <div className="mb-4 flex items-center gap-2">
        <Info className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold text-foreground">Index Summary</h3>
        <span className="text-xs text-muted-foreground">— metadata detected before the data table</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-xs text-muted-foreground">
              <th className="py-2 pr-4 text-left font-medium">Field</th>
              <th className="px-4 text-right font-medium">File A</th>
              <th className="px-4 text-right font-medium">File B</th>
              <th className="py-2 pl-4 text-left font-medium">Change</th>
            </tr>
          </thead>
          <tbody>
            {result.metadataEntries.map((entry) => (
              <MetadataRow key={entry.key} entry={entry} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function MetadataRow({ entry }: { entry: MetadataEntry }) {
  const bothNumeric = isNumeric(entry.valueA) && isNumeric(entry.valueB);
  const diff = bothNumeric ? computeNumericDiff(entry.valueA, entry.valueB) : null;
  const isUnchanged = diff !== null ? Math.abs(diff.absolute) < 1e-12 : entry.valueA === entry.valueB;

  return (
    <tr className="border-b last:border-0">
      <td className="py-2 pr-4 font-medium text-foreground">{entry.label}</td>
      <td className="px-4 py-2 text-right font-mono text-xs tabular-nums text-muted-foreground">
        {formatMetadataValue(entry.valueA)}
      </td>
      <td className="px-4 py-2 text-right font-mono text-xs tabular-nums text-foreground">
        {formatMetadataValue(entry.valueB)}
      </td>
      <td className="py-2 pl-4">
        {isUnchanged ? (
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <Check className="h-3.5 w-3.5 text-success" />
            <span>Unchanged</span>
          </span>
        ) : diff !== null ? (
          <div className="flex flex-col gap-0.5">
            <span
              className={cn(
                'inline-flex items-center gap-1 font-mono text-xs font-semibold tabular-nums',
                diff.absolute > 0 ? 'text-success' : 'text-destructive'
              )}
            >
              {diff.absolute > 0 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
              {formatDiff(diff.absolute)}
            </span>
            {diff.percentage !== null && (
              <span
                className={cn(
                  'font-mono text-xs tabular-nums',
                  diff.percentage > 0 ? 'text-success' : 'text-destructive'
                )}
              >
                {formatPercentage(diff.percentage)}
              </span>
            )}
          </div>
        ) : (
          <span className="inline-flex items-center gap-1 text-xs text-changed">
            <Minus className="h-3 w-3" />
            <span className="font-mono">
              {formatMetadataValue(entry.valueA)} → {formatMetadataValue(entry.valueB)}
            </span>
          </span>
        )}
      </td>
    </tr>
  );
}

function formatMetadataValue(value: CellValue): string {
  if (value === null || value === undefined) return '—';
  if (value instanceof Date) return value.toLocaleDateString();
  if (typeof value === 'number') return formatNumber(value);
  return String(value);
}
