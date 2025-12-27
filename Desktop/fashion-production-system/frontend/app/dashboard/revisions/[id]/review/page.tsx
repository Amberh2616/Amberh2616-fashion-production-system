'use client';

/**
 * Block-Based Draft Review Page
 * Route: /dashboard/revisions/[id]/review
 *
 * Layout:
 * - Left (60%): PDF viewer with bbox highlights
 * - Right (40%): Block editor sidebar
 */

import { useParams } from 'next/navigation';
import { useState } from 'react';
import { useDraft, useUpdateDraftBlock } from '@/lib/hooks/useDraft';
import type { DraftBlock } from '@/lib/types/revision';
import { approveRevision } from '@/lib/api/approve';

export default function DraftReviewPage() {
  const params = useParams();
  const revisionId = params.id as string;
  const { data, isLoading, error, refetch } = useDraft(revisionId);
  const updateBlock = useUpdateDraftBlock(revisionId);

  const [currentPage, setCurrentPage] = useState(1);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [isApproving, setIsApproving] = useState(false);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading revision...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
          <h2 className="text-xl font-semibold text-red-800 mb-2">Error Loading Revision</h2>
          <p className="text-red-600">{(error as Error).message}</p>
        </div>
      </div>
    );
  }

  if (!data?.data) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-gray-600">No revision data found</p>
      </div>
    );
  }

  const revision = data.data;
  const currentPageData = revision.pages.find(p => p.page_number === currentPage);

  // Flatten blocks with page_number included
  const allBlocksWithPage = revision.pages.flatMap(p =>
    p.blocks.map(b => ({ ...b, page_number: p.page_number }))
  );

  // Get selected block for bbox highlighting
  const selectedBlock = selectedBlockId
    ? allBlocksWithPage.find(b => b.id === selectedBlockId)
    : null;

  const handleBlockClick = (block: DraftBlock) => {
    setSelectedBlockId(block.id);
    // Find which page this block belongs to
    const blockPage = revision.pages.find(p =>
      p.blocks.some(b => b.id === block.id)
    );
    if (blockPage) {
      setCurrentPage(blockPage.page_number);
    }
  };

  const handleEditStart = (block: DraftBlock) => {
    setEditingBlockId(block.id);
    setEditValue(block.edited_text || block.translated_text || block.source_text);
  };

  const handleEditSave = async (blockId: string) => {
    try {
      await updateBlock.mutateAsync({
        blockId,
        editedText: editValue,
      });
      setEditingBlockId(null);
      // Mutation will auto-refetch data via onSuccess
    } catch (error) {
      console.error('Failed to save block edit:', error);
      alert('Failed to save changes. Please try again.');
    }
  };

  const handleEditCancel = () => {
    setEditingBlockId(null);
    setEditValue('');
  };

  const handleApprove = async () => {
    const confirmed = window.confirm(
      'Are you sure you want to approve this revision?\n\n' +
      'This will mark it as completed and lock the review.'
    );

    if (!confirmed) return;

    setIsApproving(true);
    try {
      await approveRevision(revisionId);
      alert('✅ Revision approved successfully!');
      // Refetch to get updated status
      refetch();
    } catch (error) {
      console.error('Failed to approve revision:', error);
      alert(`Failed to approve revision: ${(error as Error).message}`);
    } finally {
      setIsApproving(false);
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Left: PDF Viewer */}
      <div className="w-[60%] bg-white border-r border-gray-200 flex flex-col">
        {/* Header */}
        <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-lg font-semibold text-gray-900">{revision.filename}</h1>
              <span
                className={`px-2 py-1 text-xs rounded font-medium ${
                  revision.status === 'completed'
                    ? 'bg-green-100 text-green-800'
                    : revision.status === 'reviewing'
                    ? 'bg-blue-100 text-blue-800'
                    : revision.status === 'parsed'
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                {revision.status}
              </span>
            </div>
            <p className="text-sm text-gray-500">
              Page {currentPage} of {revision.page_count}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 bg-gray-100 text-gray-700 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-200 transition-colors"
            >
              ← Prev
            </button>
            <button
              onClick={() => setCurrentPage(p => Math.min(revision.page_count, p + 1))}
              disabled={currentPage === revision.page_count}
              className="px-3 py-1 bg-gray-100 text-gray-700 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-200 transition-colors"
            >
              Next →
            </button>
          </div>
        </div>

        {/* PDF Content */}
        <div className="flex-1 overflow-auto p-6">
          {/* PDF Embed */}
          <div className="bg-gray-100 rounded-lg overflow-hidden">
            {revision.file_url ? (
              <iframe
                src={`${revision.file_url}#page=${currentPage}`}
                className="w-full"
                style={{ height: 'calc(100vh - 200px)', border: 'none' }}
                title="PDF Viewer"
              />
            ) : (
              <div className="flex items-center justify-center bg-gray-200 rounded-lg" style={{ height: 'calc(100vh - 200px)' }}>
                <div className="text-center text-gray-500">
                  <svg className="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  <p className="text-sm font-medium">PDF Preview Not Available</p>
                  <p className="text-xs mt-1">File not uploaded yet</p>
                </div>
              </div>
            )}
          </div>

          {/* BBox Visual Guide (below PDF) */}
          {selectedBlock && selectedBlock.page_number === currentPage && currentPageData && (
            <div className="mt-4 p-4 bg-red-50 border-2 border-red-500 rounded-lg">
              <div className="flex items-start gap-4">
                <div className="flex-1">
                  <p className="text-sm font-semibold text-red-900 mb-2">
                    🎯 Selected Block Location
                  </p>
                  <div className="text-xs text-red-800 space-y-1">
                    <p><span className="font-medium">Position:</span> ({selectedBlock.bbox.x.toFixed(0)}, {selectedBlock.bbox.y.toFixed(0)})</p>
                    <p><span className="font-medium">Size:</span> {selectedBlock.bbox.width.toFixed(0)}×{selectedBlock.bbox.height.toFixed(0)}px</p>
                    <p><span className="font-medium">Text:</span> "{selectedBlock.source_text.substring(0, 50)}{selectedBlock.source_text.length > 50 ? '...' : ''}"</p>
                  </div>
                </div>
                <div className="flex-shrink-0">
                  {/* Mini visualization */}
                  <svg width="120" height="120" className="border border-red-300 rounded bg-white">
                    <rect
                      x={selectedBlock.bbox.x / currentPageData.width * 120}
                      y={selectedBlock.bbox.y / currentPageData.height * 120}
                      width={Math.min(selectedBlock.bbox.width / currentPageData.width * 120, 50)}
                      height={Math.min(selectedBlock.bbox.height / currentPageData.height * 120, 20)}
                      fill="rgba(239, 68, 68, 0.3)"
                      stroke="rgb(239, 68, 68)"
                      strokeWidth="2"
                    />
                    <text x="60" y="10" textAnchor="middle" fontSize="8" fill="#666">Page {currentPage}</text>
                  </svg>
                </div>
              </div>
            </div>
          )}

          {/* Page Info */}
          {currentPageData && (
            <div className="mt-4 p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800">
                <span className="font-medium">{currentPageData.blocks.length}</span> blocks on this page
                <span className="mx-2">•</span>
                <span className="text-blue-600">{currentPageData.width}×{currentPageData.height}px</span>
              </p>
              {selectedBlock && selectedBlock.page_number === currentPage && (
                <p className="text-sm text-red-600 mt-2">
                  <span className="font-medium">Selected:</span> {selectedBlock.source_text.substring(0, 40)}
                  {selectedBlock.source_text.length > 40 ? '...' : ''}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Right: Block Editor Sidebar */}
      <div className="w-[40%] flex flex-col">
        {/* Sidebar Header */}
        <div className="border-b border-gray-200 px-6 py-4 bg-white">
          <h2 className="text-lg font-semibold text-gray-900">Blocks</h2>
          <p className="text-sm text-gray-500">{allBlocksWithPage.length} total blocks</p>
        </div>

        {/* Block List */}
        <div className="flex-1 overflow-auto p-4 space-y-3">
          {currentPageData?.blocks.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <p>No blocks on this page</p>
            </div>
          ) : (
            currentPageData?.blocks.map((block, idx) => (
              <div
                key={block.id}
                className={`
                  border rounded-lg p-4 transition-all
                  ${selectedBlockId === block.id
                    ? 'border-blue-500 bg-blue-50 shadow-md'
                    : 'border-gray-200 bg-white'
                  }
                `}
              >
                {/* Block Header */}
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-gray-400">
                      Block #{idx + 1}
                    </span>
                    {/* SELECT BUTTON - Primary way to select a block */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleBlockClick(block);
                      }}
                      className={`px-2 py-1 text-xs rounded font-medium transition-colors ${
                        selectedBlockId === block.id
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      {selectedBlockId === block.id ? '✓ Selected' : 'Select'}
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded">
                      {block.block_type}
                    </span>
                    <span
                      className={`text-xs px-2 py-1 rounded ${
                        block.status === 'auto'
                          ? 'bg-gray-100 text-gray-700'
                          : block.status === 'edited'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-green-100 text-green-800'
                      }`}
                    >
                      {block.status}
                    </span>
                  </div>
                </div>

                {/* BBox Info */}
                <div className="text-xs text-gray-500 mb-3">
                  Position: ({block.bbox.x.toFixed(0)}, {block.bbox.y.toFixed(0)}) •
                  Size: {block.bbox.width.toFixed(0)}×{block.bbox.height.toFixed(0)}
                </div>

                {/* Source Text (Read-only) */}
                <div className="mb-2">
                  <span className="text-xs font-medium text-gray-700">Original:</span>
                  <p className="text-sm text-gray-900 font-medium mt-1 whitespace-pre-line">
                    {block.source_text}
                  </p>
                </div>

                {/* Editable Translation */}
                <div className="mb-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-gray-700">Translation:</span>
                    {editingBlockId !== block.id && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditStart(block);
                        }}
                        className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                      >
                        Edit
                      </button>
                    )}
                  </div>

                  {editingBlockId === block.id ? (
                    <div className="space-y-2">
                      <textarea
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="w-full text-sm border border-blue-400 rounded p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        rows={3}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditSave(block.id);
                          }}
                          disabled={updateBlock.isPending}
                          className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                        >
                          {updateBlock.isPending && (
                            <span className="inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                          )}
                          {updateBlock.isPending ? 'Saving...' : 'Save'}
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditCancel();
                          }}
                          disabled={updateBlock.isPending}
                          className="px-3 py-1 bg-gray-200 text-gray-700 text-xs rounded hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-700 whitespace-pre-line">
                      {block.edited_text || block.translated_text || '(No translation)'}
                    </p>
                  )}
                </div>

                {/* Human Edit Indicator */}
                {block.edited_text && editingBlockId !== block.id && (
                  <div className="bg-yellow-50 border-l-4 border-yellow-400 p-2 text-xs text-yellow-800">
                    ✏️ Human edited
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Sidebar Footer */}
        <div className="border-t border-gray-200 px-6 py-4 bg-white">
          <button
            onClick={handleApprove}
            disabled={isApproving}
            className="w-full px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isApproving && (
              <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            )}
            {isApproving ? 'Approving...' : 'Approve Revision'}
          </button>
        </div>
      </div>
    </div>
  );
}
