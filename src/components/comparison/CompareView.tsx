import { useStore } from '@/store/useStore';
import { SummaryCards } from '@/components/summary/SummaryCards';
import { FilterBar } from '@/components/filters/FilterBar';
import { DiffTable } from '@/components/diff-table/DiffTable';
import { MetadataComparison } from '@/components/metadata/MetadataComparison';
import { ColumnChanges } from '@/components/metadata/ColumnChanges';
import { ConfigPanel } from '@/components/comparison/ConfigPanel';
import { CheckCircle2, Download, FileText, ChevronUp, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { exportDiffToExcel } from '@/features/export/exportExcel';
import { exportDiffToPdf } from '@/features/export/exportPdf';

export function CompareView() {
  const result = useStore((s) => s.result);
  const config = useStore((s) => s.config);
  const workbookA = useStore((s) => s.workbookA);
  const workbookB = useStore((s) => s.workbookB);
  const currentChangedIndex = useStore((s) => s.currentChangedIndex);
  const setCurrentChangedIndex = useStore((s) => s.setCurrentChangedIndex);
  const toggleRowExpansion = useStore((s) => s.toggleRowExpansion);
  const expandedRowKeys = useStore((s) => s.expandedRowKeys);

  if (!result || !config) return <ConfigPanel />;

  const hasChanges = result.summary.changed + result.summary.added + result.summary.removed > 0;
  const changedRows = result.rows.filter((r) => r.status !== 'UNCHANGED');
  const totalChanged = changedRows.length;

  const jumpTo = (idx: number) => {
    const clamped = Math.max(0, Math.min(idx, totalChanged - 1));
    setCurrentChangedIndex(clamped);
    const row = changedRows[clamped];
    if (!row) return;
    if (!expandedRowKeys.has(row.key)) toggleRowExpansion(row.key);
    setTimeout(() => {
      document.getElementById(`diff-row-${row.key}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 50);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      {/* Summary + Export */}
      <div className="mb-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-muted-foreground">Comparison Summary</h2>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportDiffToExcel(result, workbookA?.fileName ?? 'File A', workbookB?.fileName ?? 'File B')}
            >
              <Download className="mr-1.5 h-3.5 w-3.5" />
              Export Excel
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportDiffToPdf(result, workbookA?.fileName ?? 'File A', workbookB?.fileName ?? 'File B')}
            >
              <FileText className="mr-1.5 h-3.5 w-3.5" />
              Export PDF
            </Button>
          </div>
        </div>
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

      {/* Jump to changed — floating nav */}
      {totalChanged > 1 && (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-center gap-1 rounded-xl border bg-card p-2 shadow-lg">
          <span className="text-xs font-mono text-muted-foreground">
            {currentChangedIndex + 1} / {totalChanged}
          </span>
          <button
            onClick={() => jumpTo(currentChangedIndex - 1)}
            disabled={currentChangedIndex === 0}
            className="rounded p-1 hover:bg-muted disabled:opacity-30"
            title="Previous change (Shift+↑)"
          >
            <ChevronUp className="h-4 w-4" />
          </button>
          <button
            onClick={() => jumpTo(currentChangedIndex + 1)}
            disabled={currentChangedIndex >= totalChanged - 1}
            className="rounded p-1 hover:bg-muted disabled:opacity-30"
            title="Next change (Shift+↓)"
          >
            <ChevronDown className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
