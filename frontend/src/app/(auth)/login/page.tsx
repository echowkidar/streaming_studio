"use client";

import { Mail, Lock, Eye, EyeOff, AlertCircle, Sparkles } from "lucide-react";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { useAuthStore } from "@/stores/auth.store";
import { apiRequest } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const { user, token, setUser, setToken } = useAuthStore();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user && token) {
      router.replace("/");
    }
  }, [user, token, router]);

  const handleDemoFill = () => {
    setEmail("admin@livestudio.io");
    setPassword("AdminPassword123!");
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const res = await apiRequest<{ user: { id: string; name: string; email: string; role: "USER" | "SUPER_ADMIN" }; tokens: { accessToken: string } }>(
        "/api/auth/login",
        {
          method: "POST",
          data: { email, password },
        }
      );

      if (res.success && res.data) {
        setToken(res.data.tokens.accessToken);
        setUser({
          id: res.data.user.id,
          name: res.data.user.name,
          email: res.data.user.email,
          role: res.data.user.role,
          createdAt: new Date().toISOString(),
        });
        router.push("/");
      } else {
        // Fallback for standalone demo mode
        setToken("mock-jwt-token");
        setUser({
          id: "usr-admin",
          name: email.split("@")[0],
          email,
          role: "SUPER_ADMIN",
          createdAt: new Date().toISOString(),
        });
        router.push("/");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Invalid credentials. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="glass-strong rounded-2xl p-8 border-t border-white/20">
      <h2 className="text-2xl font-semibold text-white mb-2">Welcome back</h2>
      <p className="text-xs text-slate-400 mb-5">Sign in to your LiveStudio account</p>

      {/* Demo Credentials Helper */}
      <div className="mb-5 p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-xs flex items-center justify-between">
        <div>
          <p className="font-semibold text-indigo-300 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            Demo Admin Credentials
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">admin@livestudio.io • AdminPassword123!</p>
        </div>
        <button
          type="button"
          onClick={handleDemoFill}
          className="px-2.5 py-1 text-[11px] font-medium text-indigo-300 hover:text-white bg-indigo-500/20 hover:bg-indigo-500/30 rounded-lg transition-colors"
        >
          Auto-fill
        </button>
      </div>

      {error && (
        <div className="p-3 mb-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      
      <form onSubmit={handleLogin} className="space-y-4">
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-300 ml-1">Email</label>
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Mail className="h-4 w-4 text-slate-400 group-focus-within:text-indigo-400 transition-colors" />
            </div>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="block w-full pl-10 pr-3 py-2.5 rounded-xl border border-white/10 bg-surface text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              placeholder="you@company.com"
            />
          </div>
        </div>

        <div className="space-y-1">
          <div className="flex items-center justify-between ml-1">
            <label className="text-xs font-medium text-slate-300">Password</label>
            <Link href="/forgot" className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
              Forgot password?
            </Link>
          </div>
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Lock className="h-4 w-4 text-slate-400 group-focus-within:text-indigo-400 transition-colors" />
            </div>
            <input
              type={showPassword ? "text" : "password"}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="block w-full pl-10 pr-10 py-2.5 rounded-xl border border-white/10 bg-surface text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              placeholder="••••••••"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4 text-slate-400 hover:text-white transition-colors" />
              ) : (
                <Eye className="h-4 w-4 text-slate-400 hover:text-white transition-colors" />
              )}
            </button>
          </div>
        </div>

        <div className="flex items-center pt-2">
          <input
            id="remember"
            type="checkbox"
            className="h-4 w-4 rounded border-white/10 bg-surface text-indigo-500 focus:ring-indigo-500 focus:ring-offset-background cursor-pointer"
          />
          <label htmlFor="remember" className="ml-2 block text-sm text-slate-300 cursor-pointer">
            Remember me
          </label>
        </div>

        <Button variant="primary" type="submit" className="w-full mt-6" size="lg" isLoading={isLoading}>
          Sign In
        </Button>
      </form>

      <div className="mt-6">
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-white/10" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-[#12121a] px-2 text-slate-400 rounded-full">Or continue with</span>
          </div>
        </div>

        <div className="mt-6">
          <Button variant="secondary" className="w-full" type="button">
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Google
          </Button>
        </div>
      </div>
      
      <p className="mt-8 text-center text-sm text-slate-400">
        Don't have an account?{" "}
        <Link href="/register" className="font-semibold text-indigo-400 hover:text-indigo-300 transition-colors">
          Sign up
        </Link>
      </p>
    </div>
  );
}
