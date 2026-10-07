import { useStore } from '@/store/useStore';
import { DataQualityPanel } from '@/components/summary/DataQualityPanel';
import { MetadataComparison } from '@/components/metadata/MetadataComparison';
import { ColumnChanges } from '@/components/metadata/ColumnChanges';

export function QualityView() {
  const result = useStore((s) => s.result);
  if (!result) return null;

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-foreground">Data Quality</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Validation results and potential issues with the matched data.
        </p>
      </div>

      <div className="space-y-4">
        <DataQualityPanel />
        {result.metadataEntries.length > 0 && <MetadataComparison />}
        {(result.columnChanges.added.length > 0 || result.columnChanges.removed.length > 0) && (
          <ColumnChanges />
        )}
      </div>
    </div>
  );
}
