import { Search, Filter, Eye, EyeOff } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useStore } from '@/store/useStore';
import { cn } from '@/lib/utils';

export function FilterBar() {
  const result = useStore((s) => s.result);
  const searchQuery = useStore((s) => s.searchQuery);
  const setSearchQuery = useStore((s) => s.setSearchQuery);
  const statusFilter = useStore((s) => s.statusFilter);
  const setStatusFilter = useStore((s) => s.setStatusFilter);
  const fieldFilter = useStore((s) => s.fieldFilter);
  const setFieldFilter = useStore((s) => s.setFieldFilter);
  const showAllFields = useStore((s) => s.showAllFields);
  const setShowAllFields = useStore((s) => s.setShowAllFields);

  if (!result) return null;

  const allFields = Array.from(
    new Set(result.rows.flatMap((r) => r.fields.map((f) => f.field)))
  ).sort();

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-card p-3">
      {/* Differences only / Show all toggle */}
      <div className="flex items-center gap-1 rounded-md border bg-muted/50 p-0.5">
        <button
          onClick={() => setShowAllFields(false)}
          className={cn(
            'flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-medium transition-colors',
            !showAllFields
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <EyeOff className="h-3.5 w-3.5" />
          Differences only
        </button>
        <button
          onClick={() => setShowAllFields(true)}
          className={cn(
            'flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-medium transition-colors',
            showAllFields
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <Eye className="h-3.5 w-3.5" />
          Show all fields
        </button>
      </div>

      <Separator orientation="vertical" className="h-8" />

      {/* Status filters */}
      <div className="flex items-center gap-3">
        <Filter className="h-3.5 w-3.5 text-muted-foreground" />
        {(['changed', 'added', 'removed', 'unchanged'] as const).map((status) => (
          <div key={status} className="flex items-center gap-1.5">
            <Checkbox
              id={`filter-${status}`}
              checked={statusFilter[status]}
              onCheckedChange={(v) => setStatusFilter({ [status]: v === true })}
            />
            <Label
              htmlFor={`filter-${status}`}
              className="cursor-pointer text-xs font-medium capitalize"
            >
              {status}
            </Label>
          </div>
        ))}
      </div>

      <Separator orientation="vertical" className="h-8" />

      {/* Field filter */}
      <div className="flex items-center gap-2">
        <Label className="text-xs text-muted-foreground">Field:</Label>
        <Select value={fieldFilter} onValueChange={setFieldFilter}>
          <SelectTrigger className="h-8 w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All fields</SelectItem>
            {allFields.map((f) => (
              <SelectItem key={f} value={f}>
                {f}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Search */}
      <div className="relative ml-auto min-w-[200px] flex-1 max-w-xs">
        <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search key, name, field, value..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="h-8 pl-8 text-xs"
        />
      </div>
    </div>
  );
}
