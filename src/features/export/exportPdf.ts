import type { ComparisonResult } from '@/types';

export function exportDiffToPdf(
  result: ComparisonResult,
  fileNameA: string,
  fileNameB: string
) {
  const { summary, metadataEntries, columnChanges } = result;

  const statusColor: Record<string, string> = {
    CHANGED: '#b45309',
    ADDED: '#15803d',
    REMOVED: '#b91c1c',
    UNCHANGED: '#6b7280',
  };

  const metaRows = metadataEntries
    .map(
      (m) => `
      <tr>
        <td>${m.label || m.key}</td>
        <td>${m.valueA ?? '—'}</td>
        <td>${m.valueB ?? '—'}</td>
      </tr>`
    )
    .join('');

  const changedRows = result.rows
    .filter((r) => r.status !== 'UNCHANGED')
    .slice(0, 200); // cap for PDF readability

  const diffRows = changedRows
    .map((row) => {
      const changedFields = row.fields
        .filter((f) => f.status !== 'UNCHANGED')
        .map((f) => {
          const old = f.oldValue ?? '—';
          const nw = f.newValue ?? '—';
          const delta = f.numericDiff
            ? ` (${f.numericDiff.absolute >= 0 ? '+' : ''}${f.numericDiff.absolute.toFixed(4)})`
            : f.dateFormatOnly
            ? ' [format only]'
            : '';
          return `<span style="color:#6b7280">${f.field}:</span> ${old} → ${nw}${delta}`;
        })
        .join('<br/>');
      return `
      <tr>
        <td style="color:${statusColor[row.status]};font-weight:600">${row.status}</td>
        <td style="font-family:monospace">${row.key}</td>
        <td style="font-size:11px">${changedFields}</td>
      </tr>`;
    })
    .join('');

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8"/>
<title>Diff Report</title>
<style>
  body { font-family: system-ui, sans-serif; font-size: 13px; color: #111; margin: 32px; }
  h1 { font-size: 20px; margin-bottom: 4px; }
  .meta { color: #6b7280; font-size: 12px; margin-bottom: 24px; }
  .cards { display: flex; gap: 16px; margin-bottom: 24px; flex-wrap: wrap; }
  .card { border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px 20px; min-width: 100px; }
  .card-label { font-size: 11px; color: #6b7280; text-transform: uppercase; }
  .card-value { font-size: 24px; font-weight: 700; font-family: monospace; }
  .changed { color: #b45309; } .added { color: #15803d; } .removed { color: #b91c1c; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
  th { text-align: left; font-size: 11px; text-transform: uppercase; color: #6b7280; border-bottom: 2px solid #e5e7eb; padding: 6px 8px; }
  td { padding: 6px 8px; border-bottom: 1px solid #f3f4f6; vertical-align: top; }
  h2 { font-size: 14px; margin: 24px 0 8px; border-bottom: 1px solid #e5e7eb; padding-bottom: 4px; }
  .note { font-size: 11px; color: #9ca3af; margin-top: -8px; margin-bottom: 12px; }
  @media print { body { margin: 16px; } }
</style>
</head>
<body>
<h1>XLS Diff — Comparison Report</h1>
<div class="meta">
  Generated: ${new Date().toLocaleString()} &nbsp;|&nbsp;
  File A: <strong>${fileNameA}</strong> &nbsp;|&nbsp;
  File B: <strong>${fileNameB}</strong>
</div>

<div class="cards">
  <div class="card"><div class="card-label">Total Matched</div><div class="card-value">${summary.totalMatched.toLocaleString()}</div></div>
  <div class="card"><div class="card-label">Changed</div><div class="card-value changed">${summary.changed.toLocaleString()}</div></div>
  <div class="card"><div class="card-label">Added</div><div class="card-value added">${summary.added.toLocaleString()}</div></div>
  <div class="card"><div class="card-label">Removed</div><div class="card-value removed">${summary.removed.toLocaleString()}</div></div>
  <div class="card"><div class="card-label">Unchanged</div><div class="card-value">${summary.unchanged.toLocaleString()}</div></div>
</div>

${
  metadataEntries.length > 0
    ? `<h2>Index Summary</h2>
<table>
  <thead><tr><th>Field</th><th>File A</th><th>File B</th></tr></thead>
  <tbody>${metaRows}</tbody>
</table>`
    : ''
}

${
  columnChanges.added.length > 0 || columnChanges.removed.length > 0
    ? `<h2>Column Changes</h2>
<p style="font-size:12px">
  <strong>Added in B:</strong> ${columnChanges.added.join(', ') || 'none'}<br/>
  <strong>Removed from A:</strong> ${columnChanges.removed.join(', ') || 'none'}
</p>`
    : ''
}

<h2>Changed Rows</h2>
${changedRows.length === 200 ? '<p class="note">Showing first 200 changed rows. Export to Excel for the full list.</p>' : ''}
<table>
  <thead><tr><th>Status</th><th>Key</th><th>Changes</th></tr></thead>
  <tbody>${diffRows}</tbody>
</table>
</body>
</html>`;

  const win = window.open('', '_blank');
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 400);
}
