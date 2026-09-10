"use client";

import { Bell, Search, Menu, Command } from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function TopBar() {
  return (
    <header className="h-16 glass-strong border-b border-white/5 flex items-center justify-between px-6 sticky top-0 z-10">
      <div className="flex items-center gap-4 flex-1">
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="h-5 w-5" />
        </Button>
        
        <div className="hidden md:flex items-center px-3 py-1.5 bg-surface rounded-lg border border-white/10 text-slate-400 text-sm w-64 hover:border-white/20 transition-colors cursor-text group">
          <Search className="h-4 w-4 mr-2 group-hover:text-indigo-400 transition-colors" />
          <span>Search...</span>
          <div className="ml-auto flex items-center gap-1 text-[10px] font-mono bg-white/5 px-1.5 py-0.5 rounded">
            <Command className="w-3 h-3" /> K
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" className="relative text-slate-400 hover:text-white">
          <Bell className="h-5 w-5" />
          <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full border-2 border-[#12121a]"></span>
        </Button>
        
        <div className="w-px h-6 bg-white/10 mx-1"></div>
        
        <button className="flex items-center gap-2 hover:bg-white/5 rounded-full p-1 pr-3 transition-colors">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center text-sm font-bold text-white border-2 border-[#12121a]">
            SA
          </div>
          <span className="text-sm font-medium text-slate-200 hidden sm:block">Salar</span>
        </button>
      </div>
    </header>
  );
}
