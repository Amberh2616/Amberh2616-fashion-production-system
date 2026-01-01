'use client';

/**
 * P0-2: Kanban Board for Sample Runs
 *
 * Features:
 * - Visual lanes for each status
 * - Cards showing run details
 * - Overdue/due soon indicators
 * - Quick status transitions
 */

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import {
  fetchKanbanCounts,
  fetchKanbanRuns,
  transitionSampleRun,
  type KanbanLane,
  type KanbanRunItem,
} from '@/lib/api/samples';
import { cn } from '@/lib/utils';

// Status to action mapping for drag-drop transitions
const STATUS_TRANSITIONS: Record<string, string> = {
  draft: 'start-materials-planning',
  materials_planning: 'generate-t2po',
  po_drafted: 'issue-t2po',
  po_issued: 'generate-mwo',
  mwo_drafted: 'issue-mwo',
  mwo_issued: 'start-production',
  in_progress: 'mark-sample-done',
  sample_done: 'record-actuals',
  actuals_recorded: 'generate-sample-costing',
  costing_generated: 'mark-quoted',
  quoted: 'mark-accepted',
};

// Priority colors
const PRIORITY_COLORS: Record<string, string> = {
  urgent: 'border-l-red-500 bg-red-50',
  normal: 'border-l-blue-500 bg-blue-50',
  low: 'border-l-gray-400 bg-gray-50',
};

// Run type badges
const RUN_TYPE_BADGES: Record<string, { label: string; color: string }> = {
  proto: { label: 'Proto', color: 'bg-purple-100 text-purple-700' },
  fit: { label: 'Fit', color: 'bg-green-100 text-green-700' },
  sales: { label: 'Sales', color: 'bg-blue-100 text-blue-700' },
  photo: { label: 'Photo', color: 'bg-orange-100 text-orange-700' },
  other: { label: 'Other', color: 'bg-gray-100 text-gray-700' },
};

// Visible lanes in the Kanban view (exclude completed states)
const VISIBLE_LANES = [
  'draft',
  'materials_planning',
  'po_drafted',
  'po_issued',
  'mwo_drafted',
  'mwo_issued',
  'in_progress',
  'sample_done',
  'actuals_recorded',
  'costing_generated',
  'quoted',
];

export default function KanbanPage() {
  const queryClient = useQueryClient();
  const [selectedLanes] = useState<string[]>(VISIBLE_LANES);

  // Fetch counts
  const { data: countsData, isLoading: countsLoading } = useQuery({
    queryKey: ['kanban-counts'],
    queryFn: () => fetchKanbanCounts(7),
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch all runs
  const { data: runsData, isLoading: runsLoading } = useQuery({
    queryKey: ['kanban-runs'],
    queryFn: () => fetchKanbanRuns({ limit: 50 }),
    refetchInterval: 30000,
  });

  // Transition mutation
  const transitionMutation = useMutation({
    mutationFn: ({ runId, action }: { runId: string; action: string }) =>
      transitionSampleRun(runId, action),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kanban-counts'] });
      queryClient.invalidateQueries({ queryKey: ['kanban-runs'] });
    },
  });

  // Group runs by status
  const runsByStatus = useMemo(() => {
    if (!runsData?.runs) return {};
    const grouped: Record<string, KanbanRunItem[]> = {};
    for (const run of runsData.runs) {
      if (!grouped[run.status]) {
        grouped[run.status] = [];
      }
      grouped[run.status].push(run);
    }
    return grouped;
  }, [runsData]);

  // Filter lanes to visible ones
  const visibleLanes = useMemo(() => {
    if (!countsData?.lanes) return [];
    return countsData.lanes.filter((lane) => selectedLanes.includes(lane.status));
  }, [countsData, selectedLanes]);

  // Handle next action
  const handleNextAction = (run: KanbanRunItem) => {
    const action = STATUS_TRANSITIONS[run.status];
    if (action) {
      transitionMutation.mutate({ runId: run.id, action });
    }
  };

  if (countsLoading || runsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-gray-500">Loading Kanban board...</div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Sample Runs Kanban</h1>
          <p className="text-sm text-gray-500">
            {countsData?.summary.total || 0} total runs |{' '}
            <span className="text-red-600">{countsData?.summary.overdue_total || 0} overdue</span> |{' '}
            <span className="text-amber-600">{countsData?.summary.due_this_week || 0} due this week</span>
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/dashboard/samples"
            className="px-4 py-2 text-sm border rounded-md hover:bg-gray-50"
          >
            List View
          </Link>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="flex gap-3 overflow-x-auto pb-4">
        {visibleLanes.map((lane) => (
          <KanbanLaneComponent
            key={lane.status}
            lane={lane}
            runs={runsByStatus[lane.status] || []}
            onNextAction={handleNextAction}
            isTransitioning={transitionMutation.isPending}
          />
        ))}
      </div>
    </div>
  );
}

// Kanban Lane Component
function KanbanLaneComponent({
  lane,
  runs,
  onNextAction,
  isTransitioning,
}: {
  lane: KanbanLane;
  runs: KanbanRunItem[];
  onNextAction: (run: KanbanRunItem) => void;
  isTransitioning: boolean;
}) {
  return (
    <div className="flex-shrink-0 w-72 bg-gray-100 rounded-lg">
      {/* Lane Header */}
      <div className="p-3 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="font-medium text-sm">{lane.label}</h3>
          <span className="px-2 py-0.5 text-xs bg-white rounded-full">
            {lane.count}
          </span>
        </div>
        {(lane.overdue > 0 || lane.due_soon > 0) && (
          <div className="flex gap-2 mt-1 text-xs">
            {lane.overdue > 0 && (
              <span className="text-red-600">{lane.overdue} overdue</span>
            )}
            {lane.due_soon > 0 && (
              <span className="text-amber-600">{lane.due_soon} due soon</span>
            )}
          </div>
        )}
      </div>

      {/* Cards */}
      <div className="p-2 space-y-2 max-h-[calc(100vh-240px)] overflow-y-auto">
        {runs.length === 0 ? (
          <div className="p-4 text-center text-sm text-gray-400">No items</div>
        ) : (
          runs.map((run) => (
            <KanbanCard
              key={run.id}
              run={run}
              onNextAction={onNextAction}
              isTransitioning={isTransitioning}
            />
          ))
        )}
      </div>
    </div>
  );
}

// Kanban Card Component
function KanbanCard({
  run,
  onNextAction,
  isTransitioning,
}: {
  run: KanbanRunItem;
  onNextAction: (run: KanbanRunItem) => void;
  isTransitioning: boolean;
}) {
  const runTypeBadge = RUN_TYPE_BADGES[run.run_type] || RUN_TYPE_BADGES.other;
  const priorityColor = PRIORITY_COLORS[run.sample_request.priority] || PRIORITY_COLORS.normal;
  const hasNextAction = STATUS_TRANSITIONS[run.status] !== undefined;

  return (
    <div
      className={cn(
        'bg-white rounded-md shadow-sm border-l-4 p-3 cursor-pointer hover:shadow-md transition-shadow',
        priorityColor
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className={cn('px-1.5 py-0.5 text-xs rounded', runTypeBadge.color)}>
              {runTypeBadge.label}
            </span>
            <span className="text-xs text-gray-500">#{run.run_no}</span>
          </div>
          {run.style && (
            <Link
              href={`/dashboard/revisions/${run.revision?.id}/review`}
              className="block text-sm font-medium text-gray-900 truncate hover:text-blue-600 mt-1"
            >
              {run.style.style_number}
            </Link>
          )}
        </div>
      </div>

      {/* Style Name */}
      {run.style && (
        <p className="text-xs text-gray-500 truncate mb-2">{run.style.style_name}</p>
      )}

      {/* Brand & Quantity */}
      <div className="flex items-center justify-between text-xs text-gray-600 mb-2">
        <span>{run.sample_request.brand_name || 'N/A'}</span>
        <span>Qty: {run.quantity}</span>
      </div>

      {/* Due Date */}
      {run.target_due_date && (
        <div
          className={cn(
            'text-xs mb-2',
            run.is_overdue ? 'text-red-600 font-medium' : 'text-gray-500'
          )}
        >
          Due: {new Date(run.target_due_date).toLocaleDateString()}
          {run.days_until_due !== null && (
            <span className="ml-1">
              ({run.days_until_due < 0 ? `${Math.abs(run.days_until_due)}d late` : `${run.days_until_due}d`})
            </span>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 mt-2 pt-2 border-t border-gray-100">
        <Link
          href={`/dashboard/samples/${run.sample_request.id}/runs/${run.id}`}
          className="flex-1 text-center text-xs py-1 px-2 border rounded hover:bg-gray-50"
        >
          View
        </Link>
        {hasNextAction && (
          <button
            onClick={() => onNextAction(run)}
            disabled={isTransitioning}
            className="flex-1 text-center text-xs py-1 px-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            Next
          </button>
        )}
      </div>
    </div>
  );
}
