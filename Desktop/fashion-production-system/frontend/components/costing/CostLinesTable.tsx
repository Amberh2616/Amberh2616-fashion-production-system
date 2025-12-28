"use client";

/**
 * Cost Lines Table
 * Read-only TanStack Table displaying BOM snapshot
 */

import { useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  createColumnHelper,
  flexRender,
  type SortingState,
} from '@tanstack/react-table';
import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import type { CostLine } from '@/lib/types/costing';

interface CostLinesTableProps {
  lines: CostLine[];
}

const columnHelper = createColumnHelper<CostLine>();

export function CostLinesTable({ lines }: CostLinesTableProps) {
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'sort_order', desc: false },
  ]);

  const columns = useMemo(
    () => [
      columnHelper.accessor('sort_order', {
        id: 'sort_order',
        header: '#',
        cell: ({ row }) => (
          <div className="text-muted-foreground">
            {row.original.sort_order + 1}
          </div>
        ),
        size: 50,
      }),
      columnHelper.accessor('category', {
        id: 'category',
        header: 'Category',
        cell: ({ getValue }) => {
          const category = getValue();
          const variant =
            category === 'fabric'
              ? 'default'
              : category === 'trim'
              ? 'secondary'
              : 'outline';
          return <Badge variant={variant}>{category}</Badge>;
        },
        size: 100,
      }),
      columnHelper.accessor('material_name', {
        id: 'material_name',
        header: 'Material Name',
        cell: ({ getValue }) => (
          <div className="font-medium">{getValue()}</div>
        ),
        size: 300,
      }),
      columnHelper.accessor('supplier', {
        id: 'supplier',
        header: 'Supplier',
        cell: ({ getValue }) => (
          <div className="text-sm text-muted-foreground">{getValue()}</div>
        ),
        size: 200,
      }),
      columnHelper.accessor('consumption', {
        id: 'consumption',
        header: 'Consumption',
        cell: ({ row }) => (
          <div className="text-right">
            {parseFloat(row.original.consumption).toFixed(4)} {row.original.unit}
          </div>
        ),
        size: 120,
      }),
      columnHelper.accessor('unit_price', {
        id: 'unit_price',
        header: 'Unit Price',
        cell: ({ getValue }) => (
          <div className="text-right">
            ${parseFloat(getValue()).toFixed(2)}
          </div>
        ),
        size: 100,
      }),
      columnHelper.accessor('line_cost', {
        id: 'line_cost',
        header: 'Line Cost',
        cell: ({ getValue }) => (
          <div className="text-right font-semibold">
            ${parseFloat(getValue()).toFixed(4)}
          </div>
        ),
        size: 120,
      }),
    ],
    []
  );

  const table = useReactTable({
    data: lines,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const totalCost = useMemo(() => {
    return lines.reduce((sum, line) => sum + parseFloat(line.line_cost), 0);
  }, [lines]);

  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} style={{ width: header.getSize() }}>
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
            {table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center text-muted-foreground"
                >
                  No cost lines found.
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
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
            )}
          </TableBody>
        </Table>
      </div>

      {/* Total */}
      <div className="flex items-center justify-end gap-4 text-sm">
        <span className="text-muted-foreground">Total Material Cost:</span>
        <span className="text-xl font-bold">${totalCost.toFixed(4)}</span>
      </div>
    </div>
  );
}
