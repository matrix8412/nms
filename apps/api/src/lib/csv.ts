export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    const next = text[i + 1];

    if (ch === '"') {
      if (inQuotes && next === '"') {
        cell += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (ch === ',' && !inQuotes) {
      row.push(cell);
      cell = '';
      continue;
    }

    if ((ch === '\n' || ch === '\r') && !inQuotes) {
      if (ch === '\r' && next === '\n') {
        i += 1;
      }
      row.push(cell);
      cell = '';
      if (row.some((item) => item.length > 0)) {
        rows.push(row);
      }
      row = [];
      continue;
    }

    cell += ch;
  }

  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    if (row.some((item) => item.length > 0)) {
      rows.push(row);
    }
  }

  return rows;
}

function escapeCell(value: unknown): string {
  const str = value == null ? '' : String(value);
  if (!/[",\n\r]/.test(str)) {
    return str;
  }
  return `"${str.replace(/"/g, '""')}"`;
}

export function toCsv(headers: string[], rows: Array<Array<unknown>>): string {
  const lines = [headers.map(escapeCell).join(',')];
  for (const row of rows) {
    lines.push(row.map(escapeCell).join(','));
  }
  return `${lines.join('\n')}\n`;
}

export function rowsToObjects(rows: string[][]): Array<Record<string, string>> {
  const headerRow = rows[0];
  if (!headerRow) {
    return [];
  }
  const dataRows = rows.slice(1);
  return dataRows.map((row) => {
    const item: Record<string, string> = {};
    for (let i = 0; i < headerRow.length; i += 1) {
      const key = headerRow[i];
      if (key === undefined) continue;
      item[key] = row[i] ?? '';
    }
    return item;
  });
}
