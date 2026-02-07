"use client";

import Link from "next/link";
import {
  CheckCircle,
  AlertTriangle,
  XCircle,
  FileText,
  Languages,
  Package,
  Ruler,
  Scissors,
  ClipboardList,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { StyleReadiness } from "@/lib/api/style-detail";

interface ReadinessChecklistProps {
  readiness: StyleReadiness;
  onBatchVerifyBOM?: () => void;
  onBatchVerifySpec?: () => void;
  isBOMVerifying?: boolean;
  isSpecVerifying?: boolean;
}

type ItemStatus = "done" | "partial" | "none";

interface ChecklistItem {
  key: string;
  icon: React.ReactNode;
  label: string;
  status: ItemStatus;
  description: string;
  href: string | null;
  action?: {
    label: string;
    onClick: () => void;
    loading?: boolean;
  };
}

function StatusIcon({ status }: { status: ItemStatus }) {
  if (status === "done") {
    return <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />;
  }
  if (status === "partial") {
    return <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />;
  }
  return <XCircle className="w-5 h-5 text-slate-300 shrink-0" />;
}

function buildItems(
  r: StyleReadiness,
  onBatchVerifyBOM?: () => void,
  onBatchVerifySpec?: () => void,
  isBOMVerifying?: boolean,
  isSpecVerifying?: boolean
): ChecklistItem[] {
  const items: ChecklistItem[] = [];

  // 1. Documents
  const docCount = r.documents?.length || 0;
  items.push({
    key: "documents",
    icon: <FileText className="w-4 h-4" />,
    label: "Documents",
    status: docCount > 0 ? "done" : "none",
    description: docCount > 0 ? `${docCount} file${docCount > 1 ? "s" : ""} uploaded` : "No files uploaded",
    href: "/dashboard/tech-packs",
  });

  // 2. Translation
  const tr = r.translation;
  const trStatus: ItemStatus =
    !tr || tr.total === 0
      ? "none"
      : tr.progress >= 95
      ? "done"
      : "partial";
  items.push({
    key: "translation",
    icon: <Languages className="w-4 h-4" />,
    label: "Translation",
    status: trStatus,
    description:
      !tr || tr.total === 0
        ? "No blocks to translate"
        : `${tr.progress}% (${tr.done}/${tr.total})`,
    href: r.tech_pack_revision_id
      ? `/dashboard/revisions/${r.tech_pack_revision_id}/review`
      : null,
  });

  // 3. BOM
  const bom = r.bom;
  const bomStatus: ItemStatus =
    bom.total === 0
      ? "none"
      : bom.verified === bom.total
      ? "done"
      : "partial";
  const bomAction =
    bomStatus === "partial" && r.revision_id && onBatchVerifyBOM
      ? {
          label: "Verify All",
          onClick: onBatchVerifyBOM,
          loading: isBOMVerifying,
        }
      : undefined;
  items.push({
    key: "bom",
    icon: <Package className="w-4 h-4" />,
    label: "BOM",
    status: bomStatus,
    description:
      bom.total === 0
        ? "No BOM items"
        : `${bom.verified}/${bom.total} verified`,
    href: r.revision_id ? `/dashboard/revisions/${r.revision_id}/bom` : null,
    action: bomAction,
  });

  // 4. Spec
  const spec = r.spec;
  const specStatus: ItemStatus =
    spec.total === 0
      ? "none"
      : spec.verified === spec.total
      ? "done"
      : "partial";
  const specAction =
    specStatus === "partial" && r.revision_id && onBatchVerifySpec
      ? {
          label: "Verify All",
          onClick: onBatchVerifySpec,
          loading: isSpecVerifying,
        }
      : undefined;
  items.push({
    key: "spec",
    icon: <Ruler className="w-4 h-4" />,
    label: "Spec",
    status: specStatus,
    description:
      spec.total === 0
        ? "No measurements"
        : `${spec.verified}/${spec.total} verified`,
    href: r.revision_id ? `/dashboard/revisions/${r.revision_id}/spec` : null,
    action: specAction,
  });

  // 5. Sample Request
  const sr = r.sample_request;
  const srStatus: ItemStatus = !sr
    ? "none"
    : sr.status === "approved" || sr.status === "completed"
    ? "done"
    : "partial";
  items.push({
    key: "sample",
    icon: <Scissors className="w-4 h-4" />,
    label: "Sample",
    status: srStatus,
    description: !sr
      ? "No sample request"
      : `${sr.status.charAt(0).toUpperCase() + sr.status.slice(1).replace(/_/g, " ")}`,
    href: sr ? `/dashboard/samples` : null,
  });

  // 6. MWO
  const run = r.sample_run;
  const mwoStatus: ItemStatus = !run
    ? "none"
    : run.mwo_status === "issued"
    ? "done"
    : run.mwo_status === "draft"
    ? "partial"
    : "none";
  items.push({
    key: "mwo",
    icon: <ClipboardList className="w-4 h-4" />,
    label: "MWO",
    status: mwoStatus,
    description: !run
      ? "No sample run"
      : run.mwo_status === "issued"
      ? "Issued"
      : run.mwo_status === "draft"
      ? "Draft"
      : `Run #${run.run_no} - ${run.status}`,
    href: run ? `/dashboard/samples/kanban` : null,
  });

  return items;
}

export function ReadinessChecklist({
  readiness,
  onBatchVerifyBOM,
  onBatchVerifySpec,
  isBOMVerifying,
  isSpecVerifying,
}: ReadinessChecklistProps) {
  const items = buildItems(
    readiness,
    onBatchVerifyBOM,
    onBatchVerifySpec,
    isBOMVerifying,
    isSpecVerifying
  );

  return (
    <div className="divide-y divide-slate-100">
      {items.map((item) => (
        <div
          key={item.key}
          className="flex items-center gap-3 py-3 px-1"
        >
          <StatusIcon status={item.status} />

          <div className="flex items-center gap-2 text-slate-600 w-28 shrink-0">
            {item.icon}
            <span className="text-sm font-medium">{item.label}</span>
          </div>

          <span className="text-sm text-slate-500 flex-1">
            {item.description}
          </span>

          <div className="flex items-center gap-2 shrink-0">
            {item.action && (
              <Button
                size="sm"
                variant="outline"
                className="text-xs h-7"
                onClick={item.action.onClick}
                disabled={item.action.loading}
              >
                {item.action.loading ? "Verifying..." : item.action.label}
              </Button>
            )}

            {item.href && (
              <Link href={item.href}>
                <Button variant="ghost" size="sm" className="text-xs h-7 gap-1">
                  View
                  <ExternalLink className="w-3 h-3" />
                </Button>
              </Link>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
