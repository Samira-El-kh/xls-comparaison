import { CheckCircle2, AlertTriangle, AlertOctagon, KeyRound } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { cn } from '@/lib/utils';

export function DataQualityPanel() {
  const result = useStore((s) => s.result);
  const config = useStore((s) => s.config);
  if (!result || !config) return null;

  const { validation } = result;
  const issues: { message: string; severity: 'error' | 'warning' }[] = [];
  const checks: { message: string }[] = [];

  if (validation.duplicateKeysA.length > 0) {
    issues.push({
      message: `${validation.duplicateKeysA.length} duplicate key(s) in File A`,
      severity: 'warning',
    });
  }
  if (validation.duplicateKeysB.length > 0) {
    issues.push({
      message: `${validation.duplicateKeysB.length} duplicate key(s) in File B`,
      severity: 'warning',
    });
  }
  if (validation.emptyKeysA > 0 || validation.emptyKeysB > 0) {
    issues.push({
      message: `${validation.emptyKeysA + validation.emptyKeysB} empty identifier(s)`,
      severity: 'warning',
    });
  }
  if (validation.keysOnlyInA > 0 || validation.keysOnlyInB > 0) {
    issues.push({
      message: `${validation.keysOnlyInA + validation.keysOnlyInB} unmatched row(s)`,
      severity: 'warning',
    });
  }

  if (!validation.hasDuplicates) {
    checks.push({ message: 'No duplicate keys' });
  }
  if (!validation.hasEmptyKeys) {
    checks.push({ message: 'No empty identifiers' });
  }
  checks.push({
    message: `${validation.uniqueMatched.toLocaleString()} unique rows matched`,
  });

  return (
    <div className="rounded-lg border bg-card p-5">
      <div className="mb-4 flex items-center gap-2">
        <KeyRound className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold text-foreground">Data Quality</h3>
      </div>

      <div className="mb-3 flex items-center gap-2 rounded-md bg-muted/50 px-3 py-2">
        <span className="text-xs text-muted-foreground">Matching key:</span>
        <span className="font-mono text-xs font-semibold text-foreground">{config.keyColumn}</span>
      </div>

      <div className="space-y-2">
        {issues.map((issue, i) => (
          <div
            key={i}
            className={cn(
              'flex items-center gap-2 text-sm',
              issue.severity === 'error' ? 'text-destructive' : 'text-warning'
            )}
          >
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{issue.message}</span>
          </div>
        ))}

        {checks.map((check, i) => (
          <div key={i} className="flex items-center gap-2 text-sm text-success">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{check.message}</span>
          </div>
        ))}

        {issues.length === 0 && (
          <div className="flex items-center gap-2 rounded-md bg-success/5 px-3 py-2 text-sm text-success">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>100% of rows matched successfully</span>
          </div>
        )}
      </div>

      {/* Duplicate key details */}
      {(validation.duplicateKeysA.length > 0 || validation.duplicateKeysB.length > 0) && (
        <div className="mt-4 space-y-3">
          {validation.duplicateKeysA.length > 0 && (
            <div>
              <p className="mb-1.5 text-xs font-medium text-muted-foreground">
                File A duplicates
              </p>
              <div className="flex flex-wrap gap-1.5">
                {validation.duplicateKeysA.slice(0, 20).map((d) => (
                  <span
                    key={d.key}
                    className="inline-flex items-center gap-1 rounded border border-warning/30 bg-warning/5 px-2 py-0.5 font-mono text-xs text-warning"
                  >
                    {d.key} ×{d.count}
                  </span>
                ))}
                {validation.duplicateKeysA.length > 20 && (
                  <span className="text-xs text-muted-foreground">
                    +{validation.duplicateKeysA.length - 20} more
                  </span>
                )}
              </div>
            </div>
          )}
          {validation.duplicateKeysB.length > 0 && (
            <div>
              <p className="mb-1.5 text-xs font-medium text-muted-foreground">
                File B duplicates
              </p>
              <div className="flex flex-wrap gap-1.5">
                {validation.duplicateKeysB.slice(0, 20).map((d) => (
                  <span
                    key={d.key}
                    className="inline-flex items-center gap-1 rounded border border-warning/30 bg-warning/5 px-2 py-0.5 font-mono text-xs text-warning"
                  >
                    {d.key} ×{d.count}
                  </span>
                ))}
                {validation.duplicateKeysB.length > 20 && (
                  <span className="text-xs text-muted-foreground">
                    +{validation.duplicateKeysB.length - 20} more
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {validation.emptyKeysA + validation.emptyKeysB > 0 && (
        <div className="mt-3 flex items-start gap-2 rounded-md bg-muted/30 p-3 text-xs text-muted-foreground">
          <AlertOctagon className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            Rows with empty keys are skipped during matching. Consider choosing a different key column if many rows are affected.
          </span>
        </div>
      )}
    </div>
  );
}
