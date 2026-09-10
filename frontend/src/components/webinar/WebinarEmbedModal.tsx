"use client";

import React, { useState } from "react";
import { Copy, Check, Code2, Globe, Shield } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

interface WebinarEmbedModalProps {
  isOpen: boolean;
  onClose: () => void;
  webinarId: string;
  webinarTitle: string;
}

export const WebinarEmbedModal: React.FC<WebinarEmbedModalProps> = ({
  isOpen,
  onClose,
  webinarId,
  webinarTitle,
}) => {
  const [copied, setCopied] = useState(false);
  const [allowedDomain, setAllowedDomain] = useState("mycompany.com");
  const [includeChat, setIncludeChat] = useState(true);

  const embedCode = `<iframe
  src="${typeof window !== "undefined" ? window.location.origin : "https://studio.example.com"}/watch/${webinarId}?embed=true&chat=${includeChat}"
  width="100%"
  height="600"
  frameborder="0"
  allow="autoplay; fullscreen; camera; microphone"
  referrerpolicy="strict-origin-when-cross-origin">
</iframe>`;

  const handleCopy = () => {
    navigator.clipboard.writeText(embedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Embed Webinar on External Website"
      description={`Generate responsive HTML iframe code to stream "${webinarTitle}" on your website, landing page, or member portal.`}
      maxWidth="lg"
    >
      <div className="space-y-4 text-xs">
        {/* Domain Restrictions */}
        <div className="p-3 rounded-xl bg-surface border border-white/5 space-y-2">
          <label className="font-semibold text-slate-300 flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-indigo-400" />
            Allowed Embedding Domain (Security Restriction)
          </label>
          <Input
            value={allowedDomain}
            onChange={(e) => setAllowedDomain(e.target.value)}
            placeholder="e.g. company.com (leave blank for any domain)"
          />
        </div>

        {/* Options */}
        <div className="flex items-center gap-4 text-slate-300">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={includeChat}
              onChange={(e) => setIncludeChat(e.target.checked)}
              className="rounded border-white/10 bg-surface text-indigo-500"
            />
            Include Live Audience Chat Sidebar
          </label>
        </div>

        {/* Generated Code Snippet */}
        <div className="space-y-1.5">
          <label className="font-semibold text-slate-300 flex items-center gap-1.5">
            <Code2 className="w-3.5 h-3.5 text-cyan-400" />
            HTML Embed Code Snippet
          </label>
          <div className="relative">
            <pre className="p-3.5 rounded-xl bg-black/80 border border-white/10 text-indigo-300 font-mono text-[11px] overflow-x-auto leading-relaxed">
              {embedCode}
            </pre>
            <Button
              variant="primary"
              size="sm"
              onClick={handleCopy}
              className="absolute top-2 right-2 h-7 text-[11px]"
            >
              {copied ? <Check className="w-3.5 h-3.5 mr-1" /> : <Copy className="w-3.5 h-3.5 mr-1" />}
              {copied ? "Copied Snippet!" : "Copy Code"}
            </Button>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
};
