"use client";

import { useState } from "react";
import { Users, UserPlus, Shield, MoreVertical, Mail, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";

export default function TeamPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("PRODUCER");

  const [members, setMembers] = useState([
    {
      id: "mem-1",
      name: "Salar Khan",
      email: "creator@livestudio.io",
      role: "OWNER",
      status: "ACTIVE",
      joinedAt: "Jan 10, 2026",
    },
    {
      id: "mem-2",
      name: "Elena Rostova",
      email: "elena@production.tv",
      role: "PRODUCER",
      status: "ACTIVE",
      joinedAt: "Feb 14, 2026",
    },
    {
      id: "mem-3",
      name: "Alex Chen",
      email: "alex.c@liveops.io",
      role: "ADMIN",
      status: "ACTIVE",
      joinedAt: "Mar 01, 2026",
    },
    {
      id: "mem-4",
      name: "Sarah Jenkins",
      email: "sarah@keynote.agency",
      role: "CREATOR",
      status: "ACTIVE",
      joinedAt: "May 12, 2026",
    }
  ]);

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail) return;
    setMembers([
      ...members,
      {
        id: `mem-${Date.now()}`,
        name: inviteEmail.split("@")[0],
        email: inviteEmail,
        role: inviteRole,
        status: "INVITED",
        joinedAt: "Pending",
      }
    ]);
    setInviteEmail("");
    setIsModalOpen(false);
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
            Manage workspace co-producers, studio directors, hosts, and guest managers.
          </p>
        </div>
        <Button variant="primary" onClick={() => setIsModalOpen(true)}>
          <UserPlus className="w-4 h-4 mr-2" />
          Invite Team Member
        </Button>
      </div>

      <div className="rounded-2xl border border-white/5 bg-surface-raised/50 overflow-hidden backdrop-blur-md">
        <div className="p-4 border-b border-white/5 flex items-center justify-between text-xs text-slate-400 uppercase tracking-wider font-semibold">
          <span>Member</span>
          <div className="flex items-center gap-12 mr-4">
            <span>Role</span>
            <span>Joined</span>
            <span>Actions</span>
          </div>
        </div>

        <div className="divide-y divide-white/5">
          {members.map((m) => (
            <div key={m.id} className="p-4 flex items-center justify-between hover:bg-white/[0.02] transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500/20 to-cyan-500/20 border border-white/10 flex items-center justify-center font-bold text-sm text-white">
                  {m.name[0]}
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-white">{m.name}</h4>
                  <p className="text-xs text-slate-400">{m.email}</p>
                </div>
              </div>

              <div className="flex items-center gap-8">
                {getRoleBadge(m.role)}
                <span className="text-xs text-slate-400 w-24">{m.joinedAt}</span>
                <div className="flex items-center gap-2">
                  {m.role !== "OWNER" && (
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-400 hover:text-rose-300">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Invite Workspace Member"
        description="Invited collaborators can operate studios, switch layouts, and moderate participants."
      >
        <form onSubmit={handleInvite} className="space-y-4">
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
                { role: "ADMIN", desc: "Full control except billing" },
                { role: "PRODUCER", desc: "Stage & media control" },
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
            <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Send Invitation
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
