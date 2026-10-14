/**
 * RecruiTrain Secure Data Export Utilities
 *
 * Implements client-side spreadsheet export with OWASP CSV/Formula Injection defenses (CWE-1236).
 * Prepends a single quote to any cell value that starts with formula triggers: =, +, -, @, \t, \r.
 */

/**
 * Sanitizes a single cell value against spreadsheet formula injection.
 * @param {*} value 
 * @returns {string}
 */
export function sanitizeCellForCsv(value) {
  if (value === null || value === undefined) {
    return '""';
  }
  let str = typeof value === 'object' ? JSON.stringify(value) : String(value);

  // Strip carriage returns and newlines inside unquoted fields
  str = str.replace(/\r\n/g, ' ').replace(/[\r\n]/g, ' ');

  // Defend against formula injection (CWE-1236)
  if (/^[=+\-@\t]/.test(str)) {
    str = `'${str}`;
  }

  // Escape inner double quotes
  return `"${str.replace(/"/g, '""')}"`;
}

/**
 * Exports an array of objects to a CSV file and triggers browser download.
 * @param {string} filename Base filename (without .csv)
 * @param {Array<{ key: string, label: string }>} columns Column definitions
 * @param {Array<Object>} rows Data rows
 */
export function exportToCsv(filename, columns, rows) {
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error('No data available to export.');
  }

  const headerRow = columns.map((col) => sanitizeCellForCsv(col.label)).join(',');
  const dataRows = rows.map((row) =>
    columns
      .map((col) => {
        const val = typeof col.render === 'function' ? col.render(row[col.key], row) : row[col.key];
        return sanitizeCellForCsv(val);
      })
      .join(',')
  );

  // Prepend UTF-8 Byte Order Mark (BOM) so Excel respects UTF-8 international characters
  const csvContent = '\uFEFF' + [headerRow, ...dataRows].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}_${new Date().toISOString().slice(0, 10)}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
