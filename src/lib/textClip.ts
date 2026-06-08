/**
 * Text Clip Creation Utilities
 *
 * Helpers for creating text clips with sensible defaults.
 */

import type { TextClip } from "../types";
import type { TextEffectDefinition } from "@clypra/engine";
import { generateId } from "./id";
import { useEffectsStore } from "../features/text-effects/store/effectsStore";

export interface CreateTextClipOptions {
  /** Track ID to place the clip on */
  trackId: string;

  /** Start time on timeline */
  startTime: number;

  /** Duration in seconds */
  duration?: number;

  /** Text content */
  text?: string;

  /** Canvas dimensions for positioning */
  canvasWidth: number;
  canvasHeight: number;

  /** Font size */
  fontSize?: number;

  /** Font family */
  fontFamily?: string;

  /** Text color */
  color?: string;

  /** Bold */
  bold?: boolean;

  /** Italic */
  italic?: boolean;

  /** Position preset */
  position?: "center" | "top" | "bottom" | "top-left" | "top-right" | "bottom-left" | "bottom-right";

  /** Text role: caption for subtitles, title for decorative text */
  textRole?: "caption" | "title";

  /** Word-level timestamps for karaoke-style caption highlighting */
  words?: Array<{
    word: string;
    start: number;
    end: number;
    probability?: number;
  }>;

  // Additional style parameters for custom presets/effects/templates
  styleId?: string;
  templateId?: string;
  fontWeight?: string | number;
  fontStyle?: "normal" | "italic";
  stroke?: { color: string; width: number };
  shadow?: { color: string; blur: number; offsetX: number; offsetY: number };
  background?: { color: string; padding: number; borderRadius: number };

  /** Effect definition for accurate bounding box calculation */
  effectDefinition?: TextEffectDefinition;
}

function measureTextWidth(text: string, fontFamily: string, fontSize: number, bold: boolean): number {
  try {
    const canvas = typeof OffscreenCanvas !== "undefined" ? new OffscreenCanvas(1, 1) : document.createElement("canvas");
    const ctx = canvas.getContext("2d") as any;
    if (!ctx) return text.length * fontSize * 0.6; // Fallback estimate
    ctx.font = `${bold ? "bold" : "normal"} ${fontSize}px ${fontFamily}`;
    const metrics = ctx.measureText(text);
    return metrics.width;
  } catch (e) {
    return text.length * fontSize * 0.6; // Fallback estimate
  }
}

/**
 * Calculate effect bleed/padding beyond text ink bounds.
 *
 * The effect definition can declare exactly what it needs via boundingBox.
 * Otherwise, we compute based on explicit style properties (stroke, shadow, background).
 *
 * **Backward Compatibility:**
 * - Effects WITH boundingBox: Uses declared padding (accurate)
 * - Effects WITHOUT boundingBox: Falls back to conservative estimates (40px x, 30px y)
 * - Plain text (no styleId): Uses minimal padding based on explicit styles only
 *
 * @returns Padding to add on each side (x = horizontal per side, y = vertical per side)
 */
export function effectBleed(options: { styleId?: string; effectDefinition?: TextEffectDefinition; stroke?: { width: number }; shadow?: { blur: number; offsetX: number; offsetY: number }; background?: { padding: number } }): { x: number; y: number } {
  let x = 0;
  let y = 0;

  // First, account for explicit styling properties (always safe, works for all effects)
  if (options.stroke) {
    x += options.stroke.width;
    y += options.stroke.width;
  }
  if (options.shadow) {
    x += Math.abs(options.shadow.offsetX) + options.shadow.blur;
    y += Math.abs(options.shadow.offsetY) + options.shadow.blur;
  }
  if (options.background) {
    x += options.background.padding;
    y += options.background.padding;
  }

  // If effect definition provides a boundingBox spec, use it (preferred, most accurate)
  if (options.effectDefinition?.boundingBox) {
    const bbox = options.effectDefinition.boundingBox;
    x = Math.max(x, bbox.paddingX);
    y = Math.max(y, bbox.paddingY);
  } else if (options.styleId) {
    // Fallback for legacy effects without boundingBox declared yet
    // Use conservative padding that works for most effects (panel, glow, shadow)
    // This ensures backward compatibility with existing effects
    x = Math.max(x, 40);
    y = Math.max(y, 30);
  }

  return { x, y };
}

export function calculateTextClipSize(options: { text: string; fontFamily: string; fontSize: number; bold?: boolean; fontWeight?: string | number; styleId?: string; effectDefinition?: TextEffectDefinition; stroke?: { width: number }; shadow?: { blur: number; offsetX: number; offsetY: number }; background?: { padding: number }; canvasWidth: number }): { width: number; height: number; bleed: { x: number; y: number }; measuredWidth: number } {
  const isBold = options.bold || options.fontWeight === "bold" || (typeof options.fontWeight === "number" && options.fontWeight >= 700);
  const measuredWidth = measureTextWidth(options.text, options.fontFamily, options.fontSize, !!isBold);
  const bleed = effectBleed(options);
  const hasDeclaredBounds = !!options.effectDefinition?.boundingBox;
  const isPanelEffect = options.effectDefinition?.boundingBox?.mode === "panel";
  const layoutBleed = isPanelEffect || !options.styleId ? bleed : { x: 0, y: 0 };

  const baseWidth = isPanelEffect ? measuredWidth : hasDeclaredBounds ? measuredWidth + options.fontSize * 0.4 : options.styleId ? measuredWidth * 1.3 : measuredWidth + options.fontSize * 0.8;

  const width = Math.min(options.canvasWidth * 0.95, Math.max(120, baseWidth + layoutBleed.x * 2));
  const contentWidth = Math.max(1, width - layoutBleed.x * 2);
  const wrappedLineCount = Math.max(1, Math.ceil(measuredWidth / contentWidth));
  const baseHeight = isPanelEffect ? options.fontSize * wrappedLineCount : hasDeclaredBounds ? options.fontSize * 1.35 * wrappedLineCount : options.fontSize * (options.styleId ? 1.8 : 1.5) * wrappedLineCount;
  const height = baseHeight + layoutBleed.y * 2;

  return { width, height, bleed, measuredWidth };
}

/**
 * Create a text clip with sensible defaults.
 */
export function createTextClip(options: CreateTextClipOptions): TextClip {
  const defaultFontSize = options.styleId ? 96 : 48;
  const { trackId, startTime, duration = 5.0, text = "Text", canvasWidth, canvasHeight, fontSize = defaultFontSize, fontFamily = "Inter, system-ui, sans-serif", color = "#ffffff", bold = false, italic = false, position = "center", textRole, words, styleId, templateId, fontWeight, fontStyle, stroke, shadow, background, effectDefinition } = options;

  const sizing = calculateTextClipSize({
    text,
    fontFamily,
    fontSize,
    bold,
    fontWeight,
    styleId,
    effectDefinition,
    stroke,
    shadow,
    background,
    canvasWidth,
  });

  // Calculate position based on preset using the dynamic box sizes
  const { x, y, width, height } = calculateTextPosition(position, canvasWidth, canvasHeight, sizing.width, sizing.height);

  return {
    id: generateId("text-clip"),
    trackId,
    mediaId: "", // Text clips don't have media assets
    startTime,
    duration,
    trimIn: 0,
    trimOut: duration,
    x,
    y,
    width,
    height,
    opacity: 1.0,
    rotation: 0,
    aspectRatioLocked: false,
    text,
    fontSize,
    fontFamily,
    color,
    fontWeight: fontWeight || (bold ? "bold" : "normal"),
    fontStyle: fontStyle || (italic ? "italic" : "normal"),
    align: "center",
    valign: "middle",
    lineHeight: 1.2,
    letterSpacing: 0,
    paddingX: 16,
    paddingY: 16,
    textRole,
    words, // Include word-level timestamps for karaoke-style highlighting
    styleId,
    templateId,
    stroke,
    shadow,
    background,
  };
}

/**
 * Calculate text position based on preset.
 */
function calculateTextPosition(position: "center" | "top" | "bottom" | "top-left" | "top-right" | "bottom-left" | "bottom-right", canvasWidth: number, canvasHeight: number, boxWidth: number, boxHeight: number): { x: number; y: number; width: number; height: number } {
  const margin = 40; // Margin from edges

  switch (position) {
    case "center":
      return {
        x: (canvasWidth - boxWidth) / 2,
        y: (canvasHeight - boxHeight) / 2,
        width: boxWidth,
        height: boxHeight,
      };

    case "top":
      return {
        x: (canvasWidth - boxWidth) / 2,
        y: margin,
        width: boxWidth,
        height: boxHeight,
      };

    case "bottom":
      return {
        x: (canvasWidth - boxWidth) / 2,
        y: canvasHeight - boxHeight - margin,
        width: boxWidth,
        height: boxHeight,
      };

    case "top-left":
      return {
        x: margin,
        y: margin,
        width: boxWidth,
        height: boxHeight,
      };

    case "top-right":
      return {
        x: canvasWidth - boxWidth - margin,
        y: margin,
        width: boxWidth,
        height: boxHeight,
      };

    case "bottom-left":
      return {
        x: margin,
        y: canvasHeight - boxHeight - margin,
        width: boxWidth,
        height: boxHeight,
      };

    case "bottom-right":
      return {
        x: canvasWidth - boxWidth - margin,
        y: canvasHeight - boxHeight - margin,
        width: boxWidth,
        height: boxHeight,
      };

    default:
      return {
        x: (canvasWidth - boxWidth) / 2,
        y: (canvasHeight - boxHeight) / 2,
        width: boxWidth,
        height: boxHeight,
      };
  }
}

/**
 * Text preset configurations.
 */
export const TEXT_PRESETS = {
  title: {
    fontSize: 72,
    bold: true,
    position: "center" as const,
  },
  subtitle: {
    fontSize: 48,
    bold: false,
    position: "center" as const,
  },
  lowerThird: {
    fontSize: 32,
    bold: false,
    position: "bottom-left" as const,
  },
  caption: {
    fontSize: 24,
    bold: false,
    position: "bottom" as const,
  },
  headline: {
    fontSize: 64,
    bold: true,
    position: "top" as const,
  },
  quote: {
    fontSize: 36,
    italic: true,
    position: "center" as const,
  },
} as const;

/**
 * Recalculate the bounding box of a text clip when text content or styling changes.
 * Keeps the center of the clip fixed on the canvas.
 */
export function recalculateTextClipBounds(clip: TextClip, updates: Partial<TextClip>, canvasWidth: number, canvasHeight: number): TextClip {
  const merged = { ...clip, ...updates };
  const { text = "Text", fontFamily = "Inter, system-ui, sans-serif", fontSize = 48, fontWeight, fontStyle, styleId, stroke, shadow, background } = merged;

  const effectDefinition = styleId ? (useEffectsStore.getState().definitions[styleId] as TextEffectDefinition | undefined) : undefined;

  const sizing = calculateTextClipSize({
    text,
    fontFamily,
    fontSize,
    fontWeight,
    styleId,
    effectDefinition,
    stroke,
    shadow,
    background,
    canvasWidth,
  });

  // Symmetrical expansion: keep center point fixed
  const oldCenterX = clip.x + clip.width / 2;
  const oldCenterY = clip.y + clip.height / 2;

  const newX = oldCenterX - sizing.width / 2;
  const newY = oldCenterY - sizing.height / 2;

  return {
    ...merged,
    x: newX,
    y: newY,
    width: sizing.width,
    height: sizing.height,
  };
}
