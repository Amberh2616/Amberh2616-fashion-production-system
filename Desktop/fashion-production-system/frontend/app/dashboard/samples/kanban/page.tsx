'use client';

/**
 * P0-2 Enhanced: Kanban Board for 300+ Sample Runs
 *
 * Features:
 * - Filter bar (search, brand, priority, due, type)
 * - Collapsible lanes (show count, expand on click)
 * - View presets (All, Urgent, Overdue, This Week)
 * - Visual priority and overdue indicators
 */

import { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import {
  fetchKanbanCounts,
  fetchKanbanRuns,
  transitionSampleRun,
  batchTransitionSampleRuns,
  exportMWO,
  exportEstimate,
  exportPO,
  exportMWOPDF,
  exportEstimatePDF,
  exportPOPDF,
  batchExportSampleRuns,
  downloadBlob,
  type KanbanLane,
  type KanbanRunItem,
  type KanbanFilters,
} from '@/lib/api/samples';
import { cn } from '@/lib/utils';
import { AlertsPanel } from '@/components/alerts/AlertsPanel';
import { FileText, DollarSign, ShoppingCart, Download } from 'lucide-react';

// Status to action mapping (backend API endpoints)
const STATUS_TO_ACTION: Record<string, { action: string; label: string }> = {
  draft: { action: 'start-materials-planning', label: 'Start Planning' },
  materials_planning: { action: 'generate-t2po', label: 'Gen T2PO' },
  po_drafted: { action: 'issue-t2po', label: 'Issue PO' },
  po_issued: { action: 'generate-mwo', label: 'Gen MWO' },
  mwo_drafted: { action: 'issue-mwo', label: 'Issue MWO' },
  mwo_issued: { action: 'start-production', label: 'Start Prod' },
  in_progress: { action: 'mark-sample-done', label: 'Done' },
  sample_done: { action: 'record-actuals', label: 'Record' },
  actuals_recorded: { action: 'generate-sample-costing', label: 'Gen Cost' },
  costing_generated: { action: 'mark-quoted', label: 'Quote' },
  quoted: { action: 'mark-accepted', label: 'Accept' },
};

// View presets
type ViewPreset = 'all' | 'urgent' | 'overdue' | 'this_week';

const VIEW_PRESETS: { key: ViewPreset; label: string; filters: KanbanFilters }[] = [
  { key: 'all', label: 'All', filters: {} },
  { key: 'urgent', label: 'Urgent', filters: { priority: 'urgent' } },
  { key: 'overdue', label: 'Overdue', filters: { overdue_only: true } },
  { key: 'this_week', label: 'This Week', filters: { due_this_week: true } },
];

// Priority colors
const PRIORITY_COLORS: Record<string, string> = {
  urgent: 'border-l-red-500 bg-red-50',
  normal: 'border-l-blue-500 bg-blue-50',
  low: 'border-l-gray-400 bg-gray-50',
};

// Run type badges
const RUN_TYPE_OPTIONS = [
  { value: '', label: 'All Types' },
  { value: 'proto', label: 'Proto' },
  { value: 'fit', label: 'Fit' },
  { value: 'sales', label: 'Sales' },
  { value: 'photo', label: 'Photo' },
];

const RUN_TYPE_BADGES: Record<string, { label: string; color: string }> = {
  proto: { label: 'Proto', color: 'bg-purple-100 text-purple-700' },
  fit: { label: 'Fit', color: 'bg-green-100 text-green-700' },
  sales: { label: 'Sales', color: 'bg-blue-100 text-blue-700' },
  photo: { label: 'Photo', color: 'bg-orange-100 text-orange-700' },
  other: { label: 'Other', color: 'bg-gray-100 text-gray-700' },
};

// Visible lanes
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
  'accepted',
];

export default function KanbanPage() {
  const queryClient = useQueryClient();

  // Filter state
  const [activePreset, setActivePreset] = useState<ViewPreset>('all');
  const [search, setSearch] = useState('');
  const [priority, setPriority] = useState('');
  const [runType, setRunType] = useState('');
  const [expandedLanes, setExpandedLanes] = useState<Set<string>>(new Set(VISIBLE_LANES));

  // P1: Multi-select state
  const [selectedRuns, setSelectedRuns] = useState<Set<string>>(new Set());

  // P1: Alerts panel visibility
  const [showAlerts, setShowAlerts] = useState(true);

  // Build filters
  const filters: KanbanFilters = useMemo(() => {
    const presetFilters = VIEW_PRESETS.find((p) => p.key === activePreset)?.filters || {};
    return {
      ...presetFilters,
      search: search || undefined,
      priority: priority || presetFilters.priority,
      run_type: runType || undefined,
      limit: 100,
    };
  }, [activePreset, search, priority, runType]);

  // Fetch counts
  const { data: countsData, isLoading: countsLoading } = useQuery({
    queryKey: ['kanban-counts'],
    queryFn: () => fetchKanbanCounts(7),
    refetchInterval: 30000,
  });

  // Fetch runs with filters
  const { data: runsData, isLoading: runsLoading } = useQuery({
    queryKey: ['kanban-runs', filters],
    queryFn: () => fetchKanbanRuns(filters),
    refetchInterval: 30000,
  });

  // Error state for showing error messages
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Transition mutation
  const transitionMutation = useMutation({
    mutationFn: ({ runId, action }: { runId: string; action: string }) =>
      transitionSampleRun(runId, action),
    onSuccess: () => {
      setErrorMsg(null);
      queryClient.invalidateQueries({ queryKey: ['kanban-counts'] });
      queryClient.invalidateQueries({ queryKey: ['kanban-runs'] });
    },
    onError: (error: Error) => {
      console.error('Transition error:', error);
      setErrorMsg(error.message || 'Transition failed');
      // Auto-clear after 5 seconds
      setTimeout(() => setErrorMsg(null), 5000);
    },
  });

  // P1: Batch transition mutation
  const batchTransitionMutation = useMutation({
    mutationFn: ({ runIds, action }: { runIds: string[]; action: string }) =>
      batchTransitionSampleRuns(runIds, action),
    onSuccess: (data) => {
      setSelectedRuns(new Set());
      queryClient.invalidateQueries({ queryKey: ['kanban-counts'] });
      queryClient.invalidateQueries({ queryKey: ['kanban-runs'] });
      if (data.failed > 0) {
        setErrorMsg(`Batch: ${data.succeeded} succeeded, ${data.failed} failed`);
        setTimeout(() => setErrorMsg(null), 5000);
      } else {
        setErrorMsg(null);
      }
    },
    onError: (error: Error) => {
      console.error('Batch transition error:', error);
      setErrorMsg(error.message || 'Batch transition failed');
      setTimeout(() => setErrorMsg(null), 5000);
    },
  });

  // P1: Toggle run selection
  const toggleRunSelection = useCallback((runId: string) => {
    setSelectedRuns((prev) => {
      const next = new Set(prev);
      if (next.has(runId)) {
        next.delete(runId);
      } else {
        next.add(runId);
      }
      return next;
    });
  }, []);

  // P1: Clear selection
  const clearSelection = useCallback(() => {
    setSelectedRuns(new Set());
  }, []);

  // P1: Get selected runs' common status (for batch action)
  const selectedRunsStatus = useMemo(() => {
    if (selectedRuns.size === 0 || !runsData?.runs) return null;
    const selectedRunsArr = runsData.runs.filter((r) => selectedRuns.has(r.id));
    if (selectedRunsArr.length === 0) return null;
    const statuses = new Set(selectedRunsArr.map((r) => r.status));
    return statuses.size === 1 ? [...statuses][0] : null;
  }, [selectedRuns, runsData]);

  // P1: Get batch action for selected runs
  const batchAction = useMemo(() => {
    if (!selectedRunsStatus) return null;
    return STATUS_TO_ACTION[selectedRunsStatus] || null;
  }, [selectedRunsStatus]);

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

  // Filter visible lanes
  const visibleLanes = useMemo(() => {
    if (!countsData?.lanes) return [];
    return countsData.lanes.filter((lane) => VISIBLE_LANES.includes(lane.status));
  }, [countsData]);

  // Toggle lane expansion
  const toggleLane = useCallback((status: string) => {
    setExpandedLanes((prev) => {
      const next = new Set(prev);
      if (next.has(status)) {
        next.delete(status);
      } else {
        next.add(status);
      }
      return next;
    });
  }, []);

  // Expand/collapse all
  const expandAll = () => setExpandedLanes(new Set(VISIBLE_LANES));
  const collapseAll = () => setExpandedLanes(new Set());

  // Clear filters
  const clearFilters = () => {
    setActivePreset('all');
    setSearch('');
    setPriority('');
    setRunType('');
  };

  const hasActiveFilters = search || priority || runType || activePreset !== 'all';

  if (countsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-gray-500">Loading Kanban board...</div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {/* Error Message */}
      {errorMsg && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
          <strong className="font-bold">Error: </strong>
          <span className="block sm:inline">{errorMsg}</span>
          <button
            onClick={() => setErrorMsg(null)}
            className="absolute top-0 bottom-0 right-0 px-4 py-3"
          >
            ×
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Sample Runs Kanban</h1>
          <p className="text-sm text-gray-500">
            {countsData?.summary.total || 0} total |{' '}
            <span className="text-red-600 font-medium">
              {countsData?.summary.overdue_total || 0} overdue
            </span>{' '}
            |{' '}
            <span className="text-amber-600">
              {countsData?.summary.due_this_week || 0} due this week
            </span>
          </p>
        </div>
        <div className="flex gap-2">
          {/* P1: Batch Actions */}
          {selectedRuns.size > 0 && (
            <div className="flex items-center gap-2 mr-4 px-3 py-1 bg-blue-50 rounded-lg border border-blue-200">
              <span className="text-sm font-medium text-blue-700">
                {selectedRuns.size} selected
              </span>
              {batchAction && (
                <button
                  onClick={() => {
                    batchTransitionMutation.mutate({
                      runIds: [...selectedRuns],
                      action: batchAction.action,
                    });
                  }}
                  disabled={batchTransitionMutation.isPending}
                  className="px-3 py-1 text-xs font-medium bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  {batchTransitionMutation.isPending ? '...' : `→ ${batchAction.label} All`}
                </button>
              )}
              {!batchAction && selectedRuns.size > 0 && (
                <span className="text-xs text-amber-600">Mixed status</span>
              )}

              {/* P3: Batch Export Buttons */}
              <button
                onClick={async () => {
                  try {
                    const blob = await batchExportSampleRuns(
                      Array.from(selectedRuns),
                      ['mwo', 'estimate', 'po'],
                      'pdf'
                    );
                    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
                    downloadBlob(blob, `export_${selectedRuns.size}_runs_pdf_${timestamp}.zip`);
                  } catch (error) {
                    console.error('Batch export PDF failed:', error);
                    alert('Failed to export PDF. Please try again.');
                  }
                }}
                className="px-2 py-1 text-xs font-medium bg-red-500 text-white rounded hover:bg-red-600 flex items-center gap-1"
                title="Export selected runs as PDF"
              >
                <Download className="h-3 w-3" />
                PDF
              </button>

              <button
                onClick={async () => {
                  try {
                    const blob = await batchExportSampleRuns(
                      Array.from(selectedRuns),
                      ['mwo', 'estimate', 'po'],
                      'excel'
                    );
                    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
                    downloadBlob(blob, `export_${selectedRuns.size}_runs_excel_${timestamp}.zip`);
                  } catch (error) {
                    console.error('Batch export Excel failed:', error);
                    alert('Failed to export Excel. Please try again.');
                  }
                }}
                className="px-2 py-1 text-xs font-medium bg-green-500 text-white rounded hover:bg-green-600 flex items-center gap-1"
                title="Export selected runs as Excel"
              >
                <Download className="h-3 w-3" />
                Excel
              </button>

              <button
                onClick={clearSelection}
                className="px-2 py-1 text-xs text-gray-600 hover:text-gray-900"
              >
                ✕
              </button>
            </div>
          )}
          <button
            onClick={collapseAll}
            className="px-3 py-1.5 text-xs border rounded hover:bg-gray-50"
          >
            Collapse All
          </button>
          <button
            onClick={expandAll}
            className="px-3 py-1.5 text-xs border rounded hover:bg-gray-50"
          >
            Expand All
          </button>
          <button
            onClick={() => setShowAlerts(!showAlerts)}
            className={cn(
              'px-3 py-1.5 text-xs border rounded hover:bg-gray-50',
              showAlerts && 'bg-red-50 border-red-200'
            )}
          >
            {showAlerts ? 'Hide Alerts' : 'Show Alerts'}
          </button>
          <Link
            href="/dashboard/samples"
            className="px-4 py-1.5 text-sm border rounded-md hover:bg-gray-50"
          >
            List View
          </Link>
        </div>
      </div>

      {/* P1: Alerts Panel */}
      {showAlerts && (
        <AlertsPanel
          limit={5}
          compact={true}
          refreshInterval={30000}
          className="shadow-sm"
        />
      )}

      {/* Filter Bar */}
      <div className="bg-gray-50 rounded-lg p-4 space-y-3">
        {/* View Presets */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-600">View:</span>
          {VIEW_PRESETS.map((preset) => (
            <button
              key={preset.key}
              onClick={() => setActivePreset(preset.key)}
              className={cn(
                'px-3 py-1 text-sm rounded-full transition-colors',
                activePreset === preset.key
                  ? 'bg-blue-600 text-white'
                  : 'bg-white border hover:bg-gray-100'
              )}
            >
              {preset.label}
            </button>
          ))}
        </div>

        {/* Filters Row */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="flex-1 min-w-[200px]">
            <input
              type="text"
              placeholder="Search style number or brand..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Priority */}
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            className="px-3 py-2 text-sm border rounded-md bg-white"
          >
            <option value="">All Priority</option>
            <option value="urgent">🔴 Urgent</option>
            <option value="normal">🔵 Normal</option>
            <option value="low">⚪ Low</option>
          </select>

          {/* Run Type */}
          <select
            value={runType}
            onChange={(e) => setRunType(e.target.value)}
            className="px-3 py-2 text-sm border rounded-md bg-white"
          >
            {RUN_TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          {/* Clear Filters */}
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="px-3 py-2 text-sm text-red-600 hover:text-red-800"
            >
              Clear Filters
            </button>
          )}
        </div>

        {/* Active Filter Summary */}
        {hasActiveFilters && (
          <div className="text-xs text-gray-500">
            Showing {runsData?.runs.length || 0} runs with active filters
          </div>
        )}
      </div>

      {/* Kanban Board */}
      <div className="flex gap-2 overflow-x-auto pb-4">
        {visibleLanes.map((lane) => (
          <KanbanLaneComponent
            key={lane.status}
            lane={lane}
            runs={runsByStatus[lane.status] || []}
            isExpanded={expandedLanes.has(lane.status)}
            onToggle={() => toggleLane(lane.status)}
            onNextAction={(run) => {
              const nextAction = STATUS_TO_ACTION[run.status];
              if (nextAction) {
                transitionMutation.mutate({ runId: run.id, action: nextAction.action });
              }
            }}
            isTransitioning={transitionMutation.isPending}
            selectedRuns={selectedRuns}
            onToggleSelect={toggleRunSelection}
          />
        ))}
      </div>
    </div>
  );
}

// Kanban Lane Component (Collapsible)
function KanbanLaneComponent({
  lane,
  runs,
  isExpanded,
  onToggle,
  onNextAction,
  isTransitioning,
  selectedRuns,
  onToggleSelect,
}: {
  lane: KanbanLane;
  runs: KanbanRunItem[];
  isExpanded: boolean;
  onToggle: () => void;
  onNextAction: (run: KanbanRunItem) => void;
  isTransitioning: boolean;
  selectedRuns: Set<string>;
  onToggleSelect: (runId: string) => void;
}) {
  return (
    <div
      className={cn(
        'flex-shrink-0 bg-gray-100 rounded-lg transition-all',
        isExpanded ? 'w-72' : 'w-20'
      )}
    >
      {/* Lane Header (Clickable) */}
      <div
        onClick={onToggle}
        className="p-3 border-b border-gray-200 cursor-pointer hover:bg-gray-200 transition-colors"
      >
        <div className="flex items-center justify-between">
          <h3
            className={cn(
              'font-medium text-sm truncate',
              !isExpanded && 'writing-mode-vertical'
            )}
            style={!isExpanded ? { writingMode: 'vertical-rl' } : undefined}
          >
            {isExpanded ? lane.label : lane.label.slice(0, 8)}
          </h3>
          <div className="flex flex-col items-end gap-1">
            <span
              className={cn(
                'px-2 py-0.5 text-xs rounded-full font-medium',
                lane.count > 0 ? 'bg-blue-100 text-blue-700' : 'bg-gray-200 text-gray-500'
              )}
            >
              {lane.count}
            </span>
            {lane.overdue > 0 && (
              <span className="px-1.5 py-0.5 text-xs bg-red-100 text-red-700 rounded">
                {lane.overdue}!
              </span>
            )}
          </div>
        </div>
        {isExpanded && (lane.overdue > 0 || lane.due_soon > 0) && (
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

      {/* Cards (Only when expanded) */}
      {isExpanded && (
        <div className="p-2 space-y-2 max-h-[calc(100vh-320px)] overflow-y-auto">
          {runs.length === 0 ? (
            <div className="p-4 text-center text-sm text-gray-400">No items</div>
          ) : (
            runs.map((run) => (
              <KanbanCard
                key={run.id}
                run={run}
                onNextAction={onNextAction}
                isTransitioning={isTransitioning}
                isSelected={selectedRuns.has(run.id)}
                onToggleSelect={() => onToggleSelect(run.id)}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}

// Kanban Card Component (Compact)
function KanbanCard({
  run,
  onNextAction,
  isTransitioning,
  isSelected,
  onToggleSelect,
}: {
  run: KanbanRunItem;
  onNextAction: (run: KanbanRunItem) => void;
  isTransitioning: boolean;
  isSelected: boolean;
  onToggleSelect: () => void;
}) {
  const runTypeBadge = RUN_TYPE_BADGES[run.run_type] || RUN_TYPE_BADGES.other;
  const priorityColor = PRIORITY_COLORS[run.sample_request.priority] || PRIORITY_COLORS.normal;
  const nextAction = STATUS_TO_ACTION[run.status];

  return (
    <div
      className={cn(
        'bg-white rounded-md shadow-sm border-l-4 p-2.5 hover:shadow-md transition-shadow',
        priorityColor,
        isSelected && 'ring-2 ring-blue-500 ring-offset-1'
      )}
    >
      {/* Header Row with Checkbox */}
      <div className="flex items-center justify-between gap-1 mb-1">
        <div className="flex items-center gap-1.5">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={(e) => {
              e.stopPropagation();
              onToggleSelect();
            }}
            className="w-3.5 h-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
          />
          <span className={cn('px-1.5 py-0.5 text-xs rounded', runTypeBadge.color)}>
            {runTypeBadge.label}
          </span>
        </div>
        <span className="text-xs text-gray-400">#{run.run_no}</span>
      </div>

      {/* Style Number */}
      {run.style && (
        <Link
          href={`/dashboard/samples/${run.sample_request.id}/runs/${run.id}`}
          className="block text-sm font-semibold text-gray-900 truncate hover:text-blue-600"
        >
          {run.style.style_number}
        </Link>
      )}

      {/* Brand & Qty */}
      <div className="flex items-center justify-between text-xs text-gray-500 mt-1">
        <span className="truncate">{run.sample_request.brand_name || '-'}</span>
        <span>×{run.quantity}</span>
      </div>

      {/* Due Date */}
      {run.target_due_date && (
        <div
          className={cn(
            'text-xs mt-1',
            run.is_overdue ? 'text-red-600 font-semibold' : 'text-gray-400'
          )}
        >
          {run.is_overdue ? '⚠️ ' : ''}
          {new Date(run.target_due_date).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
          })}
          {run.days_until_due !== null && (
            <span className="ml-1">
              ({run.days_until_due < 0 ? `${Math.abs(run.days_until_due)}d late` : `${run.days_until_due}d`})
            </span>
          )}
        </div>
      )}

      {/* Action Button */}
      {nextAction && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onNextAction(run);
          }}
          disabled={isTransitioning}
          className={cn(
            'w-full mt-2 py-1 text-xs font-medium rounded transition-colors',
            'bg-blue-600 text-white hover:bg-blue-700',
            'disabled:opacity-50 disabled:cursor-not-allowed'
          )}
        >
          {isTransitioning ? '...' : `→ ${nextAction.label}`}
        </button>
      )}

      {/* P2: Excel Export Buttons */}
      <div className="flex gap-1 mt-2 pt-2 border-t border-gray-100">
        <button
          onClick={async (e) => {
            e.stopPropagation();
            try {
              const blob = await exportMWO(run.id);
              downloadBlob(blob, `MWO_${run.style?.style_number || 'unknown'}_Run${run.run_no}.xlsx`);
            } catch (error) {
              console.error('Export MWO failed:', error);
              alert('Failed to export MWO. Please try again.');
            }
          }}
          className="flex-1 flex items-center justify-center gap-1 py-1 text-xs bg-blue-50 hover:bg-blue-100 rounded transition-colors"
          title="Download MWO"
        >
          <FileText className="h-3 w-3" />
          <span>MWO</span>
        </button>

        <button
          onClick={async (e) => {
            e.stopPropagation();
            try {
              const blob = await exportEstimate(run.id);
              downloadBlob(blob, `Estimate_${run.style?.style_number || 'unknown'}_Run${run.run_no}.xlsx`);
            } catch (error) {
              console.error('Export Estimate failed:', error);
              alert('Failed to export Estimate. Please try again.');
            }
          }}
          className="flex-1 flex items-center justify-center gap-1 py-1 text-xs bg-green-50 hover:bg-green-100 rounded transition-colors"
          title="Download Estimate"
        >
          <DollarSign className="h-3 w-3" />
          <span>Quote</span>
        </button>

        <button
          onClick={async (e) => {
            e.stopPropagation();
            try {
              const blob = await exportPO(run.id);
              downloadBlob(blob, `T2PO_${run.style?.style_number || 'unknown'}_Run${run.run_no}.xlsx`);
            } catch (error) {
              console.error('Export PO failed:', error);
              alert('Failed to export PO. Please try again.');
            }
          }}
          className="flex-1 flex items-center justify-center gap-1 py-1 text-xs bg-purple-50 hover:bg-purple-100 rounded transition-colors"
          title="Download T2 PO"
        >
          <ShoppingCart className="h-3 w-3" />
          <span>PO</span>
        </button>
      </div>

      {/* P3: PDF Export Buttons */}
      <div className="flex gap-1 mt-1">
        <button
          onClick={async (e) => {
            e.stopPropagation();
            try {
              const blob = await exportMWOPDF(run.id);
              downloadBlob(blob, `MWO_${run.style?.style_number || 'unknown'}_Run${run.run_no}.pdf`);
            } catch (error) {
              console.error('Export MWO PDF failed:', error);
              alert('Failed to export MWO PDF. Please try again.');
            }
          }}
          className="flex-1 flex items-center justify-center gap-1 py-1 text-xs bg-blue-100 hover:bg-blue-200 rounded transition-colors"
          title="Download MWO as PDF"
        >
          <FileText className="h-3 w-3" />
          <span>PDF</span>
        </button>

        <button
          onClick={async (e) => {
            e.stopPropagation();
            try {
              const blob = await exportEstimatePDF(run.id);
              downloadBlob(blob, `Estimate_${run.style?.style_number || 'unknown'}_Run${run.run_no}.pdf`);
            } catch (error) {
              console.error('Export Estimate PDF failed:', error);
              alert('Failed to export Estimate PDF. Please try again.');
            }
          }}
          className="flex-1 flex items-center justify-center gap-1 py-1 text-xs bg-green-100 hover:bg-green-200 rounded transition-colors"
          title="Download Estimate as PDF"
        >
          <DollarSign className="h-3 w-3" />
          <span>PDF</span>
        </button>

        <button
          onClick={async (e) => {
            e.stopPropagation();
            try {
              const blob = await exportPOPDF(run.id);
              downloadBlob(blob, `T2PO_${run.style?.style_number || 'unknown'}_Run${run.run_no}.pdf`);
            } catch (error) {
              console.error('Export PO PDF failed:', error);
              alert('Failed to export PO PDF. Please try again.');
            }
          }}
          className="flex-1 flex items-center justify-center gap-1 py-1 text-xs bg-purple-100 hover:bg-purple-200 rounded transition-colors"
          title="Download T2 PO as PDF"
        >
          <ShoppingCart className="h-3 w-3" />
          <span>PDF</span>
        </button>
      </div>
    </div>
  );
}
