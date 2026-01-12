"use client";

import { useState, useMemo } from "react";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  createColumnHelper,
  type SortingState,
  type ColumnFiltersState,
} from "@tanstack/react-table";
import { useBOMItems, useTranslateBOMBatch } from "@/lib/hooks/useBom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { BOMEditDrawer } from "@/components/bom/BOMEditDrawer";
import { BOMTranslationDrawer } from "@/components/bom/BOMTranslationDrawer";
import { EditableConsumptionCell } from "@/components/bom/EditableConsumptionCell";
import type { BOMItem } from "@/lib/types/bom";
import { ArrowUpDown, Languages, Sparkles, Package, ArrowLeft } from "lucide-react";
import Link from "next/link";

const API_BASE = "http://localhost:8000";

// 取得 Style 資訊（透過 revision → style）
async function fetchStyleInfo(revisionId: string) {
  // 先取得 revision
  const revResponse = await fetch(`${API_BASE}/api/v2/style-revisions/${revisionId}/`);
  if (!revResponse.ok) throw new Error("Failed to fetch revision");
  const revData = await revResponse.json();
  const styleId = revData.data?.style || revData.style;

  if (!styleId) return null;

  // 再取得 style
  const styleResponse = await fetch(`${API_BASE}/api/v2/styles/${styleId}/`);
  if (!styleResponse.ok) throw new Error("Failed to fetch style");
  const styleData = await styleResponse.json();
  return styleData.data || styleData;
}

const columnHelper = createColumnHelper<BOMItem>();

export default function BOMPage() {
  const params = useParams();
  const revisionId = params.id as string;
  const [editingItem, setEditingItem] = useState<BOMItem | null>(null);
  const [translatingItem, setTranslatingItem] = useState<BOMItem | null>(null);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState("");

  const { data: bomData, isLoading, error } = useBOMItems(revisionId);
  const translateBatchMutation = useTranslateBOMBatch(revisionId);

  // 取得款式資訊
  const { data: styleData } = useQuery({
    queryKey: ["style-info", revisionId],
    queryFn: () => fetchStyleInfo(revisionId),
    enabled: !!revisionId,
  });

  const styleNumber = styleData?.style_number || "";
  const styleName = styleData?.style_name || "";

  const columns = useMemo(
    () => [
      columnHelper.accessor("item_number", {
        header: "#",
        cell: (info) => (
          <div className="font-medium text-center w-12">{info.getValue()}</div>
        ),
        size: 50,
      }),
      columnHelper.accessor("category_display", {
        header: "分類",
        cell: (info) => (
          <Badge variant="outline" className="text-xs">
            {info.getValue()}
          </Badge>
        ),
        size: 80,
      }),
      columnHelper.accessor("material_name", {
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="h-8 px-2"
          >
            物料名稱
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: (info) => (
          <div className="max-w-xs truncate" title={info.getValue()}>
            {info.getValue()}
          </div>
        ),
        size: 200,
      }),
      columnHelper.accessor("material_name_zh", {
        header: "中文名稱",
        cell: (info) => {
          const value = info.getValue();
          const status = info.row.original.translation_status;
          return (
            <div className="flex items-center gap-2">
              <span className="text-sm truncate max-w-[120px]" title={value || ""}>
                {value || "-"}
              </span>
              {status === "confirmed" && (
                <Badge variant="default" className="text-[10px] px-1 py-0">
                  已確認
                </Badge>
              )}
            </div>
          );
        },
        size: 150,
      }),
      columnHelper.accessor("supplier", {
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="h-8 px-2"
          >
            供應商
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: (info) => (
          <div className="max-w-xs truncate text-sm" title={info.getValue()}>
            {info.getValue()}
          </div>
        ),
        size: 150,
      }),
      columnHelper.accessor("supplier_article_no", {
        header: "供應商編號",
        cell: (info) => (
          <div className="text-sm text-muted-foreground">
            {info.getValue() || "-"}
          </div>
        ),
        size: 120,
      }),
      columnHelper.accessor("color", {
        header: "顏色",
        cell: (info) => (
          <div className="text-xs text-muted-foreground truncate max-w-[100px]" title={info.getValue()}>
            {info.getValue() || "-"}
          </div>
        ),
        size: 100,
      }),
      columnHelper.accessor("material_status", {
        header: "狀態",
        cell: (info) => {
          const status = info.getValue();
          return status ? (
            <Badge
              variant={
                status.includes("Approved")
                  ? "default"
                  : status.includes("Rejected")
                  ? "destructive"
                  : "secondary"
              }
              className="text-xs"
            >
              {status}
            </Badge>
          ) : (
            <span className="text-xs text-muted-foreground">-</span>
          );
        },
        size: 130,
      }),
      columnHelper.display({
        id: "consumption",
        header: "用量",
        cell: ({ row }) => (
          <EditableConsumptionCell
            item={row.original}
            revisionId={revisionId}
          />
        ),
        size: 180,
      }),
      columnHelper.accessor("unit", {
        header: "單位",
        cell: (info) => <div className="text-sm">{info.getValue()}</div>,
        size: 60,
      }),
      columnHelper.accessor("unit_price", {
        header: "單價",
        cell: (info) => (
          <div className="text-sm">
            {info.getValue() ? `$${info.getValue()}` : "-"}
          </div>
        ),
        size: 80,
      }),
      columnHelper.accessor("leadtime_days", {
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="h-8 px-2"
          >
            交期(天)
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: (info) => <div className="text-sm">{info.getValue() || "-"}</div>,
        size: 90,
      }),
      columnHelper.display({
        id: "actions",
        header: "操作",
        cell: ({ row }) => (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setTranslatingItem(row.original)}
              title="翻譯"
            >
              <Languages className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setEditingItem(row.original)}
              title="編輯"
            >
              編輯
            </Button>
          </div>
        ),
        size: 120,
      }),
    ],
    [revisionId]
  );

  const table = useReactTable({
    data: bomData?.results || [],
    columns,
    state: {
      sorting,
      columnFilters,
      globalFilter,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="text-sm text-muted-foreground">載入中...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">
          錯誤：{(error as Error).message}
        </div>
      </div>
    );
  }

  const items = bomData?.results || [];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Link href="/dashboard/bom">
              <Button variant="ghost" size="sm" className="gap-1">
                <ArrowLeft className="h-4 w-4" />
                返回
              </Button>
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <Package className="h-6 w-6 text-blue-600" />
            <div>
              <h1 className="text-2xl font-bold">
                {styleNumber || "載入中..."}
                {styleName && <span className="text-muted-foreground font-normal ml-2">- {styleName}</span>}
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                BOM 物料清單 - 管理物料、用量與交期
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => translateBatchMutation.mutate(false)}
            disabled={translateBatchMutation.isPending}
          >
            <Sparkles className="h-4 w-4 mr-2" />
            {translateBatchMutation.isPending ? "翻譯中..." : "AI 批量翻譯"}
          </Button>
          <Badge variant="secondary" className="text-base px-3 py-1">
            共 {items.length} 項
          </Badge>
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center gap-4">
        <Input
          placeholder="搜尋物料名稱、供應商..."
          value={globalFilter ?? ""}
          onChange={(e) => setGlobalFilter(e.target.value)}
          className="max-w-sm"
        />
      </div>

      {/* Table */}
      <div className="rounded-lg border">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id} className="border-b bg-muted/50">
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      style={{ width: header.getSize() }}
                      className="px-4 py-3 text-left text-sm font-medium text-muted-foreground"
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
            <tbody>
              {table.getRowModel().rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="h-24 text-center text-muted-foreground"
                  >
                    無 BOM 資料
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b hover:bg-muted/50 transition-colors"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td
                        key={cell.id}
                        style={{ width: cell.column.getSize() }}
                        className="px-4 py-3"
                      >
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
      </div>

      {/* Edit Drawer */}
      {editingItem && (
        <BOMEditDrawer
          item={editingItem}
          revisionId={revisionId}
          open={!!editingItem}
          onClose={() => setEditingItem(null)}
        />
      )}

      {/* Translation Drawer */}
      {translatingItem && (
        <BOMTranslationDrawer
          item={translatingItem}
          revisionId={revisionId}
          open={!!translatingItem}
          onClose={() => setTranslatingItem(null)}
        />
      )}
    </div>
  );
}
