"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, Search, Menu, Command, LogOut, Settings, Shield, User as UserIcon, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useAuthStore } from "@/stores/auth.store";

export default function TopBar() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  const displayName = user?.name || "Creator";
  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "CR";

  return (
    <header className="h-16 glass-strong border-b border-white/5 flex items-center justify-between px-6 sticky top-0 z-20">
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
        
        <div className="relative" ref={menuRef}>
          <button 
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="flex items-center gap-2.5 hover:bg-white/5 rounded-full p-1 pr-3 transition-colors border border-transparent hover:border-white/10"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center text-xs font-bold text-white border-2 border-[#12121a] shadow-sm">
              {initials}
            </div>
            <span className="text-sm font-medium text-slate-200 hidden sm:block max-w-[120px] truncate">{displayName}</span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {isMenuOpen && (
            <div className="absolute right-0 mt-2 w-64 glass-strong rounded-2xl border border-white/10 p-2 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-100">
              <div className="px-3 py-2.5 border-b border-white/5 mb-1">
                <p className="text-xs font-semibold text-white truncate">{displayName}</p>
                <p className="text-[11px] text-slate-400 truncate">{user?.email || "user@livestudio.io"}</p>
                <div className="mt-1.5">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                    <Shield className="w-2.5 h-2.5 mr-1" />
                    {user?.role === "SUPER_ADMIN" ? "SUPER ADMIN" : "CREATOR"}
                  </span>
                </div>
              </div>

              <div className="space-y-0.5">
                <Link
                  href="/settings"
                  onClick={() => setIsMenuOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-300 hover:text-white hover:bg-white/5 rounded-xl transition-colors"
                >
                  <Settings className="w-4 h-4 text-slate-400" />
                  Account Settings
                </Link>

                {user?.role === "SUPER_ADMIN" && (
                  <Link
                    href="/admin"
                    onClick={() => setIsMenuOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-300 hover:text-white hover:bg-white/5 rounded-xl transition-colors"
                  >
                    <Shield className="w-4 h-4 text-indigo-400" />
                    Admin Panel
                  </Link>
                )}

                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-xl transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Log Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

