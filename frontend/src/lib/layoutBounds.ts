import { StudioLayout, ParticipantBounds, CustomLayoutConfig } from "@/stores/studio.store";

/**
 * Returns expected slot capacity for a layout preset
 */
export function getLayoutExpectedSlots(
  layout: StudioLayout | string,
  customConfig?: CustomLayoutConfig
): number {
  switch (layout) {
    case "solo":
    case "cinema":
    case "screen-full":
      return 1;
    case "side-by-side":
    case "fit":
    case "stacked":
    case "podcast":
    case "cropped":
    case "interview":
    case "pip":
    case "screen-speaker":
      return 2;
    case "speaker-large":
    case "presentation":
    case "three-equal":
      return 3;
    case "four-grid":
      return 4;
    case "five-grid":
      return 5;
    case "six-grid":
      return 6;
    case "nine-grid":
      return 9;
    case "custom": {
      const mode = customConfig?.mode || "hero-side";
      if (mode === "solo" || mode === "cinema") return 1;
      if (mode === "side-by-side" || mode === "stacked" || mode === "podcast" || mode === "pip") return 2;
      if (mode === "hero-side" || mode === "hero-bottom" || mode === "three-equal") return 3;
      if (mode === "six-grid") return 6;
      if (mode === "grid") return Math.min(8, (customConfig?.columns || 2) * 2);
      return 2;
    }
    default:
      return 2;
  }
}

/**
 * Computes responsive percentage bounds (x, y, width, height in %) for any participant
 * when ONLY participants are on stage (no active visual media).
 * Follows exact StreamYard layout logic for 1, 2, 3, 4+ speakers.
 */
export function getDefaultSlotBounds(
  layout: StudioLayout | string,
  index: number,
  total: number,
  splitRatio: number = 50,
  customConfig?: CustomLayoutConfig,
  isStageCropped: boolean = false
): ParticipantBounds {
  const safeSplit = Math.max(20, Math.min(80, splitRatio || 50));
  const effectiveTotal = Math.max(1, total);
  const fullBleed = isStageCropped || layout === "cropped" || layout === "podcast" || layout === "interview";

  switch (layout) {
    case "solo": {
      if (index === 0) {
        return { x: 0, y: 0, width: 100, height: 100, zIndex: 10, isLockedRatio: true };
      }
      return { x: 0, y: 0, width: 0, height: 0, zIndex: -1, isLockedRatio: true };
    }

    case "side-by-side":
    case "fit": {
      // In full-fill / cropped mode, side-by-side acts identically to cropped edge-to-edge
      if (fullBleed) {
        return getDefaultSlotBounds("cropped", index, total, splitRatio, customConfig, isStageCropped);
      }

      // StreamYard Fit Layout:
      // If only 1 speaker is on stage: centered 16:9 widescreen frame with canvas background visible!
      if (effectiveTotal <= 1) {
        const w = 78;
        const h = 76;
        return {
          x: (100 - w) / 2, // 11%
          y: (100 - h) / 2, // 12%
          width: w,
          height: h,
          zIndex: 10,
          isLockedRatio: true,
        };
      }

      // 2 speakers: side by side 16:9 boxes
      const col0W = Math.max(15, safeSplit - 3);
      const col1W = Math.max(15, 100 - safeSplit - 3);
      const h0 = Math.min(54, Math.max(26, col0W * 0.96));
      const h1 = Math.min(54, Math.max(26, col1W * 0.96));
      const y0 = Math.max(4, (100 - h0) / 2);
      const y1 = Math.max(4, (100 - h1) / 2);

      if (index === 0) {
        return {
          x: 2,
          y: y0,
          width: col0W,
          height: h0,
          zIndex: 10,
          isLockedRatio: true,
        };
      }
      if (index === 1) {
        return {
          x: Math.min(85, safeSplit + 1),
          y: y1,
          width: col1W,
          height: h1,
          zIndex: 10,
          isLockedRatio: true,
        };
      }

      // If 3+ on stage in side-by-side, wrap into grid
      const col = index % 2;
      const row = Math.floor(index / 2);
      const totalRows = Math.ceil(effectiveTotal / 2);
      const h = Math.max(24, (92 - (totalRows - 1) * 3) / totalRows);
      return {
        x: col === 0 ? 2 : Math.min(85, safeSplit + 1),
        y: 4 + row * (h + 3),
        width: col === 0 ? Math.max(15, safeSplit - 3) : Math.max(15, 100 - safeSplit - 3),
        height: h,
        zIndex: 10,
        isLockedRatio: true,
      };
    }

    case "stacked": {
      if (effectiveTotal <= 1) {
        return fullBleed
          ? { x: 0, y: 0, width: 100, height: 100, zIndex: 10, isLockedRatio: true }
          : { x: 4, y: 4, width: 92, height: 92, zIndex: 10, isLockedRatio: true };
      }
      if (fullBleed) {
        const topH = safeSplit;
        const botH = 100 - safeSplit;
        if (index === 0) {
          return { x: 0, y: 0, width: 100, height: topH, zIndex: 10, isLockedRatio: true };
        }
        if (index === 1) {
          return { x: 0, y: topH, width: 100, height: botH, zIndex: 10, isLockedRatio: true };
        }
        const totalRows = Math.min(4, Math.max(2, effectiveTotal));
        const h = 100 / totalRows;
        return {
          x: 0,
          y: index * h,
          width: 100,
          height: h,
          zIndex: 10,
          isLockedRatio: true,
        };
      }
      const topH = Math.max(15, safeSplit - 5);
      const botH = Math.max(15, 100 - safeSplit - 5);
      if (index === 0) {
        return {
          x: 4,
          y: 4,
          width: 92,
          height: topH,
          zIndex: 10,
          isLockedRatio: true,
        };
      }
      if (index === 1) {
        return {
          x: 4,
          y: Math.min(85, safeSplit + 1),
          width: 92,
          height: botH,
          zIndex: 10,
          isLockedRatio: true,
        };
      }
      const totalRows = Math.min(4, Math.max(2, effectiveTotal));
      const h = Math.max(20, (92 - (totalRows - 1) * 3) / totalRows);
      return {
        x: 4,
        y: 4 + index * (h + 3),
        width: 92,
        height: h,
        zIndex: 10,
        isLockedRatio: true,
      };
    }

    case "cinema":
    case "screen-full": {
      if (index === 0) {
        return { x: 0, y: 0, width: 100, height: 100, zIndex: 10, isLockedRatio: true };
      }
      return { x: 0, y: 0, width: 0, height: 0, zIndex: -1, isLockedRatio: true };
    }

    case "cropped":
    case "podcast":
    case "interview": {
      // StreamYard "Cropped layout": 100% full height bleed edge-to-edge
      if (effectiveTotal <= 1) {
        return {
          x: 0,
          y: 0,
          width: 100,
          height: 100,
          zIndex: 10,
          isLockedRatio: true,
        };
      }
      const col0W = safeSplit;
      const col1W = 100 - safeSplit;
      if (index === 0) {
        return {
          x: 0,
          y: 0,
          width: col0W,
          height: 100,
          zIndex: 10,
          isLockedRatio: true,
        };
      }
      if (index === 1) {
        return {
          x: safeSplit,
          y: 0,
          width: col1W,
          height: 100,
          zIndex: 10,
          isLockedRatio: true,
        };
      }
      const col = index % 2;
      const row = Math.floor(index / 2);
      const totalRows = Math.ceil(effectiveTotal / 2);
      const h = 100 / totalRows;
      return {
        x: col === 0 ? 0 : safeSplit,
        y: row * h,
        width: col === 0 ? col0W : col1W,
        height: h,
        zIndex: 10,
        isLockedRatio: true,
      };
    }

    case "speaker-large":
    case "screen-speaker": {
      if (effectiveTotal <= 1) {
        return { x: 0, y: 0, width: 100, height: 100, zIndex: 10, isLockedRatio: true };
      }
      const heroSplit = splitRatio ? Math.max(25, Math.min(85, splitRatio)) : 65;
      if (fullBleed) {
        if (index === 0) {
          return { x: 0, y: 0, width: heroSplit, height: 100, zIndex: 10, isLockedRatio: true };
        }
        const sideTotal = Math.max(1, effectiveTotal - 1);
        const sideH = 100 / sideTotal;
        const sideY = (index - 1) * sideH;
        return {
          x: heroSplit,
          y: sideY,
          width: 100 - heroSplit,
          height: sideH,
          zIndex: 10,
          isLockedRatio: true,
        };
      }
      if (index === 0) {
        return { x: 2, y: 4, width: Math.max(20, heroSplit - 3), height: 92, zIndex: 10, isLockedRatio: true };
      }
      const sideTotal = Math.max(1, effectiveTotal - 1);
      const sideHeight = Math.max(20, (92 - (sideTotal - 1) * 3) / sideTotal);
      const sideY = 4 + (index - 1) * (sideHeight + 3);
      const sideW = Math.max(15, 100 - heroSplit - 3);
      return {
        x: Math.min(85, heroSplit + 1),
        y: Math.min(76, sideY),
        width: sideW,
        height: Math.min(92, sideHeight),
        zIndex: 10,
        isLockedRatio: true,
      };
    }

    case "presentation": {
      if (effectiveTotal <= 1) {
        return { x: 0, y: 0, width: 100, height: 100, zIndex: 10, isLockedRatio: true };
      }
      const presSplit = splitRatio ? Math.max(25, Math.min(85, splitRatio)) : 68;
      if (index === 0) {
        return { x: 2, y: 2, width: 96, height: Math.max(20, presSplit - 3), zIndex: 10, isLockedRatio: true };
      }
      const bottomTotal = Math.max(1, effectiveTotal - 1);
      const botW = Math.max(15, Math.min(30, (96 - (bottomTotal - 1) * 2) / bottomTotal));
      const totalBotW = bottomTotal * botW + (bottomTotal - 1) * 2;
      const startX = Math.max(2, (100 - totalBotW) / 2);
      const botX = startX + (index - 1) * (botW + 2);
      const botH = Math.max(15, 100 - presSplit - 5);
      return {
        x: Math.min(100 - botW - 2, botX),
        y: Math.min(85, presSplit + 2),
        width: botW,
        height: botH,
        zIndex: 10,
        isLockedRatio: true,
      };
    }

    case "pip": {
      if (index === 0) {
        return { x: 2, y: 3, width: 96, height: 94, zIndex: 10, isLockedRatio: true };
      }
      if (index === 1) {
        return { x: 67, y: 62, width: 30, height: 32, zIndex: 25, isLockedRatio: true };
      }
      const stackY = Math.max(4, 62 - (index - 1) * 34);
      return { x: 67, y: stackY, width: 30, height: 32, zIndex: 25 + index, isLockedRatio: true };
    }

    case "three-equal": {
      if (effectiveTotal <= 1) {
        return fullBleed
          ? { x: 0, y: 0, width: 100, height: 100, zIndex: 10, isLockedRatio: true }
          : { x: 4, y: 4, width: 92, height: 92, zIndex: 10, isLockedRatio: true };
      }
      if (effectiveTotal === 2) {
        return getDefaultSlotBounds(fullBleed ? "cropped" : "side-by-side", index, 2, splitRatio, customConfig, isStageCropped);
      }
      // StreamYard 3-Column Equal Layout
      const isCustomSplit = splitRatio !== 50 && splitRatio !== 33 && splitRatio !== 65;
      if (fullBleed) {
        // 100% full height bleed edge-to-edge (0 to 100%)
        const col0W = isCustomSplit ? Math.max(20, Math.min(58, safeSplit)) : 33.33;
        const remainingW = 100 - col0W;
        const otherW = Number((remainingW / 2).toFixed(2));
        if (index === 0) {
          return { x: 0, y: 0, width: col0W, height: 100, zIndex: 10, isLockedRatio: true };
        }
        if (index === 1) {
          return { x: col0W, y: 0, width: otherW, height: 100, zIndex: 10, isLockedRatio: true };
        }
        if (index === 2) {
          return { x: col0W + otherW, y: 0, width: 100 - (col0W + otherW), height: 100, zIndex: 10, isLockedRatio: true };
        }
      } else {
        // Framed 3-column with clean 4% padding and 92% height (no huge black bars!)
        const col0W = isCustomSplit ? Math.max(20, Math.min(56, safeSplit - 3)) : 31;
        const remainingW = 96 - col0W - 4;
        const otherW = Number((remainingW / 2).toFixed(1));
        if (index === 0) {
          return { x: 2, y: 4, width: col0W, height: 92, zIndex: 10, isLockedRatio: true };
        }
        if (index === 1) {
          return { x: 2 + col0W + 2, y: 4, width: otherW, height: 92, zIndex: 10, isLockedRatio: true };
        }
        if (index === 2) {
          return { x: 2 + col0W + 2 + otherW + 2, y: 4, width: otherW, height: 92, zIndex: 10, isLockedRatio: true };
        }
      }
      // 4+ participants fallback to grid
      return getDefaultSlotBounds("six-grid", index, effectiveTotal, splitRatio, customConfig, isStageCropped);
    }

    case "four-grid": {
      if (effectiveTotal <= 1) {
        return fullBleed
          ? { x: 0, y: 0, width: 100, height: 100, zIndex: 10, isLockedRatio: true }
          : { x: 12, y: 12, width: 76, height: 76, zIndex: 10, isLockedRatio: true };
      }
      if (effectiveTotal === 2) {
        return getDefaultSlotBounds(fullBleed ? "cropped" : "side-by-side", index, 2, splitRatio, customConfig, isStageCropped);
      }
      if (fullBleed) {
        if (effectiveTotal === 3) {
          if (index === 0) return { x: 0, y: 0, width: 50, height: 50, zIndex: 10, isLockedRatio: true };
          if (index === 1) return { x: 50, y: 0, width: 50, height: 50, zIndex: 10, isLockedRatio: true };
          if (index === 2) return { x: 25, y: 50, width: 50, height: 50, zIndex: 10, isLockedRatio: true };
        }
        const cols = 2;
        const totalRows = Math.ceil(effectiveTotal / cols);
        const col = index % cols;
        const row = Math.floor(index / cols);
        const col0W = safeSplit;
        const col1W = 100 - safeSplit;
        const rowH = 100 / totalRows;
        return {
          x: col === 0 ? 0 : safeSplit,
          y: row * rowH,
          width: col === 0 ? col0W : col1W,
          height: rowH,
          zIndex: 10,
          isLockedRatio: true,
        };
      }
      if (effectiveTotal === 3) {
        // StreamYard classic 3-grid: 2 tiles on top, 1 centered on bottom
        if (index === 0) return { x: 2, y: 3, width: 47, height: 46, zIndex: 10, isLockedRatio: true };
        if (index === 1) return { x: 51, y: 3, width: 47, height: 46, zIndex: 10, isLockedRatio: true };
        if (index === 2) return { x: 26.5, y: 51, width: 47, height: 46, zIndex: 10, isLockedRatio: true };
      }
      const cols = 2;
      const totalRows = Math.ceil(effectiveTotal / cols);
      const col = index % cols;
      const row = Math.floor(index / cols);
      const col0W = Math.max(15, safeSplit - 3);
      const col1W = Math.max(15, 100 - safeSplit - 3);
      const rowH = Number(((94 - (totalRows - 1) * 2) / totalRows).toFixed(1));
      return {
        x: col === 0 ? 2 : Math.min(85, safeSplit + 1),
        y: 3 + row * (rowH + 2),
        width: col === 0 ? col0W : col1W,
        height: rowH,
        zIndex: 10,
        isLockedRatio: true,
      };
    }

    case "five-grid":
    case "six-grid": {
      if (effectiveTotal <= 1) {
        return fullBleed
          ? { x: 0, y: 0, width: 100, height: 100, zIndex: 10, isLockedRatio: true }
          : { x: 12, y: 12, width: 76, height: 76, zIndex: 10, isLockedRatio: true };
      }
      if (effectiveTotal === 2) {
        return getDefaultSlotBounds(fullBleed ? "cropped" : "side-by-side", index, 2, splitRatio, customConfig, isStageCropped);
      }
      if (effectiveTotal === 3) {
        return getDefaultSlotBounds("three-equal", index, 3, splitRatio, customConfig, isStageCropped);
      }
      if (effectiveTotal === 4) {
        return getDefaultSlotBounds("four-grid", index, 4, splitRatio, customConfig, isStageCropped);
      }
      if (fullBleed) {
        if (effectiveTotal === 5) {
          if (index < 3) {
            return { x: index * 33.33, y: 0, width: 33.34, height: 50, zIndex: 10, isLockedRatio: true };
          }
          const botIndex = index - 3;
          return { x: 16.66 + botIndex * 33.33, y: 50, width: 33.34, height: 50, zIndex: 10, isLockedRatio: true };
        }
        const cols = 3;
        const totalRows = Math.ceil(effectiveTotal / cols);
        const col = index % cols;
        const row = Math.floor(index / cols);
        const colW = 100 / cols;
        const rowH = 100 / totalRows;
        return {
          x: col * colW,
          y: row * rowH,
          width: colW,
          height: rowH,
          zIndex: 10,
          isLockedRatio: true,
        };
      }
      if (effectiveTotal === 5) {
        // StreamYard 5-seat: 3 on top row, 2 centered on bottom row
        if (index < 3) {
          return { x: 2 + index * 32.5, y: 3, width: 31, height: 46, zIndex: 10, isLockedRatio: true };
        }
        const botIndex = index - 3;
        const startX = (100 - (2 * 31 + 2)) / 2; // 18%
        return { x: startX + botIndex * 33, y: 51, width: 31, height: 46, zIndex: 10, isLockedRatio: true };
      }
      // Dynamic rows for 6, 7, 8+ participants (prevents row 2 overlap bug)
      const cols = 3;
      const totalRows = Math.ceil(effectiveTotal / cols);
      const col = index % cols;
      const row = Math.floor(index / cols);
      const rowH = Number(((94 - (totalRows - 1) * 2) / totalRows).toFixed(1));
      return {
        x: 2 + col * 32.5,
        y: 3 + row * (rowH + 2),
        width: 31,
        height: rowH,
        zIndex: 10,
        isLockedRatio: true,
      };
    }

    case "nine-grid": {
      const cols = effectiveTotal <= 4 ? 2 : 3;
      const totalRows = Math.max(1, Math.ceil(effectiveTotal / cols));
      const col = index % cols;
      const row = Math.floor(index / cols);
      if (fullBleed) {
        const w = 100 / cols;
        const h = 100 / totalRows;
        return {
          x: col * w,
          y: row * h,
          width: w,
          height: h,
          zIndex: 10,
          isLockedRatio: true,
        };
      }
      const w = Number(((96 - (cols - 1) * 2) / cols).toFixed(1));
      const h = Number(((94 - (totalRows - 1) * 2) / totalRows).toFixed(1));
      return {
        x: 2 + col * (w + 2),
        y: 3 + row * (h + 2),
        width: w,
        height: h,
        zIndex: 10,
        isLockedRatio: true,
      };
    }

    case "custom": {
      const mode = customConfig?.mode || "hero-side";
      if (mode === "solo") return getDefaultSlotBounds("solo", index, total, splitRatio, customConfig, isStageCropped);
      if (mode === "side-by-side") return getDefaultSlotBounds("side-by-side", index, total, splitRatio, customConfig, isStageCropped);
      if (mode === "stacked") return getDefaultSlotBounds("stacked", index, total, splitRatio, customConfig, isStageCropped);
      if (mode === "three-equal") return getDefaultSlotBounds("three-equal", index, total, splitRatio, customConfig, isStageCropped);
      if (mode === "six-grid") return getDefaultSlotBounds("six-grid", index, total, splitRatio, customConfig, isStageCropped);
      if (mode === "podcast") return getDefaultSlotBounds("podcast", index, total, splitRatio, customConfig, isStageCropped);
      if (mode === "hero-side") return getDefaultSlotBounds("speaker-large", index, total, splitRatio, customConfig, isStageCropped);
      if (mode === "hero-bottom") return getDefaultSlotBounds("presentation", index, total, splitRatio, customConfig, isStageCropped);
      if (mode === "grid") {
        const cols = customConfig?.columns || 2;
        const rows = Math.max(1, Math.ceil(effectiveTotal / cols));
        const col = index % cols;
        const row = Math.floor(index / cols);
        const w = (96 - (cols - 1) * 2) / cols;
        const h = (96 - (rows - 1) * 2) / rows;
        return {
          x: 2 + col * (w + 2),
          y: 2 + row * (h + 2),
          width: Number(w.toFixed(1)),
          height: Number(h.toFixed(1)),
          zIndex: 10,
          isLockedRatio: true,
        };
      }
      if (mode === "pip") {
        if (index === 0) return { x: 2, y: 3, width: 96, height: 94, zIndex: 10, isLockedRatio: true };
        const sizeMap = {
          small: { w: 22, h: 24 },
          medium: { w: 28, h: 30 },
          large: { w: 36, h: 38 },
        };
        const pipSz = sizeMap[customConfig?.pipSize || "medium"];
        const pipPos = customConfig?.pipPosition || "bottom-right";
        let x = 68;
        let y = 62;
        if (pipPos === "top-left") {
          x = 4;
          y = 4;
        } else if (pipPos === "top-right") {
          x = 100 - pipSz.w - 4;
          y = 4;
        } else if (pipPos === "bottom-left") {
          x = 4;
          y = 100 - pipSz.h - 4;
        } else {
          x = 100 - pipSz.w - 4;
          y = 100 - pipSz.h - 4;
        }
        return {
          x,
          y,
          width: pipSz.w,
          height: pipSz.h,
          zIndex: 25 + index,
          isLockedRatio: true,
        };
      }
      if (mode === "cinema") {
        return { x: 2, y: 19, width: 96, height: 62, zIndex: 10, isLockedRatio: true };
      }
      return { x: 2, y: 3, width: 96, height: 94, zIndex: 10, isLockedRatio: true };
    }

    default: {
      const cols = effectiveTotal <= 2 ? effectiveTotal : effectiveTotal <= 4 ? 2 : 3;
      const rows = Math.ceil(effectiveTotal / cols);
      const col = index % cols;
      const row = Math.floor(index / cols);
      const w = (96 - (cols - 1) * 2) / cols;
      const h = (96 - (rows - 1) * 2) / rows;
      return {
        x: 2 + col * (w + 2),
        y: 2 + row * (h + 2),
        width: Number(w.toFixed(1)),
        height: Number(h.toFixed(1)),
        zIndex: 10,
        isLockedRatio: true,
      };
    }
  }
}

/**
 * Unified Stage Layout Result containing calculated bounds for both
 * active visual media (video/slides/image) and all on-stage participants.
 */
export interface StageLayoutResult {
  mediaBounds: ParticipantBounds | null;
  participantBounds: ParticipantBounds[];
}

/**
 * Computes responsive bounds for stage elements based on the active layout preset.
 * Properly honors active layout whether visual media is present or not (StreamYard standard).
 */
export function calculateStageLayout(
  layout: StudioLayout | string,
  totalParticipants: number,
  hasVisualMedia: boolean,
  splitRatio: number = 50,
  customConfig?: CustomLayoutConfig,
  enforceReactionPiP: boolean = false,
  mediaSlotIndex: number = 0,
  isStageCropped: boolean = false
): StageLayoutResult {
  // If NO active visual media on stage, compute participant bounds directly
  if (!hasVisualMedia) {
    const participantBounds: ParticipantBounds[] = [];
    for (let i = 0; i < totalParticipants; i++) {
      participantBounds.push(
        getDefaultSlotBounds(layout, i, totalParticipants, splitRatio, customConfig, isStageCropped)
      );
    }
    return { mediaBounds: null, participantBounds };
  }

  // Special Case: 2-Window (Cropped / Fit / Podcast / Interview / Side-by-Side) where Media is on one side and Speakers stack on the other side
  if (
    (layout === "cropped" || layout === "podcast" || layout === "interview" || layout === "side-by-side" || layout === "fit") &&
    totalParticipants >= 1
  ) {
    const safeSplit = Math.max(20, Math.min(80, splitRatio || 50));
    const isMediaOnRight = mediaSlotIndex >= 1; // 0 = Left Side, 1 = Right Side!
    const isCropped = isStageCropped || layout === "cropped" || layout === "podcast" || layout === "interview";

    if (isCropped) {
      const leftW = safeSplit;
      const rightW = 100 - safeSplit;
      const mediaBounds: ParticipantBounds = isMediaOnRight
        ? { x: safeSplit, y: 0, width: rightW, height: 100, zIndex: 10, isLockedRatio: true }
        : { x: 0, y: 0, width: leftW, height: 100, zIndex: 10, isLockedRatio: true };

      const pX = isMediaOnRight ? 0 : safeSplit;
      const pW = isMediaOnRight ? leftW : rightW;
      const pH = 100 / totalParticipants;
      const participantBounds: ParticipantBounds[] = [];
      for (let i = 0; i < totalParticipants; i++) {
        participantBounds.push({
          x: pX,
          y: i * pH,
          width: pW,
          height: pH,
          zIndex: 10,
          isLockedRatio: true,
        });
      }
      return { mediaBounds, participantBounds };
    } else {
      // Fit / Side-by-Side (16:9 boxes)
      const leftW = Math.max(15, safeSplit - 3);
      const rightW = Math.max(15, 100 - safeSplit - 3);
      const mW = isMediaOnRight ? rightW : leftW;
      const mX = isMediaOnRight ? Math.min(85, safeSplit + 1) : 2;
      const mH = Math.min(54, Math.max(26, mW * 0.96));
      const mediaBounds: ParticipantBounds = {
        x: mX,
        y: Math.max(4, (100 - mH) / 2),
        width: mW,
        height: mH,
        zIndex: 10,
        isLockedRatio: true,
      };

      const pX = isMediaOnRight ? 2 : Math.min(85, safeSplit + 1);
      const pW = isMediaOnRight ? leftW : rightW;
      const participantBounds: ParticipantBounds[] = [];
      if (totalParticipants === 1) {
        const pH = Math.min(54, Math.max(26, pW * 0.96));
        participantBounds.push({
          x: pX,
          y: Math.max(4, (100 - pH) / 2),
          width: pW,
          height: pH,
          zIndex: 10,
          isLockedRatio: true,
        });
      } else {
        const pH = Math.max(20, (92 - (totalParticipants - 1) * 3) / totalParticipants);
        for (let i = 0; i < totalParticipants; i++) {
          participantBounds.push({
            x: pX,
            y: 4 + i * (pH + 3),
            width: pW,
            height: pH,
            zIndex: 10,
            isLockedRatio: true,
          });
        }
      }
      return { mediaBounds, participantBounds };
    }
  }

  // Multi-Slot Layouts (three-equal, four-grid, five-grid, six-grid, nine-grid, speaker-large, screen-speaker, presentation, stacked):
  // Calculate all (totalParticipants + 1) slot rectangles, and assign `mediaSlotIndex` to Media!
  if (
    ["three-equal", "four-grid", "five-grid", "six-grid", "nine-grid", "speaker-large", "screen-speaker", "presentation", "stacked"].includes(layout) &&
    totalParticipants >= 1
  ) {
    const totalSlots = totalParticipants + 1;
    const targetMediaSlot = Math.max(0, Math.min(totalSlots - 1, mediaSlotIndex || 0));

    const allSlotBounds: ParticipantBounds[] = [];
    for (let s = 0; s < totalSlots; s++) {
      allSlotBounds.push(getDefaultSlotBounds(layout, s, totalSlots, splitRatio, customConfig, isStageCropped));
    }

    const mediaBounds = allSlotBounds[targetMediaSlot];
    const participantBounds = allSlotBounds.filter((_, idx) => idx !== targetMediaSlot);
    return { mediaBounds, participantBounds };
  }

  // --- Fallback / Solo / Cinema / PiP / 0-participant Stage Layouts ---
  const safeSplit = Math.max(25, Math.min(75, splitRatio || 50));
  const participantBounds: ParticipantBounds[] = [];

  switch (layout) {
    case "solo": {
      // YouTube Fair-Use Reaction Lock: Keep Host/Guest visible in corner PiP even on solo/cinema media layouts
      if (enforceReactionPiP && totalParticipants > 0) {
        for (let i = 0; i < totalParticipants; i++) {
          participantBounds.push({
            x: 72,
            y: Math.max(6, 66 - i * 28),
            width: 25,
            height: 26,
            zIndex: 30 + i,
            isLockedRatio: true,
          });
        }
        return {
          mediaBounds: { x: 2, y: 3, width: 96, height: 94, zIndex: 10, isLockedRatio: true },
          participantBounds,
        };
      }

      // StreamYard: In Solo mode with media, media is 100% full screen
      const mediaBounds: ParticipantBounds = {
        x: 0,
        y: 0,
        width: 100,
        height: 100,
        zIndex: 10,
        isLockedRatio: true,
      };
      for (let i = 0; i < totalParticipants; i++) {
        participantBounds.push({
          x: 0,
          y: 0,
          width: 0,
          height: 0,
          zIndex: -1,
          isLockedRatio: true,
        });
      }
      return { mediaBounds, participantBounds };
    }

    case "cinema":
    case "screen-full": {
      // YouTube Fair-Use Reaction Lock: Keep Host/Guest visible in corner PiP even on full-screen media layouts
      if (enforceReactionPiP && totalParticipants > 0) {
        for (let i = 0; i < totalParticipants; i++) {
          participantBounds.push({
            x: 72,
            y: Math.max(6, 66 - i * 28),
            width: 25,
            height: 26,
            zIndex: 30 + i,
            isLockedRatio: true,
          });
        }
        return {
          mediaBounds: { x: 2, y: 3, width: 96, height: 94, zIndex: 10, isLockedRatio: true },
          participantBounds,
        };
      }

      // 100% Cinema / Fullscreen media presentation
      const mediaBounds: ParticipantBounds = {
        x: 0,
        y: 0,
        width: 100,
        height: 100,
        zIndex: 10,
        isLockedRatio: true,
      };
      for (let i = 0; i < totalParticipants; i++) {
        participantBounds.push({
          x: 0,
          y: 0,
          width: 0,
          height: 0,
          zIndex: -1,
          isLockedRatio: true,
        });
      }
      return { mediaBounds, participantBounds };
    }

    case "side-by-side":
    case "fit": {
      if (totalParticipants === 0) {
        const mediaBounds: ParticipantBounds = {
          x: 2,
          y: 3,
          width: 96,
          height: 94,
          zIndex: 10,
          isLockedRatio: true,
        };
        return { mediaBounds, participantBounds };
      }

      // StreamYard Fit Layout with Media: 16:9 media on left, 16:9 participant on right!
      const col0W = Math.max(15, safeSplit - 3);
      const col1W = Math.max(15, 100 - safeSplit - 3);
      const h0 = Math.min(54, Math.max(26, col0W * 0.96));
      const h1 = Math.min(54, Math.max(26, col1W * 0.96));
      const y0 = Math.max(4, (100 - h0) / 2);
      const y1 = Math.max(4, (100 - h1) / 2);

      const mediaBounds: ParticipantBounds = {
        x: 2,
        y: y0,
        width: col0W,
        height: h0,
        zIndex: 10,
        isLockedRatio: true,
      };

      if (totalParticipants <= 1) {
        participantBounds.push({
          x: Math.min(85, safeSplit + 1),
          y: y1,
          width: col1W,
          height: h1,
          zIndex: 10,
          isLockedRatio: true,
        });
      } else {
        const h = Math.max(20, (92 - (totalParticipants - 1) * 3) / totalParticipants);
        for (let i = 0; i < totalParticipants; i++) {
          participantBounds.push({
            x: Math.min(85, safeSplit + 1),
            y: 4 + i * (h + 3),
            width: col1W,
            height: h,
            zIndex: 10,
            isLockedRatio: true,
          });
        }
      }
      return { mediaBounds, participantBounds };
    }

    case "cropped":
    case "podcast":
    case "interview": {
      if (totalParticipants === 0) {
        const mediaBounds: ParticipantBounds = {
          x: 0,
          y: 0,
          width: 100,
          height: 100,
          zIndex: 10,
          isLockedRatio: true,
        };
        return { mediaBounds, participantBounds };
      }

      // Full-bleed edge-to-edge side-by-side: Media on left, speaker(s) on right
      const col0W = safeSplit;
      const col1W = 100 - safeSplit;

      const mediaBounds: ParticipantBounds = {
        x: 0,
        y: 0,
        width: col0W,
        height: 100,
        zIndex: 10,
        isLockedRatio: true,
      };

      if (totalParticipants <= 1) {
        participantBounds.push({
          x: safeSplit,
          y: 0,
          width: col1W,
          height: 100,
          zIndex: 10,
          isLockedRatio: true,
        });
      } else {
        const h = 100 / totalParticipants;
        for (let i = 0; i < totalParticipants; i++) {
          participantBounds.push({
            x: safeSplit,
            y: i * h,
            width: col1W,
            height: h,
            zIndex: 10,
            isLockedRatio: true,
          });
        }
      }
      return { mediaBounds, participantBounds };
    }

    case "presentation": {
      if (totalParticipants === 0) {
        const mediaBounds: ParticipantBounds = {
          x: 2,
          y: 2,
          width: 96,
          height: 96,
          zIndex: 10,
          isLockedRatio: true,
        };
        return { mediaBounds, participantBounds };
      }

      // Presentation Deck: Slide/Media takes upper center stage (~70%), speakers along bottom
      const presSplit = splitRatio ? Math.max(30, Math.min(80, splitRatio)) : 68;
      const mediaBounds: ParticipantBounds = {
        x: 2,
        y: 2,
        width: 96,
        height: Math.max(25, presSplit - 3),
        zIndex: 10,
        isLockedRatio: true,
      };

      const botH = Math.max(15, 100 - presSplit - 5);
      const bottomTotal = Math.max(1, totalParticipants);
      const botW = Math.max(15, Math.min(32, (96 - (bottomTotal - 1) * 2) / bottomTotal));
      const totalRowW = bottomTotal * botW + (bottomTotal - 1) * 2;
      const startX = Math.max(2, (100 - totalRowW) / 2);

      for (let i = 0; i < totalParticipants; i++) {
        const xPos = startX + i * (botW + 2);
        participantBounds.push({
          x: xPos,
          y: Math.min(85, presSplit + 2),
          width: botW,
          height: botH,
          zIndex: 10,
          isLockedRatio: true,
        });
      }
      return { mediaBounds, participantBounds };
    }

    case "pip": {
      // StreamYard Picture-in-Picture: Media fills full canvas background, speaker floats in corner!
      const mediaBounds: ParticipantBounds = {
        x: 2,
        y: 3,
        width: 96,
        height: 94,
        zIndex: 10,
        isLockedRatio: true,
      };

      for (let i = 0; i < totalParticipants; i++) {
        if (i === 0) {
          participantBounds.push({
            x: 68,
            y: 62,
            width: 29,
            height: 32,
            zIndex: 25,
            isLockedRatio: true,
          });
        } else {
          const stackY = Math.max(4, 62 - i * 34);
          participantBounds.push({
            x: 68,
            y: stackY,
            width: 29,
            height: 32,
            zIndex: 25 + i,
            isLockedRatio: true,
          });
        }
      }
      return { mediaBounds, participantBounds };
    }

    case "stacked": {
      if (totalParticipants === 0) {
        const mediaBounds: ParticipantBounds = {
          x: 4,
          y: 4,
          width: 92,
          height: 92,
          zIndex: 10,
          isLockedRatio: true,
        };
        return { mediaBounds, participantBounds };
      }

      // Media on top, speakers on bottom
      const topH = Math.max(15, safeSplit - 5);
      const botH = Math.max(15, 100 - safeSplit - 5);

      const mediaBounds: ParticipantBounds = {
        x: 4,
        y: 4,
        width: 92,
        height: topH,
        zIndex: 10,
        isLockedRatio: true,
      };

      const botW = Math.max(15, (92 - Math.max(0, totalParticipants - 1) * 2) / Math.max(1, totalParticipants));
      for (let i = 0; i < totalParticipants; i++) {
        participantBounds.push({
          x: 4 + i * (botW + 2),
          y: Math.min(85, safeSplit + 1),
          width: botW,
          height: botH,
          zIndex: 10,
          isLockedRatio: true,
        });
      }
      return { mediaBounds, participantBounds };
    }

    case "four-grid": {
      if (totalParticipants === 0) {
        const mediaBounds: ParticipantBounds = {
          x: 12,
          y: 12,
          width: 76,
          height: 76,
          zIndex: 10,
          isLockedRatio: true,
        };
        return { mediaBounds, participantBounds };
      }

      if (totalParticipants === 1) {
        // StreamYard 2-item side-by-side: Media on left, participant on right
        const col0W = Math.max(15, safeSplit - 3);
        const col1W = Math.max(15, 100 - safeSplit - 3);
        const mediaBounds: ParticipantBounds = {
          x: 2,
          y: 4,
          width: col0W,
          height: 92,
          zIndex: 10,
          isLockedRatio: true,
        };
        participantBounds.push({
          x: Math.min(85, safeSplit + 1),
          y: 4,
          width: col1W,
          height: 92,
          zIndex: 10,
          isLockedRatio: true,
        });
        return { mediaBounds, participantBounds };
      }

      if (totalParticipants === 2) {
        // 3 items total (1 media + 2 participants): 2 on top, 1 centered on bottom (StreamYard Triad)
        const mediaBounds: ParticipantBounds = {
          x: 2,
          y: 3,
          width: 47,
          height: 46,
          zIndex: 10,
          isLockedRatio: true,
        };
        participantBounds.push({
          x: 51,
          y: 3,
          width: 47,
          height: 46,
          zIndex: 10,
          isLockedRatio: true,
        });
        participantBounds.push({
          x: 26.5,
          y: 51,
          width: 47,
          height: 46,
          zIndex: 10,
          isLockedRatio: true,
        });
        return { mediaBounds, participantBounds };
      }

      // 4+ items: dynamic grid rows (Media takes tile 0, participants take remaining tiles)
      const cols = 2;
      const totalItems = totalParticipants + 1;
      const totalRows = Math.ceil(totalItems / cols);
      const col0W = Math.max(15, safeSplit - 3);
      const col1W = Math.max(15, 100 - safeSplit - 3);
      const rowH = Number(((94 - (totalRows - 1) * 2) / totalRows).toFixed(1));

      const mediaBounds: ParticipantBounds = {
        x: 2,
        y: 3,
        width: col0W,
        height: rowH,
        zIndex: 10,
        isLockedRatio: true,
      };

      for (let i = 0; i < totalParticipants; i++) {
        const slot = i + 1;
        const col = slot % cols;
        const row = Math.floor(slot / cols);
        participantBounds.push({
          x: col === 0 ? 2 : Math.min(85, safeSplit + 1),
          y: 3 + row * (rowH + 2),
          width: col === 0 ? col0W : col1W,
          height: rowH,
          zIndex: 10,
          isLockedRatio: true,
        });
      }
      return { mediaBounds, participantBounds };
    }

    case "three-equal": {
      if (totalParticipants === 0) {
        const mediaBounds: ParticipantBounds = {
          x: 12,
          y: 12,
          width: 76,
          height: 76,
          zIndex: 10,
          isLockedRatio: true,
        };
        return { mediaBounds, participantBounds };
      }

      if (totalParticipants === 1) {
        // StreamYard: 2 items on stage (1 media + 1 participant) -> 2 equal tall columns (50% / 50%)
        const col0W = Math.max(20, safeSplit - 3);
        const col1W = Math.max(20, 100 - safeSplit - 3);
        const mediaBounds: ParticipantBounds = {
          x: 2,
          y: 4,
          width: col0W,
          height: 92,
          zIndex: 10,
          isLockedRatio: true,
        };
        participantBounds.push({
          x: Math.min(85, safeSplit + 1),
          y: 4,
          width: col1W,
          height: 92,
          zIndex: 10,
          isLockedRatio: true,
        });
        return { mediaBounds, participantBounds };
      }

      if (totalParticipants === 2) {
        // 3 items total (1 media + 2 participants) -> 3 equal tall columns
        const col0W = Math.max(15, Math.min(65, safeSplit - 3));
        const remainingW = 96 - col0W - 4;
        const otherW = Number((remainingW / 2).toFixed(1));

        const mediaBounds: ParticipantBounds = {
          x: 2,
          y: 4,
          width: col0W,
          height: 92,
          zIndex: 10,
          isLockedRatio: true,
        };
        participantBounds.push({
          x: 2 + col0W + 2,
          y: 4,
          width: otherW,
          height: 92,
          zIndex: 10,
          isLockedRatio: true,
        });
        participantBounds.push({
          x: 2 + col0W + 2 + otherW + 2,
          y: 4,
          width: otherW,
          height: 92,
          zIndex: 10,
          isLockedRatio: true,
        });
        return { mediaBounds, participantBounds };
      }

      // 4+ items: Media takes left column, participants stack in right columns
      const col0W = Math.max(15, Math.min(65, safeSplit - 3));
      const remainingW = 96 - col0W - 4;
      const otherW = Number((remainingW / 2).toFixed(1));

      const mediaBounds: ParticipantBounds = {
        x: 2,
        y: 4,
        width: col0W,
        height: 92,
        zIndex: 10,
        isLockedRatio: true,
      };

      for (let i = 0; i < totalParticipants; i++) {
        const colIdx = i % 2;
        const rowIdx = Math.floor(i / 2);
        const rows = Math.ceil(totalParticipants / 2);
        const rowH = Math.max(20, (92 - (rows - 1) * 2) / rows);
        participantBounds.push({
          x: 2 + col0W + 2 + colIdx * (otherW + 2),
          y: 4 + rowIdx * (rowH + 2),
          width: otherW,
          height: rowH,
          zIndex: 10,
          isLockedRatio: true,
        });
      }
      return { mediaBounds, participantBounds };
    }

    case "five-grid":
    case "six-grid": {
      if (totalParticipants === 0) {
        const mediaBounds: ParticipantBounds = {
          x: 12,
          y: 12,
          width: 76,
          height: 76,
          zIndex: 10,
          isLockedRatio: true,
        };
        return { mediaBounds, participantBounds };
      }

      if (totalParticipants === 1) {
        // 2 items total (1 media + 1 participant) -> 2 equal columns side-by-side
        return calculateStageLayout("three-equal", 1, true, safeSplit, customConfig);
      }

      if (totalParticipants === 2) {
        // 3 items total (1 media + 2 participants) -> 2 top, 1 centered bottom
        return calculateStageLayout("four-grid", 2, true, safeSplit, customConfig);
      }

      if (totalParticipants === 3) {
        // 4 items total (1 media + 3 participants) -> 2x2 grid
        return calculateStageLayout("four-grid", 3, true, safeSplit, customConfig);
      }

      if (totalParticipants === 4) {
        // 5 items total (1 media + 4 participants) -> 3 top, 2 centered bottom
        const mediaBounds: ParticipantBounds = {
          x: 2,
          y: 3,
          width: 31,
          height: 46,
          zIndex: 10,
          isLockedRatio: true,
        };
        participantBounds.push({
          x: 34.5,
          y: 3,
          width: 31,
          height: 46,
          zIndex: 10,
          isLockedRatio: true,
        });
        participantBounds.push({
          x: 67,
          y: 3,
          width: 31,
          height: 46,
          zIndex: 10,
          isLockedRatio: true,
        });
        const startX = (100 - (2 * 31 + 2)) / 2; // 18%
        participantBounds.push({
          x: startX,
          y: 51,
          width: 31,
          height: 46,
          zIndex: 10,
          isLockedRatio: true,
        });
        participantBounds.push({
          x: startX + 33,
          y: 51,
          width: 31,
          height: 46,
          zIndex: 10,
          isLockedRatio: true,
        });
        return { mediaBounds, participantBounds };
      }

      // 6+ items (1 media + 5+ participants): 3-column dynamic rows grid
      const cols = 3;
      const totalItems = totalParticipants + 1;
      const totalRows = Math.ceil(totalItems / cols);
      const rowH = Number(((94 - (totalRows - 1) * 2) / totalRows).toFixed(1));

      const mediaBounds: ParticipantBounds = {
        x: 2,
        y: 3,
        width: 31,
        height: rowH,
        zIndex: 10,
        isLockedRatio: true,
      };

      for (let i = 0; i < totalParticipants; i++) {
        const slot = i + 1;
        const col = slot % cols;
        const row = Math.floor(slot / cols);
        participantBounds.push({
          x: 2 + col * 32.5,
          y: 3 + row * (rowH + 2),
          width: 31,
          height: rowH,
          zIndex: 10,
          isLockedRatio: true,
        });
      }
      return { mediaBounds, participantBounds };
    }

    case "nine-grid": {
      const cols = 3;
      const totalItems = totalParticipants + 1;
      const totalRows = Math.max(1, Math.ceil(totalItems / cols));
      const w = Number(((96 - (cols - 1) * 2) / cols).toFixed(1));
      const h = Number(((94 - (totalRows - 1) * 2) / totalRows).toFixed(1));
      const mediaBounds: ParticipantBounds = {
        x: 2,
        y: 3,
        width: w,
        height: h,
        zIndex: 10,
        isLockedRatio: true,
      };
      for (let i = 0; i < totalParticipants; i++) {
        const slot = i + 1;
        const col = slot % cols;
        const row = Math.floor(slot / cols);
        participantBounds.push({
          x: 2 + col * (w + 2),
          y: 3 + row * (h + 2),
          width: w,
          height: h,
          zIndex: 10,
          isLockedRatio: true,
        });
      }
      return { mediaBounds, participantBounds };
    }

    case "speaker-large":
    case "screen-speaker":
    default: {
      if (totalParticipants === 0) {
        const mediaBounds: ParticipantBounds = {
          x: 2,
          y: 3,
          width: 96,
          height: 94,
          zIndex: 10,
          isLockedRatio: true,
        };
        return { mediaBounds, participantBounds };
      }

      // News / Spotlight screen share: Media dominant on left (~68%), participants stacked on right (~26%)
      const heroSplit = splitRatio ? Math.max(25, Math.min(85, splitRatio)) : 68;
      const mediaBounds: ParticipantBounds = {
        x: 2,
        y: 4,
        width: Math.max(20, heroSplit - 3),
        height: 92,
        zIndex: 10,
        isLockedRatio: true,
      };

      const sideTotal = Math.max(1, totalParticipants);
      const sideH = Math.max(20, (92 - (sideTotal - 1) * 3) / sideTotal);
      const sideW = Math.max(15, 100 - heroSplit - 3);

      for (let i = 0; i < totalParticipants; i++) {
        const yPos = totalParticipants === 1
          ? Math.max(4, (100 - sideH) / 2)
          : Math.min(76, 4 + i * (sideH + 3));
        participantBounds.push({
          x: Math.min(85, heroSplit + 1),
          y: yPos,
          width: sideW,
          height: Math.min(92, sideH),
          zIndex: 10,
          isLockedRatio: true,
        });
      }
      return { mediaBounds, participantBounds };
    }
  }
}
