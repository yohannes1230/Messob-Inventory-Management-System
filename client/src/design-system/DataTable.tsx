import React, { useState, useMemo } from 'react';
import { Search, ChevronLeft, ChevronRight, Edit2, Trash2, History, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

export interface Column<T = any> {
  key: string;
  header: string;
  headerAm?: string;
  sortable?: boolean;
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
  sortKey?: string;
  sortOrder?: 'asc' | 'desc' | null;
  onSort?: (key: string, order: 'asc' | 'desc' | null) => void;
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
  total,
  page: controlledPage,
  limit = 10,
  onPageChange,
  onSearch,
  sortKey: controlledSortKey,
  sortOrder: controlledSortOrder,
  onSort,
  onEdit,
  onDeactivate,
  onViewHistory,
  lang = 'en',
  isLoading = false,
  emptyMessage,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [internalPage, setInternalPage] = useState(1);
  const [internalSortKey, setInternalSortKey] = useState<string | null>(null);
  const [internalSortOrder, setInternalSortOrder] = useState<'asc' | 'desc' | null>(null);

  const isAm = lang === 'am';
  const currentPage = controlledPage ?? internalPage;
  const currentSortKey = controlledSortKey !== undefined ? controlledSortKey : internalSortKey;
  const currentSortOrder = controlledSortOrder !== undefined ? controlledSortOrder : internalSortOrder;

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const term = e.target.value;
    setSearchTerm(term);
    if (!controlledPage) {
      setInternalPage(1);
    }
    if (onSearch) {
      onSearch(term);
    }
  };

  const handleSort = (key: string) => {
    let nextOrder: 'asc' | 'desc' | null = 'asc';
    if (currentSortKey === key) {
      if (currentSortOrder === 'asc') nextOrder = 'desc';
      else if (currentSortOrder === 'desc') nextOrder = null;
      else nextOrder = 'asc';
    }

    if (onSort) {
      onSort(key, nextOrder);
    } else {
      setInternalSortKey(nextOrder ? key : null);
      setInternalSortOrder(nextOrder);
    }
  };

  const handlePageChange = (newPage: number) => {
    if (onPageChange) {
      onPageChange(newPage);
    } else {
      setInternalPage(newPage);
    }
  };

  // 1. Filter
  const filteredData = useMemo(() => {
    if (onSearch || !searchTerm) return data;
    const lower = searchTerm.toLowerCase();
    return data.filter((row: any) =>
      Object.values(row).some(
        (val) => val && String(val).toLowerCase().includes(lower),
      ),
    );
  }, [data, searchTerm, onSearch]);

  // 2. Sort
  const sortedData = useMemo(() => {
    if (onSort || !currentSortKey || !currentSortOrder) return filteredData;

    return [...filteredData].sort((a: any, b: any) => {
      const valA = a[currentSortKey];
      const valB = b[currentSortKey];

      if (valA === valB) return 0;
      if (valA === undefined || valA === null) return 1;
      if (valB === undefined || valB === null) return -1;

      let comparison = 0;
      if (typeof valA === 'number' && typeof valB === 'number') {
        comparison = valA - valB;
      } else {
        comparison = String(valA).localeCompare(String(valB));
      }

      return currentSortOrder === 'asc' ? comparison : -comparison;
    });
  }, [filteredData, currentSortKey, currentSortOrder, onSort]);

  // 3. Paginate
  const effectiveTotal = total ?? sortedData.length;
  const totalPages = Math.ceil(effectiveTotal / limit) || 1;

  const displayData = useMemo(() => {
    if (onPageChange) return sortedData; // Controlled / server-side pagination
    const start = (currentPage - 1) * limit;
    return sortedData.slice(start, start + limit);
  }, [sortedData, currentPage, limit, onPageChange]);

  return (
    <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden flex flex-col">
      {/* Search Header */}
      <div className="p-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
        <div className="relative w-72">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" aria-hidden="true" />
          <input
            type="text"
            id="datatable-search"
            aria-label={isAm ? 'መዝገቦችን ፈልግ' : 'Search records'}
            value={searchTerm}
            onChange={handleSearchChange}
            placeholder={isAm ? 'ፈልግ...' : 'Search records...'}
            className="w-full pl-9 pr-3 py-1.5 bg-white border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-am-primary-500"
          />
        </div>
        <div className="text-xs text-gray-500 font-medium">
          {isAm ? `ጠቅላላ: ${effectiveTotal} መዝገቦች` : `Total: ${effectiveTotal} records`}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-am-primary-50 text-am-primary-700 font-semibold border-b border-am-primary-100">
            <tr>
              {columns.map((col) => {
                const isSortable = col.sortable !== false;
                const isCurrent = currentSortKey === col.key;
                const sortState = isCurrent ? currentSortOrder : null;

                return (
                  <th
                    key={col.key}
                    scope="col"
                    aria-sort={
                      sortState === 'asc'
                        ? 'ascending'
                        : sortState === 'desc'
                        ? 'descending'
                        : 'none'
                    }
                    className="px-4 py-3 text-left tracking-wider"
                  >
                    {isSortable ? (
                      <button
                        type="button"
                        onClick={() => handleSort(col.key)}
                        className="flex items-center space-x-1 hover:text-am-primary-600 focus:outline-none font-semibold text-left"
                        aria-label={`${isAm && col.headerAm ? col.headerAm : col.header}, ${
                          sortState === 'asc'
                            ? isAm ? 'ከትንሽ ወደ ትልቅ ደርድር' : 'sorted ascending'
                            : sortState === 'desc'
                            ? isAm ? 'ከትልቅ ወደ ትንሽ ደርድር' : 'sorted descending'
                            : isAm ? 'ለመደርደር ይጫኑ' : 'click to sort'
                        }`}
                      >
                        <span>{isAm && col.headerAm ? col.headerAm : col.header}</span>
                        <span className="text-gray-400">
                          {sortState === 'asc' ? (
                            <ArrowUp className="h-3.5 w-3.5 text-am-primary-500" aria-hidden="true" />
                          ) : sortState === 'desc' ? (
                            <ArrowDown className="h-3.5 w-3.5 text-am-primary-500" aria-hidden="true" />
                          ) : (
                            <ArrowUpDown className="h-3 w-3 opacity-60" aria-hidden="true" />
                          )}
                        </span>
                      </button>
                    ) : (
                      <span>{isAm && col.headerAm ? col.headerAm : col.header}</span>
                    )}
                  </th>
                );
              })}
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
            ) : displayData.length === 0 ? (
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
              displayData.map((row: any, idx) => {
                const rowIdentifier = row.name || row.code || row._id || String(idx);
                return (
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
                            type="button"
                            onClick={() => onViewHistory(row)}
                            title={isAm ? 'የለውጥ ታሪክ' : 'Change History'}
                            aria-label={isAm ? `የለውጥ ታሪክ - ${rowIdentifier}` : `Change History - ${rowIdentifier}`}
                            className="p-1 text-gray-500 hover:text-am-primary-500 rounded transition-colors"
                          >
                            <History className="h-4 w-4 inline" aria-hidden="true" />
                          </button>
                        )}
                        {onEdit && (
                          <button
                            type="button"
                            onClick={() => onEdit(row)}
                            title={isAm ? 'አርትዕ' : 'Edit'}
                            aria-label={isAm ? `አርትዕ - ${rowIdentifier}` : `Edit - ${rowIdentifier}`}
                            className="p-1 text-gray-500 hover:text-am-primary-500 rounded transition-colors"
                          >
                            <Edit2 className="h-4 w-4 inline" aria-hidden="true" />
                          </button>
                        )}
                        {onDeactivate && row.isActive !== false && (
                          <button
                            type="button"
                            onClick={() => onDeactivate(row)}
                            title={isAm ? 'አቦዝን' : 'Deactivate'}
                            aria-label={isAm ? `አቦዝን - ${rowIdentifier}` : `Deactivate - ${rowIdentifier}`}
                            className="p-1 text-gray-500 hover:text-red-600 rounded transition-colors"
                          >
                            <Trash2 className="h-4 w-4 inline" aria-hidden="true" />
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="p-3 border-t border-gray-200 bg-gray-50 flex items-center justify-between text-xs text-gray-600">
        <div>
          {isAm
            ? `ገጽ ${currentPage} ከ ${totalPages}`
            : `Page ${currentPage} of ${totalPages}`}
        </div>
        <div className="flex items-center space-x-1">
          <button
            type="button"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage <= 1}
            aria-label={isAm ? 'ቀዳሚ ገጽ' : 'Previous page'}
            className="p-1.5 rounded border border-gray-300 bg-white hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage >= totalPages}
            aria-label={isAm ? 'ቀጣይ ገጽ' : 'Next page'}
            className="p-1.5 rounded border border-gray-300 bg-white hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
};
