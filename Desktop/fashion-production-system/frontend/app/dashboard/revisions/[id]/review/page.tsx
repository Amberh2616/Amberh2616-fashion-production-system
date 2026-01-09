'use client';

/**
 * Block-Based Draft Review Page (with Bilingual Overlay)
 * Route: /dashboard/revisions/[id]/review
 *
 * Layout:
 * - Left (60%): PDF viewer with bilingual overlay (原文 + 中文)
 * - Right (40%): Coverage Panel + Block editor sidebar
 */

import { useParams } from 'next/navigation';
import { useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { useDraft, useUpdateDraftBlock } from '@/lib/hooks/useDraft';
import type { DraftBlock as DraftBlockType } from '@/lib/types/revision';
import { approveRevision } from '@/lib/api/approve';
import { BilingualOverlay } from '@/components/review/BilingualOverlay';
import { CoveragePanel } from '@/components/review/CoveragePanel';
import type { DraftBlock } from '@/components/review/BlockOverlayItem';

import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

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
  const [isCreatingRequest, setIsCreatingRequest] = useState(false);
  const [showMissingOnly, setShowMissingOnly] = useState(false);
  const [overlayMode, setOverlayMode] = useState<'none' | 'all'>('all'); // ⭐ 叠層顯示模式

  // PDF render states
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageWidth, setPageWidth] = useState<number>(0);
  const [scale, setScale] = useState<number>(1.0);

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

  // Convert to BilingualOverlay format
  let currentPageBlocks: DraftBlock[] = currentPageData?.blocks || [];

  // ⭐ 叠層顯示模式過濾
  if (overlayMode === 'none') {
    currentPageBlocks = [];
  }
  // overlayMode === 'all' → 顯示全部（只顯示中文，隱藏英文原文）

  // Get selected block for bbox highlighting
  const selectedBlock = selectedBlockId
    ? allBlocksWithPage.find(b => b.id === selectedBlockId)
    : null;

  const handleBlockClick = (block: DraftBlockType) => {
    setSelectedBlockId(block.id);
    // Find which page this block belongs to
    const blockPage = revision.pages.find(p =>
      p.blocks.some(b => b.id === block.id)
    );
    if (blockPage) {
      setCurrentPage(blockPage.page_number);
    }
  };

  const handleEditStart = (block: DraftBlockType) => {
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
      refetch();
    } catch (error) {
      console.error('Failed to approve revision:', error);
      alert(`Failed to approve revision: ${(error as Error).message}`);
    } finally {
      setIsApproving(false);
    }
  };

  const handleCreateRequest = async () => {
    const confirmed = window.confirm(
      '✅ 翻译已完成！\n\n' +
      '确认创建 Sample Request？\n' +
      '这将生成 Run + MWO + Estimate + PO'
    );

    if (!confirmed) return;

    setIsCreatingRequest(true);
    try {
      // Step 1: Get style_revision_id from UploadedDocument
      // We need to find the UploadedDocument that has this tech_pack_revision_id
      const docResponse = await fetch(`http://localhost:8000/api/v2/uploaded-documents/`);
      if (!docResponse.ok) throw new Error('Failed to fetch documents');

      const docs = await docResponse.json();
      const document = docs.results?.find((doc: any) =>
        doc.tech_pack_revision_id === revisionId
      );

      if (!document || !document.style_revision) {
        throw new Error(
          'Cannot create Sample Request: No BOM/Spec data found.\n\n' +
          '请确保文件包含 BOM 和 Measurement 数据。'
        );
      }

      // Step 2: Create Sample Request with style_revision_id
      const response = await fetch('http://localhost:8000/api/v2/sample-requests/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          revision_id: document.style_revision, // ⭐ Use StyleRevision ID
          request_type: 'proto',
          quantity_requested: 5,
          priority: 'normal',
          brand_name: 'Demo',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to create request');
      }

      const data = await response.json();
      alert('✅ Sample Request 创建成功！\n\n正在跳转到 Kanban 看板...');

      // Redirect to Kanban
      window.location.href = '/dashboard/samples/kanban';
    } catch (error) {
      console.error('Failed to create request:', error);
      alert(`创建 Request 失败:\n\n${(error as Error).message}`);
    } finally {
      setIsCreatingRequest(false);
    }
  };

  const jumpNextMissing = () => {
    const missingBlocks = allBlocksWithPage.filter(b =>
      !((b.edited_text || b.translated_text || "").trim())
    );
    if (missingBlocks.length === 0) return;

    // Find first missing on current page or next page
    const currentPageMissing = missingBlocks.find(b => b.page_number === currentPage);
    if (currentPageMissing) {
      setSelectedBlockId(currentPageMissing.id);
    } else {
      // Jump to first missing block
      const firstMissing = missingBlocks[0];
      setCurrentPage(firstMissing.page_number!);
      setSelectedBlockId(firstMissing.id);
    }
  };

  function onDocumentLoadSuccess({ numPages: nextNumPages }: { numPages: number }) {
    setNumPages(nextNumPages);
  }

  function onPageLoadSuccess(page: any) {
    const viewport = page.getViewport({ scale: 1 });
    setPageWidth(viewport.width);
    // Auto scale to fit container (假設容器寬度約 800px)
    const containerWidth = 800;
    const autoScale = containerWidth / viewport.width;
    setScale(autoScale);
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Left: PDF Viewer with Bilingual Overlay */}
      <div className="w-[60%] bg-white border-r border-gray-200 flex flex-col">
        {/* Header */}
        <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-lg font-semibold text-gray-900">{revision.filename}</h1>
              <span
                className={`px-2 py-1 text-xs rounded font-medium ${
                  (revision.status as string) === 'completed'
                    ? 'bg-green-100 text-green-800'
                    : (revision.status as string) === 'reviewing'
                    ? 'bg-blue-100 text-blue-800'
                    : (revision.status as string) === 'parsed'
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                {revision.status}
              </span>
            </div>
            <p className="text-sm text-gray-500">
              Page {currentPage} of {numPages || revision.page_count}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* 叠層顯示模式切換 */}
            <div className="flex items-center gap-1 border border-gray-300 rounded overflow-hidden">
              <button
                onClick={() => setOverlayMode('none')}
                className={`px-3 py-1 text-xs transition-colors ${
                  overlayMode === 'none'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
                title="不顯示叠層"
              >
                無
              </button>
              <button
                onClick={() => setOverlayMode('all')}
                className={`px-3 py-1 text-xs transition-colors ${
                  overlayMode === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
                title="顯示全部（僅中文翻譯）"
              >
                全部
              </button>
            </div>

            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 bg-gray-100 text-gray-700 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-200 transition-colors"
            >
              ← Prev
            </button>
            <button
              onClick={() => setCurrentPage(p => Math.min(numPages || revision.page_count, p + 1))}
              disabled={currentPage === (numPages || revision.page_count)}
              className="px-3 py-1 bg-gray-100 text-gray-700 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-200 transition-colors"
            >
              Next →
            </button>
          </div>
        </div>

        {/* PDF Content with Overlay */}
        <div className="flex-1 overflow-auto p-6">
          <div className="bg-gray-100 rounded-lg overflow-hidden inline-block">
            {revision.file_url ? (
              <div style={{ position: 'relative' }}>
                <Document
                  file={revision.file_url}
                  onLoadSuccess={onDocumentLoadSuccess}
                  loading={
                    <div className="flex items-center justify-center p-12">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                  }
                  error={
                    <div className="flex items-center justify-center p-12 text-red-600">
                      Failed to load PDF
                    </div>
                  }
                >
                  <Page
                    pageNumber={currentPage}
                    scale={scale}
                    renderTextLayer={false}  // 關鍵：避免文字層干擾
                    renderAnnotationLayer={false}
                    onLoadSuccess={onPageLoadSuccess}
                  />
                </Document>

                {/* 🆕 Bilingual Overlay */}
                <BilingualOverlay
                  blocks={currentPageBlocks}
                  scale={scale}
                  selectedId={selectedBlockId}
                  onSelect={(id) => setSelectedBlockId(id)}
                  showMissingOnly={showMissingOnly}
                  showSourceText={false}
                />
              </div>
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

          {/* Page Info */}
          {currentPageData && (
            <div className="mt-4 p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800">
                <span className="font-medium">{currentPageData.blocks.length}</span> blocks on this page
                <span className="mx-2">•</span>
                <span className="text-blue-600">Scale: {(scale * 100).toFixed(0)}%</span>
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Right: Coverage Panel + Block Editor Sidebar */}
      <div className="w-[40%] flex flex-col">
        {/* 🆕 Coverage Panel */}
        <div className="px-4 pt-4">
          <CoveragePanel
            blocksAll={allBlocksWithPage}
            showMissingOnly={showMissingOnly}
            onToggleMissingOnly={() => setShowMissingOnly(v => !v)}
            onJumpNextMissing={jumpNextMissing}
          />
        </div>

        {/* Sidebar Header */}
        <div className="border-b border-gray-200 px-6 py-4 bg-white">
          <h2 className="text-lg font-semibold text-gray-900">Blocks</h2>
          <p className="text-sm text-gray-500">
            {showMissingOnly
              ? `${allBlocksWithPage.filter(b => !((b.edited_text || b.translated_text || "").trim())).length} missing blocks`
              : `${allBlocksWithPage.length} total blocks`
            }
          </p>
        </div>

        {/* Block List */}
        <div className="flex-1 overflow-auto p-4 space-y-3">
          {currentPageData?.blocks.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <p>No blocks on this page</p>
            </div>
          ) : (
            currentPageData?.blocks
              .filter(block => {
                if (!showMissingOnly) return true;
                const finalText = ((block.edited_text || block.translated_text || "") + "").trim();
                return finalText.length === 0;
              })
              .map((block, idx) => (
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
        <div className="border-t border-gray-200 px-6 py-4 bg-white space-y-3">
          {revision.status === 'completed' ? (
            <>
              {/* Status Badge */}
              <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm font-medium text-green-800">✅ 翻译已批准</span>
              </div>

              {/* Create Sample Request Button */}
              <button
                onClick={handleCreateRequest}
                disabled={isCreatingRequest}
                className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-md"
              >
                {isCreatingRequest && (
                  <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                )}
                {isCreatingRequest ? '创建中...' : '📋 下 Sample Request'}
              </button>

              <p className="text-xs text-gray-500 text-center">
                将生成 Run + MWO + Estimate + PO
              </p>
            </>
          ) : (
            <>
              {/* Approve Button */}
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

              <p className="text-xs text-gray-500 text-center">
                批准后可创建 Sample Request
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
