import { StudioLayout, ParticipantBounds } from "@/stores/studio.store";

/**
 * Computes responsive percentage bounds (x, y, width, height in %) for any participant
 * based on the active studio layout preset.
 */
export function getDefaultSlotBounds(
  layout: StudioLayout | string,
  index: number,
  total: number,
  splitRatio: number = 50
): ParticipantBounds {
  if (total <= 1) {
    return { x: 2, y: 3, width: 96, height: 94, zIndex: 10, isLockedRatio: true };
  }

  const safeSplit = Math.max(20, Math.min(80, splitRatio || 50));

  switch (layout) {
    case "solo":
      return { x: 2, y: 3, width: 96, height: 94, zIndex: 10, isLockedRatio: true };

    case "side-by-side":
    case "podcast":
    case "interview": {
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
      return {
        x: Math.min(85, safeSplit + 1),
        y: 4,
        width: Math.max(15, 100 - safeSplit - 3),
        height: 92,
        zIndex: 10,
        isLockedRatio: true,
      };
    }

    case "speaker-large":
    case "screen-speaker":
    case "presentation": {
      if (index === 0) {
        return { x: 2, y: 4, width: 68, height: 92, zIndex: 10, isLockedRatio: true };
      }
      const sideTotal = Math.max(1, total - 1);
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

    case "pip": {
      if (index === 0) {
        return { x: 2, y: 3, width: 96, height: 94, zIndex: 10, isLockedRatio: true };
      }
      return { x: 67, y: 62, width: 30, height: 32, zIndex: 25, isLockedRatio: true };
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

    default: {
      const cols = total <= 2 ? total : total <= 4 ? 2 : 3;
      const rows = Math.ceil(total / cols);
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
