"use client";

import { useState } from "react";
import Link from "next/link";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type RowSelectionState,
} from "@tanstack/react-table";
import {
  Plus,
  Upload,
  Play,
  MoreHorizontal,
  Search,
  Filter,
  Download,
} from "lucide-react";

import { useStyles } from "@/lib/hooks/useStyles";
import type { StyleListItem, RevisionStatus } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// Status badge mapping
function StatusBadge({ status }: { status: RevisionStatus | null }) {
  if (!status) {
    return <Badge variant="draft">No Revision</Badge>;
  }

  const variantMap: Record<RevisionStatus, any> = {
    uploaded: "uploaded",
    parsing: "parsing",
    draft: "draft",
    approved: "approved",
    rejected: "rejected",
  };

  return <Badge variant={variantMap[status] || "draft"}>{status}</Badge>;
}

// Format date
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

export default function StylesPage() {
  const [search, setSearch] = useState("");
  const [season, setSeason] = useState("");
  const [year, setYear] = useState("");
  const [sorting, setSorting] = useState<SortingState>([]);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [page, setPage] = useState(1);

  // Fetch styles
  const { data, isLoading, isError } = useStyles({
    page,
    page_size: 50,
    search: search || undefined,
    season: season || undefined,
    year: year ? parseInt(year) : undefined,
    ordering: sorting[0]
      ? `${sorting[0].desc ? "-" : ""}${sorting[0].id}`
      : "-updated_at",
  });

  // Table columns
  const columns: ColumnDef<StyleListItem>[] = [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected()}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "style_number",
      header: "Style Number",
      cell: ({ row }) => (
        <Link
          href={`/dashboard/styles/${row.original.id}`}
          className="font-medium text-blue-600 hover:underline"
        >
          {row.getValue("style_number")}
        </Link>
      ),
    },
    {
      accessorKey: "style_name",
      header: "Name",
    },
    {
      accessorKey: "season",
      header: "Season",
      cell: ({ row }) => (
        <span className="font-mono text-xs">
          {row.getValue("season")}/{row.original.year}
        </span>
      ),
    },
    {
      accessorKey: "customer",
      header: "Customer",
      cell: ({ row }) => row.getValue("customer") || "-",
    },
    {
      accessorKey: "latest_revision_status",
      header: "Status",
      cell: ({ row }) => (
        <StatusBadge status={row.getValue("latest_revision_status")} />
      ),
    },
    {
      accessorKey: "latest_revision_number",
      header: "Rev",
      cell: ({ row }) => {
        const revNum = row.getValue("latest_revision_number");
        return revNum ? `Rev ${String.fromCharCode(64 + (revNum as number))}` : "-";
      },
    },
    {
      accessorKey: "documents_count",
      header: "Docs",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <span>{row.getValue("documents_count")}</span>
          {row.getValue("documents_count") === 0 && (
            <span className="text-xs text-red-500">!</span>
          )}
        </div>
      ),
    },
    {
      accessorKey: "issues_count",
      header: "Issues",
      cell: ({ row }) => {
        const count = row.getValue("issues_count") as number;
        return (
          <div
            className={`text-center ${count > 0 ? "text-red-600 font-semibold" : "text-slate-400"}`}
          >
            {count || "-"}
          </div>
        );
      },
    },
    {
      accessorKey: "updated_at",
      header: "Updated",
      cell: ({ row }) => (
        <span className="text-xs text-slate-500">
          {formatDate(row.getValue("updated_at"))}
        </span>
      ),
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <Button variant="ghost" size="sm">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      ),
    },
  ];

  const table = useReactTable({
    data: data?.results || [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      rowSelection,
    },
  });

  const selectedCount = Object.keys(rowSelection).length;

  return (
    <div className="p-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Styles</h1>
          <p className="text-slate-500 mt-1">
            Manage your style database ({data?.count || 0} total)
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            New Style
          </Button>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex items-center gap-4 bg-white rounded-lg border border-slate-200 p-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search by style number or name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <select
          value={season}
          onChange={(e) => setSeason(e.target.value)}
          className="px-3 py-2 border border-slate-300 rounded-md text-sm"
        >
          <option value="">All Seasons</option>
          <option value="SP">Spring</option>
          <option value="SU">Summer</option>
          <option value="FA">Fall</option>
          <option value="HO">Holiday</option>
        </select>
        <select
          value={year}
          onChange={(e) => setYear(e.target.value)}
          className="px-3 py-2 border border-slate-300 rounded-md text-sm"
        >
          <option value="">All Years</option>
          <option value="2025">2025</option>
          <option value="2024">2024</option>
          <option value="2023">2023</option>
        </select>
        <Button variant="outline" size="sm">
          <Filter className="w-4 h-4 mr-2" />
          More Filters
        </Button>
      </div>

      {/* Batch Actions */}
      {selectedCount > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center justify-between">
          <span className="text-sm font-medium text-blue-900">
            {selectedCount} item{selectedCount > 1 ? "s" : ""} selected
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Upload className="w-4 h-4 mr-2" />
              Upload Tech Packs
            </Button>
            <Button variant="outline" size="sm">
              <Play className="w-4 h-4 mr-2" />
              Batch Parse
            </Button>
            <Button variant="outline" size="sm">Export Selected</Button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-lg border border-slate-200">
        {isLoading ? (
          <div className="p-12 text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
            <p className="mt-4 text-slate-600">Loading styles...</p>
          </div>
        ) : isError ? (
          <div className="p-12 text-center">
            <p className="text-red-600">Failed to load styles</p>
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <TableHead key={header.id}>
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows?.length ? (
                  table.getRowModel().rows.map((row) => (
                    <TableRow
                      key={row.id}
                      data-state={row.getIsSelected() && "selected"}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id}>
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={columns.length}
                      className="h-24 text-center"
                    >
                      No styles found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>

            {/* Pagination */}
            <div className="flex items-center justify-between px-6 py-4 border-t">
              <div className="text-sm text-slate-500">
                Showing {((page - 1) * 50) + 1} to{" "}
                {Math.min(page * 50, data?.count || 0)} of {data?.count || 0}{" "}
                styles
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={!data?.next}
                >
                  Next
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
