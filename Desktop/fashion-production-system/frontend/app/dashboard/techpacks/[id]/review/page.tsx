"use client";

import { use, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  FileText,
  CheckCircle2,
  AlertTriangle,
  Edit3,
  ThumbsUp,
  Send,
  Save,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  X,
  MessageSquare,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import { AIAssistant } from "@/components/techpack/AIAssistant";
import { getTechPackDetail } from "@/lib/api/techpack";

export default function DraftReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // Unwrap params Promise (Next.js 15+)
  const { id } = use(params);

  const [activeTab, setActiveTab] = useState<
    "manufacturing" | "bom" | "measurements" | "construction"
  >("bom");
  const [showIssues, setShowIssues] = useState(true);
  const [pdfPage, setPdfPage] = useState(1);
  const [pdfZoom, setPdfZoom] = useState(100);
  const [showAIAssistant, setShowAIAssistant] = useState(false);

  // Fetch real data from API
  const { data: techPack, isLoading, error, refetch } = useQuery({
    queryKey: ["techpack", id],
    queryFn: () => getTechPackDetail(id),
    refetchInterval: 5000, // Auto-refresh every 5 seconds to catch AI updates
  });

  const totalPages = 12;

  // Show loading state
  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-slate-600">Loading tech pack...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error || !techPack) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-red-600 mx-auto mb-4" />
          <p className="text-slate-900 font-semibold mb-2">Failed to load tech pack</p>
          <p className="text-slate-600 mb-4">{error instanceof Error ? error.message : "Unknown error"}</p>
          <button
            onClick={() => refetch()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // 點擊 PDF 頁面 → 跳轉到對應 Tab
  const handlePdfPageClick = (page: number) => {
    if (page === 3 || page === 4 || page === 5) {
      setActiveTab("bom");
    } else if (page === 7 || page === 8) {
      setActiveTab("measurements");
    } else if (page >= 9) {
      setActiveTab("construction");
    }
  };

  return (
    <div className="h-screen flex flex-col bg-slate-50">
      {/* Top Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard/techpacks"
              className="text-slate-600 hover:text-slate-900 transition-colors"
            >
              ← Back to List
            </Link>
            <div className="h-6 w-px bg-slate-300"></div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">
                {techPack.style_number} - {techPack.style_name}
              </h1>
              <div className="flex items-center gap-3 mt-0.5">
                <span className="text-sm text-slate-600">
                  {techPack.season} | {techPack.customer}
                </span>
                <span className="text-sm text-slate-400">•</span>
                <div className="flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-700">
                    AI Confidence: {techPack.ai_confidence ? Math.round(techPack.ai_confidence * 100) : 0}%
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors">
              <Save className="w-4 h-4" />
              Save Draft
            </button>
            <button className="flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors">
              <Send className="w-4 h-4" />
              Email to Factory
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-sm">
              <ThumbsUp className="w-4 h-4" />
              Approve
            </button>
          </div>
        </div>
      </div>

      {/* Main Split View */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT: PDF Viewer (40%) */}
        <div className="w-2/5 border-r border-slate-200 bg-slate-100 flex flex-col">
          {/* PDF Toolbar */}
          <div className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-slate-700">
                Original Tech Pack PDF
              </span>
              <span className="text-sm text-slate-500">
                Page {pdfPage} of {totalPages}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPdfZoom(Math.max(50, pdfZoom - 10))}
                className="p-1.5 hover:bg-slate-100 rounded"
                title="Zoom Out"
              >
                <ZoomOut className="w-4 h-4 text-slate-600" />
              </button>
              <span className="text-sm text-slate-600 w-12 text-center">
                {pdfZoom}%
              </span>
              <button
                onClick={() => setPdfZoom(Math.min(200, pdfZoom + 10))}
                className="p-1.5 hover:bg-slate-100 rounded"
                title="Zoom In"
              >
                <ZoomIn className="w-4 h-4 text-slate-600" />
              </button>
            </div>
          </div>

          {/* PDF Viewer Area (Placeholder) */}
          <div className="flex-1 overflow-auto p-6">
            <div
              className="bg-white rounded-lg shadow-lg mx-auto cursor-pointer"
              style={{
                width: `${pdfZoom}%`,
                maxWidth: "100%",
                aspectRatio: "8.5 / 11",
              }}
              onClick={() => handlePdfPageClick(pdfPage)}
            >
              <div className="h-full border-2 border-dashed border-slate-300 rounded-lg flex flex-col items-center justify-center p-8 text-center">
                <FileText className="w-16 h-16 text-slate-400 mb-4" />
                <p className="text-slate-700 font-medium mb-2">
                  PDF Page {pdfPage} Would Display Here
                </p>
                <p className="text-slate-500 text-sm mb-4">
                  In production, this uses react-pdf library
                </p>
                <div className="text-xs text-slate-500 space-y-1">
                  <div>Click this area → Right side jumps to related section</div>
                  <div className="mt-4 space-y-1 text-left bg-slate-50 p-3 rounded">
                    <div>📄 Page 3-5: BOM Table</div>
                    <div>📏 Page 7-8: Measurements</div>
                    <div>🧵 Page 9-11: Construction</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* PDF Navigation */}
          <div className="bg-white border-t border-slate-200 px-4 py-3 flex items-center justify-center gap-4">
            <button
              onClick={() => setPdfPage(Math.max(1, pdfPage - 1))}
              disabled={pdfPage === 1}
              className="flex items-center gap-1 px-3 py-1.5 border border-slate-300 rounded hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </button>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={pdfPage}
                onChange={(e) => {
                  const val = parseInt(e.target.value);
                  if (val >= 1 && val <= totalPages) setPdfPage(val);
                }}
                className="w-16 px-2 py-1 border border-slate-300 rounded text-center"
                min={1}
                max={totalPages}
              />
              <span className="text-sm text-slate-600">of {totalPages}</span>
            </div>
            <button
              onClick={() => setPdfPage(Math.min(totalPages, pdfPage + 1))}
              disabled={pdfPage === totalPages}
              className="flex items-center gap-1 px-3 py-1.5 border border-slate-300 rounded hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* RIGHT: AI Results (60%) */}
        <div className="flex-1 flex flex-col overflow-hidden bg-white">
          {/* AI Issues Panel */}
          {showIssues && techPack.ai_issues && techPack.ai_issues.length > 0 && (
            <div className="bg-yellow-50 border-b border-yellow-200 px-6 py-4 flex-shrink-0">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-yellow-600" />
                  <h3 className="font-semibold text-yellow-900">
                    {techPack.ai_issues.length} Items Need Attention
                  </h3>
                </div>
                <button
                  onClick={() => setShowIssues(false)}
                  className="text-yellow-700 hover:text-yellow-900"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-2">
                {techPack.ai_issues.map((issue: any, idx: number) => (
                  <div
                    key={idx}
                    className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer hover:opacity-80 ${
                      issue.severity === "high"
                        ? "bg-red-100 border border-red-300"
                        : issue.severity === "medium"
                        ? "bg-yellow-100 border border-yellow-300"
                        : "bg-blue-100 border border-blue-300"
                    }`}
                  >
                    <AlertTriangle
                      className={`w-4 h-4 mt-0.5 ${
                        issue.severity === "high"
                          ? "text-red-700"
                          : issue.severity === "medium"
                          ? "text-yellow-700"
                          : "text-blue-700"
                      }`}
                    />
                    <div className="flex-1">
                      <div className="font-medium text-sm text-slate-900">
                        {issue.field || issue.type}
                      </div>
                      <div className="text-sm text-slate-700 mt-1">
                        {issue.message}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tabs */}
          <div className="bg-white border-b border-slate-200 px-6 flex-shrink-0">
            <div className="flex gap-6">
              <button
                onClick={() => setActiveTab("bom")}
                className={`py-3 px-1 border-b-2 font-medium transition-colors ${
                  activeTab === "bom"
                    ? "border-blue-600 text-blue-700"
                    : "border-transparent text-slate-600 hover:text-slate-900"
                }`}
              >
                BOM ({techPack.bom_items?.length || 0} items)
              </button>
              <button
                onClick={() => setActiveTab("measurements")}
                className={`py-3 px-1 border-b-2 font-medium transition-colors ${
                  activeTab === "measurements"
                    ? "border-blue-600 text-blue-700"
                    : "border-transparent text-slate-600 hover:text-slate-900"
                }`}
              >
                Measurements ({techPack.measurements?.length || 0} points)
              </button>
              <button
                onClick={() => setActiveTab("construction")}
                className={`py-3 px-1 border-b-2 font-medium transition-colors ${
                  activeTab === "construction"
                    ? "border-blue-600 text-blue-700"
                    : "border-transparent text-slate-600 hover:text-slate-900"
                }`}
              >
                Construction ({techPack.construction_steps?.length || 0} steps)
              </button>
              <button
                onClick={() => setActiveTab("manufacturing")}
                className={`py-3 px-1 border-b-2 font-medium transition-colors ${
                  activeTab === "manufacturing"
                    ? "border-blue-600 text-blue-700"
                    : "border-transparent text-slate-600 hover:text-slate-900"
                }`}
              >
                Manufacturing Sheet
              </button>
            </div>
          </div>

          {/* Tab Content - Scrollable */}
          <div className="flex-1 overflow-y-auto p-6">
            {/* BOM Tab */}
            {activeTab === "bom" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-slate-900">
                    Bill of Materials - AI Extracted
                  </h2>
                  <button className="text-sm text-blue-700 hover:text-blue-800 font-medium">
                    + Add Item Manually
                  </button>
                </div>

                {/* BOM Table */}
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="text-left px-4 py-3 text-xs font-medium text-slate-700 uppercase">#</th>
                        <th className="text-left px-4 py-3 text-xs font-medium text-slate-700 uppercase">Category</th>
                        <th className="text-left px-4 py-3 text-xs font-medium text-slate-700 uppercase">Material</th>
                        <th className="text-left px-4 py-3 text-xs font-medium text-slate-700 uppercase">Supplier</th>
                        <th className="text-left px-4 py-3 text-xs font-medium text-slate-700 uppercase">Color</th>
                        <th className="text-right px-4 py-3 text-xs font-medium text-slate-700 uppercase">Consumption</th>
                        <th className="text-right px-4 py-3 text-xs font-medium text-slate-700 uppercase">Unit Price</th>
                        <th className="text-center px-4 py-3 text-xs font-medium text-slate-700 uppercase">AI Conf.</th>
                        <th className="text-center px-4 py-3 text-xs font-medium text-slate-700 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {mockAIData.bom.map((item) => (
                        <tr
                          key={item.id}
                          className={`hover:bg-slate-50 cursor-pointer ${
                            item.aiConfidence < 70 ? "bg-red-50" : ""
                          }`}
                          onClick={() => setPdfPage(item.pdfPage)}
                        >
                          <td className="px-4 py-3 text-sm text-slate-900">{item.id}</td>
                          <td className="px-4 py-3">
                            <span className="text-xs px-2 py-1 bg-slate-100 text-slate-700 rounded">
                              {item.category}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm font-medium text-slate-900">
                            {item.material}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-700">{item.supplier}</td>
                          <td className="px-4 py-3 text-sm text-slate-700">{item.color}</td>
                          <td className="px-4 py-3 text-sm text-right text-slate-900">
                            {item.consumption} {item.unit}
                          </td>
                          <td className="px-4 py-3 text-sm text-right text-slate-900">
                            {item.unitPrice}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span
                              className={`text-sm font-medium ${
                                item.aiConfidence >= 90
                                  ? "text-green-700"
                                  : item.aiConfidence >= 70
                                  ? "text-yellow-700"
                                  : "text-red-700"
                              }`}
                            >
                              {item.aiConfidence}%
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button className="text-blue-700 hover:text-blue-800">
                              <Edit3 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Measurements Tab */}
            {activeTab === "measurements" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-slate-900">
                    Measurement Specifications
                  </h2>
                  <button className="text-sm text-blue-700 hover:text-blue-800 font-medium">
                    + Add Point
                  </button>
                </div>

                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="text-left px-4 py-3 text-xs font-medium text-slate-700 uppercase">Point</th>
                        <th className="text-center px-4 py-3 text-xs font-medium text-slate-700 uppercase">Code</th>
                        <th className="text-center px-4 py-3 text-xs font-medium text-slate-700 uppercase">XS</th>
                        <th className="text-center px-4 py-3 text-xs font-medium text-slate-700 uppercase">S</th>
                        <th className="text-center px-4 py-3 text-xs font-medium text-slate-700 uppercase">M</th>
                        <th className="text-center px-4 py-3 text-xs font-medium text-slate-700 uppercase">L</th>
                        <th className="text-center px-4 py-3 text-xs font-medium text-slate-700 uppercase">XL</th>
                        <th className="text-center px-4 py-3 text-xs font-medium text-slate-700 uppercase">Tolerance</th>
                        <th className="text-center px-4 py-3 text-xs font-medium text-slate-700 uppercase">AI Conf.</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {mockAIData.measurements.map((m) => (
                        <tr
                          key={m.id}
                          className="hover:bg-slate-50 cursor-pointer"
                          onClick={() => setPdfPage(m.pdfPage)}
                        >
                          <td className="px-4 py-3 text-sm font-medium text-slate-900">
                            {m.point}
                          </td>
                          <td className="px-4 py-3 text-sm text-center text-slate-700">
                            {m.code}
                          </td>
                          <td className="px-4 py-3 text-sm text-center text-slate-900">{m.sizes.XS}</td>
                          <td className="px-4 py-3 text-sm text-center text-slate-900">{m.sizes.S}</td>
                          <td className="px-4 py-3 text-sm text-center text-slate-900">{m.sizes.M}</td>
                          <td className="px-4 py-3 text-sm text-center text-slate-900">{m.sizes.L}</td>
                          <td className="px-4 py-3 text-sm text-center text-slate-900">{m.sizes.XL}</td>
                          <td className="px-4 py-3 text-sm text-center text-slate-700">
                            {m.tolerance}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="text-sm font-medium text-green-700">
                              {m.aiConfidence}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Construction Tab */}
            {activeTab === "construction" && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-slate-900 mb-4">
                  Construction Steps
                </h2>
                {mockAIData.construction.map((step, idx) => (
                  <div
                    key={step.id}
                    className="border border-slate-200 rounded-lg p-4 hover:bg-slate-50 cursor-pointer"
                    onClick={() => setPdfPage(step.pdfPage)}
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center font-medium text-sm">
                        {idx + 1}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium text-slate-900 mb-1">
                          {step.step}
                        </h3>
                        <p className="text-sm text-slate-600">{step.details}</p>
                        <div className="text-xs text-blue-700 mt-2">
                          📄 Page {step.pdfPage}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Manufacturing Sheet Tab */}
            {activeTab === "manufacturing" && (
              <div className="text-center py-12">
                <FileText className="w-16 h-16 text-slate-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-900 mb-2">
                  Manufacturing Sheet Generation
                </h3>
                <p className="text-slate-600 mb-6">
                  Generate a complete manufacturing instruction sheet from AI
                  extracted data
                </p>
                <button className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">
                  Generate Manufacturing Sheet
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* AI Assistant Floating Button */}
      {!showAIAssistant && (
        <button
          onClick={() => setShowAIAssistant(true)}
          className="fixed bottom-8 right-8 p-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-full shadow-2xl hover:shadow-3xl hover:scale-110 transition-all duration-300 z-50 group"
          title="打開 AI 助手"
        >
          <MessageSquare className="w-6 h-6" />
          <span className="absolute -top-1 -right-1 flex h-5 w-5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-5 w-5 bg-purple-500 items-center justify-center text-xs font-bold">
              AI
            </span>
          </span>
        </button>
      )}

      {/* AI Assistant Sidebar */}
      {showAIAssistant && (
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 bg-black/20 z-40 transition-opacity"
            onClick={() => setShowAIAssistant(false)}
          />

          {/* Sidebar */}
          <div className="fixed right-0 top-0 bottom-0 w-96 bg-white shadow-2xl z-50 transform transition-transform duration-300">
            <div className="h-full flex flex-col">
              {/* Close Button */}
              <button
                onClick={() => setShowAIAssistant(false)}
                className="absolute top-4 right-4 p-2 hover:bg-slate-100 rounded-full transition-colors z-10"
              >
                <X className="w-5 h-5 text-slate-600" />
              </button>

              {/* AI Assistant Component */}
              <AIAssistant techPackId={id} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
