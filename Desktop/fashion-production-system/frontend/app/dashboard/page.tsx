"use client";

import {
  FileText,
  Package,
  Shirt,
  ShoppingCart,
  Clock,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";

// Mock data for demonstration
const stats = [
  {
    name: "Total Projects",
    value: "15",
    change: "+3 this week",
    icon: FileText,
    color: "blue",
  },
  {
    name: "Active Tech Packs",
    value: "8",
    change: "3 pending review",
    icon: Package,
    color: "purple",
  },
  {
    name: "Samples In Progress",
    value: "12",
    change: "5 need approval",
    icon: Shirt,
    color: "green",
  },
  {
    name: "Open POs",
    value: "6",
    change: "$45,600 total",
    icon: ShoppingCart,
    color: "orange",
  },
];

const projects = [
  {
    id: "1",
    styleNumber: "LW1FLWS",
    name: "SP25 Tank Top",
    progress: 60,
    status: "Fit 2",
    statusColor: "yellow",
    dueDate: "2 days",
    urgent: false,
  },
  {
    id: "2",
    styleNumber: "LW2ABCD",
    name: "FA24 Hoodie",
    progress: 30,
    status: "Proto",
    statusColor: "green",
    dueDate: "5 days",
    urgent: false,
  },
  {
    id: "3",
    styleNumber: "LW3WXYZ",
    name: "HO24 Jacket",
    progress: 100,
    status: "Approved",
    statusColor: "blue",
    dueDate: "Completed",
    urgent: false,
  },
  {
    id: "4",
    styleNumber: "LW4STUV",
    name: "SS25 Dress",
    progress: 10,
    status: "Tech Pack",
    statusColor: "red",
    dueDate: "Today!",
    urgent: true,
  },
];

export default function DashboardPage() {
  return (
    <div className="p-6 space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-500 mt-1">
          Welcome back! Here's what's happening with your projects.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <div
            key={stat.name}
            className="bg-white rounded-lg border border-slate-200 p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">
                  {stat.name}
                </p>
                <p className="text-3xl font-bold text-slate-900 mt-2">
                  {stat.value}
                </p>
                <p className="text-sm text-slate-500 mt-1">{stat.change}</p>
              </div>
              <div
                className={`p-3 rounded-lg ${
                  stat.color === "blue"
                    ? "bg-blue-100"
                    : stat.color === "purple"
                    ? "bg-purple-100"
                    : stat.color === "green"
                    ? "bg-green-100"
                    : "bg-orange-100"
                }`}
              >
                <stat.icon
                  className={`w-6 h-6 ${
                    stat.color === "blue"
                      ? "text-blue-600"
                      : stat.color === "purple"
                      ? "text-purple-600"
                      : stat.color === "green"
                      ? "text-green-600"
                      : "text-orange-600"
                  }`}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Projects Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-slate-900">
            Active Projects ({projects.length})
          </h2>
          <Link
            href="/dashboard/projects"
            className="text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            View all →
          </Link>
        </div>

        {/* Projects Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {projects.map((project) => (
            <div
              key={project.id}
              className="bg-white rounded-lg border border-slate-200 p-6 hover:shadow-lg transition-shadow cursor-pointer"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-slate-900">
                    {project.styleNumber}
                  </h3>
                  <p className="text-sm text-slate-600 mt-0.5">
                    {project.name}
                  </p>
                </div>
                {project.urgent && (
                  <AlertCircle className="w-5 h-5 text-red-500" />
                )}
              </div>

              {/* Progress Bar */}
              <div className="mb-4">
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-slate-600">Progress</span>
                  <span className="font-medium text-slate-900">
                    {project.progress}%
                  </span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full transition-all"
                    style={{ width: `${project.progress}%` }}
                  />
                </div>
              </div>

              {/* Status Badge */}
              <div className="flex items-center justify-between">
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                    project.statusColor === "yellow"
                      ? "bg-yellow-100 text-yellow-700"
                      : project.statusColor === "green"
                      ? "bg-green-100 text-green-700"
                      : project.statusColor === "blue"
                      ? "bg-blue-100 text-blue-700"
                      : "bg-red-100 text-red-700"
                  }`}
                >
                  {project.statusColor === "blue" ? (
                    <CheckCircle2 className="w-3 h-3" />
                  ) : (
                    <Clock className="w-3 h-3" />
                  )}
                  {project.status}
                </span>
                <span
                  className={`text-xs font-medium ${
                    project.urgent ? "text-red-600" : "text-slate-500"
                  }`}
                >
                  {project.urgent ? "⚠️ " : ""}Due: {project.dueDate}
                </span>
              </div>

              {/* Action Button */}
              <button className="w-full mt-4 px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 transition-colors">
                Open Project
              </button>
            </div>
          ))}

          {/* Add New Project Card */}
          <div className="bg-slate-50 rounded-lg border-2 border-dashed border-slate-300 p-6 flex flex-col items-center justify-center hover:border-blue-500 hover:bg-blue-50 transition-all cursor-pointer group">
            <div className="w-12 h-12 bg-slate-200 group-hover:bg-blue-100 rounded-full flex items-center justify-center mb-3 transition-colors">
              <TrendingUp className="w-6 h-6 text-slate-500 group-hover:text-blue-600" />
            </div>
            <p className="font-medium text-slate-700 group-hover:text-blue-700">
              New Project
            </p>
            <p className="text-sm text-slate-500 mt-1">
              Click to create a new style
            </p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <h3 className="font-semibold text-slate-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link
            href="/dashboard/upload"
            className="flex flex-col items-center gap-2 p-4 border border-slate-200 rounded-lg hover:bg-slate-50 hover:border-blue-500 transition-all"
          >
            <FileText className="w-6 h-6 text-blue-600" />
            <span className="text-sm font-medium text-slate-700">
              Upload Tech Pack
            </span>
          </Link>
          <Link
            href="/dashboard/styles"
            className="flex flex-col items-center gap-2 p-4 border border-slate-200 rounded-lg hover:bg-slate-50 hover:border-purple-500 transition-all"
          >
            <Package className="w-6 h-6 text-purple-600" />
            <span className="text-sm font-medium text-slate-700">
              View Styles
            </span>
          </Link>
          <Link
            href="/dashboard/samples"
            className="flex flex-col items-center gap-2 p-4 border border-slate-200 rounded-lg hover:bg-slate-50 hover:border-green-500 transition-all"
          >
            <Shirt className="w-6 h-6 text-green-600" />
            <span className="text-sm font-medium text-slate-700">
              Sample Requests
            </span>
          </Link>
          <Link
            href="/dashboard/samples/kanban"
            className="flex flex-col items-center gap-2 p-4 border border-slate-200 rounded-lg hover:bg-slate-50 hover:border-orange-500 transition-all"
          >
            <ShoppingCart className="w-6 h-6 text-orange-600" />
            <span className="text-sm font-medium text-slate-700">
              View Kanban
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
}
