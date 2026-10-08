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
    case "six-grid":
      return 6;
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
 * based on the active studio layout preset.
 */
export function getDefaultSlotBounds(
  layout: StudioLayout | string,
  index: number,
  total: number,
  splitRatio: number = 50,
  customConfig?: CustomLayoutConfig
): ParticipantBounds {
  const safeSplit = Math.max(20, Math.min(80, splitRatio || 50));
  const effectiveTotal = Math.max(total, getLayoutExpectedSlots(layout, customConfig));

  switch (layout) {
    case "solo": {
      if (index === 0) {
        return { x: 2, y: 3, width: 96, height: 94, zIndex: 10, isLockedRatio: true };
      }
      // Extra participants in solo mode appear as small floating badges
      const topOffset = Math.min(76, 4 + (index - 1) * 22);
      return { x: 74, y: topOffset, width: 22, height: 20, zIndex: 25, isLockedRatio: true };
    }

    case "side-by-side":
    case "fit": {
      // StreamYard Fit Layout: 16:9 widescreen boxes side-by-side with canvas background visible
      const col0W = Math.max(15, safeSplit - 3);
      const col1W = Math.max(15, 100 - safeSplit - 3);
      // In 16:9 canvas, 16:9 video height% equals width%
      const h0 = Math.min(58, Math.max(26, col0W * 1.02));
      const h1 = Math.min(58, Math.max(26, col1W * 1.02));
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
      // If 3+ on stage in side-by-side, wrap into 2nd row or grid
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
      // Floating indicator in bottom right for guest
      return { x: 80, y: 80, width: 18, height: 16, zIndex: 25, isLockedRatio: true };
    }

    case "cropped":
    case "podcast":
    case "interview": {
      // StreamYard "Cropped layout": 100% full height bleed from top to bottom, vertical center-crop
      const col0W = Math.max(15, safeSplit - 0.25);
      const col1W = Math.max(15, 100 - safeSplit - 0.25);
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
          x: Math.min(85, safeSplit + 0.25),
          y: 0,
          width: col1W,
          height: 100,
          zIndex: 10,
          isLockedRatio: true,
        };
      }
      // Fallback for > 2
      const col = index % 2;
      const row = Math.floor(index / 2);
      const totalRows = Math.ceil(effectiveTotal / 2);
      const h = Math.max(20, (100 - (totalRows - 1) * 1) / totalRows);
      return {
        x: col === 0 ? 0 : Math.min(85, safeSplit + 0.25),
        y: row * (h + 1),
        width: col === 0 ? col0W : col1W,
        height: h,
        zIndex: 10,
        isLockedRatio: true,
      };
    }

    case "speaker-large":
    case "screen-speaker": {
      const heroSplit = splitRatio ? Math.max(25, Math.min(85, splitRatio)) : 65;
      if (index === 0) {
        return { x: 2, y: 4, width: Math.max(20, heroSplit - 3), height: 92, zIndex: 10, isLockedRatio: true };
      }
      const sideTotal = Math.max(2, effectiveTotal - 1);
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
      // Presentation deck has primary focus area on top/center, speakers on bottom strip
      const presSplit = splitRatio ? Math.max(25, Math.min(85, splitRatio)) : 68;
      if (index === 0) {
        return { x: 2, y: 2, width: 96, height: Math.max(20, presSplit - 3), zIndex: 10, isLockedRatio: true };
      }
      const bottomTotal = Math.max(2, effectiveTotal - 1);
      const botW = Math.max(15, Math.min(30, (96 - (bottomTotal - 1) * 2) / bottomTotal));
      const botX = 2 + (index - 1) * (botW + 2);
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
      // Multiple PiPs stack up from bottom-right
      const stackY = Math.max(4, 62 - (index - 1) * 34);
      return { x: 67, y: stackY, width: 30, height: 32, zIndex: 25 + index, isLockedRatio: true };
    }

    case "four-grid": {
      const col = index % 2;
      const row = Math.floor(index / 2);
      const col0W = Math.max(15, safeSplit - 3);
      const col1W = Math.max(15, 100 - safeSplit - 3);
      return {
        x: col === 0 ? 2 : Math.min(85, safeSplit + 1),
        y: row === 0 ? 3 : 51,
        width: col === 0 ? col0W : col1W,
        height: 46,
        zIndex: 10,
        isLockedRatio: true,
      };
    }

    case "three-equal": {
      const col0W = Math.max(15, Math.min(65, safeSplit - 3));
      const remainingW = 96 - col0W - 4;
      const otherW = Number((remainingW / 2).toFixed(1));
      if (index === 0) {
        return { x: 2, y: 4, width: col0W, height: 92, zIndex: 10, isLockedRatio: true };
      }
      if (index === 1) {
        return { x: 2 + col0W + 2, y: 4, width: otherW, height: 92, zIndex: 10, isLockedRatio: true };
      }
      return { x: 2 + col0W + 2 + otherW + 2, y: 4, width: otherW, height: 92, zIndex: 10, isLockedRatio: true };
    }

    case "six-grid": {
      const col = index % 3;
      const row = Math.floor(index / 3);
      return {
        x: 2 + col * 32.5,
        y: row === 0 ? 3 : 51,
        width: 31,
        height: 46,
        zIndex: 10,
        isLockedRatio: true,
      };
    }

    case "custom": {
      const mode = customConfig?.mode || "hero-side";
      if (mode === "solo") {
        return getDefaultSlotBounds("solo", index, total, splitRatio);
      }
      if (mode === "side-by-side") {
        return getDefaultSlotBounds("side-by-side", index, total, splitRatio);
      }
      if (mode === "stacked") {
        return getDefaultSlotBounds("stacked", index, total, splitRatio);
      }
      if (mode === "three-equal") {
        return getDefaultSlotBounds("three-equal", index, total, splitRatio);
      }
      if (mode === "six-grid") {
        return getDefaultSlotBounds("six-grid", index, total, splitRatio);
      }
      if (mode === "podcast") {
        return getDefaultSlotBounds("podcast", index, total, splitRatio);
      }
      if (mode === "hero-side") {
        return getDefaultSlotBounds("speaker-large", index, total, splitRatio);
      }
      if (mode === "hero-bottom") {
        return getDefaultSlotBounds("presentation", index, total, splitRatio);
      }
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
        if (index === 0) {
          return { x: 2, y: 3, width: 96, height: 94, zIndex: 10, isLockedRatio: true };
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
        return { x: 2, y: 19, width: 96, height: 62, zIndex: 10, isLockedRatio: true };
      }
      // fallback
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
