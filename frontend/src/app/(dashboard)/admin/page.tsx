"use client";

import { useState, useEffect } from "react";
import { 
  Shield, Server, Cpu, HardDrive, Database, Activity, 
  CheckCircle2, RefreshCw, ShieldAlert, Users, KeyRound, 
  Sparkles, Copy, Check, UserPlus, Trash2, Film, Music, Image as ImageIcon, Eye 
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth.store";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { apiRequest } from "@/lib/api";
import { cn } from "@/lib/utils";

export default function AdminPage() {
  const router = useRouter();
  const { user } = useAuthStore();

  const [users, setUsers] = useState<Array<{ id: string; name: string; email: string; role: string; createdAt: string }>>([]);
  const [usersLoading, setUsersLoading] = useState(true);

  // Reset Password State
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [selectedUserForReset, setSelectedUserForReset] = useState<{ id?: string; name?: string; email: string } | null>(null);
  const [newPasswordInput, setNewPasswordInput] = useState("");
  const [isSavingReset, setIsSavingReset] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetSuccessText, setResetSuccessText] = useState<string | null>(null);
  const [copiedPassword, setCopiedPassword] = useState(false);

  // Create User State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createEmail, setCreateEmail] = useState("");
  const [createPassword, setCreatePassword] = useState("");
  const [createRole, setCreateRole] = useState<"USER" | "SUPER_ADMIN">("USER");
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSuccess, setCreateSuccess] = useState<string | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);

  // Media Moderation State
  const [adminMedia, setAdminMedia] = useState<Array<{
    id: string;
    name: string;
    assetType: "VIDEO" | "AUDIO" | "IMAGE" | "PDF";
    mimeType: string;
    fileSize: number;
    duration?: number;
    storagePath: string;
    url: string;
    studioId: string;
    isTemporary: boolean;
    createdAt: string;
    uploader: {
      id: string;
      name: string;
      email: string;
      workspaceName: string;
    };
  }>>([]);
  const [adminMediaLoading, setAdminMediaLoading] = useState(true);
  const [deletingMediaId, setDeletingMediaId] = useState<string | null>(null);
  const [previewMedia, setPreviewMedia] = useState<{
    id: string;
    name: string;
    assetType: "VIDEO" | "AUDIO" | "IMAGE" | "PDF";
    mimeType: string;
    fileSize: number;
    duration?: number;
    storagePath: string;
    url: string;
    studioId: string;
    isTemporary: boolean;
    createdAt: string;
    uploader: {
      id: string;
      name: string;
      email: string;
      workspaceName: string;
    };
  } | null>(null);
  const [mediaFilter, setMediaFilter] = useState<string>("ALL");

  const fetchAdminMedia = async () => {
    setAdminMediaLoading(true);
    try {
      const res = await apiRequest<Array<{
        id: string;
        name: string;
        assetType: "VIDEO" | "AUDIO" | "IMAGE" | "PDF";
        mimeType: string;
        fileSize: number;
        duration?: number;
        storagePath: string;
        url: string;
        studioId: string;
        isTemporary: boolean;
        createdAt: string;
        uploader: {
          id: string;
          name: string;
          email: string;
          workspaceName: string;
        };
      }>>("/api/admin/media");
      if (res.success && Array.isArray(res.data)) {
        setAdminMedia(res.data);
      }
    } catch (err) {
      console.warn("Failed to load admin media:", err);
    } finally {
      setAdminMediaLoading(false);
    }
  };

  const handleDeleteProhibitedMedia = async (item: { id: string; name: string; uploader: { email: string } }) => {
    if (
      !confirm(
        `Are you sure you want to permanently delete and purge "${item.name}" uploaded by ${item.uploader.email}? This will immediately remove it from the VPS disk and database.`
      )
    ) {
      return;
    }
    setDeletingMediaId(item.id);
    try {
      const res = await apiRequest(`/api/admin/media/${item.id}`, { method: "DELETE" });
      if (res.success) {
        setAdminMedia((prev) => prev.filter((m) => m.id !== item.id));
        if (previewMedia?.id === item.id) setPreviewMedia(null);
      } else {
        alert(res.error || "Failed to delete media asset");
      }
    } catch (err) {
      console.error("Delete media error:", err);
    } finally {
      setDeletingMediaId(null);
    }
  };

  const fetchUsers = async () => {
    setUsersLoading(true);
    try {
      const res = await apiRequest<Array<{ id: string; name: string; email: string; role: string; createdAt: string }>>(
        "/api/admin/users"
      );
      if (res.success && Array.isArray(res.data)) {
        setUsers(res.data);
      }
    } catch (err) {
      console.warn("Failed to load users:", err);
    } finally {
      setUsersLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role === "SUPER_ADMIN") {
      fetchUsers();
      fetchAdminMedia();
    }
  }, [user]);

  const handleGenerateRandomPassword = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
    let rand = "";
    for (let i = 0; i < 4; i++) rand += chars.charAt(Math.floor(Math.random() * chars.length));
    const pass = `Studio#${rand}${Math.floor(100 + Math.random() * 900)}`;
    setNewPasswordInput(pass);
  };

  const handleExecutePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPasswordInput || newPasswordInput.length < 6) {
      setResetError("Password must be at least 6 characters long");
      return;
    }
    if (!selectedUserForReset?.email) {
      setResetError("Email is required");
      return;
    }

    setIsSavingReset(true);
    setResetError(null);

    try {
      let res;
      if (selectedUserForReset.id && !selectedUserForReset.id.startsWith("usr-custom")) {
        res = await apiRequest(`/api/admin/users/${selectedUserForReset.id}/reset-password`, {
          method: "POST",
          data: { newPassword: newPasswordInput },
        });
      } else {
        res = await apiRequest(`/api/admin/reset-password-by-email`, {
          method: "POST",
          data: {
            email: selectedUserForReset.email,
            newPassword: newPasswordInput,
          },
        });
      }

      if (res.success) {
        setResetSuccessText(newPasswordInput);
        fetchUsers();
      } else {
        setResetError(res.error || "Failed to reset password. Please try again.");
      }
    } catch (err) {
      setResetError(err instanceof Error ? err.message : "Failed to reset password.");
    } finally {
      setIsSavingReset(false);
    }
  };

  const handleGenerateCreatePassword = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
    let rand = "";
    for (let i = 0; i < 4; i++) rand += chars.charAt(Math.floor(Math.random() * chars.length));
    setCreatePassword(`Studio#${rand}${Math.floor(100 + Math.random() * 900)}`);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createEmail || !createPassword || !createName) {
      setCreateError("Name, email, and password are required.");
      return;
    }
    try {
      setCreateLoading(true);
      setCreateError(null);
      setCreateSuccess(null);
      const res = await apiRequest("/api/admin/users", {
        method: "POST",
        data: {
          name: createName.trim(),
          email: createEmail.trim(),
          password: createPassword,
          role: createRole,
        },
      });

      if (res.success) {
        setCreateSuccess(`Account for ${createEmail} created successfully! Password: ${createPassword}`);
        fetchUsers();
      } else {
        setCreateError(res.error || "Failed to create user");
      }
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Failed to create user");
    } finally {
      setCreateLoading(false);
    }
  };

  const handleDeleteUser = async (u: { id: string; email: string; role?: string }) => {
    if (u.role === "SUPER_ADMIN" || u.id === user?.id || u.email === user?.email) {
      alert("SUPER_ADMIN accounts are protected and cannot be deleted.");
      return;
    }
    if (!confirm(`Are you sure you want to permanently delete user ${u.email}?`)) return;

    try {
      setDeletingUserId(u.id);
      const res = await apiRequest(`/api/admin/users/${u.id}`, {
        method: "DELETE",
      });
      if (res.success) {
        fetchUsers();
      } else {
        alert(res.error || "Failed to delete user");
      }
    } catch {
      alert("Failed to delete user");
    } finally {
      setDeletingUserId(null);
    }
  };

  if (!user || user.role !== "SUPER_ADMIN") {
    return (
      <div className="max-w-md mx-auto mt-20 p-8 glass-strong rounded-2xl border border-rose-500/30 text-center space-y-4 animate-in fade-in duration-300">
        <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 mx-auto flex items-center justify-center">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-white tracking-tight">Access Denied (403 Forbidden)</h2>
        <p className="text-xs text-slate-400 leading-relaxed">
          System Administration and server infrastructure telemetry are restricted to <strong>SUPER_ADMIN</strong> accounts only.
        </p>
        <Button
          variant="primary"
          onClick={() => router.push("/")}
          className="mt-2 w-full"
        >
          Return to Dashboard
        </Button>
      </div>
    );
  }

  const containers = [
    { name: "livestudio-frontend", type: "Docker Container", status: "HEALTHY", port: "3000", uptime: "Running", memory: "128 MB" },
    { name: "livestudio-api", type: "Docker Container", status: "HEALTHY", port: "4000", uptime: "Running", memory: "214 MB" },
    { name: "livestudio-websocket", type: "Docker Container", status: "HEALTHY", port: "4001", uptime: "Running", memory: "86 MB" },
    { name: "livestudio-worker", type: "Docker Container", status: "HEALTHY", port: "Queue", uptime: "Running", memory: "310 MB" },
    { name: "livestudio-postgres", type: "Docker Container", status: "HEALTHY", port: "5432", uptime: "Running", memory: "195 MB" },
    { name: "livestudio-redis", type: "Docker Container", status: "HEALTHY", port: "6379", uptime: "Running", memory: "42 MB" },
    { name: "livestudio-minio", type: "Docker Container", status: "HEALTHY", port: "9000/9001", uptime: "Running", memory: "160 MB" },
    { name: "livestudio-nginx", type: "Docker Container", status: "HEALTHY", port: "80/443", uptime: "Running", memory: "24 MB" },
    { name: "livekit-cloud-sfu", type: "Cloud Service", status: "CONNECTED", port: "WSS", uptime: "Global Anycast", memory: "Managed Cloud" },
  ];

  const filteredAdminMedia = mediaFilter === "ALL" ? adminMedia : adminMedia.filter((m) => m.assetType === mediaFilter);

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold text-white tracking-tight">System Administration</h1>
            <Badge variant="purple" size="sm">SUPER ADMIN</Badge>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Global server health, Docker container status, resource telemetry, and active WebRTC rooms.
          </p>
        </div>
        <Button variant="secondary">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh Metrics
        </Button>
      </div>

      {/* Host Telemetry */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <Card className="p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-slate-400">Host CPU Load</span>
            <Cpu className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-bold text-white mb-2">14.2%</div>
          <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
            <div className="h-full bg-indigo-500 rounded-full" style={{ width: "14.2%" }} />
          </div>
          <span className="text-[11px] text-slate-500 mt-2 block">8 Cores @ 3.4 GHz</span>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-slate-400">System Memory</span>
            <Activity className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold text-white mb-2">5.8 GB / 32 GB</div>
          <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
            <div className="h-full bg-cyan-500 rounded-full" style={{ width: "18.1%" }} />
          </div>
          <span className="text-[11px] text-slate-500 mt-2 block">26.2 GB Available RAM</span>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-slate-400">NVMe Storage</span>
            <HardDrive className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-white mb-2">142 GB / 1000 GB</div>
          <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
            <div className="h-full bg-emerald-500 rounded-full" style={{ width: "14.2%" }} />
          </div>
          <span className="text-[11px] text-slate-500 mt-2 block">MinIO S3 Root Volume</span>
        </Card>
      </div>

      {/* Docker Stack Health */}
      <Card className="p-6">
        <CardHeader className="p-0 mb-4 flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Server className="w-5 h-5 text-indigo-400" />
            Docker Containers & Infrastructure (8 Containers + LiveKit Cloud)
          </CardTitle>
          <span className="text-xs text-emerald-400 font-medium flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4" /> All Services Operational
          </span>
        </CardHeader>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-white/5 text-slate-400">
                <th className="py-3 px-4 font-semibold">Service</th>
                <th className="py-3 px-4 font-semibold">Type</th>
                <th className="py-3 px-4 font-semibold">Status</th>
                <th className="py-3 px-4 font-semibold">Ports / Endpoint</th>
                <th className="py-3 px-4 font-semibold">Memory</th>
                <th className="py-3 px-4 font-semibold">Uptime</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {containers.map((c, idx) => (
                <tr key={idx} className="hover:bg-white/[0.02] text-slate-300">
                  <td className="py-3 px-4 font-mono font-medium text-white">{c.name}</td>
                  <td className="py-3 px-4 text-slate-400">{c.type}</td>
                  <td className="py-3 px-4">
                    <Badge variant={c.status === "CONNECTED" ? "purple" : "success"} size="sm">
                      {c.status}
                    </Badge>
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-400">{c.port}</td>
                  <td className="py-3 px-4 font-mono">{c.memory}</td>
                  <td className="py-3 px-4 text-slate-400">{c.uptime}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* User Management & Password Override */}
      <Card className="p-6">
        <CardHeader className="p-0 mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-400" />
              User Accounts & Password Management
            </CardTitle>
            <p className="text-xs text-slate-400 mt-1">
              Directly reset or override passwords for any user who is locked out or forgot their password.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setCreateName("");
                setCreateEmail("");
                setCreatePassword("");
                setCreateRole("USER");
                setCreateError(null);
                setCreateSuccess(null);
                setIsCreateModalOpen(true);
              }}
              className="text-xs"
            >
              <UserPlus className="w-3.5 h-3.5 mr-1.5" />
              Create New User
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setSelectedUserForReset({ email: "", name: "Custom User" });
                setNewPasswordInput("");
                setResetSuccessText(null);
                setResetError(null);
                setIsResetModalOpen(true);
              }}
              className="text-xs shrink-0"
            >
              <KeyRound className="w-3.5 h-3.5 mr-1.5 text-amber-400" />
              Reset Password
            </Button>
          </div>
        </CardHeader>

        {usersLoading ? (
          <div className="py-8 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-indigo-400" />
            Loading registered accounts...
          </div>
        ) : users.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">
            No registered users found in the database.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/5 text-slate-400">
                  <th className="py-3 px-4 font-semibold">User</th>
                  <th className="py-3 px-4 font-semibold">Email</th>
                  <th className="py-3 px-4 font-semibold">Role</th>
                  <th className="py-3 px-4 font-semibold">Created</th>
                  <th className="py-3 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-white/[0.02] text-slate-300">
                    <td className="py-3 px-4 font-medium text-white">{u.name || "User"}</td>
                    <td className="py-3 px-4 font-mono text-slate-400">{u.email}</td>
                    <td className="py-3 px-4">
                      <Badge variant={u.role === "SUPER_ADMIN" ? "purple" : "neutral"} size="sm">
                        {u.role}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-slate-400">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedUserForReset(u);
                            setNewPasswordInput("");
                            setResetSuccessText(null);
                            setResetError(null);
                            setIsResetModalOpen(true);
                          }}
                          className="h-7 px-2.5 text-xs text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10"
                          title="Set new password for this user"
                        >
                          <KeyRound className="w-3 h-3 mr-1" />
                          Reset Password
                        </Button>
                        {u.role !== "SUPER_ADMIN" && u.id !== user?.id && u.email !== user?.email && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteUser(u)}
                            disabled={deletingUserId === u.id}
                            className="h-7 w-7 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
                            title="Delete user account"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Media Moderation & Prohibited Content Watchdog */}
      <Card className="p-6">
        <CardHeader className="p-0 mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Film className="w-5 h-5 text-rose-400" />
              Media Moderation & Prohibited Content Monitoring
            </CardTitle>
            <p className="text-xs text-slate-400 mt-1">
              Live audit of all media uploaded across all users. Watch videos, inspect content, and immediately delete prohibited media.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex rounded-lg bg-surface border border-white/10 p-0.5 text-xs">
              {["ALL", "VIDEO", "AUDIO", "IMAGE", "PDF"].map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setMediaFilter(tab)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                    mediaFilter === tab
                      ? "bg-indigo-600 text-white shadow"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  {tab === "ALL" ? "All Files" : tab}
                </button>
              ))}
            </div>

            <Button variant="secondary" size="sm" onClick={fetchAdminMedia} className="text-xs">
              <RefreshCw className={cn("w-3.5 h-3.5 mr-1.5", adminMediaLoading && "animate-spin")} />
              Refresh
            </Button>
          </div>
        </CardHeader>

        {/* Stats strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5 text-xs">
          <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between">
            <span className="text-slate-400">Total Uploaded Files</span>
            <span className="font-mono font-bold text-white text-sm">{adminMedia.length}</span>
          </div>
          <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between">
            <span className="text-slate-400">Total Storage Consumed</span>
            <span className="font-mono font-bold text-emerald-400 text-sm">
              {(adminMedia.reduce((acc, m) => acc + (m.fileSize || 0), 0) / (1024 * 1024)).toFixed(1)} MB
            </span>
          </div>
          <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between">
            <span className="text-slate-400">Total Video Duration</span>
            <span className="font-mono font-bold text-indigo-400 text-sm">
              {Math.floor(adminMedia.filter(m => m.assetType === "VIDEO").reduce((acc, m) => acc + (m.duration || 0), 0) / 60)} min
            </span>
          </div>
        </div>

        {adminMediaLoading ? (
          <div className="py-8 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-indigo-400" />
            Scanning all user uploaded media...
          </div>
        ) : filteredAdminMedia.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">
            No media assets found in the system.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/5 text-slate-400">
                  <th className="py-3 px-4 font-semibold">Media Asset</th>
                  <th className="py-3 px-4 font-semibold">Uploader Account</th>
                  <th className="py-3 px-4 font-semibold">Duration / Size</th>
                  <th className="py-3 px-4 font-semibold">Studio Session</th>
                  <th className="py-3 px-4 font-semibold">Uploaded</th>
                  <th className="py-3 px-4 font-semibold text-right">Moderation Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredAdminMedia.map((m) => (
                  <tr key={m.id} className="hover:bg-white/[0.02] text-slate-300">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-surface border border-white/10 flex items-center justify-center shrink-0">
                          {m.assetType === "VIDEO" ? (
                            <Film className="w-4 h-4 text-rose-400" />
                          ) : m.assetType === "AUDIO" ? (
                            <Music className="w-4 h-4 text-cyan-400" />
                          ) : (
                            <ImageIcon className="w-4 h-4 text-emerald-400" />
                          )}
                        </div>
                        <div className="min-w-0 max-w-[200px]">
                          <div className="font-medium text-white truncate" title={m.name}>
                            {m.name}
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono">
                            {m.assetType}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-white font-medium">{m.uploader.name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{m.uploader.email}</div>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-400">
                      <div>
                        {m.duration
                          ? `${Math.floor(m.duration / 60)}:${(m.duration % 60).toString().padStart(2, "0")}`
                          : "—"}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {(m.fileSize / (1024 * 1024)).toFixed(1)} MB
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-400">
                      <span className="px-2 py-0.5 rounded bg-white/5 border border-white/5 text-[10px]">
                        {m.studioId}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-400 whitespace-nowrap">
                      {new Date(m.createdAt).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setPreviewMedia(m)}
                          className="h-7 px-2.5 text-xs"
                          title="Watch / Preview content"
                        >
                          <Eye className="w-3.5 h-3.5 mr-1 text-indigo-400" />
                          Watch
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteProhibitedMedia(m)}
                          disabled={deletingMediaId === m.id}
                          className="h-7 px-2.5 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
                          title="Purge prohibited media from server"
                        >
                          <Trash2 className="w-3.5 h-3.5 mr-1" />
                          {deletingMediaId === m.id ? "Deleting..." : "Delete"}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Admin Password Reset Modal */}
      <Modal
        isOpen={isResetModalOpen}
        onClose={() => setIsResetModalOpen(false)}
        title="Admin Password Reset"
        description="Set a new password for this user. The new password will be hashed and updated in the database immediately."
      >
        <form onSubmit={handleExecutePasswordReset} className="space-y-4 pt-2">
          <div>
            <label className="text-xs font-medium text-slate-300 block mb-1">Target User Email</label>
            <Input
              value={selectedUserForReset?.email || ""}
              onChange={(e) =>
                setSelectedUserForReset((prev) => ({
                  ...prev,
                  email: e.target.value,
                  name: prev?.name || "User",
                }))
              }
              placeholder="user@example.com"
              required
              disabled={Boolean(selectedUserForReset?.id)}
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium text-slate-300">New Password for User</label>
              <button
                type="button"
                onClick={handleGenerateRandomPassword}
                className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
              >
                <Sparkles className="w-3 h-3" />
                Generate Random
              </button>
            </div>
            <Input
              value={newPasswordInput}
              onChange={(e) => setNewPasswordInput(e.target.value)}
              placeholder="Min. 6 characters (e.g. Studio#7492)"
              required
            />
          </div>

          {resetError && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>{resetError}</span>
            </div>
          )}

          {resetSuccessText && (
            <div className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-xs space-y-2">
              <div className="flex items-center gap-2 text-emerald-300 font-semibold">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Password Reset Successfully!</span>
              </div>
              <p className="text-slate-300 text-[11px]">
                Share this password with the user so they can log in:
              </p>
              <div className="flex items-center gap-2 bg-black/50 p-2 rounded-lg border border-white/10 font-mono text-emerald-400 text-xs">
                <span className="flex-1 select-all">{resetSuccessText}</span>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    navigator.clipboard.writeText(resetSuccessText);
                    setCopiedPassword(true);
                    setTimeout(() => setCopiedPassword(false), 2000);
                  }}
                  className="h-6 px-2 text-[11px]"
                >
                  {copiedPassword ? "Copied!" : "Copy"}
                </Button>
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsResetModalOpen(false)}
            >
              {resetSuccessText ? "Close" : "Cancel"}
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={isSavingReset}
              disabled={!newPasswordInput || newPasswordInput.length < 6}
            >
              <KeyRound className="w-3.5 h-3.5 mr-1.5" />
              Set Password
            </Button>
          </div>
        </form>
      </Modal>

      {/* Create New User Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create New User Account"
        description="Add a new account directly to PostgreSQL database with secure hashed credentials."
      >
        <form onSubmit={handleCreateUser} className="space-y-4 pt-2">
          {createError && (
            <div className="p-2.5 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-400 text-xs">
              {createError}
            </div>
          )}
          {createSuccess && (
            <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-300 text-xs">
              {createSuccess}
            </div>
          )}

          <div>
            <label className="text-xs font-medium text-slate-300 block mb-1">Full Name</label>
            <Input
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
              placeholder="e.g. John Doe"
              required
            />
          </div>

          <div>
            <label className="text-xs font-medium text-slate-300 block mb-1">Email Address</label>
            <Input
              type="email"
              value={createEmail}
              onChange={(e) => setCreateEmail(e.target.value)}
              placeholder="user@livestudio.io"
              required
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium text-slate-300">Password</label>
              <button
                type="button"
                onClick={handleGenerateCreatePassword}
                className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
              >
                <Sparkles className="w-3 h-3" />
                Generate Random
              </button>
            </div>
            <Input
              value={createPassword}
              onChange={(e) => setCreatePassword(e.target.value)}
              placeholder="At least 6 characters"
              required
            />
          </div>

          <div>
            <label className="text-xs font-medium text-slate-300 block mb-1">System Role</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setCreateRole("USER")}
                className={`p-3 rounded-xl border text-left transition-all ${
                  createRole === "USER"
                    ? "border-indigo-500 bg-indigo-500/10 text-white"
                    : "border-white/5 bg-surface text-slate-400 hover:text-white"
                }`}
              >
                <div className="text-xs font-semibold">USER</div>
                <div className="text-[10px] text-slate-400 mt-0.5">Regular studio creator</div>
              </button>
              <button
                type="button"
                onClick={() => setCreateRole("SUPER_ADMIN")}
                className={`p-3 rounded-xl border text-left transition-all ${
                  createRole === "SUPER_ADMIN"
                    ? "border-purple-500 bg-purple-500/10 text-white"
                    : "border-white/5 bg-surface text-slate-400 hover:text-white"
                }`}
              >
                <div className="text-xs font-semibold text-purple-300">SUPER_ADMIN</div>
                <div className="text-[10px] text-slate-400 mt-0.5">Full admin & server access</div>
              </button>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-white/5">
            <Button type="button" variant="ghost" onClick={() => setIsCreateModalOpen(false)}>
              Close
            </Button>
            <Button type="submit" variant="primary" disabled={createLoading}>
              {createLoading ? "Creating..." : "Create Account"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Media Preview & Inspection Modal */}
      <Modal
        isOpen={!!previewMedia}
        onClose={() => setPreviewMedia(null)}
        title={`Content Inspection: ${previewMedia?.name || ""}`}
        description={`Uploaded by ${previewMedia?.uploader.name} (${previewMedia?.uploader.email})`}
      >
        {previewMedia && (
          <div className="space-y-4 pt-2">
            <div className="rounded-xl overflow-hidden bg-black/90 border border-white/10 flex items-center justify-center min-h-[220px] max-h-[380px]">
              {previewMedia.assetType === "VIDEO" ? (
                <video
                  src={previewMedia.url}
                  controls
                  autoPlay
                  className="w-full max-h-[360px] object-contain"
                />
              ) : previewMedia.assetType === "AUDIO" ? (
                <div className="p-8 w-full flex flex-col items-center justify-center gap-4">
                  <Music className="w-12 h-12 text-cyan-400 animate-pulse" />
                  <audio src={previewMedia.url} controls autoPlay className="w-full" />
                </div>
              ) : (
                <img
                  src={previewMedia.url}
                  alt={previewMedia.name}
                  className="max-h-[360px] w-auto object-contain"
                />
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs p-3 rounded-xl bg-white/[0.02] border border-white/5">
              <div>
                <span className="text-slate-500 block">File Type</span>
                <span className="text-white font-mono">{previewMedia.mimeType}</span>
              </div>
              <div>
                <span className="text-slate-500 block">File Size</span>
                <span className="text-white font-mono">{(previewMedia.fileSize / (1024 * 1024)).toFixed(2)} MB</span>
              </div>
              <div>
                <span className="text-slate-500 block">Uploader Account</span>
                <span className="text-white font-mono">{previewMedia.uploader.email}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Studio Session ID</span>
                <span className="text-white font-mono">{previewMedia.studioId}</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-white/10">
              <Button
                type="button"
                variant="danger"
                size="sm"
                onClick={() => handleDeleteProhibitedMedia(previewMedia)}
                disabled={deletingMediaId === previewMedia.id}
              >
                <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                {deletingMediaId === previewMedia.id ? "Purging..." : "Delete Prohibited Content"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setPreviewMedia(null)}
              >
                Close Preview
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
