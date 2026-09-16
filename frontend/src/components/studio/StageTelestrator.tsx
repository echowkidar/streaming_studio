"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import {
  Pencil,
  Highlighter,
  MoveRight,
  Square,
  Circle,
  Type,
  Eraser,
  Undo2,
  Trash2,
  Eye,
  EyeOff,
  X,
  GripVertical,
  Check,
} from "lucide-react";
import { useStudioStore, DrawingTool } from "@/stores/studio.store";
import { cn } from "@/lib/utils";

interface Point {
  x: number;
  y: number;
}

const COLOR_PALETTE = [
  { name: "Neon Red", hex: "#ef4444" },
  { name: "Bright Yellow", hex: "#facc15" },
  { name: "Emerald Green", hex: "#22c55e" },
  { name: "Vibrant Cyan", hex: "#06b6d4" },
  { name: "Electric Purple", hex: "#a855f7" },
  { name: "Pure White", hex: "#ffffff" },
];

const STROKE_WIDTHS = [
  { label: "Thin", value: 3 },
  { label: "Med", value: 6 },
  { label: "Bold", value: 12 },
];

export const StageTelestrator: React.FC = () => {
  const {
    isDrawingMode,
    setIsDrawingMode,
    drawingTool,
    setDrawingTool,
    drawingColor,
    setDrawingColor,
    drawingWidth,
    setDrawingWidth,
    isDrawingVisible,
    setIsDrawingVisible,
  } = useStudioStore();

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef(false);
  const startPointRef = useRef<Point | null>(null);
  const currentPointsRef = useRef<Point[]>([]);
  const snapshotBeforeShapeRef = useRef<ImageData | null>(null);

  // Undo History Stack (Max 20 states)
  const historyStackRef = useRef<ImageData[]>([]);

  // Text Tool Inline Input State
  const [textInputPos, setTextInputPos] = useState<{ x: number; y: number; clientX: number; clientY: number } | null>(null);
  const [textValue, setTextValue] = useState("");
  const textInputRef = useRef<HTMLInputElement | null>(null);

  // Floating Toolbar Position & Dragging State
  const [toolbarPos, setToolbarPos] = useState<{ x: number; y: number }>({ x: 24, y: 24 });
  const isDraggingToolbarRef = useRef(false);
  const toolbarDragOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Save current canvas snapshot to undo history
  const pushHistoryState = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;
    try {
      const state = ctx.getImageData(0, 0, canvas.width, canvas.height);
      historyStackRef.current.push(state);
      if (historyStackRef.current.length > 20) {
        historyStackRef.current.shift();
      }
    } catch {
      // ignore
    }
  }, []);

  // Undo last action
  const handleUndo = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    if (historyStackRef.current.length > 0) {
      const previousState = historyStackRef.current.pop();
      if (previousState) {
        ctx.putImageData(previousState, 0, 0);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }, []);

  // Clear all drawings
  const handleClearAll = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;
    pushHistoryState();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }, [pushHistoryState]);

  // Keyboard shortcuts (Ctrl+Z for undo, Esc to close)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isDrawingMode) return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        handleUndo();
      } else if (e.key === "Escape") {
        if (textInputPos) {
          setTextInputPos(null);
          setTextValue("");
        } else {
          setIsDrawingMode(false);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isDrawingMode, handleUndo, textInputPos, setIsDrawingMode]);

  // Convert client viewport coordinates to fixed 1920x1080 canvas coordinates
  const getCanvasCoords = (e: React.MouseEvent | React.TouchEvent): Point | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return null;

    let clientX = 0;
    let clientY = 0;

    if ("touches" in e) {
      if (e.touches.length === 0) return null;
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  };

  // Helper to draw an arrowhead on a canvas
  const drawArrowhead = (
    ctx: CanvasRenderingContext2D,
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
    radius: number
  ) => {
    const angle = Math.atan2(toY - fromY, toX - fromX);
    ctx.beginPath();
    ctx.moveTo(toX, toY);
    ctx.lineTo(
      toX - radius * Math.cos(angle - Math.PI / 6),
      toY - radius * Math.sin(angle - Math.PI / 6)
    );
    ctx.lineTo(
      toX - radius * Math.cos(angle + Math.PI / 6),
      toY - radius * Math.sin(angle + Math.PI / 6)
    );
    ctx.closePath();
    ctx.fillStyle = ctx.strokeStyle;
    ctx.fill();
  };

  // ── Mouse & Touch Drawing Handlers ─────────────────────────
  const handlePointerDown = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawingMode) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    const coords = getCanvasCoords(e);
    if (!coords) return;

    // If Text tool is active, handle inline text placement
    if (drawingTool === "text") {
      let clientX = 0;
      let clientY = 0;
      if ("touches" in e) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else {
        clientX = e.clientX;
        clientY = e.clientY;
      }
      setTextInputPos({ x: coords.x, y: coords.y, clientX, clientY });
      setTextValue("");
      setTimeout(() => textInputRef.current?.focus(), 50);
      return;
    }

    e.preventDefault();
    e.stopPropagation();

    // Push state before starting a new stroke/shape
    pushHistoryState();

    isDrawingRef.current = true;
    startPointRef.current = coords;
    currentPointsRef.current = [coords];

    // Snapshot before previewing shapes (arrow, rect, circle)
    snapshotBeforeShapeRef.current = ctx.getImageData(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    if (drawingTool === "eraser") {
      ctx.globalCompositeOperation = "destination-out";
      ctx.lineWidth = drawingWidth * 5;
      ctx.beginPath();
      ctx.arc(coords.x, coords.y, drawingWidth * 2.5, 0, Math.PI * 2);
      ctx.fill();
    } else if (drawingTool === "highlighter") {
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = `${drawingColor}70`; // 45% opacity
      ctx.lineWidth = drawingWidth * 4;
      ctx.beginPath();
      ctx.moveTo(coords.x, coords.y);
    } else {
      // Pen / shapes
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = drawingColor;
      ctx.fillStyle = drawingColor;
      ctx.lineWidth = drawingWidth;
      ctx.beginPath();
      ctx.moveTo(coords.x, coords.y);
    }
  };

  const handlePointerMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawingRef.current || !isDrawingMode) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    const coords = getCanvasCoords(e);
    if (!coords) return;

    e.preventDefault();
    e.stopPropagation();

    const start = startPointRef.current;
    if (!start) return;

    if (drawingTool === "pen" || drawingTool === "highlighter" || drawingTool === "eraser") {
      currentPointsRef.current.push(coords);

      if (drawingTool === "eraser") {
        ctx.beginPath();
        ctx.arc(coords.x, coords.y, drawingWidth * 2.5, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Smooth freehand drawing with quadratic curves
        const points = currentPointsRef.current;
        if (points.length >= 3) {
          const xc = (points[points.length - 2].x + points[points.length - 1].x) / 2;
          const yc = (points[points.length - 2].y + points[points.length - 1].y) / 2;
          ctx.quadraticCurveTo(points[points.length - 2].x, points[points.length - 2].y, xc, yc);
          ctx.stroke();
        } else {
          ctx.lineTo(coords.x, coords.y);
          ctx.stroke();
        }
      }
    } else if (
      (drawingTool === "arrow" || drawingTool === "rect" || drawingTool === "circle") &&
      snapshotBeforeShapeRef.current
    ) {
      // Restore previous snapshot for live interactive shape preview
      ctx.putImageData(snapshotBeforeShapeRef.current, 0, 0);

      ctx.save();
      ctx.strokeStyle = drawingColor;
      ctx.fillStyle = drawingColor;
      ctx.lineWidth = drawingWidth;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      if (drawingTool === "arrow") {
        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(coords.x, coords.y);
        ctx.stroke();
        drawArrowhead(ctx, start.x, start.y, coords.x, coords.y, Math.max(16, drawingWidth * 3.5));
      } else if (drawingTool === "rect") {
        const x = Math.min(start.x, coords.x);
        const y = Math.min(start.y, coords.y);
        const w = Math.abs(coords.x - start.x);
        const h = Math.abs(coords.y - start.y);

        ctx.beginPath();
        ctx.strokeRect(x, y, w, h);
      } else if (drawingTool === "circle") {
        const rx = Math.abs(coords.x - start.x) / 2;
        const ry = Math.abs(coords.y - start.y) / 2;
        const cx = Math.min(start.x, coords.x) + rx;
        const cy = Math.min(start.y, coords.y) + ry;

        ctx.beginPath();
        ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.restore();
    }
  };

  const handlePointerUp = () => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    startPointRef.current = null;
    currentPointsRef.current = [];
    snapshotBeforeShapeRef.current = null;

    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      ctx?.restore();
    }
  };

  // Commit text input to canvas
  const handleCommitText = () => {
    if (!textInputPos || !textValue.trim()) {
      setTextInputPos(null);
      setTextValue("");
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    pushHistoryState();

    ctx.save();
    const fontSize = Math.max(28, drawingWidth * 7);
    ctx.font = `bold ${fontSize}px Inter, system-ui, sans-serif`;
    ctx.textAlign = "left";
    ctx.textBaseline = "top";

    // Draw high-contrast text outline (legible over any stage background)
    ctx.strokeStyle = "rgba(0, 0, 0, 0.9)";
    ctx.lineWidth = 6;
    ctx.lineJoin = "round";
    ctx.strokeText(textValue, textInputPos.x, textInputPos.y);

    // Draw solid text fill
    ctx.fillStyle = drawingColor;
    ctx.fillText(textValue, textInputPos.x, textInputPos.y);

    ctx.restore();

    setTextInputPos(null);
    setTextValue("");
  };

  // ── Floating Toolbar Drag Handlers ─────────────────────────
  const handleToolbarMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("button") || (e.target as HTMLElement).closest("input")) return;
    e.preventDefault();
    isDraggingToolbarRef.current = true;
    toolbarDragOffsetRef.current = {
      x: e.clientX - toolbarPos.x,
      y: e.clientY - toolbarPos.y,
    };

    const handleMouseMove = (moveEvt: MouseEvent) => {
      if (!isDraggingToolbarRef.current) return;
      const newX = Math.max(10, Math.min(window.innerWidth - 320, moveEvt.clientX - toolbarDragOffsetRef.current.x));
      const newY = Math.max(10, Math.min(window.innerHeight - 80, moveEvt.clientY - toolbarDragOffsetRef.current.y));
      setToolbarPos({ x: newX, y: newY });
    };

    const handleMouseUp = () => {
      isDraggingToolbarRef.current = false;
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  };

  return (
    <>
      {/* ── High-DPI Drawing Canvas Layer (1920x1080 native 16:9) ──────────────── */}
      <canvas
        id="livestudio-draw-canvas"
        ref={canvasRef}
        width={1920}
        height={1080}
        onMouseDown={handlePointerDown}
        onMouseMove={handlePointerMove}
        onMouseUp={handlePointerUp}
        onMouseLeave={handlePointerUp}
        onTouchStart={handlePointerDown}
        onTouchMove={handlePointerMove}
        onTouchEnd={handlePointerUp}
        className={cn(
          "absolute inset-0 w-full h-full z-30 touch-none select-none transition-opacity duration-150",
          isDrawingVisible ? "opacity-100" : "opacity-0 pointer-events-none",
          isDrawingMode ? "pointer-events-auto cursor-crosshair" : "pointer-events-none"
        )}
      />

      {/* ── Inline Text Input Popup (when clicking on canvas with Text Tool) ────── */}
      {textInputPos && isDrawingMode && (
        <div
          className="fixed z-50 animate-in fade-in zoom-in-95"
          style={{ left: textInputPos.clientX, top: textInputPos.clientY }}
        >
          <div className="flex items-center gap-1.5 p-1.5 rounded-xl bg-black/95 border border-indigo-500/60 shadow-2xl backdrop-blur-xl">
            <input
              ref={textInputRef}
              type="text"
              value={textValue}
              onChange={(e) => setTextValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCommitText();
                if (e.key === "Escape") setTextInputPos(null);
              }}
              placeholder="Type on screen..."
              className="bg-transparent text-sm font-bold text-white px-2.5 py-1 focus:outline-none min-w-[180px]"
              style={{ color: drawingColor }}
              autoFocus
            />
            <button
              onClick={handleCommitText}
              className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-colors"
            >
              Add
            </button>
            <button
              onClick={() => setTextInputPos(null)}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* ── Floating Draggable Drawing Toolbar (appears when Draw button is active) ─ */}
      {isDrawingMode && (
        <div
          style={{ left: toolbarPos.x, top: toolbarPos.y }}
          onMouseDown={handleToolbarMouseDown}
          className="absolute z-40 flex items-center gap-2 p-1.5 sm:p-2 rounded-2xl bg-[#090912]/95 border border-white/15 backdrop-blur-2xl shadow-2xl animate-in fade-in slide-in-from-top-2 select-none"
        >
          {/* Drag Handle */}
          <div className="cursor-grab active:cursor-grabbing text-slate-500 hover:text-slate-300 p-0.5">
            <GripVertical className="w-4 h-4" />
          </div>

          {/* ── Tool Selectors ── */}
          <div className="flex items-center gap-1 border-r border-white/10 pr-2">
            {[
              { id: "pen" as DrawingTool, icon: Pencil, label: "Pencil" },
              { id: "highlighter" as DrawingTool, icon: Highlighter, label: "Highlighter" },
              { id: "arrow" as DrawingTool, icon: MoveRight, label: "Arrow" },
              { id: "rect" as DrawingTool, icon: Square, label: "Box" },
              { id: "circle" as DrawingTool, icon: Circle, label: "Circle" },
              { id: "text" as DrawingTool, icon: Type, label: "Text" },
              { id: "eraser" as DrawingTool, icon: Eraser, label: "Eraser" },
            ].map((tool) => {
              const isActive = drawingTool === tool.id;
              return (
                <button
                  key={tool.id}
                  onClick={() => setDrawingTool(tool.id)}
                  className={cn(
                    "p-1.5 sm:p-2 rounded-xl transition-all relative group",
                    isActive
                      ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
                      : "text-slate-400 hover:text-white hover:bg-white/10"
                  )}
                  title={tool.label}
                >
                  <tool.icon className="w-4 h-4" />
                  <span className="sr-only">{tool.label}</span>
                </button>
              );
            })}
          </div>

          {/* ── Color Palette ── */}
          <div className="flex items-center gap-1.5 border-r border-white/10 pr-2">
            {COLOR_PALETTE.map((c) => {
              const isSelected = drawingColor === c.hex;
              return (
                <button
                  key={c.hex}
                  onClick={() => setDrawingColor(c.hex)}
                  className={cn(
                    "w-5 h-5 rounded-full border border-white/20 transition-transform flex items-center justify-center shadow-sm",
                    isSelected ? "scale-125 ring-2 ring-white" : "hover:scale-110"
                  )}
                  style={{ backgroundColor: c.hex }}
                  title={c.name}
                >
                  {isSelected && <Check className="w-3 h-3 text-black font-black" />}
                </button>
              );
            })}
          </div>

          {/* ── Brush Thickness ── */}
          <div className="flex items-center gap-1 border-r border-white/10 pr-2">
            {STROKE_WIDTHS.map((w) => {
              const isSelected = drawingWidth === w.value;
              return (
                <button
                  key={w.value}
                  onClick={() => setDrawingWidth(w.value)}
                  className={cn(
                    "px-2 py-1 rounded-lg text-[10px] font-bold transition-colors",
                    isSelected
                      ? "bg-white/20 text-white border border-white/30"
                      : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
                  )}
                  title={`${w.label} Stroke`}
                >
                  {w.label}
                </button>
              );
            })}
          </div>

          {/* ── Action Buttons (Undo, Clear, Visibility, Close) ── */}
          <div className="flex items-center gap-1">
            <button
              onClick={handleUndo}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              title="Undo (Ctrl+Z)"
            >
              <Undo2 className="w-4 h-4" />
            </button>

            <button
              onClick={handleClearAll}
              className="p-1.5 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
              title="Clear All Drawings"
            >
              <Trash2 className="w-4 h-4" />
            </button>

            <button
              onClick={() => setIsDrawingVisible(!isDrawingVisible)}
              className={cn(
                "p-1.5 rounded-xl transition-colors",
                isDrawingVisible
                  ? "text-slate-400 hover:text-white hover:bg-white/10"
                  : "text-amber-400 bg-amber-500/15"
              )}
              title={isDrawingVisible ? "Hide Drawings from Stream" : "Show Drawings on Stream"}
            >
              {isDrawingVisible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            </button>

            <button
              onClick={() => setIsDrawingMode(false)}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors ml-1"
              title="Close Drawing Tools"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
};
