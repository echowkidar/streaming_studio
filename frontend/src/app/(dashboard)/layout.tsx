"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/dashboard/Sidebar";
import TopBar from "@/components/dashboard/TopBar";
import { useAuthStore } from "@/stores/auth.store";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { user, token, logout, setUser } = useAuthStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !user && !token) {
      router.replace("/login");
    }
  }, [mounted, user, token, router]);

  // Active Session & Password Change Verification with Server
  useEffect(() => {
    if (!mounted || !token) return;

    let isMounted = true;
    const verifySession = async () => {
      try {
        const res = await fetch("/api/auth/me", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!isMounted) return;

        if (res.status === 401) {
          console.warn("[Auth] Session invalid or revoked due to password change. Redirecting to login...");
          logout();
          router.replace("/login");
          return;
        }

        if (res.ok) {
          const data = await res.json().catch(() => null);
          if (data?.success && data?.data && isMounted) {
            setUser({
              id: data.data.id,
              name: data.data.name,
              email: data.data.email,
              role: data.data.role,
              createdAt: user?.createdAt || new Date().toISOString(),
            });
          }
        }
      } catch (err) {
        // Network failure (offline) - do not logout, preserve offline state
        console.warn("[Auth] Session verification skipped due to network:", err);
      }
    };

    verifySession();
    return () => {
      isMounted = false;
    };
  }, [mounted, token, logout, router, setUser]);

  // Prevent flicker during hydration or when unauthenticated
  if (!mounted || (!user && !token)) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#0a0a0f]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-primary flex items-center justify-center shadow-lg shadow-indigo-500/20 animate-pulse">
            <span className="text-white font-bold text-2xl">L</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            <span>Verifying session...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#0a0a0f] text-slate-200 overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {/* Subtle background glow */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none -z-10" />
        
        <TopBar />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 custom-scrollbar">
          {children}
        </main>
      </div>
    </div>
  );
}
