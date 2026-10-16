"use client";

import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
  Globe,
  X,
  Plus,
  Play,
  Trash2,
  Edit2,
  RefreshCw,
  MousePointer,
  MousePointerClick,
  Crosshair,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  ExternalLink,
  ShieldCheck,
  Sparkles,
  Check,
  Maximize2,
  Eye,
  Lock,
  Unlock,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import {
  MediaFileItem,
  WebsiteSceneConfig,
  WebsitePointerStyle,
  useStudioStore,
} from "@/stores/studio.store";
import { cn } from "@/lib/utils";

declare global {
  interface Window {
    __livestudioWebPointer?: {
      visible: boolean;
      xPct: number;
      yPct: number;
      style: WebsitePointerStyle;
      color: string;
      isClicking: boolean;
      label?: string;
    };
  }
}

export function normalizeWebsiteUrl(raw: string): string {
  const trimmed = (raw || "").trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export interface InteractiveWebsiteStageViewProps {
  item: MediaFileItem;
  zoom?: number;
  panX?: number;
  panY?: number;
  rotation?: number;
  isMirrored?: boolean;
  onOpenLibraryModal?: () => void;
}

export const InteractiveWebsiteStageView: React.FC<InteractiveWebsiteStageViewProps> = ({
  item,
  zoom = 1,
  panX = 0,
  panY = 0,
  rotation = 0,
  isMirrored = false,
  onOpenLibraryModal,
}) => {
  const { updateMediaLibraryItem, setActiveMedia, setTileTransform, tileTransforms } = useStudioStore();
  const webCfg: WebsiteSceneConfig = item.websiteConfig || {
    url: item.url,
    title: item.name || "Live Webpage",
    useProxy: true,
    interactiveMode: true,
    showBroadcastPointer: true,
    pointerStyle: "laser",
    pointerColor: "#ef4444",
    scrollYPercent: 0,
    areaZoom: 1,
  };

  const [isInteractEnabled, setIsInteractEnabled] = useState<boolean>(
    webCfg.interactiveMode ?? true
  );
  const [showPointer, setShowPointer] = useState<boolean>(
    webCfg.showBroadcastPointer ?? true
  );
  const [pointerStyle, setPointerStyle] = useState<WebsitePointerStyle>(
    webCfg.pointerStyle || "laser"
  );
  const [pointerColor, setPointerColor] = useState<string>(
    webCfg.pointerColor || "#ef4444"
  );
  const [useBackendProxy, setUseBackendProxy] = useState<boolean>(
    webCfg.useProxy ?? true
  );
  const [scrollOffsetPx, setScrollOffsetPx] = useState<number>(
    (webCfg.scrollYPercent || 0) * 18
  );
  const [iframeKey, setIframeKey] = useState<number>(0);

  // Live Pointer Position (0-100%) inside the website viewport
  const [pointerPos, setPointerPos] = useState<{ x: number; y: number; active: boolean; clicking: boolean }>({
    x: 50,
    y: 50,
    active: false,
    clicking: false,
  });

  const containerRef = useRef<HTMLDivElement | null>(null);

  // Sync pointer state to global window object so stageBroadcaster.ts can draw the cursor onto Live Stream & Recording!
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.__livestudioWebPointer = {
      visible: Boolean(showPointer && pointerPos.active),
      xPct: pointerPos.x,
      yPct: pointerPos.y,
      style: pointerStyle,
      color: pointerColor,
      isClicking: pointerPos.clicking,
      label: "HOST",
    };
    return () => {
      if (window.__livestudioWebPointer) {
        window.__livestudioWebPointer.visible = false;
      }
    };
  }, [showPointer, pointerPos, pointerStyle, pointerColor]);

  const cleanUrl = normalizeWebsiteUrl(webCfg.url || item.url);
  const iframeSrc = useBackendProxy
    ? `/api/media/website/proxy?url=${encodeURIComponent(cleanUrl)}`
    : cleanUrl;

  const mediaTf = tileTransforms["active-media"] || {
    fitMode: "contain",
    zoom: 1,
    panX: 0,
    panY: 0,
    rotation: 0,
    flipH: false,
    flipV: false,
  };

  const effectiveZoom = Math.max(1, zoom || mediaTf.zoom || 1);
  const originX = Math.max(0, Math.min(100, 50 + (panX || mediaTf.panX || 0)));
  const originY = Math.max(0, Math.min(100, 50 + (panY || mediaTf.panY || 0)));

  const handleUpdateConfig = (partial: Partial<WebsiteSceneConfig>) => {
    const nextCfg: WebsiteSceneConfig = { ...webCfg, ...partial };
    updateMediaLibraryItem(item.id, { websiteConfig: nextCfg });
    setActiveMedia({ ...item, websiteConfig: nextCfg });
  };

  const handleContainerMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / Math.max(1, rect.width)) * 100));
    const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / Math.max(1, rect.height)) * 100));
    setPointerPos((prev) => ({ ...prev, x, y, active: true }));
  };

  const handleContainerMouseDown = () => {
    setPointerPos((prev) => ({ ...prev, clicking: true }));
    setTimeout(() => {
      setPointerPos((prev) => ({ ...prev, clicking: false }));
    }, 260);
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleContainerMouseMove}
      onMouseEnter={() => setPointerPos((p) => ({ ...p, active: true }))}
      onMouseLeave={() => setPointerPos((p) => ({ ...p, active: false }))}
      onMouseDown={handleContainerMouseDown}
      className="relative w-full h-full bg-[#070913] overflow-hidden select-none group/webstage"
    >
      {/* Top Broadcast Browser Address Bar Pill */}
      <div className="absolute top-2 left-2.5 right-2.5 z-25 flex items-center justify-between gap-2 px-3 py-1 rounded-xl bg-[#0b0d1a]/90 backdrop-blur-md border border-white/15 shadow-lg pointer-events-auto opacity-85 group-hover/webstage:opacity-100 transition-opacity">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
          <Globe className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
          <span className="text-[10.5px] font-mono text-slate-200 truncate">
            {cleanUrl}
          </span>
        </div>

        <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
          {/* Interactive Click Mode vs Pan/Pointer Mode */}
          <button
            type="button"
            onClick={() => {
              const next = !isInteractEnabled;
              setIsInteractEnabled(next);
              handleUpdateConfig({ interactiveMode: next });
            }}
            className={cn(
              "px-2 py-0.5 rounded-lg text-[9.5px] font-bold flex items-center gap-1 border transition-all",
              isInteractEnabled
                ? "bg-emerald-600/30 text-emerald-200 border-emerald-400/60"
                : "bg-amber-600/30 text-amber-200 border-amber-400/60"
            )}
            title={
              isInteractEnabled
                ? "Interactive Mode ON: Click links, buttons, images & play videos directly inside the webpage"
                : "Focus / Pointer Mode ON: Move broadcast laser pointer & drag to pan without accidentally clicking links"
            }
          >
            {isInteractEnabled ? (
              <>
                <MousePointerClick className="w-3 h-3 text-emerald-300" />
                <span>Interact: ON</span>
              </>
            ) : (
              <>
                <Lock className="w-3 h-3 text-amber-300" />
                <span>Lock Clicks (Pointer Only)</span>
              </>
            )}
          </button>

          {/* Broadcast Viewer Pointer / Cursor Toggle */}
          <button
            type="button"
            onClick={() => {
              const next = !showPointer;
              setShowPointer(next);
              handleUpdateConfig({ showBroadcastPointer: next });
            }}
            className={cn(
              "px-2 py-0.5 rounded-lg text-[9.5px] font-bold flex items-center gap-1 border transition-all",
              showPointer
                ? "bg-rose-600/35 text-rose-200 border-rose-400/60 shadow"
                : "bg-white/5 text-slate-400 border-white/15 hover:text-white"
            )}
            title="Show live Broadcast Pointer / Cursor to viewers on Stage, Recording & Live Stream"
          >
            <Crosshair className="w-3 h-3 text-rose-400" />
            <span>Pointer {showPointer ? "ON" : "OFF"}</span>
          </button>

          {showPointer && (
            <select
              value={pointerStyle}
              onChange={(e) => {
                const st = e.target.value as WebsitePointerStyle;
                setPointerStyle(st);
                handleUpdateConfig({ pointerStyle: st });
              }}
              className="bg-slate-900 border border-white/15 rounded px-1.5 py-0.5 text-[9.5px] text-rose-200 focus:outline-none"
              title="Broadcast Pointer Visual Style"
            >
              <option value="laser">🔴 Laser Dot</option>
              <option value="cursor">🟡 Broadcast Arrow</option>
              <option value="crosshair">🎯 Tactical Crosshair</option>
              <option value="spotlight">🔦 Spotlight Ring</option>
            </select>
          )}

          {/* Proxy vs Direct Embed Switcher */}
          <button
            type="button"
            onClick={() => {
              const next = !useBackendProxy;
              setUseBackendProxy(next);
              handleUpdateConfig({ useProxy: next });
            }}
            className={cn(
              "px-2 py-0.5 rounded-lg text-[9.5px] font-semibold border transition-all",
              useBackendProxy
                ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/40"
                : "bg-white/5 text-slate-300 border-white/15"
            )}
            title="Proxy Mode bypasses X-Frame-Options restrictions so any news/article website loads inside the scene"
          >
            {useBackendProxy ? "🛡️ Proxy ON" : "Direct"}
          </button>

          {/* Reload Webpage */}
          <button
            type="button"
            onClick={() => setIframeKey((k) => k + 1)}
            className="p-1 rounded-lg bg-white/5 hover:bg-white/15 text-slate-300 hover:text-white border border-white/10"
            title="Reload Webpage"
          >
            <RefreshCw className="w-3 h-3" />
          </button>

          {onOpenLibraryModal && (
            <button
              type="button"
              onClick={onOpenLibraryModal}
              className="px-2 py-0.5 rounded-lg bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-200 border border-indigo-400/50 text-[9.5px] font-semibold"
              title="Open Website URL Library"
            >
              URLs
            </button>
          )}
        </div>
      </div>

      {/* Main Zoomable / Pannable Interactive Webpage Viewport */}
      <div
        style={{
          width: "100%",
          height: "100%",
          paddingTop: "36px",
          transform: [
            effectiveZoom > 1 ? `scale(${effectiveZoom})` : "",
            rotation ? `rotate(${rotation}deg)` : "",
            isMirrored ? "scaleX(-1)" : "",
          ]
            .filter(Boolean)
            .join(" ") || undefined,
          transformOrigin: `${originX}% ${originY}%`,
          transition: "transform 0.15s ease-out, transform-origin 0.15s ease-out",
        }}
        className="w-full h-full relative overflow-hidden bg-white"
      >
        <div
          style={{
            width: "100%",
            height: `calc(100% + ${scrollOffsetPx}px)`,
            transform: scrollOffsetPx > 0 ? `translateY(-${scrollOffsetPx}px)` : undefined,
            transition: "transform 0.12s ease-out",
          }}
          className="w-full h-full relative"
        >
          <iframe
            id="livestudio-active-website-iframe"
            key={`${iframeKey}-${cleanUrl}-${useBackendProxy ? "proxy" : "direct"}`}
            src={iframeSrc}
            title={webCfg.title || item.name}
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-presentation"
            allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
            className={cn(
              "w-full h-full border-0 bg-white",
              isInteractEnabled ? "pointer-events-auto" : "pointer-events-none"
            )}
          />
        </div>
      </div>

      {/* Live Broadcast Viewer Pointer / Laser Cursor Overlay (Visible to Host & Captured on Stream) */}
      {showPointer && pointerPos.active && (
        <div
          style={{
            left: `${pointerPos.x}%`,
            top: `${pointerPos.y}%`,
          }}
          className="absolute z-40 pointer-events-none -translate-x-1/2 -translate-y-1/2 transition-transform duration-75"
        >
          {pointerStyle === "laser" && (
            <div className="relative flex items-center justify-center">
              <span
                className={cn(
                  "absolute rounded-full animate-ping opacity-75",
                  pointerPos.clicking ? "w-12 h-12" : "w-7 h-7"
                )}
                style={{ backgroundColor: pointerColor }}
              />
              <span
                className="w-4 h-4 rounded-full border-2 border-white shadow-[0_0_16px_#ef4444]"
                style={{ backgroundColor: pointerColor }}
              />
            </div>
          )}

          {pointerStyle === "cursor" && (
            <div className="relative">
              <div
                className={cn(
                  "w-7 h-7 rounded-full flex items-center justify-center shadow-2xl border-2 border-white transition-transform",
                  pointerPos.clicking ? "scale-125" : "scale-100"
                )}
                style={{ backgroundColor: pointerColor }}
              >
                <MousePointer className="w-4 h-4 text-white fill-white" />
              </div>
              <span className="mt-0.5 px-1.5 py-0.2 rounded bg-black/90 text-white font-bold text-[8px] uppercase tracking-wider border border-white/20 block text-center shadow">
                POINTER
              </span>
            </div>
          )}

          {pointerStyle === "crosshair" && (
            <div className="relative flex items-center justify-center">
              <div
                className={cn(
                  "w-11 h-11 rounded-full border-2 flex items-center justify-center shadow-lg",
                  pointerPos.clicking ? "scale-125" : "scale-100"
                )}
                style={{ borderColor: pointerColor }}
              >
                <div className="w-full h-[1.5px] bg-rose-500/80 absolute" />
                <div className="h-full w-[1.5px] bg-rose-500/80 absolute" />
                <span className="w-2 h-2 rounded-full bg-white" />
              </div>
            </div>
          )}

          {pointerStyle === "spotlight" && (
            <div
              className={cn(
                "w-28 h-28 rounded-full border-2 shadow-[0_0_0_9999px_rgba(0,0,0,0.45)] transition-transform",
                pointerPos.clicking ? "scale-90" : "scale-100"
              )}
              style={{ borderColor: pointerColor }}
            />
          )}
        </div>
      )}

      {/* Bottom Area Focus, Scroll & Zoom Control Bar */}
      <div
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        className="absolute bottom-2 left-1/2 -translate-x-1/2 z-30 bg-[#090a14]/95 backdrop-blur-md border border-white/15 rounded-xl px-3 py-1.5 flex items-center gap-2 shadow-2xl opacity-0 group-hover/webstage:opacity-100 transition-opacity pointer-events-auto"
      >
        <span className="text-[9.5px] font-bold text-cyan-300 uppercase tracking-wider">
          Page Focus:
        </span>

        {/* Quick Scroll Up / Down Slider for Highlighting Page Sections */}
        <div className="flex items-center gap-1 bg-white/5 rounded-lg px-2 py-0.5 border border-white/10">
          <ArrowUp className="w-3 h-3 text-slate-400" />
          <input
            type="range"
            min={0}
            max={2400}
            step={40}
            value={scrollOffsetPx}
            onChange={(e) => setScrollOffsetPx(Number(e.target.value))}
            className="w-20 h-1 accent-cyan-400 bg-white/20 rounded cursor-pointer"
            title="Scroll webpage vertically to focus on a specific article section or image"
          />
          <ArrowDown className="w-3 h-3 text-slate-400" />
        </div>

        {/* Area Zoom Controls */}
        <button
          type="button"
          onClick={() =>
            setTileTransform("active-media", {
              zoom: Math.max(1, Number((effectiveZoom - 0.25).toFixed(2))),
            })
          }
          className="px-1.5 py-0.5 rounded bg-white/10 hover:bg-white/20 text-white text-[10px] font-bold"
          title="Zoom Out Webpage Area"
        >
          <ZoomOut className="w-3 h-3" />
        </button>
        <span className="text-[10px] font-mono text-amber-300 min-w-[36px] text-center">
          {Math.round(effectiveZoom * 100)}%
        </span>
        <button
          type="button"
          onClick={() =>
            setTileTransform("active-media", {
              zoom: Math.min(3, Number((effectiveZoom + 0.25).toFixed(2))),
            })
          }
          className="px-1.5 py-0.5 rounded bg-white/10 hover:bg-white/20 text-white text-[10px] font-bold"
          title="Zoom In to highlight a specific area of the webpage"
        >
          <ZoomIn className="w-3 h-3" />
        </button>

        {/* Quick Area Focus Presets */}
        {(["top", "center", "bottom", "left", "right"] as const).map((pos) => (
          <button
            key={pos}
            type="button"
            onClick={() => {
              const targetZoom = effectiveZoom <= 1 ? 1.5 : effectiveZoom;
              if (pos === "top") setTileTransform("active-media", { zoom: targetZoom, panY: -50 });
              if (pos === "bottom") setTileTransform("active-media", { zoom: targetZoom, panY: 50 });
              if (pos === "left") setTileTransform("active-media", { zoom: targetZoom, panX: -50 });
              if (pos === "right") setTileTransform("active-media", { zoom: targetZoom, panX: 50 });
              if (pos === "center") setTileTransform("active-media", { zoom: targetZoom, panX: 0, panY: 0 });
            }}
            className="px-1.5 py-0.5 rounded bg-indigo-500/20 hover:bg-indigo-500/40 text-indigo-200 border border-indigo-500/30 text-[9px] font-semibold uppercase"
            title={`Focus viewer attention on ${pos} area of webpage`}
          >
            {pos === "center" ? "Mid" : pos === "bottom" ? "Btm" : pos}
          </button>
        ))}

        <button
          type="button"
          onClick={() => {
            setScrollOffsetPx(0);
            setTileTransform("active-media", { zoom: 1, panX: 0, panY: 0, rotation: 0 });
          }}
          className="p-1 rounded bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white"
          title="Reset Webpage Zoom & Scroll"
        >
          <RotateCcw className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
};

interface WebsiteLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetSceneId?: string | null;
  onSelectWebsiteItem?: (item: MediaFileItem) => void;
}

export const WebsiteLibraryModal: React.FC<WebsiteLibraryModalProps> = ({
  isOpen,
  onClose,
  targetSceneId,
  onSelectWebsiteItem,
}) => {
  const {
    mediaLibrary,
    addMediaLibraryItem,
    updateMediaLibraryItem,
    removeMediaLibraryItem,
    setActiveMedia,
    activeMedia,
    scenes,
    activeSceneId,
    updateScene,
  } = useStudioStore();

  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const [urlInput, setUrlInput] = useState("");
  const [titleInput, setTitleInput] = useState("");
  const [useProxy, setUseProxy] = useState(true);
  const [interactiveMode, setInteractiveMode] = useState(true);
  const [showPointer, setShowPointer] = useState(true);
  const [pointerStyle, setPointerStyle] = useState<WebsitePointerStyle>("laser");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const effectiveSceneId = targetSceneId || activeSceneId;
  const targetScene = scenes.find((s) => s.id === effectiveSceneId);

  const websiteItems = React.useMemo(
    () => mediaLibrary.filter((m) => m.type === "website" || Boolean(m.websiteConfig)),
    [mediaLibrary]
  );

  if (!isOpen || !isMounted) return null;

  const resetForm = () => {
    setUrlInput("");
    setTitleInput("");
    setUseProxy(true);
    setInteractiveMode(true);
    setShowPointer(true);
    setPointerStyle("laser");
    setEditingId(null);
    setErrorMsg(null);
  };

  const handleEditItem = (item: MediaFileItem) => {
    setEditingId(item.id);
    setUrlInput(item.websiteConfig?.url || item.url);
    setTitleInput(item.name);
    setUseProxy(item.websiteConfig?.useProxy ?? true);
    setInteractiveMode(item.websiteConfig?.interactiveMode ?? true);
    setShowPointer(item.websiteConfig?.showBroadcastPointer ?? true);
    setPointerStyle(item.websiteConfig?.pointerStyle || "laser");
  };

  const handleSaveWebsite = (attachAndPresentNow: boolean) => {
    const cleanUrl = normalizeWebsiteUrl(urlInput);
    if (!cleanUrl || !cleanUrl.includes(".")) {
      setErrorMsg("Please enter a valid Website URL (e.g. https://en.wikipedia.org or https://bbc.com/news).");
      return;
    }

    let hostnameLabel = cleanUrl;
    try {
      hostnameLabel = new URL(cleanUrl).hostname.replace(/^www\./, "");
    } catch {}

    const cleanTitle = titleInput.trim() || `🌐 ${hostnameLabel}`;
    const websiteConfig: WebsiteSceneConfig = {
      url: cleanUrl,
      title: cleanTitle,
      useProxy,
      interactiveMode,
      showBroadcastPointer: showPointer,
      pointerStyle,
      pointerColor: "#ef4444",
      scrollYPercent: 0,
      areaZoom: 1,
    };

    if (editingId) {
      const updates: Partial<MediaFileItem> = {
        name: cleanTitle,
        type: "website",
        url: cleanUrl,
        duration: hostnameLabel,
        websiteConfig,
        isUploaded: true,
      };
      updateMediaLibraryItem(editingId, updates);
      const existing = mediaLibrary.find((m) => m.id === editingId);
      if (attachAndPresentNow && existing) {
        const merged = { ...existing, ...updates };
        if (effectiveSceneId) updateScene(effectiveSceneId, { activeMedia: merged });
        if (!targetSceneId || targetSceneId === activeSceneId) setActiveMedia(merged);
        onSelectWebsiteItem?.(merged);
        onClose();
      } else {
        resetForm();
      }
      return;
    }

    const newItem: MediaFileItem = {
      id: `website-${Date.now()}`,
      name: cleanTitle,
      type: "website",
      url: cleanUrl,
      duration: hostnameLabel,
      websiteConfig,
      isUploaded: true,
    };

    addMediaLibraryItem(newItem);

    if (attachAndPresentNow) {
      if (effectiveSceneId) {
        updateScene(effectiveSceneId, { activeMedia: newItem });
      }
      if (!targetSceneId || targetSceneId === activeSceneId) {
        setActiveMedia(newItem);
      }
      onSelectWebsiteItem?.(newItem);
      resetForm();
      onClose();
    } else {
      resetForm();
    }
  };

  const handleAttachToScene = (item: MediaFileItem) => {
    if (effectiveSceneId) {
      updateScene(effectiveSceneId, { activeMedia: item });
    }
    if (!targetSceneId || targetSceneId === activeSceneId) {
      setActiveMedia(item);
    }
    onSelectWebsiteItem?.(item);
    onClose();
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl bg-[#0d0e1a] border border-white/20 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-white max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-white/10 bg-[#121426] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/20 border border-indigo-400/40 flex items-center justify-center text-indigo-300">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>Interactive Live Website Scene Player & URL Library</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono">
                  Interactive Click • Area Focus • Live Viewer Pointer
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">
                Pre-save website URLs, click to attach to any Scene, interact with articles/images/videos, and highlight areas with a live Broadcast Pointer
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-white/10 min-h-0">
          {/* Left Column: Add / Configure Website URL (6 cols) */}
          <div className="lg:col-span-6 p-4 space-y-3.5 overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-300 flex items-center gap-1.5">
                <Plus className="w-3.5 h-3.5" />
                <span>{editingId ? "Edit Saved Website URL" : "Add Website URL to Library"}</span>
              </span>
              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="text-[10px] text-slate-400 hover:text-white underline"
                >
                  Cancel Edit
                </button>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-300 block">
                Website / Article / Portal URL *
              </label>
              <input
                type="text"
                value={urlInput}
                onChange={(e) => {
                  setUrlInput(e.target.value);
                  setErrorMsg(null);
                }}
                placeholder="https://en.wikipedia.org/wiki/... or https://..."
                className="w-full px-3 py-2 rounded-xl bg-black/60 border border-white/15 text-xs text-white font-mono focus:outline-none focus:border-indigo-400"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-300 block">
                Custom Label / Title (Optional)
              </label>
              <input
                type="text"
                value={titleInput}
                onChange={(e) => setTitleInput(e.target.value)}
                placeholder="e.g. Live Election Results / Breaking News Article"
                className="w-full px-3 py-2 rounded-xl bg-black/60 border border-white/15 text-xs text-white focus:outline-none focus:border-indigo-400"
              />
            </div>

            {/* Interactive & Pointer Settings */}
            <div className="p-3 rounded-xl bg-indigo-950/25 border border-indigo-500/30 space-y-2.5">
              <span className="text-[11px] font-bold text-indigo-200 flex items-center gap-1.5">
                <Crosshair className="w-3.5 h-3.5 text-rose-400" />
                <span>Stage Interaction & Viewer Pointer Controls</span>
              </span>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setInteractiveMode(!interactiveMode)}
                  className={cn(
                    "p-2 rounded-xl border text-left transition-all",
                    interactiveMode
                      ? "bg-emerald-950/40 border-emerald-500/50 text-emerald-200"
                      : "bg-white/5 border-white/10 text-slate-400"
                  )}
                >
                  <div className="text-[10.5px] font-bold flex items-center justify-between">
                    <span>🖱️ Interactive Webpage</span>
                    <span>{interactiveMode ? "ON" : "OFF"}</span>
                  </div>
                  <p className="text-[9px] text-slate-400 mt-0.5">
                    Click links, scroll, open images & play videos inside stage
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setShowPointer(!showPointer)}
                  className={cn(
                    "p-2 rounded-xl border text-left transition-all",
                    showPointer
                      ? "bg-rose-950/40 border-rose-500/50 text-rose-200"
                      : "bg-white/5 border-white/10 text-slate-400"
                  )}
                >
                  <div className="text-[10.5px] font-bold flex items-center justify-between">
                    <span>🔴 Viewer Laser Pointer</span>
                    <span>{showPointer ? "ON" : "OFF"}</span>
                  </div>
                  <p className="text-[9px] text-slate-400 mt-0.5">
                    Shows your live cursor/laser to viewers on Stage & Stream
                  </p>
                </button>
              </div>

              <div className="flex items-center justify-between pt-1 border-t border-white/10">
                <span className="text-[10px] text-slate-300">Pointer Style for Viewers:</span>
                <select
                  value={pointerStyle}
                  onChange={(e) => setPointerStyle(e.target.value as WebsitePointerStyle)}
                  className="bg-slate-900 border border-white/15 rounded-lg px-2 py-1 text-[10px] text-white"
                >
                  <option value="laser">🔴 Red Laser Dot + Pulse</option>
                  <option value="cursor">🟡 Broadcast Arrow Cursor</option>
                  <option value="crosshair">🎯 Tactical Crosshair</option>
                  <option value="spotlight">🔦 Spotlight Highlight Ring</option>
                </select>
              </div>

              <div className="flex items-center justify-between pt-1 border-t border-white/10">
                <span className="text-[10px] text-slate-300">Bypass IFrame Block (`X-Frame-Options`):</span>
                <button
                  type="button"
                  onClick={() => setUseProxy(!useProxy)}
                  className={cn(
                    "px-2.5 py-0.5 rounded-lg text-[10px] font-bold border",
                    useProxy
                      ? "bg-cyan-600 text-white border-cyan-400"
                      : "bg-white/5 text-slate-400 border-white/10"
                  )}
                >
                  {useProxy ? "🛡️ Smart Proxy ON (Recommended)" : "Direct IFrame"}
                </button>
              </div>
            </div>

            {errorMsg && (
              <div className="p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/40 text-xs text-rose-300">
                {errorMsg}
              </div>
            )}

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => handleSaveWebsite(false)}
                className="flex-1 py-2 px-3 rounded-xl bg-white/10 hover:bg-white/15 text-white border border-white/15 text-xs font-semibold flex items-center justify-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5 text-cyan-400" />
                <span>{editingId ? "Update in URL Library" : "Save to URL Library"}</span>
              </button>

              <button
                type="button"
                onClick={() => handleSaveWebsite(true)}
                className="flex-1 py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-lg shadow-indigo-600/25"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>{targetScene ? `Add to "${targetScene.name}"` : "Show on Stage Now"}</span>
              </button>
            </div>
          </div>

          {/* Right Column: Saved Website URLs Library (6 cols) */}
          <div className="lg:col-span-6 p-4 bg-[#090a14] flex flex-col justify-between gap-3 overflow-y-auto custom-scrollbar">
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Saved Website URLs Library ({websiteItems.length})</span>
                </span>
                {targetScene && (
                  <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    Scene: <strong>{targetScene.name}</strong>
                  </span>
                )}
              </div>

              {websiteItems.length === 0 ? (
                <div className="p-8 rounded-2xl border border-dashed border-white/10 text-center space-y-2 text-slate-400">
                  <Globe className="w-8 h-8 text-indigo-400/50 mx-auto" />
                  <p className="text-xs font-semibold text-slate-300">No Website URLs saved yet</p>
                  <p className="text-[11px] text-slate-500">
                    Paste any news portal, blog, live dashboard, or webpage URL on the left and save it here. Click any saved URL to display it in your Scene!
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[52vh] overflow-y-auto pr-1 custom-scrollbar">
                  {websiteItems.map((item) => {
                    const isAttached = targetScene?.activeMedia?.id === item.id;
                    const isLive = activeMedia?.id === item.id;
                    return (
                      <div
                        key={item.id}
                        onClick={() => handleAttachToScene(item)}
                        className={cn(
                          "p-2.5 rounded-xl border flex items-center justify-between gap-2.5 cursor-pointer transition-all group",
                          isAttached || isLive
                            ? "bg-indigo-950/40 border-indigo-400 ring-1 ring-indigo-400/30"
                            : "bg-white/[0.03] border-white/10 hover:border-indigo-400/40 hover:bg-white/[0.06]"
                        )}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-bold text-white truncate flex items-center gap-1.5">
                            <span>{item.name}</span>
                            {isAttached && (
                              <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[9px] font-bold">
                                In Scene ✓
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-cyan-300/90 font-mono truncate mt-0.5">
                            {item.websiteConfig?.url || item.url}
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => handleAttachToScene(item)}
                            className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold"
                          >
                            {isAttached ? "Present" : targetScene?.activeMedia ? "Replace" : "Use"}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleEditItem(item)}
                            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-slate-300 hover:text-white border border-white/10"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeMediaLibraryItem(item.id)}
                            className="p-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/30"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="p-3 rounded-xl bg-cyan-950/25 border border-cyan-500/30 text-[10.5px] text-cyan-200/90 leading-relaxed">
              💡 <strong>Full Stage & Area Focus Controls:</strong> Once a website is on stage, use the bottom bar or top toolbar to <strong>Zoom (100%–300%)</strong>, focus on <strong>Top / Btm / Left / Right / Mid</strong> areas, scroll smoothly, and move your <strong>Red Laser Pointer</strong> so viewers see exactly what you are explaining!
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};