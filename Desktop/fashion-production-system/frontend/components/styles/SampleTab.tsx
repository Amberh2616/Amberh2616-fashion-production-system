"use client";

import Link from "next/link";
import { Scissors, Download, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useRunsSummary } from "@/lib/hooks/useSamples";
import { API_BASE_URL } from "@/lib/api/client";
import type { StyleReadiness } from "@/lib/api/style-detail";

interface SampleTabProps {
  sampleRequest: StyleReadiness["sample_request"];
  sampleRun: StyleReadiness["sample_run"];
}

const statusVariant: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  draft: "outline",
  submitted: "secondary",
  quoted: "secondary",
  pending_approval: "secondary",
  approved: "default",
  completed: "default",
  rejected: "destructive",
  cancelled: "destructive",
  materials: "secondary",
  po_issued: "secondary",
  in_production: "secondary",
};

function formatStatus(status: string): string {
  return status
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function SampleTab({ sampleRequest, sampleRun }: SampleTabProps) {
  const { data: runsSummary, isLoading } = useRunsSummary(
    sampleRequest?.id ?? null
  );

  if (!sampleRequest) {
    return (
      <div className="text-center py-12">
        <Scissors className="w-10 h-10 text-slate-300 mx-auto mb-3" />
        <p className="text-sm text-slate-500">
          No sample request created yet.
        </p>
        <Link href="/dashboard/samples" className="inline-block mt-4">
          <Button variant="outline" size="sm">
            Go to Samples
          </Button>
        </Link>
      </div>
    );
  }

  const runs = runsSummary?.runs ?? [];

  return (
    <div className="space-y-4">
      {/* Sample Request Info */}
      <div className="flex items-center gap-3 bg-slate-50 rounded-md px-4 py-3">
        <div className="flex-1">
          <span className="text-sm font-medium text-slate-700">
            Sample Request
          </span>
          <span className="text-xs text-slate-500 ml-2">
            {sampleRequest.request_type?.replace(/_/g, " ") ?? ""}
          </span>
        </div>
        <Badge variant={statusVariant[sampleRequest.status] ?? "outline"}>
          {formatStatus(sampleRequest.status)}
        </Badge>
      </div>

      {/* Runs Table */}
      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-solid border-blue-600 border-r-transparent" />
        </div>
      ) : runs.length === 0 ? (
        <p className="text-sm text-slate-500 text-center py-6">
          No sample runs yet.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-slate-500">
                <th className="pb-2 font-medium">Run</th>
                <th className="pb-2 font-medium">Type</th>
                <th className="pb-2 font-medium">Status</th>
                <th className="pb-2 font-medium text-right">Qty</th>
                <th className="pb-2 font-medium">Due Date</th>
                <th className="pb-2 font-medium w-20">MWO</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {runs.map((run) => {
                const isCurrent = sampleRun?.id === run.id;
                const hasMWO =
                  isCurrent &&
                  sampleRun?.mwo_id &&
                  sampleRun?.mwo_status === "issued";
                const mwoDownloadUrl = hasMWO
                  ? `${API_BASE_URL}/sample-runs/${run.id}/export-mwo-complete-pdf/`
                  : null;

                return (
                  <tr
                    key={run.id}
                    className={`hover:bg-slate-50 ${
                      isCurrent ? "bg-blue-50/50" : ""
                    }`}
                  >
                    <td className="py-2 pr-3 font-medium">
                      #{run.run_no}
                    </td>
                    <td className="py-2 pr-3 text-slate-600">
                      {run.run_type_label || run.run_type}
                    </td>
                    <td className="py-2 pr-3">
                      <Badge
                        variant={statusVariant[run.status] ?? "outline"}
                        className="text-xs"
                      >
                        {run.status_label || formatStatus(run.status)}
                      </Badge>
                    </td>
                    <td className="py-2 pr-3 text-right">{run.quantity}</td>
                    <td className="py-2 pr-3 text-slate-500 text-xs">
                      {run.target_due_date ?? "-"}
                    </td>
                    <td className="py-2">
                      {mwoDownloadUrl ? (
                        <a
                          href={mwoDownloadUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 gap-1 text-xs"
                          >
                            <Download className="w-3 h-3" />
                            PDF
                          </Button>
                        </a>
                      ) : isCurrent && sampleRun?.mwo_status ? (
                        <span className="text-xs text-slate-400 capitalize">
                          {sampleRun.mwo_status}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-300">-</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 pt-1">
        <Link href="/dashboard/samples/kanban">
          <Button variant="outline" size="sm" className="gap-1">
            View Kanban
            <ExternalLink className="w-3 h-3" />
          </Button>
        </Link>
      </div>
    </div>
  );
}
