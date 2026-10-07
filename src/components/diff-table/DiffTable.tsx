import { useMemo, useState, useCallback } from 'react';
import {
  ChevronRight,
  ChevronDown,
  ArrowUp,
  ArrowDown,
  Plus,
  Minus,
  Equal,
  Search as SearchIcon,
} from 'lucide-react';
import { useStore } from '@/store/useStore';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { formatNumber, formatDiff, formatPercentage, isNumeric, toNumber } from '@/features/diff/numericDiff';
import type { CellValue, RowDiff, FieldDiff } from '@/types';

const PAGE_SIZE = 50;

export function DiffTable() {
  const result = useStore((s) => s.result);
  const searchQuery = useStore((s) => s.searchQuery);
  const statusFilter = useStore((s) => s.statusFilter);
  const fieldFilter = useStore((s) => s.fieldFilter);
  const showAllFields = useStore((s) => s.showAllFields);
  const expandedRowKeys = useStore((s) => s.expandedRowKeys);
  const toggleRowExpansion = useStore((s) => s.toggleRowExpansion);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const filteredRows = useMemo(() => {
    if (!result) return [];
    let rows = result.rows;

    // Status filter
    rows = rows.filter((r) => {
      if (r.status === 'CHANGED') return statusFilter.changed;
      if (r.status === 'ADDED') return statusFilter.added;
      if (r.status === 'REMOVED') return statusFilter.removed;
      if (r.status === 'UNCHANGED') return statusFilter.unchanged;
      return false;
    });

    // Field filter — show only rows where this field changed
    if (fieldFilter !== 'all') {
      rows = rows.filter((r) =>
        r.fields.some((f) => f.field === fieldFilter && f.status === 'CHANGED')
      );
    }

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      rows = rows.filter((r) => {
        if (r.key.toLowerCase().includes(q)) return true;
        for (const f of r.fields) {
          if (f.field.toLowerCase().includes(q)) return true;
          if (String(f.oldValue ?? '').toLowerCase().includes(q)) return true;
          if (String(f.newValue ?? '').toLowerCase().includes(q)) return true;
        }
        return false;
      });
    }

    return rows;
  }, [result, statusFilter, fieldFilter, searchQuery]);

  const visibleRows = filteredRows.slice(0, visibleCount);

  const handleLoadMore = useCallback(() => {
    setVisibleCount((c) => c + PAGE_SIZE);
  }, []);

  if (!result) return null;

  if (filteredRows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
        <SearchIcon className="mb-3 h-8 w-8 text-muted-foreground" />
        <p className="text-sm font-medium text-foreground">No rows match your filters</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {result.rows.length === 0
            ? 'The selected datasets are identical according to your comparison settings.'
            : 'Try adjusting the status filters or search query.'}
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border">
      {/* Header */}
      <div className="flex items-center gap-3 border-b bg-muted/30 px-4 py-2.5">
        <span className="text-xs font-semibold text-muted-foreground">STATUS</span>
        <span className="flex-1 text-xs font-semibold text-muted-foreground">KEY</span>
        <span className="text-right text-xs font-semibold text-muted-foreground">CHANGED FIELDS</span>
      </div>

      {/* Rows */}
      <div className="divide-y">
        {visibleRows.map((row) => (
          <DiffRow
            key={row.key}
            row={row}
            expanded={expandedRowKeys.has(row.key)}
            onToggle={() => toggleRowExpansion(row.key)}
            showAllFields={showAllFields}
            fieldFilter={fieldFilter}
          />
        ))}
      </div>

      {/* Load more */}
      {visibleCount < filteredRows.length && (
        <div className="border-t p-3 text-center">
          <button
            onClick={handleLoadMore}
            className="text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            Showing {visibleRows.length.toLocaleString()} of {filteredRows.length.toLocaleString()} rows — Load more
          </button>
        </div>
      )}
    </div>
  );
}

function DiffRow({
  row,
  expanded,
  onToggle,
  showAllFields,
  fieldFilter,
}: {
  row: RowDiff;
  expanded: boolean;
  onToggle: () => void;
  showAllFields: boolean;
  fieldFilter: string;
}) {
  return (
    <div className="animate-fade-in">
      <button
        onClick={onToggle}
        className={cn(
          'flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-muted/30',
          expanded && 'bg-muted/20'
        )}
      >
        {expanded ? (
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
        )}
        <StatusBadge status={row.status} />
        <span className="flex-1 truncate font-mono text-sm font-medium text-foreground">
          {row.key}
        </span>
        {row.status === 'CHANGED' && (
          <span className="text-xs text-muted-foreground">
            {row.changedFieldCount} field{row.changedFieldCount !== 1 ? 's' : ''}
          </span>
        )}
        {row.status === 'ADDED' && (
          <span className="text-xs text-added">new</span>
        )}
        {row.status === 'REMOVED' && (
          <span className="text-xs text-removed">deleted</span>
        )}
      </button>

      {expanded && (
        <div className="border-t bg-muted/10 px-4 py-3">
          <ExpandedRowContent
            row={row}
            showAllFields={showAllFields}
            fieldFilter={fieldFilter}
          />
        </div>
      )}
    </div>
  );
}

function ExpandedRowContent({
  row,
  showAllFields,
  fieldFilter,
}: {
  row: RowDiff;
  showAllFields: boolean;
  fieldFilter: string;
}) {
  let fields = row.fields;

  if (!showAllFields) {
    fields = fields.filter((f) => f.status !== 'UNCHANGED');
  }

  if (fieldFilter !== 'all') {
    fields = fields.filter((f) => f.field === fieldFilter);
  }

  if (fields.length === 0) {
    return (
      <p className="py-4 text-center text-xs text-muted-foreground">
        No fields to display with current filters.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto scrollbar-thin">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-xs text-muted-foreground">
            <th className="py-2 pr-4 text-left font-medium">FIELD</th>
            <th className="px-4 py-2 text-right font-medium">OLD</th>
            <th className="px-4 py-2 text-right font-medium">NEW</th>
            <th className="py-2 pl-4 text-left font-medium">CHANGE</th>
          </tr>
        </thead>
        <tbody>
          {fields.map((field) => (
            <FieldRow key={field.field} field={field} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function FieldRow({ field }: { field: FieldDiff }) {
  const oldNum = toNumber(field.oldValue);
  const newNum = toNumber(field.newValue);
  const bothNumeric = oldNum !== null && newNum !== null;

  const isChanged = field.status === 'CHANGED';
  const isAdded = field.status === 'ADDED';
  const isRemoved = field.status === 'REMOVED';

  return (
    <tr
      className={cn(
        'border-b last:border-0',
        isChanged && 'bg-changed/[0.03]',
        isAdded && 'bg-added/[0.03]',
        isRemoved && 'bg-removed/[0.03]'
      )}
    >
      <td className="py-2 pr-4">
        <span className="text-xs font-medium text-foreground">{field.field}</span>
      </td>
      <td className="px-4 py-2 text-right">
        <ValueCell value={field.oldValue} struck={isAdded || isRemoved} muted={isAdded} />
      </td>
      <td className="px-4 py-2 text-right">
        <ValueCell value={field.newValue} struck={isRemoved} muted={isRemoved} />
      </td>
      <td className="py-2 pl-4">
        {field.status === 'UNCHANGED' ? (
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <Equal className="h-3 w-3" />
          </span>
        ) : field.status === 'ADDED' ? (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-added">
            <Plus className="h-3 w-3" />
            <span>Added</span>
          </span>
        ) : field.status === 'REMOVED' ? (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-removed">
            <Minus className="h-3 w-3" />
            <span>Removed</span>
          </span>
        ) : bothNumeric && field.numericDiff ? (
          <NumericChange
            absolute={field.numericDiff.absolute}
            percentage={field.numericDiff.percentage}
          />
        ) : (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-changed">
            <ArrowUp className="h-3 w-3" />
            <span className="font-mono">
              {formatValue(field.oldValue)} → {formatValue(field.newValue)}
            </span>
          </span>
        )}
      </td>
    </tr>
  );
}

function NumericChange({
  absolute,
  percentage,
}: {
  absolute: number;
  percentage: number | null;
}) {
  const isPositive = absolute > 0;
  const isNegative = absolute < 0;
  const color = isPositive ? 'text-success' : isNegative ? 'text-destructive' : 'text-muted-foreground';

  return (
    <div className="flex flex-col gap-0.5">
      <span className={cn('inline-flex items-center gap-1 font-mono text-xs font-semibold tabular-nums', color)}>
        {isPositive ? <ArrowUp className="h-3 w-3" /> : isNegative ? <ArrowDown className="h-3 w-3" /> : <Equal className="h-3 w-3" />}
        {formatDiff(absolute)}
      </span>
      {percentage !== null && (
        <span className={cn('font-mono text-xs tabular-nums', color)}>
          {formatPercentage(percentage)}
        </span>
      )}
    </div>
  );
}

function ValueCell({
  value,
  struck,
  muted,
}: {
  value: CellValue;
  struck?: boolean;
  muted?: boolean;
}) {
  return (
    <span
      className={cn(
        'font-mono text-xs tabular-nums',
        muted && 'text-muted-foreground',
        struck && 'line-through opacity-50'
      )}
    >
      {formatValue(value)}
    </span>
  );
}

function formatValue(value: CellValue): string {
  if (value === null || value === undefined) return '—';
  if (value instanceof Date) return value.toLocaleDateString();
  if (typeof value === 'number') return formatNumber(value);
  if (typeof value === 'boolean') return String(value);
  return String(value);
}

function StatusBadge({ status }: { status: RowDiff['status'] }) {
  const config = {
    CHANGED: { label: 'Changed', className: 'border-changed/30 bg-changed/10 text-changed' },
    ADDED: { label: 'Added', className: 'border-added/30 bg-added/10 text-added' },
    REMOVED: { label: 'Removed', className: 'border-removed/30 bg-removed/10 text-removed' },
    UNCHANGED: { label: 'Unchanged', className: 'border-border bg-muted text-muted-foreground' },
  };
  const c = config[status];
  return (
    <Badge variant="outline" className={cn('shrink-0 text-xs', c.className)}>
      {c.label}
    </Badge>
  );
}
