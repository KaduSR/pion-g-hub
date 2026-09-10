import React, { useState } from 'react';

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
  searchPlaceholder?: string;
  searchKeys?: (keyof T)[];
}

export function BaseTable<T>({ columns, data, title, onAdd, addLabel, searchPlaceholder, searchKeys }: BaseTableProps<T>) {
  const [searchText, setSearchText] = useState('');

  const filteredData = searchText && searchKeys && searchKeys.length > 0
    ? data.filter((item) =>
        searchKeys.some((key) => {
          const value = (item as any)[key];
          if (value == null) return false;
          return String(value).toLowerCase().includes(searchText.toLowerCase());
        })
      )
    : data;

  const hasSearch = Boolean(searchPlaceholder && searchKeys && searchKeys.length > 0);
  const isSearching = hasSearch && searchText.trim().length > 0;
  const isEmpty = filteredData.length === 0;

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
      {hasSearch && (
        <div style={{ marginBottom: '1rem' }}>
          <input
            type="text"
            placeholder={searchPlaceholder}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: '100%', maxWidth: '400px', padding: '0.5rem', boxSizing: 'border-box' }}
          />
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
          {isEmpty ? (
            <tr>
              <td colSpan={columns.length} style={{ padding: '1rem', textAlign: 'center' }}>
                {isSearching ? `Nenhum registro encontrado para "${searchText}"` : 'Nenhum registro cadastrado'}
              </td>
            </tr>
          ) : (
            filteredData.map((item, idx) => (
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
