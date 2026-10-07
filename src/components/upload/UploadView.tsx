import { FileSpreadsheet, Lock, ArrowRight, ArrowLeftRight } from 'lucide-react';
import { FileUploadCard } from './FileUploadCard';
import { useStore } from '@/store/useStore';
import { Button } from '@/components/ui/button';

export function UploadView() {
  const workbookA = useStore((s) => s.workbookA);
  const workbookB = useStore((s) => s.workbookB);
  const setView = useStore((s) => s.setView);

  const bothLoaded = workbookA && workbookB;

  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <div className="mb-10 text-center">
        <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg">
          <FileSpreadsheet className="h-7 w-7" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Compare two Excel files
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Drop your files to begin. All processing happens locally in your browser.
        </p>
      </div>

      <div className="mb-6 flex items-stretch gap-4">
        <div className="flex-1">
          <FileUploadCard label="Original File" variant="A" />
        </div>

        <div className="flex items-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-border bg-muted">
            <ArrowLeftRight className="h-4 w-4 text-muted-foreground" />
          </div>
        </div>

        <div className="flex-1">
          <FileUploadCard label="New File" variant="B" />
        </div>
      </div>

      <div className="mt-8 flex flex-col items-center gap-4">
        <div className="flex items-center gap-2 rounded-lg border bg-muted/30 px-4 py-2.5 text-xs text-muted-foreground">
          <Lock className="h-3.5 w-3.5 text-success" />
          <span>
            Your files stay in your browser. No files are uploaded or transmitted.
          </span>
        </div>

        {bothLoaded && (
          <Button
            size="lg"
            className="animate-slide-up"
            onClick={() => setView('compare')}
          >
            Configure Comparison
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        )}

        {workbookA && !workbookB && (
          <p className="text-sm text-muted-foreground">
            One more file needed — upload the second Excel file to continue.
          </p>
        )}

        {!workbookA && workbookB && (
          <p className="text-sm text-muted-foreground">
            One more file needed — upload the first Excel file to continue.
          </p>
        )}
      </div>
    </div>
  );
}
