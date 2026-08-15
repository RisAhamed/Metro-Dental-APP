import * as XLSX from 'xlsx';

// Builds an Excel workbook from rows using column definitions, then serializes
// to a buffer suitable for streaming from a server route.
export function buildWorkbookBuffer(
  data: Record<string, unknown>[],
  columns: { key: string; header: string }[],
  sheetName: string
): ArrayBuffer {
  const rows = data.map((row) => {
    const obj: Record<string, unknown> = {};
    columns.forEach((col) => {
      obj[col.header] = row[col.key] ?? '';
    });
    return obj;
  });

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  return out;
}
