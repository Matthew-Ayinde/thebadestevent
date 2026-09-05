'use client';

import { ReactNode } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import AdminCheckbox from './AdminCheckbox';

interface Column {
  key: string;
  label: string;
  render?: (value: any, row: any) => ReactNode;
  sortable?: boolean;
}

interface AdminTableProps {
  columns: Column[];
  data: any[];
  onSort?: (key: string, direction: 'asc' | 'desc') => void;
  sortKey?: string;
  sortDirection?: 'asc' | 'desc';
  /** Enables the leading checkbox column for multi-select. */
  selectable?: boolean;
  selectedIds?: Set<string>;
  onToggleRow?: (id: string) => void;
  onToggleAll?: () => void;
  getRowId?: (row: any) => string;
  accentColor?: string;
}

export default function AdminTable({
  columns,
  data,
  onSort,
  sortKey,
  sortDirection = 'asc',
  selectable = false,
  selectedIds,
  onToggleRow,
  onToggleAll,
  getRowId = (row) => row._id,
  accentColor = '#5eead4',
}: AdminTableProps) {
  if (data.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-white/50">No data available</p>
      </div>
    );
  }

  const selectedCount = data.filter((row) => selectedIds?.has(getRowId(row))).length;
  const allSelected = selectable && selectedCount === data.length;
  const someSelected = selectable && selectedCount > 0 && !allSelected;

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-white/10">
            {selectable && (
              <th className="w-12 px-6 py-4">
                <AdminCheckbox
                  checked={allSelected}
                  indeterminate={someSelected}
                  onChange={() => onToggleAll?.()}
                  accentColor={accentColor}
                  ariaLabel="Select all rows"
                />
              </th>
            )}
            {columns.map((column) => (
              <th
                key={column.key}
                className="px-6 py-4 text-left text-xs uppercase tracking-[0.26em] text-white/50 font-medium cursor-pointer hover:text-white/70 transition"
                onClick={() => onSort && column.sortable && onSort(column.key, sortDirection === 'asc' ? 'desc' : 'asc')}
              >
                <div className="flex items-center gap-2">
                  {column.label}
                  {column.sortable && sortKey === column.key && (
                    sortDirection === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, idx) => {
            const rowId = getRowId(row);
            const isSelected = !!selectedIds?.has(rowId);
            return (
              <tr
                key={idx}
                className={`border-b border-white/5 transition ${isSelected ? 'bg-white/6' : 'hover:bg-white/5'}`}
              >
                {selectable && (
                  <td className="px-6 py-4">
                    <AdminCheckbox
                      checked={isSelected}
                      onChange={() => onToggleRow?.(rowId)}
                      accentColor={accentColor}
                      ariaLabel="Select row"
                    />
                  </td>
                )}
                {columns.map((column) => (
                  <td key={column.key} className="px-6 py-4 text-sm text-white/80">
                    {column.render ? column.render(row[column.key], row) : row[column.key]}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
