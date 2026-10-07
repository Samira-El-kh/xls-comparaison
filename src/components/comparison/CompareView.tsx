import { useStore } from '@/store/useStore';
import { SummaryCards } from '@/components/summary/SummaryCards';
import { FilterBar } from '@/components/filters/FilterBar';
import { DiffTable } from '@/components/diff-table/DiffTable';
import { MetadataComparison } from '@/components/metadata/MetadataComparison';
import { ColumnChanges } from '@/components/metadata/ColumnChanges';
import { ConfigPanel } from '@/components/comparison/ConfigPanel';
import { CheckCircle2 } from 'lucide-react';

export function CompareView() {
  const result = useStore((s) => s.result);
  const config = useStore((s) => s.config);

  // If no result yet, show config panel
  if (!result || !config) {
    return <ConfigPanel />;
  }

  const hasChanges = result.summary.changed + result.summary.added + result.summary.removed > 0;

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      {/* Summary */}
      <div className="mb-6">
        <h2 className="mb-3 text-sm font-semibold text-muted-foreground">Comparison Summary</h2>
        <SummaryCards />
      </div>

      {/* Metadata & Column Changes */}
      {(result.metadataEntries.length > 0 ||
        result.columnChanges.added.length > 0 ||
        result.columnChanges.removed.length > 0) && (
        <div className="mb-6 space-y-4">
          <MetadataComparison />
          <ColumnChanges />
        </div>
      )}

      {/* Filters */}
      <div className="mb-4">
        <FilterBar />
      </div>

      {/* Table */}
      {hasChanges ? (
        <DiffTable />
      ) : (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
          <CheckCircle2 className="mb-3 h-10 w-10 text-success" />
          <p className="text-sm font-semibold text-foreground">No differences found</p>
          <p className="mt-1 text-xs text-muted-foreground">
            The selected datasets are identical according to your comparison settings.
          </p>
        </div>
      )}
    </div>
  );
}
