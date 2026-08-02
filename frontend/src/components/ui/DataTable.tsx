import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
  type PaginationState,
} from "@tanstack/react-table";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { useThemeStore } from "@/shared/lib/theme-store";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  pageCount?: number;
  pagination?: PaginationState;
  onPaginationChange?: React.Dispatch<React.SetStateAction<PaginationState>>;
  loading?: boolean;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  pageCount,
  pagination,
  onPaginationChange,
  loading,
}: DataTableProps<TData, TValue>) {
  const dark = useThemeStore((s) => s.dark);
  const table = useReactTable({
    data,
    columns,
    pageCount,
    state: { pagination },
    onPaginationChange: onPaginationChange as any,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
  });

  const currentPage = pagination?.pageIndex ?? 0;
  const pageSize = pagination?.pageSize ?? 10;
  const totalPages = pageCount ?? 1;
  const totalRows = data.length;

  const setPageSize = (size: number) => {
    if (typeof onPaginationChange === "function") {
      onPaginationChange({ pageIndex: 0, pageSize: size });
    }
  };

  const goToPage = (page: number) => {
    if (typeof onPaginationChange === "function") {
      onPaginationChange({ pageIndex: page, pageSize: pagination?.pageSize ?? 10 });
    }
  };

  const getPageNumbers = (): (number | "...")[] => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i);
    }
    const pages: (number | "...")[] = [];
    pages.push(0);
    if (currentPage > 3) pages.push("...");
    const start = Math.max(1, currentPage - 1);
    const end = Math.min(totalPages - 2, currentPage + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    if (currentPage < totalPages - 4) pages.push("...");
    pages.push(totalPages - 1);
    return pages;
  };

  return (
    <div className={cn("w-full overflow-hidden rounded-lg border", dark ? "border-gray-700 bg-gray-800" : "border-gray-200 bg-white")}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr
                key={headerGroup.id}
                className={cn("border-b", dark ? "border-gray-700 bg-gray-900" : "border-gray-200 bg-gray-50")}
              >
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className={cn("px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider", dark ? "text-gray-400" : "text-gray-500")}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className={cn("divide-y", dark ? "divide-gray-700" : "divide-gray-100")}>
            {loading ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className={cn("px-4 py-12 text-center", dark ? "text-gray-400" : "text-gray-500")}
                >
                  <div className="flex items-center justify-center gap-2">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
                    Loading...
                  </div>
                </td>
              </tr>
            ) : table.getRowModel().rows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className={cn("px-4 py-12 text-center", dark ? "text-gray-400" : "text-gray-500")}
                >
                  No results found.
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row, i) => (
                <tr
                  key={row.id}
                  className={cn(
                    "transition-colors",
                    dark
                      ? "hover:bg-gray-700/50 text-gray-200"
                      : "hover:bg-blue-50/50 text-gray-700",
                    i % 2 === 1 && (dark ? "bg-gray-900/50" : "bg-gray-50/50")
                  )}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-4 py-3">
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {totalRows > 0 && (
        <div className={cn("flex flex-col gap-3 border-t px-4 py-3 sm:flex-row sm:items-center sm:justify-between", dark ? "border-gray-700 bg-gray-900" : "border-gray-200 bg-gray-50")}>
          <div className="flex items-center gap-2">
            <span className={cn("text-sm", dark ? "text-gray-400" : "text-gray-500")}>Show</span>
            <select
              value={pageSize >= 99999 ? "99999" : pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
              }}
              className={cn(
                "rounded-md border px-2 py-1 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20",
                dark ? "border-gray-600 bg-gray-700 text-white" : "border-gray-300 bg-white text-gray-700"
              )}
            >
              <option value="10">10</option>
              <option value="50">50</option>
              <option value="100">100</option>
              <option value="99999">All</option>
            </select>
            <span className={cn("text-sm", dark ? "text-gray-400" : "text-gray-500")}>
              of {totalRows} entries
            </span>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 0}
                className={cn(
                  "inline-flex h-8 w-8 items-center justify-center rounded-md transition-colors disabled:cursor-not-allowed disabled:opacity-40",
                  dark ? "text-gray-400 hover:bg-gray-700" : "text-gray-500 hover:bg-gray-200"
                )}
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              {getPageNumbers().map((page, idx) =>
                page === "..." ? (
                  <span key={`dots-${idx}`} className={cn("px-1 text-sm", dark ? "text-gray-500" : "text-gray-400")}>
                    ...
                  </span>
                ) : (
                  <button
                    key={page}
                    onClick={() => goToPage(page)}
                    className={cn(
                      "inline-flex h-8 min-w-[32px] items-center justify-center rounded-md px-2 text-sm font-medium transition-colors",
                      page === currentPage
                        ? "bg-blue-600 text-white"
                        : dark
                        ? "text-gray-400 hover:bg-gray-700"
                        : "text-gray-600 hover:bg-gray-200"
                    )}
                  >
                    {page + 1}
                  </button>
                )
              )}
              <button
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage >= totalPages - 1}
                className={cn(
                  "inline-flex h-8 w-8 items-center justify-center rounded-md transition-colors disabled:cursor-not-allowed disabled:opacity-40",
                  dark ? "text-gray-400 hover:bg-gray-700" : "text-gray-500 hover:bg-gray-200"
                )}
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
