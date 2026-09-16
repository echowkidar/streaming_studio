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
      return 1;
    case "side-by-side":
    case "podcast":
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
      if (mode === "grid") return Math.min(8, (customConfig?.columns || 2) * 2);
      if (mode === "hero-side") return 3;
      if (mode === "hero-bottom") return 3;
      if (mode === "pip") return 2;
      if (mode === "cinema") return 1;
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

    case "side-by-side": {
      if (index === 0) {
        return {
          x: 2,
          y: 4,
          width: Math.max(15, safeSplit - 3),
          height: 92,
          zIndex: 10,
          isLockedRatio: true,
        };
      }
      if (index === 1) {
        return {
          x: Math.min(85, safeSplit + 1),
          y: 4,
          width: Math.max(15, 100 - safeSplit - 3),
          height: 92,
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

    case "podcast":
    case "interview": {
      if (index === 0) {
        return {
          x: 4,
          y: 6,
          width: 44,
          height: 88,
          zIndex: 10,
          isLockedRatio: true,
        };
      }
      if (index === 1) {
        return {
          x: 52,
          y: 6,
          width: 44,
          height: 88,
          zIndex: 10,
          isLockedRatio: true,
        };
      }
      // Fallback for > 2
      const col = index % 2;
      const row = Math.floor(index / 2);
      return {
        x: col === 0 ? 4 : 52,
        y: row === 0 ? 6 : 52,
        width: 44,
        height: 42,
        zIndex: 10,
        isLockedRatio: true,
      };
    }

    case "speaker-large":
    case "screen-speaker": {
      if (index === 0) {
        return { x: 2, y: 4, width: 68, height: 92, zIndex: 10, isLockedRatio: true };
      }
      const sideTotal = Math.max(2, effectiveTotal - 1);
      const sideHeight = Math.max(20, (92 - (sideTotal - 1) * 3) / sideTotal);
      const sideY = 4 + (index - 1) * (sideHeight + 3);
      return {
        x: 72,
        y: Math.min(76, sideY),
        width: 26,
        height: Math.min(92, sideHeight),
        zIndex: 10,
        isLockedRatio: true,
      };
    }

    case "presentation": {
      // Presentation deck has primary focus area on top/center (68% height), speakers on bottom strip
      if (index === 0) {
        return { x: 2, y: 2, width: 96, height: 68, zIndex: 10, isLockedRatio: true };
      }
      const bottomTotal = Math.max(2, effectiveTotal - 1);
      const botW = Math.max(15, Math.min(30, (96 - (bottomTotal - 1) * 2) / bottomTotal));
      const botX = 2 + (index - 1) * (botW + 2);
      return {
        x: Math.min(100 - botW - 2, botX),
        y: 72,
        width: botW,
        height: 25,
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
      return {
        x: col === 0 ? 2 : 51,
        y: row === 0 ? 3 : 51,
        width: 47,
        height: 46,
        zIndex: 10,
        isLockedRatio: true,
      };
    }

    case "three-equal": {
      const w = 31;
      const x = 2 + index * 32.5;
      return {
        x: Math.min(67, x),
        y: 4,
        width: w,
        height: 92,
        zIndex: 10,
        isLockedRatio: true,
      };
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
      if (mode === "hero-side") {
        if (index === 0) {
          return { x: 2, y: 4, width: 68, height: 92, zIndex: 10, isLockedRatio: true };
        }
        const sideTotal = Math.max(2, effectiveTotal - 1);
        const sideHeight = Math.max(20, (92 - (sideTotal - 1) * 3) / sideTotal);
        const sideY = 4 + (index - 1) * (sideHeight + 3);
        return {
          x: 72,
          y: Math.min(76, sideY),
          width: 26,
          height: Math.min(92, sideHeight),
          zIndex: 10,
          isLockedRatio: true,
        };
      }
      if (mode === "hero-bottom") {
        if (index === 0) {
          return { x: 2, y: 4, width: 96, height: 66, zIndex: 10, isLockedRatio: true };
        }
        const botTotal = Math.max(2, effectiveTotal - 1);
        const botW = Math.max(15, (96 - (botTotal - 1) * 2) / botTotal);
        return {
          x: 2 + (index - 1) * (botW + 2),
          y: 72,
          width: botW,
          height: 24,
          zIndex: 10,
          isLockedRatio: true,
        };
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
