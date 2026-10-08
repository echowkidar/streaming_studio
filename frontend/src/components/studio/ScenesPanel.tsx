"use client";

import React, { useState } from "react";
import { useStudioStore, StudioScene } from "@/stores/studio.store";
import { cn } from "@/lib/utils";
import {
  Plus,
  HelpCircle,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  GripVertical,
  Check,
  Trash2,
  Copy,
  Edit2,
  Camera,
  Play,
  User,
  Users,
  MonitorUp,
  Clapperboard,
  Sparkles,
} from "lucide-react";

interface ScenesPanelProps {
  className?: string;
}

export const ScenesPanel: React.FC<ScenesPanelProps> = ({ className }) => {
  const {
    scenes,
    activeSceneId,
    isScenesPanelOpen,
    toggleScenesPanel,
    addScene,
    updateScene,
    deleteScene,
    duplicateScene,
    switchScene,
    saveCurrentStageToScene,
    reorderScenes,
  } = useStudioStore();

  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  const handleStartRename = (scene: StudioScene) => {
    setEditingId(scene.id);
    setEditName(scene.name);
    setActiveMenuId(null);
  };

  const handleSaveRename = (id: string) => {
    if (editName.trim()) {
      updateScene(id, { name: editName.trim() });
    }
    setEditingId(null);
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIdx(index);
    e.dataTransfer.setData("text/plain", String(index));
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIdx(index);
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedIdx !== null && draggedIdx !== targetIndex) {
      reorderScenes(draggedIdx, targetIndex);
    }
    setDraggedIdx(null);
    setDragOverIdx(null);
  };

  // Render visual thumbnail representation based on layout
  const renderThumbnailContent = (scene: StudioScene) => {
    const isCropped = scene.layout === "cropped" || scene.layout === "podcast";
    const isSideBySide = scene.layout === "side-by-side" || scene.layout === "fit";
    const isSolo = scene.layout === "solo";
    const isCinema = scene.layout === "cinema";
    const isGrid = scene.layout === "four-grid" || scene.layout === "six-grid";
    const isSpeaker = scene.layout === "speaker-large";
    const isPresentation = scene.layout === "presentation";

    return (
      <div className="absolute inset-0 p-1 flex items-center justify-center">
        {scene.activeMedia ? (
          <div className="w-full h-full bg-cyan-950/40 border border-cyan-500/30 rounded flex flex-col items-center justify-center gap-0.5">
            <Clapperboard className="w-4 h-4 text-cyan-400" />
            <span className="text-[7px] text-cyan-200 line-clamp-1 max-w-[90%]">
              {scene.activeMedia.name}
            </span>
          </div>
        ) : isSolo || isCinema ? (
          <div className="w-full h-full bg-indigo-950/40 border border-indigo-500/30 rounded flex items-center justify-center">
            <User className="w-4 h-4 text-indigo-300 opacity-80" />
          </div>
        ) : isCropped ? (
          <div className="w-full h-full flex divide-x divide-white/20 border border-indigo-500/40 rounded overflow-hidden">
            <div className="flex-1 bg-indigo-900/40 flex items-center justify-center">
              <User className="w-3 h-3 text-indigo-300" />
            </div>
            <div className="flex-1 bg-indigo-900/40 flex items-center justify-center">
              <User className="w-3 h-3 text-indigo-300" />
            </div>
          </div>
        ) : isSideBySide ? (
          <div className="w-full h-full flex items-center justify-center gap-1">
            <div className="w-[45%] h-[75%] bg-indigo-900/40 border border-indigo-500/40 rounded flex items-center justify-center">
              <User className="w-2.5 h-2.5 text-indigo-300" />
            </div>
            <div className="w-[45%] h-[75%] bg-indigo-900/40 border border-indigo-500/40 rounded flex items-center justify-center">
              <User className="w-2.5 h-2.5 text-indigo-300" />
            </div>
          </div>
        ) : isSpeaker ? (
          <div className="w-full h-full flex gap-1">
            <div className="flex-[2] bg-indigo-900/40 border border-indigo-500/40 rounded flex items-center justify-center">
              <User className="w-3.5 h-3.5 text-indigo-300" />
            </div>
            <div className="flex-1 flex flex-col gap-0.5">
              <div className="flex-1 bg-indigo-900/30 rounded" />
              <div className="flex-1 bg-indigo-900/30 rounded" />
            </div>
          </div>
        ) : isPresentation ? (
          <div className="w-full h-full flex flex-col gap-0.5">
            <div className="flex-[2] bg-cyan-950/40 border border-cyan-500/40 rounded flex items-center justify-center">
              <MonitorUp className="w-3 h-3 text-cyan-300" />
            </div>
            <div className="flex-1 flex gap-0.5">
              <div className="flex-1 bg-indigo-900/30 rounded" />
              <div className="flex-1 bg-indigo-900/30 rounded" />
            </div>
          </div>
        ) : (
          <div className="w-full h-full grid grid-cols-2 grid-rows-2 gap-0.5">
            <div className="bg-indigo-900/30 rounded" />
            <div className="bg-indigo-900/30 rounded" />
            <div className="bg-indigo-900/30 rounded" />
            <div className="bg-indigo-900/30 rounded" />
          </div>
        )}
      </div>
    );
  };

  if (!isScenesPanelOpen) {
    // Collapsed slim sidebar trigger
    return (
      <div className="relative shrink-0 z-30 select-none flex items-center">
        <button
          type="button"
          onClick={toggleScenesPanel}
          className="h-28 w-4 sm:w-5 bg-[#0e0f18] hover:bg-[#161726] border-y border-r border-white/15 rounded-r-xl flex flex-col items-center justify-center gap-2 text-slate-400 hover:text-white transition-all shadow-xl group"
          title="Expand Scenes Panel (StreamYard Scenes)"
        >
          <ChevronRight className="w-3.5 h-3.5 text-indigo-400 group-hover:scale-110 transition-transform" />
          <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 [writing-mode:vertical-lr] rotate-180">
            Scenes
          </span>
        </button>
      </div>
    );
  }

  return (
    <aside
      className={cn(
        "relative w-44 sm:w-52 h-full bg-[#0a0a12] border-r border-white/10 flex flex-col z-30 select-none shrink-0",
        className
      )}
    >
      {/* ─── Header: Scenes (BETA) ────────────────────────── */}
      <div className="p-3 border-b border-white/10 bg-[#0c0c16] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-1.5">
          <h2 className="text-xs font-bold text-white tracking-wider">Scenes</h2>
          <div className="group/help relative">
            <HelpCircle className="w-3 h-3 text-slate-400 cursor-pointer hover:text-white" />
            <div className="absolute left-0 top-full mt-1.5 w-44 bg-[#141525] border border-white/15 p-2 rounded-lg text-[10px] text-slate-300 shadow-2xl opacity-0 group-hover/help:opacity-100 pointer-events-none transition-opacity z-50">
              Scenes allow you to prepare stage layouts, speakers, and media in advance and switch during your stream with 1 click.
            </div>
          </div>
          <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
            BETA
          </span>
        </div>

        {/* Collapse Button */}
        <button
          type="button"
          onClick={toggleScenesPanel}
          className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          title="Collapse Scenes Panel"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      </div>

      {/* ─── "+ New scene" Button ──────────────────────────── */}
      <div className="p-2.5 pb-2 shrink-0">
        <button
          type="button"
          onClick={() => addScene()}
          className="w-full py-2 px-3 rounded-lg border border-white/15 hover:border-indigo-500/50 bg-white/5 hover:bg-indigo-600/20 text-white font-medium text-xs flex items-center justify-center gap-1.5 transition-all shadow-sm group active:scale-95"
          title="Save current stage layout or create a new scene"
        >
          <Plus className="w-3.5 h-3.5 text-cyan-400 group-hover:scale-110 transition-transform" />
          <span>New scene</span>
        </button>
      </div>

      {/* ─── Scene Cards Stack ──────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-2 pb-3 space-y-2.5 custom-scrollbar">
        {scenes.map((scene, index) => {
          const isActive = activeSceneId === scene.id;
          const isDragTarget = dragOverIdx === index;

          return (
            <div
              key={scene.id}
              draggable
              onDragStart={(e) => handleDragStart(e, index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDrop={(e) => handleDrop(e, index)}
              onClick={() => switchScene(scene.id)}
              className={cn(
                "group relative rounded-xl border transition-all duration-150 cursor-pointer overflow-hidden bg-[#11121d] shadow-md",
                isActive
                  ? "border-indigo-500 ring-1 ring-indigo-500/50 shadow-indigo-500/20"
                  : "border-white/10 hover:border-white/25",
                isDragTarget && "border-cyan-400 scale-[1.02]"
              )}
            >
              {/* Drag Handle (Left edge) */}
              <div
                className="absolute left-1 top-2.5 z-20 opacity-0 group-hover:opacity-60 hover:opacity-100 cursor-grab active:cursor-grabbing text-slate-400"
                title="Drag to reorder"
                onClick={(e) => e.stopPropagation()}
              >
                <GripVertical className="w-3 h-3" />
              </div>

              {/* 16:9 Thumbnail Preview */}
              <div
                className="relative w-full aspect-video bg-[#07070e] overflow-hidden"
                style={{
                  backgroundImage: scene.backgroundUrl ? `url(${scene.backgroundUrl})` : undefined,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }}
              >
                {/* Visual Layout Representation */}
                {renderThumbnailContent(scene)}

                {/* Hover/Active Badges */}
                <div className="absolute top-1 right-1 z-20 flex items-center gap-1 pointer-events-auto">
                  {/* Clapperboard if media attached */}
                  {scene.activeMedia && (
                    <span className="p-0.5 rounded bg-cyan-950/80 border border-cyan-500/40 text-cyan-300">
                      <Clapperboard className="w-2.5 h-2.5" />
                    </span>
                  )}

                  {/* 3-dots Context Menu Button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveMenuId(activeMenuId === scene.id ? null : scene.id);
                    }}
                    className="p-1 rounded bg-black/70 hover:bg-black text-slate-300 hover:text-white transition-colors"
                    title="Scene options"
                  >
                    <MoreVertical className="w-3 h-3" />
                  </button>
                </div>

                {/* Context Menu Dropdown */}
                {activeMenuId === scene.id && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="absolute top-6 right-1 z-50 w-44 bg-[#141525] border border-white/20 rounded-xl shadow-2xl p-1 text-xs animate-in fade-in zoom-in-95"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        saveCurrentStageToScene(scene.id);
                        setActiveMenuId(null);
                      }}
                      className="w-full px-2.5 py-1.5 rounded-lg text-left text-slate-200 hover:bg-white/10 flex items-center gap-2"
                    >
                      <Camera className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Update with stage</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleStartRename(scene)}
                      className="w-full px-2.5 py-1.5 rounded-lg text-left text-slate-200 hover:bg-white/10 flex items-center gap-2"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Rename scene</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        duplicateScene(scene.id);
                        setActiveMenuId(null);
                      }}
                      className="w-full px-2.5 py-1.5 rounded-lg text-left text-slate-200 hover:bg-white/10 flex items-center gap-2"
                    >
                      <Copy className="w-3.5 h-3.5 text-amber-400" />
                      <span>Duplicate scene</span>
                    </button>

                    {scenes.length > 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          deleteScene(scene.id);
                          setActiveMenuId(null);
                        }}
                        className="w-full px-2.5 py-1.5 rounded-lg text-left text-rose-300 hover:bg-rose-500/20 flex items-center gap-2"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete scene</span>
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Bottom Scene Title Pill Bar */}
              <div
                className={cn(
                  "px-2.5 py-1 flex items-center justify-between text-xs transition-colors",
                  isActive
                    ? "bg-indigo-600 text-white font-semibold"
                    : "bg-[#141522] text-slate-300 group-hover:text-white"
                )}
              >
                {editingId === scene.id ? (
                  <div
                    className="flex items-center gap-1 w-full"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSaveRename(scene.id);
                        if (e.key === "Escape") setEditingId(null);
                      }}
                      autoFocus
                      className="w-full bg-black/60 text-white px-1.5 py-0.5 rounded border border-indigo-400 text-xs focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => handleSaveRename(scene.id)}
                      className="p-1 text-emerald-400 hover:text-emerald-300"
                    >
                      <Check className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <>
                    <span className="truncate pr-1">{scene.name}</span>
                    {isActive && (
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-300 animate-pulse shrink-0" />
                    )}
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
};
