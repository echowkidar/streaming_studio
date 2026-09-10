"use client";

import { Mail, Lock, User, Eye, EyeOff, ShieldCheck } from "lucide-react";
import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";

export default function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [password, setPassword] = useState("");

  const calculateStrength = () => {
    if (!password) return 0;
    let score = 0;
    if (password.length >= 8) score += 25;
    if (/[A-Z]/.test(password)) score += 25;
    if (/[0-9]/.test(password)) score += 25;
    if (/[^A-Za-z0-9]/.test(password)) score += 25;
    return score;
  };

  const strength = calculateStrength();

  return (
    <div className="glass-strong rounded-2xl p-8 border-t border-white/20">
      <h2 className="text-2xl font-semibold text-white mb-2">Create an account</h2>
      <p className="text-xs text-slate-400 mb-6">
        Start hosting professional live streams, webinars and recordings.
      </p>
      
      <form className="space-y-4">
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-300 ml-1">Full Name</label>
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <User className="h-4 w-4 text-slate-400 group-focus-within:text-indigo-400 transition-colors" />
            </div>
            <input
              type="text"
              required
              className="block w-full pl-10 pr-3 py-2.5 rounded-xl border border-white/10 bg-surface text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              placeholder="Salar Khan"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-300 ml-1">Work Email</label>
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Mail className="h-4 w-4 text-slate-400 group-focus-within:text-indigo-400 transition-colors" />
            </div>
            <input
              type="email"
              required
              className="block w-full pl-10 pr-3 py-2.5 rounded-xl border border-white/10 bg-surface text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              placeholder="you@company.com"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-300 ml-1">Password</label>
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
              placeholder="Min 8 chars, 1 uppercase, 1 symbol"
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
          {password && (
            <div className="pt-1">
              <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-300 ${
                    strength <= 25 ? "bg-rose-500" : strength <= 50 ? "bg-amber-500" : strength <= 75 ? "bg-indigo-500" : "bg-emerald-500"
                  }`} 
                  style={{ width: `${strength}%` }} 
                />
              </div>
            </div>
          )}
        </div>

        <div className="flex items-start pt-2">
          <input
            id="terms"
            type="checkbox"
            required
            className="h-4 w-4 mt-0.5 rounded border-white/10 bg-surface text-indigo-500 focus:ring-indigo-500 focus:ring-offset-background cursor-pointer"
          />
          <label htmlFor="terms" className="ml-2 block text-xs text-slate-300 leading-relaxed cursor-pointer">
            I agree to the <span className="text-indigo-400 hover:underline">Terms of Service</span> and <span className="text-indigo-400 hover:underline">Privacy Policy</span>
          </label>
        </div>

        <Button variant="primary" className="w-full mt-6" size="lg">
          <ShieldCheck className="w-4 h-4 mr-2" />
          Create Studio Account
        </Button>
      </form>

      <p className="mt-8 text-center text-sm text-slate-400">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-indigo-400 hover:text-indigo-300 transition-colors">
          Sign in
        </Link>
      </p>
    </div>
  );
}
