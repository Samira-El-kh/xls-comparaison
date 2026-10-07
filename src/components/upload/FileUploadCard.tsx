import { useCallback, useRef, useState } from 'react';
import { FileSpreadsheet, X, Upload, FileCheck2, AlertCircle, Layers, Table2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useStore } from '@/store/useStore';
import { parseExcelFile } from '@/features/workbook/parser';
import type { ParsedWorkbook } from '@/types';

interface FileUploadCardProps {
  label: string;
  variant: 'A' | 'B';
}

export function FileUploadCard({ label, variant }: FileUploadCardProps) {
  const workbook = useStore((s) => (variant === 'A' ? s.workbookA : s.workbookB));
  const error = useStore((s) => (variant === 'A' ? s.fileAError : s.fileBError));
  const setWorkbook = useStore((s) => (variant === 'A' ? s.setWorkbookA : s.setWorkbookB));
  const [isDragging, setIsDragging] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    async (file: File) => {
      const validExtensions = ['.xls', '.xlsx', '.xlsm', '.xlsb'];
      const ext = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
      if (!validExtensions.includes(ext)) {
        setWorkbook(null, 'This file does not appear to be an Excel workbook. Supported formats: .xls, .xlsx');
        return;
      }

      setIsParsing(true);
      const result = await parseExcelFile(file);
      setIsParsing(false);

      if (result.error) {
        setWorkbook(result.workbook, result.error);
      } else if (result.workbook.sheets.length === 0) {
        setWorkbook(result.workbook, 'No worksheets were found in this file.');
      } else {
        setWorkbook(result.workbook, null);
      }
    },
    [setWorkbook]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleRemove = useCallback(() => {
    setWorkbook(null, null);
    if (inputRef.current) inputRef.current.value = '';
  }, [setWorkbook]);

  return (
    <div className="flex flex-col">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'inline-flex h-6 items-center rounded px-2 text-xs font-semibold',
              variant === 'A'
                ? 'bg-info/10 text-info'
                : 'bg-success/10 text-success'
            )}
          >
            {variant === 'A' ? 'FILE A' : 'FILE B'}
          </span>
          <span className="text-sm font-medium text-foreground">{label}</span>
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept=".xls,.xlsx,.xlsm,.xlsb"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />

      {!workbook && !error && (
        <div
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={cn(
            'group relative flex min-h-[200px] cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 text-center transition-all',
            isDragging
              ? 'border-primary bg-primary/5 scale-[1.01]'
              : 'border-border hover:border-primary/40 hover:bg-muted/50'
          )}
        >
          {isParsing ? (
            <>
              <div className="mb-3 h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <p className="text-sm text-muted-foreground">Parsing workbook...</p>
            </>
          ) : (
            <>
              <div
                className={cn(
                  'mb-3 flex h-12 w-12 items-center justify-center rounded-lg transition-colors',
                  isDragging
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary'
                )}
              >
                <Upload className="h-5 w-5" />
              </div>
              <p className="text-sm font-medium text-foreground">
                Drop Excel file here
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                or click to browse
              </p>
              <Badge variant="secondary" className="mt-3 font-mono">
                XLS / XLSX
              </Badge>
            </>
          )}
        </div>
      )}

      {error && !workbook && (
        <div className="flex min-h-[200px] flex-col items-center justify-center rounded-lg border-2 border-destructive/30 bg-destructive/5 p-8 text-center">
          <AlertCircle className="mb-3 h-10 w-10 text-destructive" />
          <p className="text-sm font-semibold text-foreground">Unable to read this file</p>
          <p className="mt-1 text-xs text-muted-foreground">{error}</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-4"
            onClick={() => {
              setWorkbook(null, null);
              inputRef.current?.click();
            }}
          >
            Try another file
          </Button>
        </div>
      )}

      {workbook && (
        <div className="animate-slide-up rounded-lg border bg-card p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-success/10">
                <FileCheck2 className="h-5 w-5 text-success" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-foreground">
                  {workbook.fileName}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(workbook.fileSize)}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
              onClick={handleRemove}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
            <div className="rounded-md bg-muted/50 p-2.5">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Layers className="h-3.5 w-3.5" />
                <span>Worksheets</span>
              </div>
              <p className="mt-1 font-mono text-sm font-semibold text-foreground">
                {workbook.sheets.length}
              </p>
            </div>
            <div className="rounded-md bg-muted/50 p-2.5">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Table2 className="h-3.5 w-3.5" />
                <span>Total Rows</span>
              </div>
              <p className="mt-1 font-mono text-sm font-semibold text-foreground">
                {workbook.sheets.reduce((sum, s) => sum + s.rows.length, 0).toLocaleString()}
              </p>
            </div>
          </div>

          <div className="mt-3">
            <p className="mb-1.5 text-xs font-medium text-muted-foreground">Sheets</p>
            <div className="flex flex-wrap gap-1.5">
              {workbook.sheets.map((sheet) => (
                <Badge key={sheet.name} variant="outline" className="text-xs">
                  <FileSpreadsheet className="mr-1 h-3 w-3" />
                  {sheet.name}
                  <span className="ml-1 text-muted-foreground">
                    ({sheet.rows.length})
                  </span>
                </Badge>
              ))}
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            className="mt-3 w-full text-xs text-muted-foreground"
            onClick={() => inputRef.current?.click()}
          >
            Replace file
          </Button>
        </div>
      )}
    </div>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export { formatFileSize };
