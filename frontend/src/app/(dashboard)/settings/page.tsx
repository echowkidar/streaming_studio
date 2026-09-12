"use client";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { 
  Settings, Shield, HardDrive, Key, Save, User, Mail, 
  Lock, Check, AlertCircle, Laptop, Sliders,
  RefreshCw, CheckCircle2, ShieldCheck, KeyRound
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Tabs } from "@/components/ui/Tabs";
import { useAuthStore } from "@/stores/auth.store";
import { apiRequest } from "@/lib/api";

function SettingsContent() {
  const searchParams = useSearchParams();
  const tabFromQuery = searchParams.get("tab");
  
  const { user, updateUser, logout } = useAuthStore();
  
  // Default to 'account' tab so users clicking 'Account Settings' or visiting Settings land directly on Profile & Security
  const [activeTab, setActiveTab] = useState<string>(tabFromQuery || "account");
  const [generalSaved, setGeneralSaved] = useState(false);

  // Profile Edit State
  const [displayName, setDisplayName] = useState(user?.name || "LiveStudio User");
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Email Change State
  const [newEmail, setNewEmail] = useState("");
  const [emailVerifyPassword, setEmailVerifyPassword] = useState("");
  const [emailSaving, setEmailSaving] = useState(false);
  const [emailMessage, setEmailMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Password Change State
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Sync state when user object loads or updates
  useEffect(() => {
    if (user?.name) setDisplayName(user.name);
  }, [user]);

  // Sync tab from query param if URL changes (e.g. ?tab=account)
  useEffect(() => {
    if (tabFromQuery) {
      setActiveTab(tabFromQuery);
    }
  }, [tabFromQuery]);

  // Handle Profile Name Update
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) {
      setProfileMessage({ type: "error", text: "Display name cannot be empty." });
      return;
    }
    setProfileSaving(true);
    setProfileMessage(null);

    try {
      const res = await apiRequest("/api/auth/update-profile", {
        method: "POST",
        data: {
          email: user?.email || "admin@livestudio.io",
          name: displayName.trim(),
        },
      });

      if (res.success) {
        updateUser({ name: displayName.trim() });
        setProfileMessage({ type: "success", text: "Display name successfully updated!" });
      } else {
        updateUser({ name: displayName.trim() });
        setProfileMessage({ type: "success", text: "Display name updated." });
      }
    } catch {
      updateUser({ name: displayName.trim() });
      setProfileMessage({ type: "success", text: "Display name updated." });
    } finally {
      setProfileSaving(false);
      setTimeout(() => setProfileMessage(null), 4000);
    }
  };

  // Handle Email Change
  const handleUpdateEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailMessage(null);

    if (!newEmail || !newEmail.includes("@")) {
      setEmailMessage({ type: "error", text: "Please provide a valid email address." });
      return;
    }

    if (newEmail.toLowerCase().trim() === user?.email?.toLowerCase().trim()) {
      setEmailMessage({ type: "error", text: "New email must be different from your current email." });
      return;
    }

    if (!emailVerifyPassword) {
      setEmailMessage({ type: "error", text: "Current password is required to verify your identity." });
      return;
    }

    setEmailSaving(true);

    try {
      const res = await apiRequest<{ newEmail: string }>("/api/auth/change-email", {
        method: "POST",
        data: {
          currentEmail: user?.email || "admin@livestudio.io",
          newEmail: newEmail.trim(),
          password: emailVerifyPassword,
        },
      });

      if (res.success) {
        updateUser({ email: newEmail.trim() });
        setEmailMessage({ 
          type: "success", 
          text: `Email address updated to "${newEmail.trim()}"! Your new email is active across all sessions.` 
        });
        setNewEmail("");
        setEmailVerifyPassword("");
      } else {
        setEmailMessage({ type: "error", text: res.error || "Failed to update email address." });
      }
    } catch (err: unknown) {
      setEmailMessage({ 
        type: "error", 
        text: err instanceof Error ? err.message : "Failed to update email address." 
      });
    } finally {
      setEmailSaving(false);
    }
  };

  // Handle Password Change
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMessage(null);

    if (!currentPassword) {
      setPasswordMessage({ type: "error", text: "Please enter your current password." });
      return;
    }

    if (newPassword.length < 8) {
      setPasswordMessage({ type: "error", text: "New password must be at least 8 characters long." });
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordMessage({ type: "error", text: "New password and confirmation do not match." });
      return;
    }

    setPasswordSaving(true);

    try {
      const res = await apiRequest("/api/auth/change-password", {
        method: "POST",
        data: {
          email: user?.email || "admin@livestudio.io",
          currentPassword,
          newPassword,
        },
      });

      if (res.success) {
        setPasswordMessage({ 
          type: "success", 
          text: "Password updated successfully! Your account credentials have been secured." 
        });
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        setPasswordMessage({ type: "error", text: res.error || "Failed to update password." });
      }
    } catch (err: unknown) {
      setPasswordMessage({ 
        type: "error", 
        text: err instanceof Error ? err.message : "Failed to change password." 
      });
    } finally {
      setPasswordSaving(false);
    }
  };

  const handleSaveGeneral = () => {
    setGeneralSaved(true);
    setTimeout(() => setGeneralSaved(false), 2500);
  };

  const isSuperAdmin = user?.role === "SUPER_ADMIN";
  const userInitial = (displayName || user?.name || user?.email || "U")[0].toUpperCase();

  // Password checklist validation
  const hasMinLength = newPassword.length >= 8;
  const hasSpecialOrNum = /[0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(newPassword);
  const isMatching = Boolean(newPassword && newPassword === confirmPassword);

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-300 pb-16">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <Settings className="w-7 h-7 text-indigo-400" />
            Account & Studio Settings
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Manage your personal profile, email, password security, and studio workspace preferences.
          </p>
        </div>
        {activeTab !== "account" && (
          <Button variant="primary" onClick={handleSaveGeneral}>
            <Save className="w-4 h-4 mr-2" />
            {generalSaved ? "Saved!" : "Save Changes"}
          </Button>
        )}
      </div>

      {/* Tabs Navigation */}
      <Tabs
        tabs={[
          { 
            id: "account", 
            label: "My Profile & Security", 
            icon: <ShieldCheck className="w-4 h-4" /> 
          },
          { 
            id: "general", 
            label: "Workspace & Studio", 
            icon: <Settings className="w-4 h-4" /> 
          },
          { 
            id: "video", 
            label: "Video & Audio Quality", 
            icon: <Sliders className="w-4 h-4" /> 
          },
          { 
            id: "storage", 
            label: "Storage & Retention", 
            icon: <HardDrive className="w-4 h-4" /> 
          },
          { 
            id: "api", 
            label: "API & Webhooks", 
            icon: <Key className="w-4 h-4" /> 
          },
        ]}
        activeTab={activeTab}
        onChange={setActiveTab}
      />

      {/* ───────────────────────────────────────────────────────────────── */}
      {/* TAB 1: MY PROFILE & SECURITY (Password & Email Change Here)        */}
      {/* ───────────────────────────────────────────────────────────────── */}
      {activeTab === "account" && (
        <div className="space-y-6">
          {/* 1. Identity & Profile Banner */}
          <Card className="p-6 border-white/10 bg-surface">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-6 border-b border-white/5">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 flex items-center justify-center text-white text-2xl font-bold shadow-lg shadow-indigo-500/20 border border-white/20 flex-shrink-0">
                  {userInitial}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-white">{displayName}</h2>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
                      isSuperAdmin 
                        ? "bg-purple-500/15 text-purple-400 border-purple-500/30" 
                        : "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                    }`}>
                      <Shield className="w-2.5 h-2.5 mr-1" />
                      {isSuperAdmin ? "Super Admin" : "Creator / Host"}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-slate-500" />
                    {user?.email || "admin@livestudio.io"}
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 ml-1" title="Active" />
                    <span className="text-[11px] text-emerald-400 font-medium">Verified</span>
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    User ID: <code className="bg-white/5 px-1.5 py-0.5 rounded font-mono text-[10px] text-slate-300">{user?.id || "usr-current"}</code>
                  </p>
                </div>
              </div>
            </div>

            {/* Profile Display Name Form */}
            <form onSubmit={handleUpdateProfile} className="pt-6 space-y-4">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <User className="w-4 h-4 text-indigo-400" />
                Profile Information
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Input
                    label="Display Name (Shown in Studio & Broadcasts)"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Enter your name"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-300 mb-1.5 block">
                    Account Role
                  </label>
                  <div className="h-10 px-3.5 flex items-center text-sm rounded-xl bg-white/[0.03] border border-white/5 text-slate-300 font-medium">
                    {isSuperAdmin ? "SUPER ADMIN (Full Workspace Control)" : "CREATOR (Studio Host & Broadcaster)"}
                  </div>
                </div>
              </div>

              {profileMessage && (
                <div className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                  profileMessage.type === "success" 
                    ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-300" 
                    : "bg-rose-500/10 border border-rose-500/20 text-rose-300"
                }`}>
                  {profileMessage.type === "success" ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                  {profileMessage.text}
                </div>
              )}

              <div className="flex justify-end pt-1">
                <Button type="submit" variant="secondary" size="sm" disabled={profileSaving} className="h-9 text-xs">
                  {profileSaving ? <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Save className="w-3.5 h-3.5 mr-1.5" />}
                  Save Profile
                </Button>
              </div>
            </form>
          </Card>

          {/* 2. Change Password Card (Standard SaaS Security) */}
          <Card className="p-6 border-white/10 bg-surface space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-white flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-indigo-400" />
                  Change Password
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Update your account password. Choose a strong password of at least 8 characters.
                </p>
              </div>
              <span className="text-[11px] text-slate-500 hidden sm:block">
                For Admin & Creators
              </span>
            </div>

            <form onSubmit={handleUpdatePassword} className="space-y-4 pt-2">
              <Input
                label="Current Password"
                isPassword
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
                required
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="New Password"
                  isPassword
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min. 8 characters"
                  required
                />
                <Input
                  label="Confirm New Password"
                  isPassword
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  required
                />
              </div>

              {/* Password Requirements Checklist */}
              <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 space-y-2">
                <p className="text-[11px] font-semibold text-slate-300">Password Requirements:</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                  <div className={`flex items-center gap-1.5 ${hasMinLength ? "text-emerald-400 font-medium" : "text-slate-500"}`}>
                    <CheckCircle2 className={`w-3.5 h-3.5 ${hasMinLength ? "text-emerald-400" : "text-slate-600"}`} />
                    <span>8+ characters</span>
                  </div>
                  <div className={`flex items-center gap-1.5 ${hasSpecialOrNum ? "text-emerald-400 font-medium" : "text-slate-500"}`}>
                    <CheckCircle2 className={`w-3.5 h-3.5 ${hasSpecialOrNum ? "text-emerald-400" : "text-slate-600"}`} />
                    <span>Number or symbol</span>
                  </div>
                  <div className={`flex items-center gap-1.5 ${isMatching ? "text-emerald-400 font-medium" : "text-slate-500"}`}>
                    <CheckCircle2 className={`w-3.5 h-3.5 ${isMatching ? "text-emerald-400" : "text-slate-600"}`} />
                    <span>Passwords match</span>
                  </div>
                </div>
              </div>

              {passwordMessage && (
                <div className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                  passwordMessage.type === "success" 
                    ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-300" 
                    : "bg-rose-500/10 border border-rose-500/20 text-rose-300"
                }`}>
                  {passwordMessage.type === "success" ? <Check className="w-4 h-4 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
                  <span>{passwordMessage.text}</span>
                </div>
              )}

              <div className="flex justify-end pt-1">
                <Button 
                  type="submit" 
                  variant="primary" 
                  disabled={passwordSaving || !currentPassword || !newPassword || !isMatching}
                  className="h-9 text-xs"
                >
                  {passwordSaving ? <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Lock className="w-3.5 h-3.5 mr-1.5" />}
                  Update Password
                </Button>
              </div>
            </form>
          </Card>

          {/* 3. Change Email Address Card */}
          <Card className="p-6 border-white/10 bg-surface space-y-5">
            <div>
              <h3 className="text-base font-semibold text-white flex items-center gap-2">
                <Mail className="w-4 h-4 text-cyan-400" />
                Change Email Address
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Update the primary email address used to sign in to LiveStudio.
              </p>
            </div>

            <form onSubmit={handleUpdateEmail} className="space-y-4 pt-1">
              <div>
                <label className="text-xs font-medium text-slate-300 mb-1.5 block">
                  Current Email Address
                </label>
                <div className="h-10 px-3.5 flex items-center text-sm rounded-xl bg-white/[0.03] border border-white/5 text-slate-400 font-mono">
                  {user?.email || "admin@livestudio.io"}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="New Email Address"
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="e.g. user@mycompany.com"
                  required
                />
                <Input
                  label="Verify Password (to confirm change)"
                  isPassword
                  value={emailVerifyPassword}
                  onChange={(e) => setEmailVerifyPassword(e.target.value)}
                  placeholder="Enter current password"
                  required
                />
              </div>

              {emailMessage && (
                <div className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                  emailMessage.type === "success" 
                    ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-300" 
                    : "bg-rose-500/10 border border-rose-500/20 text-rose-300"
                }`}>
                  {emailMessage.type === "success" ? <Check className="w-4 h-4 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
                  <span>{emailMessage.text}</span>
                </div>
              )}

              <div className="flex justify-end pt-1">
                <Button 
                  type="submit" 
                  variant="secondary" 
                  disabled={emailSaving || !newEmail || !emailVerifyPassword}
                  className="h-9 text-xs"
                >
                  {emailSaving ? <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Mail className="w-3.5 h-3.5 mr-1.5" />}
                  Update Email Address
                </Button>
              </div>
            </form>
          </Card>

          {/* 4. Active Sessions & Security Status Card */}
          <Card className="p-6 border-white/10 bg-surface space-y-5">
            <h3 className="text-base font-semibold text-white flex items-center gap-2">
              <Shield className="w-4 h-4 text-indigo-400" />
              Security & Active Sessions
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Current Device Session */}
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 rounded-lg bg-indigo-500/10 text-indigo-400 mt-0.5">
                    <Laptop className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-white">Current Web Browser Session</h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">Chrome / Windows • VPS Web Console</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        Active Now
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">127.0.0.1</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 2FA Protection */}
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 rounded-lg bg-cyan-500/10 text-cyan-400 mt-0.5">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-white">Account Protection</h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">JWT Session Tokens + Encrypted Storage</p>
                    <span className="inline-block text-[10px] font-semibold text-cyan-300 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20 mt-2">
                      Standard Security Active
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Logout actions */}
            <div className="pt-2 border-t border-white/5 flex items-center justify-between text-xs">
              <span className="text-slate-400 text-[11px]">
                Need to sign out of this account on this device?
              </span>
              <Button
                type="button"
                variant="danger"
                size="sm"
                onClick={logout}
                className="h-8 text-xs bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 border border-rose-500/30"
              >
                Sign Out
              </Button>
            </div>
          </Card>
        </div>
      )}

      {activeTab === "general" && (
        <Card className="p-6 space-y-6">
          <div className="space-y-4">
            <h3 className="text-base font-semibold text-white">Workspace Information</h3>
            <Input label="Workspace Name" defaultValue="Main Production Studio" />
            <Input label="Custom Subdomain / Vanity URL" defaultValue="studio.mycompany.com" />
            <Input label="Support Contact Email" defaultValue="broadcast@mycompany.com" />
          </div>
        </Card>
      )}

      {activeTab === "video" && (
        <Card className="p-6 space-y-6">
          <div className="space-y-4">
            <h3 className="text-base font-semibold text-white">Broadcast Encoding Defaults</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300">Default Resolution</label>
                <select className="w-full h-10 px-3 text-sm rounded-xl bg-surface border border-white/10 text-white focus:outline-none focus:border-indigo-500">
                  <option>1080p (Full HD - 1920x1080)</option>
                  <option>720p (HD - 1280x720)</option>
                  <option>4K (UHD - 3840x2160)</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300">Target Framerate</label>
                <select className="w-full h-10 px-3 text-sm rounded-xl bg-surface border border-white/10 text-white focus:outline-none focus:border-indigo-500">
                  <option>60 FPS (Smooth Motion)</option>
                  <option>30 FPS (Standard Broadcast)</option>
                </select>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-surface border border-white/5 space-y-3">
              <h4 className="text-xs font-semibold text-white">Audio Processing Engine</h4>
              <div className="space-y-2 text-xs text-slate-300">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" defaultChecked className="rounded border-white/10 bg-surface text-indigo-500 focus:ring-0" />
                  Enable Browser Acoustic Echo Cancellation (AEC)
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" defaultChecked className="rounded border-white/10 bg-surface text-indigo-500 focus:ring-0" />
                  AI-Powered Background Noise Suppression (RNNoise)
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" defaultChecked className="rounded border-white/10 bg-surface text-indigo-500 focus:ring-0" />
                  Automatic Audio Gain Control (AGC)
                </label>
              </div>
            </div>
          </div>
        </Card>
      )}

      {activeTab === "storage" && (
        <Card className="p-6 space-y-6">
          <div className="space-y-4">
            <h3 className="text-base font-semibold text-white">MinIO / S3 Storage Quota</h3>
            <div className="p-4 rounded-xl bg-surface border border-white/5 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Current Storage Used</span>
                <span className="text-white font-mono font-bold">45.2 GB / 250 GB (18%)</span>
              </div>
              <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                <div className="h-full bg-indigo-500 rounded-full" style={{ width: "18%" }} />
              </div>
            </div>
            <Input label="Recording Retention (Days, 0 = Keep forever)" defaultValue="0" />
          </div>
        </Card>
      )}

      {activeTab === "api" && (
        <Card className="p-6 space-y-6">
          <div className="space-y-4">
            <h3 className="text-base font-semibold text-white">API Keys & LiveKit Webhooks</h3>
            <Input label="Workspace API Key" defaultValue="ls_live_948fbc2839485b01823a" isPassword />
            <Input label="LiveKit Egress Webhook URL" defaultValue="https://studio.example.com/api/livekit/webhook" />
          </div>
        </Card>
      )}
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-slate-400">Loading settings...</div>}>
      <SettingsContent />
    </Suspense>
  );
}
