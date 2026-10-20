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
      if (mode === "side-by-side" || mode === "fit" || mode === "cropped" || mode === "stacked" || mode === "podcast" || mode === "pip") return 2;
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
 * Helper to resolve a custom composition mode to its canonical StudioLayout
 */
export function resolveEffectiveLayout(
  layout: StudioLayout | string,
  customConfig?: CustomLayoutConfig
): StudioLayout | string {
  if (layout !== "custom") return layout;
  const mode = customConfig?.mode || "hero-side";
  switch (mode) {
    case "solo":
      return "solo";
    case "cinema":
      return "cinema";
    case "side-by-side":
    case "fit":
      return "side-by-side";
    case "cropped":
    case "podcast":
      return "cropped";
    case "stacked":
      return "stacked";
    case "three-equal":
      return "three-equal";
    case "six-grid":
      return "six-grid";
    case "hero-side":
      return "speaker-large";
    case "hero-bottom":
      return "presentation";
    case "pip":
      return "pip";
    case "grid":
      return (customConfig?.columns || 2) >= 3 ? "six-grid" : "four-grid";
    default:
      return "speaker-large";
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
        if (index === 1 && effectiveTotal === 2) {
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
      if (index === 1 && effectiveTotal === 2) {
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
      if (index === 0 && effectiveTotal === 2) {
        return {
          x: 0,
          y: 0,
          width: col0W,
          height: 100,
          zIndex: 10,
          isLockedRatio: true,
        };
      }
      if (index === 1 && effectiveTotal === 2) {
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
      const isLastSingleItem = row === totalRows - 1 && effectiveTotal % 2 === 1;
      return {
        x: isLastSingleItem ? 0 : col === 0 ? 0 : safeSplit,
        y: row * h,
        width: isLastSingleItem ? 100 : col === 0 ? col0W : col1W,
        height: h,
        zIndex: 10,
        isLockedRatio: true,
      };
    }

    case "speaker-large":
    case "screen-speaker": {
      if (effectiveTotal <= 1) {
        return fullBleed
          ? { x: 0, y: 0, width: 100, height: 100, zIndex: 10, isLockedRatio: true }
          : { x: 2, y: 4, width: 96, height: 92, zIndex: 10, isLockedRatio: true };
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
        return fullBleed
          ? { x: 0, y: 0, width: 100, height: 100, zIndex: 10, isLockedRatio: true }
          : { x: 2, y: 2, width: 96, height: 96, zIndex: 10, isLockedRatio: true };
      }
      const presSplit = splitRatio ? Math.max(25, Math.min(85, splitRatio)) : 68;
      if (fullBleed) {
        if (index === 0) {
          return { x: 0, y: 0, width: 100, height: presSplit, zIndex: 10, isLockedRatio: true };
        }
        const bottomTotal = Math.max(1, effectiveTotal - 1);
        const botW = 100 / bottomTotal;
        const botX = (index - 1) * botW;
        const botH = 100 - presSplit;
        return {
          x: Number(botX.toFixed(2)),
          y: presSplit,
          width: Number(botW.toFixed(2)),
          height: botH,
          zIndex: 10,
          isLockedRatio: true,
        };
      }
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
        return fullBleed
          ? { x: 0, y: 0, width: 100, height: 100, zIndex: 10, isLockedRatio: true }
          : { x: 2, y: 3, width: 96, height: 94, zIndex: 10, isLockedRatio: true };
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
        const col0W = safeSplit;
        const col1W = 100 - safeSplit;
        if (effectiveTotal === 3) {
          if (index === 0) return { x: 0, y: 0, width: col0W, height: 50, zIndex: 10, isLockedRatio: true };
          if (index === 1) return { x: col0W, y: 0, width: col1W, height: 50, zIndex: 10, isLockedRatio: true };
          // Full-fill bottom row: 100% width so zero black bars appear on left/right!
          if (index === 2) return { x: 0, y: 50, width: 100, height: 50, zIndex: 10, isLockedRatio: true };
        }
        const cols = 2;
        const totalRows = Math.ceil(effectiveTotal / cols);
        const col = index % cols;
        const row = Math.floor(index / cols);
        const rowH = 100 / totalRows;
        const isLastSingleItem = row === totalRows - 1 && effectiveTotal % 2 === 1;
        return {
          x: isLastSingleItem ? 0 : col === 0 ? 0 : safeSplit,
          y: row * rowH,
          width: isLastSingleItem ? 100 : col === 0 ? col0W : col1W,
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
            return { x: Number((index * (100 / 3)).toFixed(2)), y: 0, width: Number((100 / 3).toFixed(2)), height: 50, zIndex: 10, isLockedRatio: true };
          }
          const botIndex = index - 3;
          // Full-fill bottom row: 2 tiles at 50% width each (0% black bars!)
          return { x: botIndex * 50, y: 50, width: 50, height: 50, zIndex: 10, isLockedRatio: true };
        }
        const cols = 3;
        const totalRows = Math.ceil(effectiveTotal / cols);
        const col = index % cols;
        const row = Math.floor(index / cols);
        const isLastRow = row === totalRows - 1;
        const itemsInThisRow = isLastRow ? effectiveTotal - row * cols : cols;
        const colW = 100 / Math.max(1, itemsInThisRow);
        const rowH = 100 / totalRows;
        return {
          x: Number((col * colW).toFixed(2)),
          y: Number((row * rowH).toFixed(2)),
          width: Number(colW.toFixed(2)),
          height: Number(rowH.toFixed(2)),
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
        const isLastRow = row === totalRows - 1;
        const itemsInThisRow = isLastRow ? effectiveTotal - row * cols : cols;
        const w = 100 / Math.max(1, itemsInThisRow);
        const h = 100 / totalRows;
        return {
          x: Number((col * w).toFixed(2)),
          y: Number((row * h).toFixed(2)),
          width: Number(w.toFixed(2)),
          height: Number(h.toFixed(2)),
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
      if (mode === "side-by-side" || mode === "fit") return getDefaultSlotBounds("side-by-side", index, total, splitRatio, customConfig, isStageCropped);
      if (mode === "cropped" || mode === "podcast") return getDefaultSlotBounds("cropped", index, total, splitRatio, customConfig, isStageCropped);
      if (mode === "stacked") return getDefaultSlotBounds("stacked", index, total, splitRatio, customConfig, isStageCropped);
      if (mode === "three-equal") return getDefaultSlotBounds("three-equal", index, total, splitRatio, customConfig, isStageCropped);
      if (mode === "six-grid") return getDefaultSlotBounds("six-grid", index, total, splitRatio, customConfig, isStageCropped);
      if (mode === "hero-side") return getDefaultSlotBounds("speaker-large", index, total, splitRatio, customConfig, isStageCropped);
      if (mode === "hero-bottom") return getDefaultSlotBounds("presentation", index, total, splitRatio, customConfig, isStageCropped);
      if (mode === "grid") {
        const cols = customConfig?.columns || 2;
        const rows = Math.max(1, Math.ceil(effectiveTotal / cols));
        const col = index % cols;
        const row = Math.floor(index / cols);
        if (fullBleed) {
          const isLastRow = row === rows - 1;
          const itemsInRow = isLastRow ? effectiveTotal - row * cols : cols;
          const w = 100 / Math.max(1, itemsInRow);
          const h = 100 / rows;
          return {
            x: Number((col * w).toFixed(2)),
            y: Number((row * h).toFixed(2)),
            width: Number(w.toFixed(2)),
            height: Number(h.toFixed(2)),
            zIndex: 10,
            isLockedRatio: true,
          };
        }
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
        if (index === 0) {
          return fullBleed
            ? { x: 0, y: 0, width: 100, height: 100, zIndex: 10, isLockedRatio: true }
            : { x: 2, y: 3, width: 96, height: 94, zIndex: 10, isLockedRatio: true };
        }
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
        return fullBleed
          ? { x: 0, y: 0, width: 100, height: 100, zIndex: 10, isLockedRatio: true }
          : { x: 2, y: 19, width: 96, height: 62, zIndex: 10, isLockedRatio: true };
      }
      return fullBleed
        ? { x: 0, y: 0, width: 100, height: 100, zIndex: 10, isLockedRatio: true }
        : { x: 2, y: 3, width: 96, height: 94, zIndex: 10, isLockedRatio: true };
    }

    default: {
      const cols = effectiveTotal <= 2 ? effectiveTotal : effectiveTotal <= 4 ? 2 : 3;
      const rows = Math.ceil(effectiveTotal / cols);
      const col = index % cols;
      const row = Math.floor(index / cols);
      if (fullBleed) {
        const isLastRow = row === rows - 1;
        const itemsInRow = isLastRow ? effectiveTotal - row * cols : cols;
        const w = 100 / Math.max(1, itemsInRow);
        const h = 100 / rows;
        return {
          x: Number((col * w).toFixed(2)),
          y: Number((row * h).toFixed(2)),
          width: Number(w.toFixed(2)),
          height: Number(h.toFixed(2)),
          zIndex: 10,
          isLockedRatio: true,
        };
      }
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
  secondaryMediaBounds?: ParticipantBounds | null;
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
  isStageCropped: boolean = false,
  hasSecondaryVisualMedia: boolean = false
): StageLayoutResult {
  const effectiveLayout = resolveEffectiveLayout(layout, customConfig);
  const fullBleed =
    isStageCropped ||
    effectiveLayout === "cropped" ||
    effectiveLayout === "podcast" ||
    effectiveLayout === "interview";

  // If NO active visual media on stage (neither primary nor secondary), compute participant bounds directly
  if (!hasVisualMedia && !hasSecondaryVisualMedia) {
    const participantBounds: ParticipantBounds[] = [];
    for (let i = 0; i < totalParticipants; i++) {
      participantBounds.push(
        getDefaultSlotBounds(layout, i, totalParticipants, splitRatio, customConfig, isStageCropped)
      );
    }
    return { mediaBounds: null, secondaryMediaBounds: null, participantBounds };
  }

  // If only secondary media is present (no primary), promote it to single media layout
  if (!hasVisualMedia && hasSecondaryVisualMedia) {
    const singleResult = calculateStageLayout(
      layout,
      totalParticipants,
      true,
      splitRatio,
      customConfig,
      enforceReactionPiP,
      mediaSlotIndex,
      isStageCropped,
      false
    );
    return {
      mediaBounds: null,
      secondaryMediaBounds: singleResult.mediaBounds,
      participantBounds: singleResult.participantBounds,
    };
  }

  // --- Dual Media on Stage (e.g. Video + Map, YouTube + Video, Map + Website in Cropped / 2-Window / Multi-Slot) ---
  if (hasVisualMedia && hasSecondaryVisualMedia) {
    const safeSplit = Math.max(20, Math.min(80, splitRatio || 50));
    const isMediaOnRight = (mediaSlotIndex || 0) >= 1;

    // Case 1: 0 participants on stage (Pure Dual Media Presentation)
    if (totalParticipants === 0) {
      if (
        effectiveLayout === "cropped" ||
        effectiveLayout === "podcast" ||
        effectiveLayout === "interview" ||
        (fullBleed && (effectiveLayout === "side-by-side" || effectiveLayout === "fit"))
      ) {
        const leftW = safeSplit;
        const rightW = 100 - safeSplit;
        const slot0: ParticipantBounds = { x: 0, y: 0, width: leftW, height: 100, zIndex: 10, isLockedRatio: true };
        const slot1: ParticipantBounds = { x: safeSplit, y: 0, width: rightW, height: 100, zIndex: 10, isLockedRatio: true };
        return {
          mediaBounds: isMediaOnRight ? slot1 : slot0,
          secondaryMediaBounds: isMediaOnRight ? slot0 : slot1,
          participantBounds: [],
        };
      }

      if (effectiveLayout === "side-by-side" || effectiveLayout === "fit") {
        const col0W = Math.max(15, safeSplit - 3);
        const col1W = Math.max(15, 100 - safeSplit - 3);
        const h0 = Math.min(54, Math.max(26, col0W * 0.96));
        const h1 = Math.min(54, Math.max(26, col1W * 0.96));
        const slot0: ParticipantBounds = {
          x: 2,
          y: Math.max(4, (100 - h0) / 2),
          width: col0W,
          height: h0,
          zIndex: 10,
          isLockedRatio: true,
        };
        const slot1: ParticipantBounds = {
          x: Math.min(85, safeSplit + 1),
          y: Math.max(4, (100 - h1) / 2),
          width: col1W,
          height: h1,
          zIndex: 10,
          isLockedRatio: true,
        };
        return {
          mediaBounds: isMediaOnRight ? slot1 : slot0,
          secondaryMediaBounds: isMediaOnRight ? slot0 : slot1,
          participantBounds: [],
        };
      }

      if (effectiveLayout === "stacked") {
        const topH = Math.max(15, safeSplit - 5);
        const botH = Math.max(15, 100 - safeSplit - 5);
        const slot0: ParticipantBounds = fullBleed
          ? { x: 0, y: 0, width: 100, height: safeSplit, zIndex: 10, isLockedRatio: true }
          : { x: 4, y: 4, width: 92, height: topH, zIndex: 10, isLockedRatio: true };
        const slot1: ParticipantBounds = fullBleed
          ? { x: 0, y: safeSplit, width: 100, height: 100 - safeSplit, zIndex: 10, isLockedRatio: true }
          : { x: 4, y: Math.min(85, safeSplit + 1), width: 92, height: botH, zIndex: 10, isLockedRatio: true };
        return {
          mediaBounds: isMediaOnRight ? slot1 : slot0,
          secondaryMediaBounds: isMediaOnRight ? slot0 : slot1,
          participantBounds: [],
        };
      }

      // Any other layout (solo, cinema, three-equal, four-grid, etc.) with 0 participants
      const slot0 = getDefaultSlotBounds(effectiveLayout, 0, 2, splitRatio, customConfig, isStageCropped);
      const slot1 = getDefaultSlotBounds(effectiveLayout, 1, 2, splitRatio, customConfig, isStageCropped);
      return {
        mediaBounds: isMediaOnRight ? slot1 : slot0,
        secondaryMediaBounds: isMediaOnRight ? slot0 : slot1,
        participantBounds: [],
      };
    }

    // Case 2: 1 or more participants on stage alongside Dual Media (total slots = totalParticipants + 2)
    const totalSlots = totalParticipants + 2;
    const allSlotBounds: ParticipantBounds[] = [];
    for (let s = 0; s < totalSlots; s++) {
      allSlotBounds.push(
        getDefaultSlotBounds(effectiveLayout, s, totalSlots, splitRatio, customConfig, isStageCropped)
      );
    }
    const slot0 = allSlotBounds[0];
    const slot1 = allSlotBounds[1];
    const participantBounds = allSlotBounds.slice(2);
    return {
      mediaBounds: isMediaOnRight ? slot1 : slot0,
      secondaryMediaBounds: isMediaOnRight ? slot0 : slot1,
      participantBounds,
    };
  }

  // Special Case: 2-Window (Cropped / Fit / Podcast / Interview / Side-by-Side) where Media is on one side and Speakers stack on the other side
  if (
    (effectiveLayout === "cropped" ||
      effectiveLayout === "podcast" ||
      effectiveLayout === "interview" ||
      effectiveLayout === "side-by-side" ||
      effectiveLayout === "fit") &&
    totalParticipants >= 1
  ) {
    const safeSplit = Math.max(20, Math.min(80, splitRatio || 50));
    const isMediaOnRight = mediaSlotIndex >= 1; // 0 = Left Side, 1 = Right Side!

    if (fullBleed) {
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
    [
      "three-equal",
      "four-grid",
      "five-grid",
      "six-grid",
      "nine-grid",
      "speaker-large",
      "screen-speaker",
      "presentation",
      "stacked",
    ].includes(effectiveLayout) &&
    totalParticipants >= 1
  ) {
    const totalSlots = totalParticipants + 1;
    const targetMediaSlot = Math.max(0, Math.min(totalSlots - 1, mediaSlotIndex || 0));

    const allSlotBounds: ParticipantBounds[] = [];
    for (let s = 0; s < totalSlots; s++) {
      allSlotBounds.push(
        getDefaultSlotBounds(effectiveLayout, s, totalSlots, splitRatio, customConfig, isStageCropped)
      );
    }

    const mediaBounds = allSlotBounds[targetMediaSlot];
    const participantBounds = allSlotBounds.filter((_, idx) => idx !== targetMediaSlot);
    return { mediaBounds, participantBounds };
  }

  // --- Fallback / Solo / Cinema / PiP / 0-participant Stage Layouts ---
  const safeSplit = Math.max(25, Math.min(75, splitRatio || 50));
  const participantBounds: ParticipantBounds[] = [];

  // If 0 participants are on stage (Media-only presentation) and Full Fill is ON, fill 100% edge-to-edge!
  if (totalParticipants === 0 && fullBleed) {
    return {
      mediaBounds: { x: 0, y: 0, width: 100, height: 100, zIndex: 10, isLockedRatio: true },
      participantBounds: [],
    };
  }

  switch (effectiveLayout) {
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
          mediaBounds: { x: 0, y: 0, width: 100, height: 100, zIndex: 10, isLockedRatio: true },
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
          mediaBounds: { x: 0, y: 0, width: 100, height: 100, zIndex: 10, isLockedRatio: true },
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
        const mediaBounds: ParticipantBounds = fullBleed
          ? { x: 0, y: 0, width: 100, height: 100, zIndex: 10, isLockedRatio: true }
          : { x: 2, y: 3, width: 96, height: 94, zIndex: 10, isLockedRatio: true };
        return { mediaBounds, participantBounds };
      }
      return calculateStageLayout("cropped", totalParticipants, true, safeSplit, customConfig, enforceReactionPiP, mediaSlotIndex, isStageCropped);
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
        const mediaBounds: ParticipantBounds = fullBleed
          ? { x: 0, y: 0, width: 100, height: 100, zIndex: 10, isLockedRatio: true }
          : { x: 2, y: 2, width: 96, height: 96, zIndex: 10, isLockedRatio: true };
        return { mediaBounds, participantBounds };
      }

      const presSplit = splitRatio ? Math.max(30, Math.min(80, splitRatio)) : 68;
      if (fullBleed) {
        const mediaBounds: ParticipantBounds = {
          x: 0,
          y: 0,
          width: 100,
          height: presSplit,
          zIndex: 10,
          isLockedRatio: true,
        };
        const bottomTotal = Math.max(1, totalParticipants);
        const botW = 100 / bottomTotal;
        const botH = 100 - presSplit;
        for (let i = 0; i < totalParticipants; i++) {
          participantBounds.push({
            x: Number((i * botW).toFixed(2)),
            y: presSplit,
            width: Number(botW.toFixed(2)),
            height: botH,
            zIndex: 10,
            isLockedRatio: true,
          });
        }
        return { mediaBounds, participantBounds };
      }

      // Presentation Deck: Slide/Media takes upper center stage (~70%), speakers along bottom
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
      // StreamYard Picture-in-Picture: Media fills 100% full canvas background top-to-bottom, speaker floats in corner!
      const mediaBounds: ParticipantBounds = { x: 0, y: 0, width: 100, height: 100, zIndex: 10, isLockedRatio: true };

      const sizeMap = {
        small: { w: 22, h: 24 },
        medium: { w: 29, h: 32 },
        large: { w: 36, h: 38 },
      };
      const pipSz = layout === "custom" ? sizeMap[customConfig?.pipSize || "medium"] : { w: 29, h: 32 };
      const pipPos = layout === "custom" ? (customConfig?.pipPosition || "bottom-right") : "bottom-right";

      for (let i = 0; i < totalParticipants; i++) {
        let baseX = 68;
        let baseY = 62;
        if (pipPos === "top-left") {
          baseX = 4;
          baseY = 4 + i * (pipSz.h + 2);
        } else if (pipPos === "top-right") {
          baseX = 100 - pipSz.w - 4;
          baseY = 4 + i * (pipSz.h + 2);
        } else if (pipPos === "bottom-left") {
          baseX = 4;
          baseY = Math.max(4, 100 - pipSz.h - 4 - i * (pipSz.h + 2));
        } else {
          baseX = 100 - pipSz.w - 3;
          baseY = Math.max(4, 62 - i * 34);
        }
        participantBounds.push({
          x: baseX,
          y: baseY,
          width: pipSz.w,
          height: pipSz.h,
          zIndex: 25 + i,
          isLockedRatio: true,
        });
      }
      return { mediaBounds, participantBounds };
    }

    case "stacked": {
      if (totalParticipants === 0) {
        const mediaBounds: ParticipantBounds = fullBleed
          ? { x: 0, y: 0, width: 100, height: 100, zIndex: 10, isLockedRatio: true }
          : { x: 4, y: 4, width: 92, height: 92, zIndex: 10, isLockedRatio: true };
        return { mediaBounds, participantBounds };
      }

      if (fullBleed) {
        const topH = safeSplit;
        const botH = 100 - safeSplit;
        const mediaBounds: ParticipantBounds = {
          x: 0,
          y: 0,
          width: 100,
          height: topH,
          zIndex: 10,
          isLockedRatio: true,
        };
        const botW = 100 / Math.max(1, totalParticipants);
        for (let i = 0; i < totalParticipants; i++) {
          participantBounds.push({
            x: Number((i * botW).toFixed(2)),
            y: topH,
            width: Number(botW.toFixed(2)),
            height: botH,
            zIndex: 10,
            isLockedRatio: true,
          });
        }
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

    case "four-grid":
    case "three-equal":
    case "five-grid":
    case "six-grid":
    case "nine-grid": {
      const mediaBounds: ParticipantBounds = fullBleed
        ? { x: 0, y: 0, width: 100, height: 100, zIndex: 10, isLockedRatio: true }
        : { x: 12, y: 12, width: 76, height: 76, zIndex: 10, isLockedRatio: true };
      return { mediaBounds, participantBounds };
    }

    case "speaker-large":
    case "screen-speaker":
    default: {
      if (totalParticipants === 0) {
        const mediaBounds: ParticipantBounds = fullBleed
          ? { x: 0, y: 0, width: 100, height: 100, zIndex: 10, isLockedRatio: true }
          : { x: 2, y: 3, width: 96, height: 94, zIndex: 10, isLockedRatio: true };
        return { mediaBounds, participantBounds };
      }

      const heroSplit = splitRatio ? Math.max(25, Math.min(85, splitRatio)) : 68;
      if (fullBleed) {
        const mediaBounds: ParticipantBounds = {
          x: 0,
          y: 0,
          width: heroSplit,
          height: 100,
          zIndex: 10,
          isLockedRatio: true,
        };
        const sideTotal = Math.max(1, totalParticipants);
        const sideH = 100 / sideTotal;
        const sideW = 100 - heroSplit;
        for (let i = 0; i < totalParticipants; i++) {
          participantBounds.push({
            x: heroSplit,
            y: i * sideH,
            width: sideW,
            height: sideH,
            zIndex: 10,
            isLockedRatio: true,
          });
        }
        return { mediaBounds, participantBounds };
      }

      // News / Spotlight screen share: Media dominant on left (~68%), participants stacked on right (~26%)
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
