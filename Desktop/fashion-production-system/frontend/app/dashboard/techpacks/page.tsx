"use client";

import { useState } from "react";
import {
  Upload,
  FileText,
  Search,
  Filter,
  MoreVertical,
  Eye,
  Edit3,
  Trash2,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import { useTechPacks } from "@/lib/hooks/useTechPacks";
import { UploadDialog } from "@/components/techpack/UploadDialog";

// 狀態徽章組件
function StatusBadge({ status }: { status: string }) {
  const config = {
    uploaded: {
      label: "Uploaded",
      color: "bg-slate-100 text-slate-800 border-slate-300",
      icon: Clock,
    },
    draft: {
      label: "Draft (Needs Review)",
      color: "bg-yellow-100 text-yellow-800 border-yellow-300",
      icon: AlertTriangle,
    },
    approved: {
      label: "Approved",
      color: "bg-green-100 text-green-800 border-green-300",
      icon: CheckCircle2,
    },
    in_production: {
      label: "In Production",
      color: "bg-blue-100 text-blue-800 border-blue-300",
      icon: Clock,
    },
    parsing: {
      label: "AI Parsing...",
      color: "bg-purple-100 text-purple-800 border-purple-300",
      icon: Clock,
    },
  };

  const { label, color, icon: Icon } = config[status as keyof typeof config] || config.uploaded;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border ${color}`}
    >
      <Icon className="w-3.5 h-3.5" />
      {label}
    </span>
  );
}

export default function TechPacksPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);

  // 🔥 使用真實 API（自動每 5 秒重新查詢，以便看到 AI 解析進度）
  const { data, isLoading, error } = useTechPacks({
    search: searchQuery || undefined,
    status: filterStatus !== "all" ? filterStatus : undefined,
  });

  // 格式化日期
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("zh-TW");
  };

  // 過濾邏輯（前端額外過濾）
  const techPacks = data?.results || [];
  const filteredTechPacks = techPacks.filter((tp) => {
    const matchesSearch =
      tp.style_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tp.style_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter =
      filterStatus === "all" || tp.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="h-full flex flex-col bg-slate-50">
      {/* Upload Dialog */}
      <UploadDialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen} />

      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Tech Pack Management
            </h1>
            <p className="text-slate-600 mt-1">
              Upload, parse, and review tech packs with AI assistance
            </p>
          </div>
          <button
            onClick={() => setUploadDialogOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium shadow-sm"
          >
            <Upload className="w-4 h-4" />
            Upload Tech Pack
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="flex items-center gap-4">
          {/* Search */}
          <div className="flex-1 relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by style number or name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-600" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="all">All Status</option>
              <option value="draft">Draft</option>
              <option value="approved">Approved</option>
              <option value="in_production">In Production</option>
              <option value="parsing">Parsing</option>
            </select>
          </div>

          {/* Results Count */}
          <div className="text-sm text-slate-600">
            {filteredTechPacks.length} tech packs
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto px-6 py-6">
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-700 uppercase tracking-wider">
                  Style Number
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-700 uppercase tracking-wider">
                  Name
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-700 uppercase tracking-wider">
                  Season
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-700 uppercase tracking-wider">
                  Customer
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-700 uppercase tracking-wider">
                  Status
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-700 uppercase tracking-wider">
                  Upload Date
                </th>
                <th className="text-center px-6 py-3 text-xs font-medium text-slate-700 uppercase tracking-wider">
                  AI Status
                </th>
                <th className="text-center px-6 py-3 text-xs font-medium text-slate-700 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {/* Loading State */}
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center">
                    <Loader2 className="w-8 h-8 text-blue-600 mx-auto mb-3 animate-spin" />
                    <p className="text-slate-600 font-medium">載入中...</p>
                  </td>
                </tr>
              ) : error ? (
                /* Error State */
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center">
                    <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-3" />
                    <p className="text-slate-600 font-medium">載入失敗</p>
                    <p className="text-slate-500 text-sm mt-1">
                      {error.message}
                    </p>
                  </td>
                </tr>
              ) : filteredTechPacks.length === 0 ? (
                /* Empty State */
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center">
                    <FileText className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                    <p className="text-slate-600 font-medium">
                      沒有找到 Tech Pack
                    </p>
                    <p className="text-slate-500 text-sm mt-1">
                      點擊右上角「Upload Tech Pack」開始上傳
                    </p>
                  </td>
                </tr>
              ) : (
                /* Data Rows */
                filteredTechPacks.map((tp) => (
                  <tr
                    key={tp.id}
                    className="hover:bg-slate-50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-slate-400" />
                        <span className="font-mono font-medium text-slate-900">
                          {tp.style_number}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-900">
                      {tp.style_name}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-slate-700">
                        {tp.season}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-slate-700">
                        {tp.customer || "-"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={tp.status} />
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-700">
                      {formatDate(tp.created_at)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {tp.status === "parsing" ? (
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                          <span className="text-sm text-blue-700">
                            AI 解析中...
                          </span>
                        </div>
                      ) : tp.ai_confidence !== null ? (
                        <div className="flex items-center justify-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-green-600" />
                          <span className="text-sm font-medium text-green-700">
                            {Math.round(tp.ai_confidence)}%
                          </span>
                          {tp.ai_issues && tp.ai_issues.length > 0 && (
                            <span className="ml-1 px-1.5 py-0.5 bg-red-100 text-red-800 text-xs rounded">
                              {tp.ai_issues.length} issues
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-sm text-slate-500">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <Link
                          href={`/dashboard/techpacks/${tp.id}/review`}
                          className="p-2 hover:bg-blue-100 rounded-lg transition-colors group"
                          title="Review AI Results"
                        >
                          <Eye className="w-4 h-4 text-slate-600 group-hover:text-blue-700" />
                        </Link>
                        <button
                          className="p-2 hover:bg-slate-100 rounded-lg transition-colors group"
                          title="Edit"
                        >
                          <Edit3 className="w-4 h-4 text-slate-600 group-hover:text-slate-900" />
                        </button>
                        <button
                          className="p-2 hover:bg-red-100 rounded-lg transition-colors group"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4 text-slate-600 group-hover:text-red-700" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
