"use client";

import React, { useState } from "react";
import { Film, Calendar, Clock, Upload, CheckCircle2, ArrowRight } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { useStudioStore } from "@/stores/studio.store";

interface PreRecordedSchedulerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PreRecordedSchedulerModal: React.FC<PreRecordedSchedulerModalProps> = ({ isOpen, onClose }) => {
  const { destinations } = useStudioStore();
  const [videoTitle, setVideoTitle] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [selectedFile, setSelectedFile] = useState<string | null>("Keynote_Recorded_Presentation_1080p.mp4");
  const [isScheduled, setIsScheduled] = useState(false);

  const handleSchedule = (e: React.FormEvent) => {
    e.preventDefault();
    setIsScheduled(true);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        setIsScheduled(false);
        onClose();
      }}
      title="Schedule Pre-Recorded Live Broadcast"
      description="Upload an existing video and schedule it to automatically stream to your destinations as a simulated live event."
      maxWidth="md"
    >
      {!isScheduled ? (
        <form onSubmit={handleSchedule} className="space-y-4 text-xs">
          <Input
            label="Broadcast Title"
            placeholder="e.g. Worldwide Product Announcement (Automated)"
            value={videoTitle}
            onChange={(e) => setVideoTitle(e.target.value)}
            required
            autoFocus
          />

          {/* Video Selection Box */}
          <div className="space-y-1.5">
            <label className="font-semibold text-slate-300">Selected Source Video</label>
            <div className="p-3 rounded-xl bg-surface border border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Film className="w-4 h-4 text-indigo-400" />
                <span className="text-white font-medium truncate max-w-[220px]">{selectedFile}</span>
              </div>
              <Badge variant="neutral" size="sm">1080p H.264</Badge>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Broadcast Date"
              type="date"
              value={scheduledDate}
              onChange={(e) => setScheduledDate(e.target.value)}
              required
            />
            <Input
              label="Broadcast Time"
              type="time"
              value={scheduledTime}
              onChange={(e) => setScheduledTime(e.target.value)}
              required
            />
          </div>

          {/* Destination Target Checkboxes */}
          <div className="space-y-1.5">
            <label className="font-semibold text-slate-300">Push to Destinations</label>
            <div className="space-y-1">
              {destinations.map((d) => (
                <label key={d.id} className="p-2 rounded-lg bg-surface/60 border border-white/5 flex items-center justify-between text-slate-300 cursor-pointer">
                  <span>{d.name}</span>
                  <input type="checkbox" defaultChecked className="rounded bg-surface text-indigo-500" />
                </label>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-white/5">
            <Button type="button" variant="ghost" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm">
              Schedule Broadcast
            </Button>
          </div>
        </form>
      ) : (
        <div className="text-center py-6 space-y-4 animate-in fade-in zoom-in-95 duration-200">
          <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Broadcast Scheduled Successfully!</h3>
            <p className="text-xs text-slate-400 mt-1">
              Your video will be queued on BullMQ and pushed to your chosen destinations on {scheduledDate} at {scheduledTime} UTC without requiring your computer to stay online.
            </p>
          </div>
          <Button variant="primary" size="sm" onClick={onClose}>
            Done
          </Button>
        </div>
      )}
    </Modal>
  );
};
