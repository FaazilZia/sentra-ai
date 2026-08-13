import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Search, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface Column<T> {
  header: string;
  accessorKey?: keyof T;
  cell?: (item: T) => React.ReactNode;
  sortable?: boolean;
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (item: T) => string;
  rowStyle?: (item: T) => string;
  isLoading?: boolean;
  emptyMessage?: string;
  searchPlaceholder?: string;
  onSearchChange?: (val: string) => void;
  actions?: React.ReactNode;
  className?: string;
}

export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  rowStyle,
  isLoading = false,
  emptyMessage = 'No records found.',
  searchPlaceholder = 'Filter records...',
  onSearchChange,
  actions,
  className
}: DataTableProps<T>) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortCol, setSortCol] = useState<keyof T | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchTerm(val);
    if (onSearchChange) onSearchChange(val);
  };

  const handleSort = (colKey?: keyof T) => {
    if (!colKey) return;
    if (sortCol === colKey) {
      setSortDir(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortCol(colKey);
      setSortDir('asc');
    }
  };

  let processedData = [...data];
  if (searchTerm && !onSearchChange) {
    const term = searchTerm.toLowerCase();
    processedData = processedData.filter(item =>
      Object.values(item as any).some(
        val => val && String(val).toLowerCase().includes(term)
      )
    );
  }

  if (sortCol) {
    processedData.sort((a, b) => {
      const valA = a[sortCol];
      const valB = b[sortCol];
      if (valA < valB) return sortDir === 'asc' ? -1 : 1;
      if (valA > valB) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }

  return (
    <div className={cn("bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm flex flex-col", className)}>
      {/* Top search & filter bar */}
      {(searchPlaceholder || actions) && (
        <div className="p-3 bg-slate-50/50 dark:bg-slate-900/40 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
          {searchPlaceholder && (
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
              <input
                type="text"
                placeholder={searchPlaceholder}
                value={searchTerm}
                onChange={handleSearch}
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs font-medium text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>
          )}
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}

      {/* Table Container */}
      <div className="overflow-x-auto custom-scrollbar flex-1">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-100/70 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[10px] font-bold">
              {columns.map((col, index) => (
                <th
                  key={index}
                  onClick={() => col.sortable && handleSort(col.accessorKey)}
                  className={cn(
                    "px-4 py-3 font-bold select-none",
                    col.sortable && "cursor-pointer hover:text-slate-900 dark:hover:text-slate-100",
                    col.className
                  )}
                >
                  <div className="flex items-center gap-1.5">
                    <span>{col.header}</span>
                    {col.sortable && sortCol === col.accessorKey && (
                      sortDir === 'asc' ? <ChevronUp className="h-3 w-3 text-indigo-600 dark:text-indigo-400" /> : <ChevronDown className="h-3 w-3 text-indigo-600 dark:text-indigo-400" />
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200/80 dark:divide-slate-800/80 text-slate-800 dark:text-slate-200">
            {isLoading ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-12 text-center text-slate-400">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Loader2 className="h-6 w-6 animate-spin text-indigo-600 dark:text-indigo-400" />
                    <span className="text-[11px] font-bold uppercase tracking-wider">Loading data...</span>
                  </div>
                </td>
              </tr>
            ) : processedData.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-12 text-center text-slate-400">
                  <span className="text-[11px] font-semibold">{emptyMessage}</span>
                </td>
              </tr>
            ) : (
              processedData.map((item) => {
                const key = keyExtractor(item);
                const customStyle = rowStyle ? rowStyle(item) : '';

                return (
                  <tr
                    key={key}
                    className={cn(
                      "hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors",
                      customStyle
                    )}
                  >
                    {columns.map((col, idx) => (
                      <td key={idx} className={cn("px-4 py-3 align-middle", col.className)}>
                        {col.cell
                          ? col.cell(item)
                          : col.accessorKey
                          ? (item[col.accessorKey] as any)
                          : null}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
