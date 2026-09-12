"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setSubmitted(true);
    }, 800);
  };

  return (
    <div className="glass-strong rounded-2xl p-8 border-t border-white/20 max-w-md w-full mx-auto">
      <div className="mb-6">
        <Link href="/login" className="inline-flex items-center text-xs text-slate-400 hover:text-white transition-colors mb-4">
          <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Back to Sign In
        </Link>
        <h2 className="text-2xl font-semibold text-white mb-2">Reset Password</h2>
        <p className="text-xs text-slate-400">
          Enter your registered email address and we will send you a link to reset your password.
        </p>
      </div>

      {submitted ? (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center space-y-3">
          <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
          <p className="text-sm font-medium text-white">Reset instructions sent!</p>
          <p className="text-xs text-slate-400">
            If an account exists for <span className="text-slate-200 font-semibold">{email}</span>, you will receive password reset instructions shortly.
          </p>
          <Link href="/login">
            <Button variant="secondary" size="sm" className="mt-3 w-full text-xs">
              Return to Login
            </Button>
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Email Address"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@example.com"
            required
            autoFocus
          />

          <Button variant="primary" size="lg" className="w-full" type="submit" disabled={loading}>
            {loading ? "Sending link..." : "Send Reset Link"}
          </Button>
        </form>
      )}
    </div>
  );
}
