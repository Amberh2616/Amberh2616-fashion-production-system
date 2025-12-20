'use client';

/**
 * Draft Review Page - Main Review Interface
 * Route: /dashboard/revisions/[id]/review
 */

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { useDraft } from '@/lib/hooks/useDraft';
import { UIState, DraftTab, Evidence, TableSelection, DraftIssue } from '@/lib/types/draft';

// Components (will create next)
import ReviewHeaderBar from '@/components/review/ReviewHeaderBar';
import PdfPane from '@/components/review/PdfPane';
import DraftPane from '@/components/review/DraftPane';
import IssuesDrawer from '@/components/review/IssuesDrawer';

export default function RevisionReviewPage() {
  // Get revision ID from route params
  const params = useParams();
  const revisionId = params.id as string;

  // Fetch draft data
  const { data: draftResponse, isLoading, error } = useDraft(revisionId);

  // UI State
  const [uiState, setUIState] = useState<UIState>({
    activeTab: 'bom',
    activeIssueId: null,
    activeEvidence: null,
    tableSelection: null,
    filters: {
      issueOnly: false,
      missingOnly: false,
      lowConfidence: false,
    },
    search: '',
  });

  const [issuesOpen, setIssuesOpen] = useState(true);

  // === Handlers ===

  const handleTabChange = (tab: DraftTab) => {
    setUIState((prev) => ({ ...prev, activeTab: tab }));
  };

  const handleIssueSelect = (issue: DraftIssue, issueId: string) => {
    // Resolve issue to table target
    const target = resolveIssueTarget(issue);

    if (target) {
      setUIState((prev) => ({
        ...prev,
        activeIssueId: issueId,
        activeTab: target.tab,
        tableSelection: {
          tab: target.tab,
          rowKey: target.rowKey,
          fieldKey: target.fieldKey,
        },
        activeEvidence: target.evidence || null,
      }));
    } else {
      // Global issue, just highlight
      setUIState((prev) => ({
        ...prev,
        activeIssueId: issueId,
        activeEvidence: issue.evidence || null,
      }));
    }
  };

  const handleEvidenceClick = (evidence: Evidence) => {
    setUIState((prev) => ({ ...prev, activeEvidence: evidence }));
  };

  const handleTableSelectionChange = (selection: TableSelection | null) => {
    setUIState((prev) => ({ ...prev, tableSelection: selection }));
  };

  // === Helper function (inline for now) ===
  function resolveIssueTarget(issue: DraftIssue) {
    // Simplified version - full logic in draftUtils.ts
    const tab = issue.target as DraftTab;
    const rowKey =
      issue.item_number ?? issue.point_code ?? issue.step_number ?? null;

    if (tab && rowKey !== null) {
      return {
        tab,
        rowKey,
        fieldKey: issue.field,
        evidence: issue.evidence,
      };
    }
    return null;
  }

  // === Loading & Error States ===

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600 mx-auto"></div>
          <p className="text-gray-600">Loading draft data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="max-w-md rounded-lg border border-red-200 bg-red-50 p-6">
          <h3 className="mb-2 text-lg font-semibold text-red-900">
            Failed to load draft
          </h3>
          <p className="text-red-700">{(error as Error).message}</p>
        </div>
      </div>
    );
  }

  if (!draftResponse?.data) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-gray-600">No draft data available</p>
      </div>
    );
  }

  const draft = draftResponse.data;

  // === Render ===

  return (
    <div className="flex h-screen flex-col">
      {/* Header */}
      <ReviewHeaderBar
        revisionId={revisionId}
        draft={draft}
        onToggleIssues={() => setIssuesOpen(!issuesOpen)}
        issuesOpen={issuesOpen}
      />

      {/* Main Content: Resizable Panels */}
      <div className="flex-1 overflow-hidden">
        <ResizablePanelGroup direction="horizontal">
          {/* Left: PDF Viewer (40%) */}
          <ResizablePanel defaultSize={40} minSize={30}>
            <PdfPane
              revisionId={revisionId}
              activeEvidence={uiState.activeEvidence}
            />
          </ResizablePanel>

          <ResizableHandle className="w-1 bg-gray-200 hover:bg-blue-400" />

          {/* Right: Draft Editor (60%) */}
          <ResizablePanel defaultSize={60} minSize={40}>
            <DraftPane
              draft={draft}
              activeTab={uiState.activeTab}
              tableSelection={uiState.tableSelection}
              filters={uiState.filters}
              search={uiState.search}
              onTabChange={handleTabChange}
              onEvidenceClick={handleEvidenceClick}
              onTableSelectionChange={handleTableSelectionChange}
              onFiltersChange={(filters) =>
                setUIState((prev) => ({ ...prev, filters }))
              }
              onSearchChange={(search) =>
                setUIState((prev) => ({ ...prev, search }))
              }
            />
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>

      {/* Bottom: Issues Drawer */}
      {issuesOpen && (
        <IssuesDrawer
          draft={draft}
          activeIssueId={uiState.activeIssueId}
          activeTab={uiState.activeTab}
          onIssueSelect={handleIssueSelect}
          onClose={() => setIssuesOpen(false)}
        />
      )}
    </div>
  );
}
