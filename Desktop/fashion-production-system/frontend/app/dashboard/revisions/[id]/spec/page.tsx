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
import { useMeasurements, useTranslateMeasurementBatch } from "@/lib/hooks/useMeasurement";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { MeasurementEditDrawer } from "@/components/measurement/MeasurementEditDrawer";
import type { MeasurementItem } from "@/lib/types/measurement";
import { ArrowUpDown, Pencil, Sparkles, Ruler, ArrowLeft } from "lucide-react";
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

const columnHelper = createColumnHelper<MeasurementItem>();

export default function SpecPage() {
  const params = useParams();
  const revisionId = params.id as string;
  const [editingItem, setEditingItem] = useState<MeasurementItem | null>(null);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState("");

  const { data: measurementData, isLoading, error } = useMeasurements(revisionId);
  const translateBatchMutation = useTranslateMeasurementBatch(revisionId);

  // 取得款式資訊
  const { data: styleData } = useQuery({
    queryKey: ["style-info", revisionId],
    queryFn: () => fetchStyleInfo(revisionId),
    enabled: !!revisionId,
  });

  const styleNumber = styleData?.style_number || "";
  const styleName = styleData?.style_name || "";

  // Get unique size keys from all measurements
  const sizeKeys = useMemo(() => {
    if (!measurementData?.results) return [];
    const keys = new Set<string>();
    measurementData.results.forEach((item) => {
      if (item.values) {
        Object.keys(item.values).forEach((k) => keys.add(k));
      }
    });
    // Sort sizes in a logical order
    const sizeOrder = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', '2XL', '3XL', '4XL'];
    return Array.from(keys).sort((a, b) => {
      const aIndex = sizeOrder.indexOf(a);
      const bIndex = sizeOrder.indexOf(b);
      if (aIndex >= 0 && bIndex >= 0) return aIndex - bIndex;
      if (aIndex >= 0) return -1;
      if (bIndex >= 0) return 1;
      return a.localeCompare(b);
    });
  }, [measurementData]);

  const columns = useMemo(
    () => [
      columnHelper.accessor("point_name", {
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="h-8 px-2"
          >
            尺寸點
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: (info) => (
          <div className="max-w-xs truncate font-medium" title={info.getValue()}>
            {info.getValue()}
          </div>
        ),
        size: 180,
      }),
      columnHelper.accessor("point_name_zh", {
        header: "中文名稱",
        cell: (info) => {
          const value = info.getValue();
          const status = info.row.original.translation_status;
          return (
            <div className="flex items-center gap-2">
              <span className="text-sm truncate max-w-[100px]" title={value || ""}>
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
        size: 130,
      }),
      columnHelper.accessor("point_code", {
        header: "編碼",
        cell: (info) => (
          <div className="text-sm text-muted-foreground">
            {info.getValue() || "-"}
          </div>
        ),
        size: 80,
      }),
      // Dynamic size columns
      ...sizeKeys.map((sizeKey) =>
        columnHelper.display({
          id: `size_${sizeKey}`,
          header: sizeKey,
          cell: ({ row }) => {
            const value = row.original.values?.[sizeKey];
            return (
              <div className="text-sm text-center font-mono">
                {value !== undefined ? value : "-"}
              </div>
            );
          },
          size: 60,
        })
      ),
      columnHelper.accessor("tolerance_plus", {
        header: "+/-",
        cell: (info) => {
          const plus = info.getValue();
          const minus = info.row.original.tolerance_minus;
          return (
            <div className="text-xs text-muted-foreground text-center">
              +{plus}/-{minus}
            </div>
          );
        },
        size: 70,
      }),
      columnHelper.accessor("unit", {
        header: "單位",
        cell: (info) => <div className="text-sm text-center">{info.getValue()}</div>,
        size: 50,
      }),
      columnHelper.display({
        id: "actions",
        header: "操作",
        cell: ({ row }) => (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setEditingItem(row.original)}
            title="編輯"
          >
            <Pencil className="h-4 w-4" />
          </Button>
        ),
        size: 60,
      }),
    ],
    [sizeKeys]
  );

  const table = useReactTable({
    data: measurementData?.results || [],
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

  const items = measurementData?.results || [];

  // Count translation stats
  const translatedCount = items.filter(
    (item) => item.point_name_zh && item.translation_status === "confirmed"
  ).length;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Link href="/dashboard/spec">
              <Button variant="ghost" size="sm" className="gap-1">
                <ArrowLeft className="h-4 w-4" />
                返回列表
              </Button>
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <Ruler className="h-6 w-6 text-purple-600" />
            <div>
              <h1 className="text-2xl font-bold">
                {styleNumber || "載入中..."}
                {styleName && <span className="text-muted-foreground font-normal ml-2">- {styleName}</span>}
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Spec 尺寸表 - 管理尺寸規格與中文翻譯
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
            {translatedCount}/{items.length} 已翻譯
          </Badge>
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center gap-4">
        <Input
          placeholder="搜尋尺寸點名稱..."
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
                      className="px-3 py-3 text-left text-sm font-medium text-muted-foreground"
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
                    無尺寸資料
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
                        className="px-3 py-2"
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
        <MeasurementEditDrawer
          item={editingItem}
          revisionId={revisionId}
          open={!!editingItem}
          onClose={() => setEditingItem(null)}
        />
      )}
    </div>
  );
}
