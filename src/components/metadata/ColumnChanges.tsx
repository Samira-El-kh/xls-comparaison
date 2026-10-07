import { Columns3, Plus, Minus } from 'lucide-react';
import { useStore } from '@/store/useStore';

export function ColumnChanges() {
  const result = useStore((s) => s.result);
  if (!result) return null;

  const { added, removed } = result.columnChanges;
  if (added.length === 0 && removed.length === 0) return null;

  return (
    <div className="rounded-lg border bg-card p-5">
      <div className="mb-4 flex items-center gap-2">
        <Columns3 className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold text-foreground">Column Changes</h3>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {added.length > 0 && (
          <div>
            <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-added">
              <Plus className="h-3.5 w-3.5" />
              <span>Added in File B</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {added.map((col) => (
                <span
                  key={col}
                  className="inline-flex items-center gap-1 rounded border border-added/30 bg-added/5 px-2 py-0.5 font-mono text-xs text-added"
                >
                  {col}
                </span>
              ))}
            </div>
          </div>
        )}

        {removed.length > 0 && (
          <div>
            <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-removed">
              <Minus className="h-3.5 w-3.5" />
              <span>Removed from File B</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {removed.map((col) => (
                <span
                  key={col}
                  className="inline-flex items-center gap-1 rounded border border-removed/30 bg-removed/5 px-2 py-0.5 font-mono text-xs text-removed"
                >
                  {col}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
