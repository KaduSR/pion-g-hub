import React from 'react';

export interface Column<T> {
  key: keyof T | string;
  header: string;
  render?: (item: T) => React.ReactNode;
}

interface BaseTableProps<T> {
  columns: Column<T>[];
  data: T[];
  title?: string;
  onAdd?: () => void;
  addLabel?: string;
}

export function BaseTable<T>({ columns, data, title, onAdd, addLabel }: BaseTableProps<T>) {
  return (
    <div style={{ padding: '2rem' }}>
      {title && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h1>{title}</h1>
          {onAdd && addLabel && (
            <button onClick={onAdd} style={{ padding: '0.5rem 1rem' }}>
              {addLabel}
            </button>
          )}
        </div>
      )}
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: '#f5f5f5' }}>
            {columns.map((col) => (
              <th key={String(col.key)} style={{ padding: '0.5rem', border: '1px solid #ddd', textAlign: 'left' }}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} style={{ padding: '1rem', textAlign: 'center' }}>
                Nenhum registro encontrado
              </td>
            </tr>
          ) : (
            data.map((item, idx) => (
              <tr key={idx}>
                {columns.map((col) => (
                  <td key={String(col.key)} style={{ padding: '0.5rem', border: '1px solid #ddd' }}>
                    {col.render ? col.render(item) : (item as any)[col.key]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
