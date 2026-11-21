import { getInstitutionName } from '@/lib/institution';
/**
 * Universal ERP Export Utilities (CSV & Printable Reports)
 */

export function exportToCSV(filename: string, headers: string[], rows: (string | number | null | undefined)[][]): void {
  const sanitize = (val: any) => {
    if (val === null || val === undefined) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const csvContent = [
    headers.map(sanitize).join(','),
    ...rows.map(row => row.map(sanitize).join(',')),
  ].join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function printDocument(title: string, bodyHtml: string): void {
  const printWindow = window.open('', '_blank', 'width=900,height=700');
  if (!printWindow) {
    alert('Please allow popups to print official institutional reports.');
    return;
  }

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>${title}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 40px; color: #111; }
          .header { text-align: center; border-bottom: 2px solid #2563eb; padding-bottom: 16px; margin-bottom: 24px; }
          .title { font-size: 24px; font-weight: bold; color: #1e3a8a; margin: 0; }
          .subtitle { font-size: 13px; color: #64748b; margin-top: 4px; }
          table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 13px; }
          th { background: #f1f5f9; text-align: left; padding: 10px; border: 1px solid #cbd5e1; }
          td { padding: 10px; border: 1px solid #cbd5e1; }
          .footer { margin-top: 40px; font-size: 11px; text-align: center; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 12px; }
          @media print {
            body { padding: 0; }
            button { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="title">ADHITYAN GROUP OF INSTITUTIONS</div>
          <div class="subtitle">Official ERP Academic & Administrative Management System</div>
          <h2 style="font-size: 18px; margin-top: 12px; font-weight: 600;">${title}</h2>
          <div style="font-size: 12px; color: #64748b;">Generated on: ${new Date().toLocaleString()}</div>
        </div>
        ${bodyHtml}
        <div class="footer">
          Confidential Institutional Document • ${getInstitutionName()} • Certified Record
        </div>
        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
}

