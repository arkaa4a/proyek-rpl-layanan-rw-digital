import React from 'react';

type Column = {
  header: string;
  accessor: string;
  render?: (value: any, row: any) => React.ReactNode;
};

type DataTableProps = {
  columns: Column[];
  data: any[];
  emptyMessage?: string;
};

export default function DataTable({ columns, data, emptyMessage = "Tidak ada data." }: DataTableProps) {
  if (!data || data.length === 0) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--secondary-foreground)', border: '1px dashed var(--border)', borderRadius: 'var(--radius-md)' }}>
        {emptyMessage}
      </div>
    );
  }

  return (
    <div style={{ overflowX: 'auto', width: '100%' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
        <thead>
          <tr style={{ borderBottom: '2px solid var(--border)' }}>
            {columns.map((col, idx) => (
              <th key={idx} style={{ padding: '0.75rem 1rem', color: 'var(--secondary-foreground)', fontWeight: 600, fontSize: '0.875rem' }}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, rowIdx) => (
            <tr key={row.id || rowIdx} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.2s' }}>
              {columns.map((col, colIdx) => (
                <td key={colIdx} style={{ padding: '1rem', fontSize: '0.875rem' }}>
                  {col.render ? col.render(row[col.accessor], row) : row[col.accessor]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
