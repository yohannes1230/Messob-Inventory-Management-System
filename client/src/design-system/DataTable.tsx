import React, { useState, useMemo } from 'react';
import { Search, ChevronLeft, ChevronRight, Edit2, Trash2, History } from 'lucide-react';

export interface Column<T = any> {
  key: string;
  header: string;
  headerAm?: string;
  render?: (value: any, row: T) => React.ReactNode;
}

export interface DataTableProps<T = any> {
  columns: Column<T>[];
  data: T[];
  total?: number;
  page?: number;
  limit?: number;
  onPageChange?: (page: number) => void;
  onSearch?: (term: string) => void;
  onEdit?: (row: T) => void;
  onDeactivate?: (row: T) => void;
  onViewHistory?: (row: T) => void;
  lang?: 'en' | 'am';
  isLoading?: boolean;
  emptyMessage?: string;
}

export const DataTable: React.FC<DataTableProps> = ({
  columns,
  data,
  total = data.length,
  page = 1,
  limit = 10,
  onPageChange,
  onSearch,
  onEdit,
  onDeactivate,
  onViewHistory,
  lang = 'en',
  isLoading = false,
  emptyMessage,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const isAm = lang === 'am';

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const term = e.target.value;
    setSearchTerm(term);
    if (onSearch) {
      onSearch(term);
    }
  };

  // If external pagination/search isn't provided, do client-side filter
  const filteredData = useMemo(() => {
    if (onSearch || !searchTerm) return data;
    const lower = searchTerm.toLowerCase();
    return data.filter((row: any) =>
      Object.values(row).some(
        (val) => val && String(val).toLowerCase().includes(lower),
      ),
    );
  }, [data, searchTerm, onSearch]);

  const totalPages = Math.ceil((total || filteredData.length) / limit) || 1;

  return (
    <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden flex flex-col">
      {/* Search Header */}
      <div className="p-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
        <div className="relative w-72">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={handleSearchChange}
            placeholder={isAm ? 'ፈልግ...' : 'Search records...'}
            className="w-full pl-9 pr-3 py-1.5 bg-white border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#D4A373]"
          />
        </div>
        <div className="text-xs text-gray-500 font-medium">
          {isAm ? `ጠቅላላ: ${total} መዝገቦች` : `Total: ${total} records`}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-[#FEFAE0] text-gray-700 font-semibold">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  scope="col"
                  className="px-4 py-3 text-left tracking-wider"
                >
                  {isAm && col.headerAm ? col.headerAm : col.header}
                </th>
              ))}
              {(onEdit || onDeactivate || onViewHistory) && (
                <th scope="col" className="px-4 py-3 text-right">
                  {isAm ? 'ተግባራት' : 'Actions'}
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {isLoading ? (
              <tr>
                <td
                  colSpan={columns.length + 1}
                  className="px-4 py-8 text-center text-gray-500"
                >
                  {isAm ? 'በመጫን ላይ...' : 'Loading...'}
                </td>
              </tr>
            ) : filteredData.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + 1}
                  className="px-4 py-8 text-center text-gray-500"
                >
                  {emptyMessage ||
                    (isAm ? 'ምንም መረጃ አልተገኘም' : 'No records found')}
                </td>
              </tr>
            ) : (
              filteredData.map((row: any, idx) => (
                <tr
                  key={row._id || idx}
                  className="hover:bg-gray-50 transition-colors"
                >
                  {columns.map((col) => (
                    <td key={col.key} className="px-4 py-3 whitespace-nowrap text-gray-800">
                      {col.render ? col.render(row[col.key], row) : String(row[col.key] ?? '')}
                    </td>
                  ))}
                  {(onEdit || onDeactivate || onViewHistory) && (
                    <td className="px-4 py-3 whitespace-nowrap text-right space-x-2">
                      {onViewHistory && (
                        <button
                          onClick={() => onViewHistory(row)}
                          title={isAm ? 'የለውጥ ታሪክ' : 'Change History'}
                          className="p-1 text-gray-500 hover:text-blue-600 rounded transition-colors"
                        >
                          <History className="h-4 w-4 inline" />
                        </button>
                      )}
                      {onEdit && (
                        <button
                          onClick={() => onEdit(row)}
                          title={isAm ? 'አርትዕ' : 'Edit'}
                          className="p-1 text-gray-500 hover:text-[#D4A373] rounded transition-colors"
                        >
                          <Edit2 className="h-4 w-4 inline" />
                        </button>
                      )}
                      {onDeactivate && row.isActive !== false && (
                        <button
                          onClick={() => onDeactivate(row)}
                          title={isAm ? 'አቦዝን' : 'Deactivate'}
                          className="p-1 text-gray-500 hover:text-red-600 rounded transition-colors"
                        >
                          <Trash2 className="h-4 w-4 inline" />
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="p-3 border-t border-gray-200 bg-gray-50 flex items-center justify-between text-xs text-gray-600">
        <div>
          {isAm
            ? `ገጽ ${page} ከ ${totalPages}`
            : `Page ${page} of ${totalPages}`}
        </div>
        <div className="flex items-center space-x-1">
          <button
            onClick={() => onPageChange && onPageChange(page - 1)}
            disabled={page <= 1}
            className="p-1.5 rounded border border-gray-300 bg-white hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => onPageChange && onPageChange(page + 1)}
            disabled={page >= totalPages}
            className="p-1.5 rounded border border-gray-300 bg-white hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
