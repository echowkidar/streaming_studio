"use client";

import { useState, useEffect } from "react";
import { Users, UserPlus, Shield, MoreVertical, Mail, Trash2, RefreshCw, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { useAuthStore } from "@/stores/auth.store";
import { apiRequest } from "@/lib/api";

interface TeamMember {
  id: string;
  userId?: string;
  name: string;
  email: string;
  role: string;
  joinedAt: string;
}

export default function TeamPage() {
  const { user } = useAuthStore();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("PRODUCER");
  const [isInviting, setIsInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);

  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchMembers = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiRequest<TeamMember[]>("/api/workspaces/members");
      if (res.success && res.data) {
        setMembers(res.data);
      } else {
        setError(res.error || "Failed to load team members");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load team members");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, []);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail) return;

    try {
      setIsInviting(true);
      setInviteError(null);
      const res = await apiRequest("/api/workspaces/members", {
        method: "POST",
        data: {
          name: inviteName.trim() || inviteEmail.split("@")[0],
          email: inviteEmail.trim(),
          role: inviteRole,
        },
      });

      if (res.success) {
        setInviteEmail("");
        setInviteName("");
        setIsModalOpen(false);
        fetchMembers();
      } else {
        setInviteError(res.error || "Failed to add member");
      }
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : "Failed to add member");
    } finally {
      setIsInviting(false);
    }
  };

  const handleDeleteMember = async (memberId: string) => {
    if (!confirm("Are you sure you want to remove this team member?")) return;
    try {
      setDeletingId(memberId);
      const res = await apiRequest(`/api/workspaces/members/${memberId}`, {
        method: "DELETE",
      });
      if (res.success) {
        setMembers((prev) => prev.filter((m) => m.id !== memberId));
      }
    } catch {
      // ignore
    } finally {
      setDeletingId(null);
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "OWNER": return <Badge variant="purple">OWNER</Badge>;
      case "ADMIN": return <Badge variant="default">ADMIN</Badge>;
      case "PRODUCER": return <Badge variant="success">PRODUCER</Badge>;
      default: return <Badge variant="neutral">CREATOR</Badge>;
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Team & Permissions</h1>
          <p className="text-sm text-slate-400 mt-1">
            Manage workspace co-producers, studio directors, hosts, and collaborators.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={fetchMembers} disabled={loading} className="text-xs text-slate-400 hover:text-white">
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button variant="primary" onClick={() => { setIsModalOpen(true); setInviteError(null); }}>
            <UserPlus className="w-4 h-4 mr-2" />
            Invite Team Member
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      <div className="rounded-2xl border border-white/5 bg-surface-raised/50 overflow-hidden backdrop-blur-md">
        <div className="p-4 border-b border-white/5 flex items-center justify-between text-xs text-slate-400 uppercase tracking-wider font-semibold">
          <span>Member</span>
          <div className="flex items-center gap-12 mr-4">
            <span>Role</span>
            <span>Joined</span>
            <span>Actions</span>
          </div>
        </div>

        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center gap-3 text-slate-400 text-xs">
            <RefreshCw className="w-5 h-5 animate-spin text-indigo-400" />
            Loading real workspace members...
          </div>
        ) : members.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs space-y-2">
            <p>No team members found in this workspace.</p>
            <p className="text-slate-500">Click &ldquo;Invite Team Member&rdquo; above to add members.</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {members.map((m) => (
              <div key={m.id} className="p-4 flex items-center justify-between hover:bg-white/[0.02] transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500/20 to-cyan-500/20 border border-white/10 flex items-center justify-center font-bold text-sm text-white">
                    {(m.name || m.email || "U")[0]?.toUpperCase()}
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-white">{m.name || "Member"}</h4>
                    <p className="text-xs font-mono text-slate-400">{m.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-8">
                  {getRoleBadge(m.role)}
                  <span className="text-xs text-slate-400 w-24">
                    {m.joinedAt ? new Date(m.joinedAt).toLocaleDateString() : "Active"}
                  </span>
                  <div className="flex items-center gap-2">
                    {m.role !== "OWNER" && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteMember(m.id)}
                        disabled={deletingId === m.id}
                        className="h-8 w-8 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
                        title="Remove member"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Invite Workspace Member"
        description="Add a collaborator to this workspace. They will be registered in the database if they don't already have an account."
      >
        <form onSubmit={handleInvite} className="space-y-4">
          {inviteError && (
            <div className="p-2.5 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-400 text-xs">
              {inviteError}
            </div>
          )}

          <Input
            label="Full Name (Optional)"
            placeholder="John Doe"
            value={inviteName}
            onChange={(e) => setInviteName(e.target.value)}
          />

          <Input
            label="Email Address"
            type="email"
            placeholder="colleague@domain.com"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            required
          />

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-300">Workspace Role</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { role: "ADMIN", desc: "Full studio & member control" },
                { role: "PRODUCER", desc: "Stage & media operations" },
                { role: "CREATOR", desc: "Host personal broadcasts" },
              ].map((r) => (
                <button
                  key={r.role}
                  type="button"
                  onClick={() => setInviteRole(r.role)}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    inviteRole === r.role
                      ? "border-indigo-500 bg-indigo-500/10 text-white"
                      : "border-white/5 bg-surface text-slate-400 hover:text-white"
                  }`}
                >
                  <div className="text-xs font-semibold">{r.role}</div>
                  <div className="text-[10px] text-slate-400 mt-1">{r.desc}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)} disabled={isInviting}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={isInviting}>
              {isInviting ? "Adding..." : "Add Member"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
