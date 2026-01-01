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
  type KanbanLane,
  type KanbanRunItem,
  type KanbanFilters,
} from '@/lib/api/samples';
import { cn } from '@/lib/utils';

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
];

export default function KanbanPage() {
  const queryClient = useQueryClient();

  // Filter state
  const [activePreset, setActivePreset] = useState<ViewPreset>('all');
  const [search, setSearch] = useState('');
  const [priority, setPriority] = useState('');
  const [runType, setRunType] = useState('');
  const [expandedLanes, setExpandedLanes] = useState<Set<string>>(new Set(VISIBLE_LANES));

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
          <Link
            href="/dashboard/samples"
            className="px-4 py-1.5 text-sm border rounded-md hover:bg-gray-50"
          >
            List View
          </Link>
        </div>
      </div>

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
              // Simple next action - can be enhanced
              transitionMutation.mutate({ runId: run.id, action: 'advance' });
            }}
            isTransitioning={transitionMutation.isPending}
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
}: {
  lane: KanbanLane;
  runs: KanbanRunItem[];
  isExpanded: boolean;
  onToggle: () => void;
  onNextAction: (run: KanbanRunItem) => void;
  isTransitioning: boolean;
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
}: {
  run: KanbanRunItem;
  onNextAction: (run: KanbanRunItem) => void;
  isTransitioning: boolean;
}) {
  const runTypeBadge = RUN_TYPE_BADGES[run.run_type] || RUN_TYPE_BADGES.other;
  const priorityColor = PRIORITY_COLORS[run.sample_request.priority] || PRIORITY_COLORS.normal;

  return (
    <div
      className={cn(
        'bg-white rounded-md shadow-sm border-l-4 p-2.5 hover:shadow-md transition-shadow',
        priorityColor
      )}
    >
      {/* Header Row */}
      <div className="flex items-center justify-between gap-1 mb-1">
        <span className={cn('px-1.5 py-0.5 text-xs rounded', runTypeBadge.color)}>
          {runTypeBadge.label}
        </span>
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
    </div>
  );
}
