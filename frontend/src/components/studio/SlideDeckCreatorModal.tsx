"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Plus,
  Trash2,
  Copy,
  ChevronLeft,
  ChevronRight,
  FileText,
  Sparkles,
  Check,
  Play,
  Layers,
  Layout,
  Palette,
  AlignLeft,
} from "lucide-react";
import { MediaFileItem, useStudioStore } from "@/stores/studio.store";
import { cn } from "@/lib/utils";

export interface SlidePageItem {
  id: string;
  badge: string;
  title: string;
  subtitle: string;
  bullets: string;
  secondaryColumn: string;
  footerText: string;
  speakerNote: string;
  layout: "bullets" | "center-hero" | "two-column" | "quote";
  themeId: "indigo" | "cyber" | "emerald" | "crimson" | "light";
}

interface SlideDeckCreatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetSceneId?: string | null;
  onDeckCreated?: (deckItem: MediaFileItem) => void;
}

const SLIDE_THEMES: Record<
  SlidePageItem["themeId"],
  {
    name: string;
    bgStart: string;
    bgEnd: string;
    accent: string;
    badgeBg: string;
    badgeText: string;
    titleColor: string;
    subColor: string;
    bulletColor: string;
    cardBg: string;
    cardBorder: string;
  }
> = {
  indigo: {
    name: "Indigo Keynote",
    bgStart: "#090a16",
    bgEnd: "#1e1b4b",
    accent: "#6366f1",
    badgeBg: "rgba(99, 102, 241, 0.22)",
    badgeText: "#a5b4fc",
    titleColor: "#ffffff",
    subColor: "#94a3b8",
    bulletColor: "#e2e8f0",
    cardBg: "rgba(15, 23, 42, 0.72)",
    cardBorder: "rgba(99, 102, 241, 0.35)",
  },
  cyber: {
    name: "Cyber Neon",
    bgStart: "#040d1a",
    bgEnd: "#083344",
    accent: "#06b6d4",
    badgeBg: "rgba(6, 182, 212, 0.22)",
    badgeText: "#67e8f9",
    titleColor: "#ffffff",
    subColor: "#94a3b8",
    bulletColor: "#ecfeff",
    cardBg: "rgba(8, 25, 43, 0.75)",
    cardBorder: "rgba(6, 182, 212, 0.4)",
  },
  emerald: {
    name: "Emerald Growth",
    bgStart: "#04130e",
    bgEnd: "#064e3b",
    accent: "#10b981",
    badgeBg: "rgba(16, 185, 129, 0.22)",
    badgeText: "#6ee7b7",
    titleColor: "#ffffff",
    subColor: "#a7f3d0",
    bulletColor: "#ecfdf5",
    cardBg: "rgba(6, 36, 26, 0.75)",
    cardBorder: "rgba(16, 185, 129, 0.38)",
  },
  crimson: {
    name: "Breaking News",
    bgStart: "#18050b",
    bgEnd: "#4c0519",
    accent: "#f43f5e",
    badgeBg: "rgba(244, 63, 94, 0.28)",
    badgeText: "#fda4af",
    titleColor: "#ffffff",
    subColor: "#fecdd3",
    bulletColor: "#fff1f2",
    cardBg: "rgba(38, 8, 18, 0.78)",
    cardBorder: "rgba(244, 63, 94, 0.42)",
  },
  light: {
    name: "Executive Light",
    bgStart: "#f8fafc",
    bgEnd: "#e2e8f0",
    accent: "#4f46e5",
    badgeBg: "rgba(79, 70, 229, 0.12)",
    badgeText: "#4338ca",
    titleColor: "#0f172a",
    subColor: "#475569",
    bulletColor: "#1e293b",
    cardBg: "rgba(255, 255, 255, 0.9)",
    cardBorder: "rgba(79, 70, 229, 0.25)",
  },
};

function wrapCanvasText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines.length > 0 ? lines : [""];
}

function renderSlideToDataUrl(
  slide: SlidePageItem,
  slideIndex: number,
  totalSlides: number,
  deckTitle: string
): string {
  const canvas = document.createElement("canvas");
  const W = 1920;
  const H = 1080;
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";

  const theme = SLIDE_THEMES[slide.themeId] || SLIDE_THEMES.indigo;

  // 1. Background Gradient
  const grad = ctx.createLinearGradient(0, 0, W, H);
  grad.addColorStop(0, theme.bgStart);
  grad.addColorStop(1, theme.bgEnd);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // Subtle decorative glow orbs
  const radial = ctx.createRadialGradient(W * 0.85, H * 0.18, 20, W * 0.85, H * 0.18, 520);
  radial.addColorStop(0, `${theme.accent}33`);
  radial.addColorStop(1, "transparent");
  ctx.fillStyle = radial;
  ctx.fillRect(0, 0, W, H);

  // Top Accent Bar
  ctx.fillStyle = theme.accent;
  ctx.fillRect(0, 0, W, 10);

  // Badge Pill
  let cursorY = 115;
  if (slide.badge.trim()) {
    ctx.font = "bold 24px Inter, system-ui, sans-serif";
    const badgeTxt = slide.badge.trim().toUpperCase();
    const bw = ctx.measureText(badgeTxt).width + 48;
    const bh = 48;
    const bx = slide.layout === "center-hero" || slide.layout === "quote" ? (W - bw) / 2 : 120;

    ctx.fillStyle = theme.badgeBg;
    ctx.beginPath();
    ctx.roundRect(bx, cursorY, bw, bh, 24);
    ctx.fill();
    ctx.strokeStyle = theme.cardBorder;
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = theme.badgeText;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(badgeTxt, bx + bw / 2, cursorY + bh / 2 + 1);
    cursorY += 82;
  }

  // Layout-Specific Content
  if (slide.layout === "center-hero") {
    ctx.textAlign = "center";
    ctx.fillStyle = theme.titleColor;
    ctx.font = "bold 78px Inter, system-ui, sans-serif";
    const titleLines = wrapCanvasText(ctx, slide.title || "Slide Title", W - 320);
    let ty = H * 0.42 - ((titleLines.length - 1) * 92) / 2;
    titleLines.forEach((line) => {
      ctx.fillText(line, W / 2, ty);
      ty += 92;
    });

    if (slide.subtitle.trim()) {
      ctx.fillStyle = theme.subColor;
      ctx.font = "500 38px Inter, system-ui, sans-serif";
      const subLines = wrapCanvasText(ctx, slide.subtitle, W - 420);
      ty += 24;
      subLines.forEach((line) => {
        ctx.fillText(line, W / 2, ty);
        ty += 52;
      });
    }
  } else if (slide.layout === "quote") {
    // Big Callout Quote Box
    const boxX = 160;
    const boxY = 220;
    const boxW = W - 320;
    const boxH = H - 400;
    ctx.fillStyle = theme.cardBg;
    ctx.beginPath();
    ctx.roundRect(boxX, boxY, boxW, boxH, 32);
    ctx.fill();
    ctx.strokeStyle = theme.cardBorder;
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.textAlign = "center";
    ctx.fillStyle = theme.accent;
    ctx.font = "bold 120px Georgia, serif";
    ctx.fillText("“", W / 2, boxY + 110);

    ctx.fillStyle = theme.titleColor;
    ctx.font = "italic bold 54px Inter, system-ui, sans-serif";
    const qLines = wrapCanvasText(ctx, slide.title || "Key Quote or Takeaway", boxW - 180);
    let qy = boxY + 210;
    qLines.forEach((l) => {
      ctx.fillText(l, W / 2, qy);
      qy += 70;
    });

    if (slide.subtitle.trim()) {
      ctx.fillStyle = theme.badgeText;
      ctx.font = "bold 32px Inter, system-ui, sans-serif";
      ctx.fillText(`— ${slide.subtitle}`, W / 2, qy + 35);
    }
  } else if (slide.layout === "two-column") {
    // Title & Subtitle at top left
    ctx.textAlign = "left";
    ctx.fillStyle = theme.titleColor;
    ctx.font = "bold 62px Inter, system-ui, sans-serif";
    ctx.fillText(slide.title || "Slide Title", 120, cursorY + 45);
    cursorY += 75;

    if (slide.subtitle.trim()) {
      ctx.fillStyle = theme.subColor;
      ctx.font = "500 30px Inter, system-ui, sans-serif";
      ctx.fillText(slide.subtitle, 120, cursorY + 25);
      cursorY += 65;
    } else {
      cursorY += 30;
    }

    const colW = (W - 280) / 2;
    const colH = H - cursorY - 130;
    const col1X = 120;
    const col2X = 120 + colW + 40;

    [
      { x: col1X, content: slide.bullets },
      { x: col2X, content: slide.secondaryColumn || "Column 2 Key Points\nAdd comparison details here" },
    ].forEach((col) => {
      ctx.fillStyle = theme.cardBg;
      ctx.beginPath();
      ctx.roundRect(col.x, cursorY, colW, colH, 24);
      ctx.fill();
      ctx.strokeStyle = theme.cardBorder;
      ctx.lineWidth = 2;
      ctx.stroke();

      const items = col.content
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);
      let by = cursorY + 68;
      ctx.font = "500 32px Inter, system-ui, sans-serif";
      items.forEach((b) => {
        if (by > cursorY + colH - 40) return;
        ctx.fillStyle = theme.accent;
        ctx.beginPath();
        ctx.arc(col.x + 48, by - 10, 9, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = theme.bulletColor;
        const wrapped = wrapCanvasText(ctx, b.replace(/^[-•*]\s*/, ""), colW - 110);
        wrapped.forEach((wl) => {
          ctx.fillText(wl, col.x + 76, by);
          by += 46;
        });
        by += 18;
      });
    });
  } else {
    // Default "bullets" layout
    ctx.textAlign = "left";
    ctx.fillStyle = theme.titleColor;
    ctx.font = "bold 64px Inter, system-ui, sans-serif";
    const tLines = wrapCanvasText(ctx, slide.title || "Slide Title", W - 240);
    tLines.forEach((l) => {
      ctx.fillText(l, 120, cursorY + 48);
      cursorY += 76;
    });

    if (slide.subtitle.trim()) {
      ctx.fillStyle = theme.subColor;
      ctx.font = "500 32px Inter, system-ui, sans-serif";
      ctx.fillText(slide.subtitle, 120, cursorY + 20);
      cursorY += 64;
    } else {
      cursorY += 24;
    }

    // Main Card Container for Bullets
    const cardX = 120;
    const cardY = cursorY;
    const cardW = W - 240;
    const cardH = H - cardY - 125;

    ctx.fillStyle = theme.cardBg;
    ctx.beginPath();
    ctx.roundRect(cardX, cardY, cardW, cardH, 28);
    ctx.fill();
    ctx.strokeStyle = theme.cardBorder;
    ctx.lineWidth = 2;
    ctx.stroke();

    const bulletItems = slide.bullets
      .split("\n")
      .map((b) => b.trim())
      .filter(Boolean);

    let by = cardY + 78;
    ctx.font = "500 36px Inter, system-ui, sans-serif";
    bulletItems.forEach((item) => {
      if (by > cardY + cardH - 45) return;
      // Bullet circle
      ctx.fillStyle = theme.accent;
      ctx.beginPath();
      ctx.arc(cardX + 58, by - 12, 11, 0, Math.PI * 2);
      ctx.fill();

      // Bullet text
      ctx.fillStyle = theme.bulletColor;
      const lines = wrapCanvasText(ctx, item.replace(/^[-•*]\s*/, ""), cardW - 140);
      lines.forEach((line) => {
        ctx.fillText(line, cardX + 94, by);
        by += 52;
      });
      by += 24;
    });
  }

  // Footer Bar
  ctx.fillStyle = theme.subColor;
  ctx.font = "600 22px Inter, system-ui, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(slide.footerText || deckTitle, 120, H - 48);

  ctx.textAlign = "right";
  ctx.fillStyle = theme.badgeText;
  ctx.fillText(`Slide ${slideIndex + 1} / ${totalSlides}`, W - 120, H - 48);

  return canvas.toDataURL("image/jpeg", 0.92);
}

export const SlideDeckCreatorModal: React.FC<SlideDeckCreatorModalProps> = ({
  isOpen,
  onClose,
  targetSceneId,
  onDeckCreated,
}) => {
  const { addMediaLibraryItem, setActiveMedia, updateScene, activeSceneId, scenes } = useStudioStore();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const [deckTitle, setDeckTitle] = useState("Live Keynote Presentation");
  const [slides, setSlides] = useState<SlidePageItem[]>([
    {
      id: "slide-1",
      badge: "KEYNOTE 2026",
      title: "Welcome to Our Live Broadcast",
      subtitle: "Interactive Insights, Architecture & Live Q&A",
      bullets:
        "Real-Time HD Multi-Track Streaming & Recording\nZero-Latency Guest Switching & Scene Transitions\nInteractive Polls, Q&A & Fair-Use Commentary Mode",
      secondaryColumn: "",
      footerText: "LiveStudio Broadcast Deck",
      speakerNote: "Welcome everyone! Introduce the agenda and invite viewers to drop questions in chat.",
      layout: "bullets",
      themeId: "indigo",
    },
    {
      id: "slide-2",
      badge: "DEEP DIVE",
      title: "Key Highlights & Roadmap",
      subtitle: "What We Are Covering Today",
      bullets:
        "100% Edge-to-Edge Full-Fill Layouts (No Black Bars)\nCustom Brand Logos, Lower-Third Themes & Overlays\nBuilt-In Slide Deck Creator with Presenter Notes",
      secondaryColumn:
        "StreamYard Pro Parity\nLocal 1080p MP4 Recording + Simultaneous RTMP Stream",
      footerText: "LiveStudio Broadcast Deck",
      speakerNote: "Walk through each feature and demonstrate the live scene transition.",
      layout: "two-column",
      themeId: "cyber",
    },
  ]);

  const [currentIdx, setCurrentIdx] = useState(0);
  const [previewDataUrl, setPreviewDataUrl] = useState<string>("");

  const activeSlide = slides[currentIdx] || slides[0];

  useEffect(() => {
    if (!isOpen || !activeSlide) return;
    const url = renderSlideToDataUrl(activeSlide, currentIdx, slides.length, deckTitle);
    setPreviewDataUrl(url);
  }, [isOpen, activeSlide, currentIdx, slides.length, deckTitle]);

  if (!isOpen || !isMounted) return null;

  const updateActiveSlide = (updates: Partial<SlidePageItem>) => {
    setSlides((prev) =>
      prev.map((s, idx) => (idx === currentIdx ? { ...s, ...updates } : s))
    );
  };

  const handleAddSlide = () => {
    const newSlide: SlidePageItem = {
      id: `slide-${Date.now()}`,
      badge: activeSlide?.badge || "TOPIC",
      title: `Slide ${slides.length + 1} Headline`,
      subtitle: "Supporting subtitle or key takeaway",
      bullets: "First key talking point for your audience\nSecond actionable insight or metric\nThird summary point for discussion",
      secondaryColumn: "Right column comparison point 1\nRight column comparison point 2",
      footerText: deckTitle,
      speakerNote: "",
      layout: "bullets",
      themeId: activeSlide?.themeId || "indigo",
    };
    const next = [...slides, newSlide];
    setSlides(next);
    setCurrentIdx(next.length - 1);
  };

  const handleDuplicateSlide = () => {
    if (!activeSlide) return;
    const copy: SlidePageItem = {
      ...activeSlide,
      id: `slide-${Date.now()}`,
      title: `${activeSlide.title} (Copy)`,
    };
    const next = [...slides];
    next.splice(currentIdx + 1, 0, copy);
    setSlides(next);
    setCurrentIdx(currentIdx + 1);
  };

  const handleDeleteSlide = (idx: number) => {
    if (slides.length <= 1) return;
    const next = slides.filter((_, i) => i !== idx);
    setSlides(next);
    setCurrentIdx(Math.max(0, Math.min(next.length - 1, currentIdx)));
  };

  const handleSaveDeck = (presentImmediately: boolean) => {
    const renderedUrls = slides.map((s, idx) =>
      renderSlideToDataUrl(s, idx, slides.length, deckTitle)
    );
    const notesMap: Record<number, string> = {};
    slides.forEach((s, idx) => {
      if (s.speakerNote.trim()) {
        notesMap[idx] = s.speakerNote.trim();
      }
    });

    const cleanName = (deckTitle.trim() || "Custom_Slide_Deck").replace(/\s+/g, "_");
    const newDeck: MediaFileItem = {
      id: `slides-deck-${Date.now()}`,
      name: `${cleanName}.pdf`,
      type: "pdf",
      url: renderedUrls[0],
      thumbnail: renderedUrls[0],
      duration: `${renderedUrls.length} slides`,
      slides: renderedUrls,
      currentSlideIndex: 0,
      speakerNotes: notesMap,
      isUploaded: true,
      loop: false,
    };

    addMediaLibraryItem(newDeck);

    const sceneToUpdate = targetSceneId || (presentImmediately ? activeSceneId : null);
    if (sceneToUpdate) {
      const targetScene = scenes.find((s) => s.id === sceneToUpdate);
      updateScene(sceneToUpdate, {
        activeMedia: newDeck,
        ...(targetScene?.layout === "solo" ? { layout: "presentation" } : {}),
      });
    }

    if (presentImmediately) {
      setActiveMedia(newDeck);
    }

    onDeckCreated?.(newDeck);
    onClose();
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-5xl bg-[#0d0e1a] border border-white/20 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-white max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-white/10 bg-[#121424] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/20 border border-indigo-400/40 flex items-center justify-center text-indigo-300">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>In-App Broadcast Slide Deck Creator</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-mono">
                  1920×1080 Full HD
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">
                Design multi-slide presentations with speaker notes and attach directly to any Scene or Live Stage
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              value={deckTitle}
              onChange={(e) => setDeckTitle(e.target.value)}
              placeholder="Presentation Deck Name..."
              className="px-3 py-1.5 rounded-xl bg-black/50 border border-white/15 text-xs text-white focus:outline-none focus:border-indigo-400 w-52"
            />
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-white/10 min-h-0">
          {/* Left Column: Slide List & Editor Controls (7 cols) */}
          <div className="lg:col-span-7 p-4 space-y-3.5 overflow-y-auto custom-scrollbar">
            {/* Slide Strip Navigation */}
            <div className="flex items-center justify-between gap-2 pb-2 border-b border-white/10">
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                {slides.map((s, idx) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setCurrentIdx(idx)}
                    className={cn(
                      "px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition-all shrink-0",
                      idx === currentIdx
                        ? "bg-indigo-600 text-white border-indigo-400 shadow-md"
                        : "bg-white/5 text-slate-400 border-white/10 hover:text-white"
                    )}
                  >
                    <span>Slide {idx + 1}</span>
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={handleAddSlide}
                  className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1 shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Slide</span>
                </button>
                <button
                  type="button"
                  onClick={handleDuplicateSlide}
                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10"
                  title="Duplicate current slide"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
                {slides.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleDeleteSlide(currentIdx)}
                    className="p-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30"
                    title="Delete current slide"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Layout & Theme Pickers */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1 mb-1">
                  <Layout className="w-3 h-3 text-indigo-400" />
                  <span>Slide Layout</span>
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { id: "bullets", label: "Title + Bullets" },
                    { id: "center-hero", label: "Center Hero" },
                    { id: "two-column", label: "2-Column Split" },
                    { id: "quote", label: "Big Callout" },
                  ].map((ly) => (
                    <button
                      key={ly.id}
                      type="button"
                      onClick={() => updateActiveSlide({ layout: ly.id as SlidePageItem["layout"] })}
                      className={cn(
                        "py-1.5 px-2 rounded-lg text-[11px] font-medium border text-center transition-all",
                        activeSlide.layout === ly.id
                          ? "bg-indigo-600/30 border-indigo-400 text-white font-bold"
                          : "bg-white/5 border-white/10 text-slate-400 hover:text-white"
                      )}
                    >
                      {ly.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1 mb-1">
                  <Palette className="w-3 h-3 text-cyan-400" />
                  <span>Color Theme</span>
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(Object.keys(SLIDE_THEMES) as SlidePageItem["themeId"][]).map((tKey) => {
                    const t = SLIDE_THEMES[tKey];
                    return (
                      <button
                        key={tKey}
                        type="button"
                        onClick={() => updateActiveSlide({ themeId: tKey })}
                        className={cn(
                          "py-1.5 px-2 rounded-lg text-[10px] font-semibold border flex items-center gap-1.5 transition-all truncate",
                          activeSlide.themeId === tKey
                            ? "bg-white/15 border-cyan-400 text-white"
                            : "bg-white/5 border-white/10 text-slate-400 hover:text-white"
                        )}
                      >
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: t.accent }}
                        />
                        <span className="truncate">{t.name.split(" ")[0]}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Badge & Headline */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div>
                <label className="block text-[10px] font-semibold text-slate-400 uppercase mb-1">
                  Top Badge Tag
                </label>
                <input
                  type="text"
                  value={activeSlide.badge}
                  onChange={(e) => updateActiveSlide({ badge: e.target.value })}
                  placeholder="e.g. KEYNOTE / LIVE"
                  className="w-full px-2.5 py-1.5 rounded-xl bg-black/50 border border-white/15 text-xs text-white focus:outline-none focus:border-indigo-400"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-[10px] font-semibold text-slate-400 uppercase mb-1">
                  Slide Headline / Main Title
                </label>
                <input
                  type="text"
                  value={activeSlide.title}
                  onChange={(e) => updateActiveSlide({ title: e.target.value })}
                  placeholder="Enter main slide title..."
                  className="w-full px-3 py-1.5 rounded-xl bg-black/50 border border-white/15 text-xs text-white font-semibold focus:outline-none focus:border-indigo-400"
                />
              </div>
            </div>

            {/* Subtitle */}
            <div>
              <label className="block text-[10px] font-semibold text-slate-400 uppercase mb-1">
                Subtitle / Supporting Line
              </label>
              <input
                type="text"
                value={activeSlide.subtitle}
                onChange={(e) => updateActiveSlide({ subtitle: e.target.value })}
                placeholder="Optional subtitle or speaker attribution..."
                className="w-full px-3 py-1.5 rounded-xl bg-black/50 border border-white/15 text-xs text-slate-200 focus:outline-none focus:border-indigo-400"
              />
            </div>

            {/* Bullet Points */}
            {(activeSlide.layout === "bullets" || activeSlide.layout === "two-column") && (
              <div className={cn("grid gap-3", activeSlide.layout === "two-column" ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1")}>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-400 uppercase mb-1 flex items-center gap-1">
                    <AlignLeft className="w-3 h-3 text-indigo-400" />
                    <span>{activeSlide.layout === "two-column" ? "Left Column Bullets (1 per line)" : "Bullet Points (1 per line)"}</span>
                  </label>
                  <textarea
                    rows={4}
                    value={activeSlide.bullets}
                    onChange={(e) => updateActiveSlide({ bullets: e.target.value })}
                    placeholder="Enter one bullet point per line..."
                    className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/15 text-xs text-slate-200 focus:outline-none focus:border-indigo-400 leading-relaxed resize-none"
                  />
                </div>

                {activeSlide.layout === "two-column" && (
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-400 uppercase mb-1 flex items-center gap-1">
                      <AlignLeft className="w-3 h-3 text-cyan-400" />
                      <span>Right Column Bullets (1 per line)</span>
                    </label>
                    <textarea
                      rows={4}
                      value={activeSlide.secondaryColumn}
                      onChange={(e) => updateActiveSlide({ secondaryColumn: e.target.value })}
                      placeholder="Enter right column bullet points..."
                      className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/15 text-xs text-slate-200 focus:outline-none focus:border-indigo-400 leading-relaxed resize-none"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Presenter Speaker Notes (Only visible to Host on Stage) */}
            <div>
              <label className="block text-[10px] font-semibold text-amber-300 uppercase mb-1 flex items-center gap-1">
                <FileText className="w-3 h-3 text-amber-400" />
                <span>Presenter Speaker Notes (Private teleprompter notes for this slide)</span>
              </label>
              <textarea
                rows={2}
                value={activeSlide.speakerNote}
                onChange={(e) => updateActiveSlide({ speakerNote: e.target.value })}
                placeholder="Write private talking points for this slide (viewers won't see this on stream)..."
                className="w-full px-3 py-1.5 rounded-xl bg-amber-950/20 border border-amber-500/30 text-xs text-amber-100 placeholder-amber-300/40 focus:outline-none focus:border-amber-400 resize-none"
              />
            </div>
          </div>

          {/* Right Column: Live 16:9 HD Canvas Preview (5 cols) */}
          <div className="lg:col-span-5 p-4 bg-[#080912] flex flex-col justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Live 16:9 Slide Preview</span>
                </span>
                <span className="text-[11px] font-mono text-cyan-300">
                  Slide {currentIdx + 1} of {slides.length}
                </span>
              </div>

              <div className="w-full aspect-video rounded-xl overflow-hidden border border-white/15 bg-black shadow-2xl relative">
                {previewDataUrl ? (
                  <img
                    src={previewDataUrl}
                    alt={`Slide ${currentIdx + 1}`}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs text-slate-500">
                    Rendering preview...
                  </div>
                )}
              </div>

              {/* Quick Prev / Next Navigation */}
              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  disabled={currentIdx <= 0}
                  onClick={() => setCurrentIdx((c) => Math.max(0, c - 1))}
                  className="px-3 py-1 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 text-xs text-slate-200 flex items-center gap-1 border border-white/10"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Prev Slide</span>
                </button>
                <span className="text-[11px] text-slate-400">
                  Use <strong>‹ / ›</strong> on stage to flip slides live
                </span>
                <button
                  type="button"
                  disabled={currentIdx >= slides.length - 1}
                  onClick={() => setCurrentIdx((c) => Math.min(slides.length - 1, c + 1))}
                  className="px-3 py-1 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 text-xs text-slate-200 flex items-center gap-1 border border-white/10"
                >
                  <span>Next Slide</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-indigo-950/30 border border-indigo-500/30 text-[11px] text-indigo-200/90 space-y-1">
              <div className="font-bold text-white flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>StreamYard Presentation Deck Ready</span>
              </div>
              <p className="text-[10px] text-slate-300 leading-relaxed">
                Every slide is rendered at 1920×1080 Full HD and saved in your Media Library. You can drag-and-drop this deck onto any Scene card, flip slides from the Stage or Backstage Strip, and read your private Speaker Notes live.
              </p>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3 border-t border-white/10 bg-[#121424] flex flex-wrap items-center justify-between gap-2 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-xl border border-white/15 hover:bg-white/10 text-slate-300 text-xs font-semibold"
          >
            Cancel
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleSaveDeck(false)}
              className="px-4 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-white border border-white/15 text-xs font-semibold flex items-center gap-1.5 transition-all"
            >
              <Check className="w-3.5 h-3.5 text-cyan-400" />
              <span>{targetSceneId ? "Save & Attach to Scene" : "Save to Media Library"}</span>
            </button>

            <button
              type="button"
              onClick={() => handleSaveDeck(true)}
              className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-indigo-500/25 transition-all"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Save & Present on Stage Now</span>
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
