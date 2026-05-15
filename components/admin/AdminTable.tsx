'use client';

import { ReactNode } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';

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
}

export default function AdminTable({
  columns,
  data,
  onSort,
  sortKey,
  sortDirection = 'asc',
}: AdminTableProps) {
  if (data.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-white/50">No data available</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-white/10">
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
          {data.map((row, idx) => (
            <tr key={idx} className="border-b border-white/5 hover:bg-white/5 transition">
              {columns.map((column) => (
                <td key={column.key} className="px-6 py-4 text-sm text-white/80">
                  {column.render ? column.render(row[column.key], row) : row[column.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
