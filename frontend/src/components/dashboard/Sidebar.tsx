"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth.store";
import { useUIStore } from "@/stores/ui.store";
import { cn } from "@/lib/utils";
import { 
  Home, Video, Radio, Film, Send, Palette, 
  FolderOpen, Users, Sparkles, FileText, BarChart3,
  UserPlus, Settings, Shield, ChevronLeft, ChevronRight, LogOut, X
} from "lucide-react";

const navigation = [
  { name: "Dashboard", href: "/", icon: Home },
  { name: "Studios", href: "/studios", icon: Video },
  { name: "Broadcasts", href: "/broadcasts", icon: Radio },
  { name: "Recordings", href: "/recordings", icon: Film },
  { name: "Destinations", href: "/destinations", icon: Send },
  { name: "Brand Kit", href: "/brand-kit", icon: Palette },
  { name: "Media Library", href: "/media", icon: FolderOpen },
  { name: "Webinars", href: "/webinars", icon: Users },
  { name: "AI Clips", href: "/ai-clips", icon: Sparkles },
  { name: "Transcripts", href: "/transcripts", icon: FileText },
  { name: "Analytics", href: "/analytics", icon: BarChart3 },
];

const secondaryNavigation = [
  { name: "Team", href: "/team", icon: UserPlus },
  { name: "Settings", href: "/settings", icon: Settings },
  { name: "Admin", href: "/admin", icon: Shield },
];

export default function Sidebar() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const { isMobileSidebarOpen, setMobileSidebarOpen } = useUIStore();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const pathname = usePathname();

  const isSuperAdmin = user?.role === "SUPER_ADMIN";
  const filteredSecondaryNav = secondaryNavigation.filter(
    (item) => item.href !== "/admin" || isSuperAdmin
  );

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  return (
    <>
      {/* Mobile Drawer Backdrop */}
      {isMobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/75 backdrop-blur-sm z-40 md:hidden animate-in fade-in duration-200"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      <div 
        className={cn(
          "flex flex-col h-screen glass-panel border-r border-white/5 transition-all duration-300 z-50",
          // On Desktop
          "hidden md:flex relative shrink-0",
          isCollapsed ? "w-[72px]" : "w-[260px]",
          // On Mobile
          isMobileSidebarOpen && "fixed inset-y-0 left-0 flex w-[280px] bg-[#0c0c14] shadow-2xl"
        )}
      >
        <div className="h-16 flex items-center justify-between px-4 border-b border-white/5 shrink-0">
          <div className="flex items-center">
            <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center shrink-0">
              <span className="text-white font-bold text-xl">L</span>
            </div>
            {(!isCollapsed || isMobileSidebarOpen) && (
              <span className="ml-3 font-bold text-lg text-white tracking-tight truncate">
                LiveStudio
              </span>
            )}
          </div>

          {/* Close button on mobile */}
          {isMobileSidebarOpen && (
            <button
              onClick={() => setMobileSidebarOpen(false)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 md:hidden"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

      <div className="flex-1 overflow-y-auto py-4 custom-scrollbar flex flex-col gap-1 px-3">
        {navigation.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/" && pathname?.startsWith(item.href));
          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={() => setMobileSidebarOpen(false)}
              className={cn(
                "group flex items-center rounded-xl px-3 py-2.5 text-sm font-medium transition-all relative overflow-hidden",
                isActive 
                  ? "text-indigo-400 bg-indigo-500/10" 
                  : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
              )}
              title={isCollapsed ? item.name : undefined}
            >
              {isActive && (
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-primary rounded-r" />
              )}
              <item.icon className={cn("shrink-0 h-5 w-5", isActive ? "text-indigo-400" : "text-slate-400 group-hover:text-slate-300")} />
              {!isCollapsed && <span className="ml-3 truncate">{item.name}</span>}
            </Link>
          );
        })}

        <div className="mt-4 mb-2 mx-4 h-px bg-white/10" />

        {filteredSecondaryNav.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/" && pathname?.startsWith(item.href));
          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={() => setMobileSidebarOpen(false)}
              className={cn(
                "group flex items-center rounded-xl px-3 py-2.5 text-sm font-medium transition-all relative overflow-hidden",
                isActive
                  ? "text-indigo-400 bg-indigo-500/10"
                  : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
              )}
              title={isCollapsed ? item.name : undefined}
            >
              {isActive && (
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-primary rounded-r" />
              )}
              <item.icon className={cn("shrink-0 h-5 w-5", isActive ? "text-indigo-400" : "text-slate-400 group-hover:text-slate-300")} />
              {!isCollapsed && <span className="ml-3 truncate">{item.name}</span>}
            </Link>
          );
        })}
      </div>

      <div className="p-3 border-t border-white/5 shrink-0 flex flex-col gap-1">
        <button
          onClick={handleLogout}
          className={cn(
            "group flex items-center rounded-xl px-3 py-2 text-sm font-medium transition-all w-full",
            "text-rose-400/80 hover:text-rose-300 hover:bg-rose-500/10"
          )}
          title={isCollapsed ? "Log out" : undefined}
        >
          <LogOut className="shrink-0 h-5 w-5 text-rose-400 group-hover:text-rose-300" />
          {!isCollapsed && <span className="ml-3 truncate font-medium">Log out</span>}
        </button>
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="w-full hidden md:flex items-center justify-center p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
          title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isCollapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
        </button>
      </div>
    </div>
    </>
  );
}
