"use client";

import { Search, Bell, User } from "lucide-react";
import { useState } from "react";

export function TopNav() {
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <div className="h-16 border-b bg-white px-6 flex items-center justify-between sticky top-0 z-10">
      {/* Search */}
      <div className="flex-1 max-w-xl">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search projects, tech packs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Right Side Actions */}
      <div className="flex items-center gap-4 ml-6">
        {/* Notifications */}
        <button className="relative p-2 hover:bg-slate-100 rounded-lg transition-colors">
          <Bell className="w-5 h-5 text-slate-600" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
        </button>

        {/* User Menu */}
        <button className="flex items-center gap-2 p-2 hover:bg-slate-100 rounded-lg transition-colors">
          <div className="w-8 h-8 bg-gradient-to-br from-green-400 to-blue-500 rounded-full flex items-center justify-center">
            <User className="w-4 h-4 text-white" />
          </div>
          <div className="text-left hidden md:block">
            <p className="text-sm font-medium text-slate-700">Amber</p>
            <p className="text-xs text-slate-500">Admin</p>
          </div>
        </button>
      </div>
    </div>
  );
}
