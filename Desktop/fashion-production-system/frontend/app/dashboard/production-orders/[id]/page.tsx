"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Calculator,
  FileText,
  CheckCircle,
  Package,
  Calendar,
  DollarSign,
  Layers,
  RefreshCcw,
} from "lucide-react";

import {
  useProductionOrder,
  useCalculateMRP,
  useGeneratePO,
  useConfirmProductionOrder,
  useRequirementsSummary,
} from "@/lib/hooks/useProductionOrders";
import type { ProductionOrderStatus, MaterialRequirement } from "@/lib/types/production-order";
import { PRODUCTION_ORDER_STATUS_OPTIONS } from "@/lib/types/production-order";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function StatusBadge({ status }: { status: ProductionOrderStatus }) {
  const statusColors: Record<ProductionOrderStatus, string> = {
    draft: "bg-gray-100 text-gray-800",
    confirmed: "bg-blue-100 text-blue-800",
    materials_ordered: "bg-purple-100 text-purple-800",
    in_production: "bg-yellow-100 text-yellow-800",
    completed: "bg-green-100 text-green-800",
    cancelled: "bg-red-100 text-red-800",
  };
  const option = PRODUCTION_ORDER_STATUS_OPTIONS.find((o) => o.value === status);
  return (
    <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[status]}`}>
      {option?.label_zh || status}
    </span>
  );
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("zh-TW", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

function formatNumber(num: number): string {
  return new Intl.NumberFormat("en-US").format(num);
}

function formatDecimal(num: number): string {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(num);
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function ProductionOrderDetailPage({ params }: PageProps) {
  const { id } = use(params);
  const router = useRouter();

  const { data: order, isLoading, isError } = useProductionOrder(id);
  const { data: summary } = useRequirementsSummary(id);

  const confirmOrder = useConfirmProductionOrder();
  const calculateMRP = useCalculateMRP();
  const generatePO = useGeneratePO();

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
          <span className="ml-4 text-slate-600">Loading production order...</span>
        </div>
      </div>
    );
  }

  if (isError || !order) {
    return (
      <div className="p-6">
        <div className="text-center">
          <p className="text-red-600">Failed to load production order</p>
          <Button variant="outline" className="mt-4" onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  const handleConfirm = async () => {
    try {
      await confirmOrder.mutateAsync(id);
    } catch (error) {
      console.error("Failed to confirm order:", error);
    }
  };

  const handleCalculateMRP = async () => {
    try {
      await calculateMRP.mutateAsync({ id });
    } catch (error) {
      console.error("Failed to calculate MRP:", error);
    }
  };

  const handleGeneratePO = async () => {
    try {
      const result = await generatePO.mutateAsync({ id });
      if (result.purchase_orders.length > 0) {
        // Could navigate to PO list
        alert(`Generated ${result.purchase_orders.length} purchase order(s)`);
      }
    } catch (error) {
      console.error("Failed to generate PO:", error);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/production-orders">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <Package className="w-6 h-6" />
              {order.order_number}
            </h1>
            <p className="text-slate-500">Customer PO: {order.po_number}</p>
          </div>
          <StatusBadge status={order.status} />
        </div>

        <div className="flex items-center gap-2">
          {/* Action buttons based on status */}
          {order.status === "draft" && (
            <Button onClick={handleConfirm} disabled={confirmOrder.isPending}>
              <CheckCircle className="w-4 h-4 mr-2" />
              {confirmOrder.isPending ? "Confirming..." : "Confirm Order"}
            </Button>
          )}

          {order.status === "confirmed" && !order.mrp_calculated && (
            <Button onClick={handleCalculateMRP} disabled={calculateMRP.isPending}>
              <Calculator className="w-4 h-4 mr-2" />
              {calculateMRP.isPending ? "Calculating..." : "Calculate MRP"}
            </Button>
          )}

          {order.status === "confirmed" && order.mrp_calculated && (
            <>
              <Button
                variant="outline"
                onClick={handleCalculateMRP}
                disabled={calculateMRP.isPending}
              >
                <RefreshCcw className="w-4 h-4 mr-2" />
                Recalculate
              </Button>
              <Button onClick={handleGeneratePO} disabled={generatePO.isPending}>
                <FileText className="w-4 h-4 mr-2" />
                {generatePO.isPending ? "Generating..." : "Generate PO"}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Order Info Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center gap-2 text-slate-500 text-sm mb-1">
            <Package className="w-4 h-4" />
            Customer
          </div>
          <div className="font-semibold">{order.customer}</div>
        </div>

        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center gap-2 text-slate-500 text-sm mb-1">
            <Layers className="w-4 h-4" />
            Total Quantity
          </div>
          <div className="text-2xl font-bold text-blue-600">
            {formatNumber(order.total_quantity)}
          </div>
        </div>

        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center gap-2 text-slate-500 text-sm mb-1">
            <DollarSign className="w-4 h-4" />
            Total Amount
          </div>
          <div className="text-xl font-bold">{formatCurrency(order.total_amount)}</div>
          <div className="text-sm text-slate-500">@ {formatCurrency(order.unit_price)}/pc</div>
        </div>

        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center gap-2 text-slate-500 text-sm mb-1">
            <Calendar className="w-4 h-4" />
            Delivery Date
          </div>
          <div className="font-semibold">{formatDate(order.delivery_date)}</div>
        </div>
      </div>

      {/* Size Breakdown */}
      <div className="bg-white rounded-lg border p-4">
        <h2 className="text-lg font-semibold mb-3">Size Breakdown</h2>
        <div className="flex flex-wrap gap-4">
          {Object.entries(order.size_breakdown).map(([size, qty]) => (
            <div key={size} className="bg-slate-50 rounded-lg px-4 py-2 text-center">
              <div className="text-sm text-slate-500">{size}</div>
              <div className="text-lg font-bold">{formatNumber(qty)}</div>
            </div>
          ))}
        </div>
      </div>

      {/* MRP Summary */}
      {order.mrp_calculated && summary && (
        <div className="bg-white rounded-lg border p-4">
          <h2 className="text-lg font-semibold mb-3">Material Requirements Summary</h2>
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-blue-50 rounded-lg p-3">
              <div className="text-sm text-blue-600">Total Items</div>
              <div className="text-2xl font-bold text-blue-700">{summary.total_items}</div>
            </div>
            <div className="bg-green-50 rounded-lg p-3">
              <div className="text-sm text-green-600">Ready for PO</div>
              <div className="text-2xl font-bold text-green-700">{summary.ready_for_po}</div>
            </div>
            <div className="bg-purple-50 rounded-lg p-3">
              <div className="text-sm text-purple-600">Already Ordered</div>
              <div className="text-2xl font-bold text-purple-700">{summary.already_ordered}</div>
            </div>
            <div className="bg-slate-50 rounded-lg p-3">
              <div className="text-sm text-slate-600">Categories</div>
              <div className="text-2xl font-bold text-slate-700">
                {Object.keys(summary.by_category).length}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Material Requirements Table */}
      {order.material_requirements && order.material_requirements.length > 0 && (
        <div className="bg-white rounded-lg border">
          <div className="p-4 border-b">
            <h2 className="text-lg font-semibold">
              Material Requirements ({order.material_requirements.length})
            </h2>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Category</TableHead>
                <TableHead>Material</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead className="text-right">Consumption</TableHead>
                <TableHead className="text-right">Wastage %</TableHead>
                <TableHead className="text-right">Gross Req.</TableHead>
                <TableHead className="text-right">Total Req.</TableHead>
                <TableHead className="text-right">To Order</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {order.material_requirements.map((req: MaterialRequirement) => (
                <TableRow key={req.id}>
                  <TableCell>
                    <span className="px-2 py-1 bg-slate-100 rounded text-xs font-medium">
                      {req.category}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div>{req.material_name}</div>
                    {req.material_name_zh && (
                      <div className="text-sm text-slate-500">{req.material_name_zh}</div>
                    )}
                  </TableCell>
                  <TableCell>{req.supplier || "-"}</TableCell>
                  <TableCell className="text-right font-mono">
                    {formatDecimal(req.consumption_per_piece)} {req.unit}
                  </TableCell>
                  <TableCell className="text-right">{req.wastage_pct}%</TableCell>
                  <TableCell className="text-right font-mono">
                    {formatDecimal(req.gross_requirement)}
                  </TableCell>
                  <TableCell className="text-right font-mono font-medium">
                    {formatDecimal(req.total_requirement)} {req.unit}
                  </TableCell>
                  <TableCell className="text-right font-mono text-blue-600 font-medium">
                    {formatDecimal(req.order_quantity_needed)}
                  </TableCell>
                  <TableCell>
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        req.status === "ordered"
                          ? "bg-green-100 text-green-800"
                          : req.status === "received"
                          ? "bg-blue-100 text-blue-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {req.status}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Notes */}
      {order.notes && (
        <div className="bg-white rounded-lg border p-4">
          <h2 className="text-lg font-semibold mb-2">Notes</h2>
          <p className="text-slate-600 whitespace-pre-wrap">{order.notes}</p>
        </div>
      )}
    </div>
  );
}
