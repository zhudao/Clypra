import { TextEffectDefinition } from "./types";

/**
 * Parses hex or rgba/rgb color strings into [r, g, b, a] numeric array.
 * @param color - The input color string.
 * @returns An array representing [r, g, b, a].
 */
export const parseColor = (color: string): number[] => {
  const col = color.trim();
  if (col.startsWith("#")) {
    if (col.length === 4) {
      const r = parseInt(col[1] + col[1], 16);
      const g = parseInt(col[2] + col[2], 16);
      const b = parseInt(col[3] + col[3], 16);
      return [r, g, b, 1];
    }
    const r = parseInt(col.slice(1, 3), 16);
    const g = parseInt(col.slice(3, 5), 16);
    const b = parseInt(col.slice(5, 7), 16);
    const a = col.length === 9 ? parseInt(col.slice(7, 9), 16) / 255 : 1;
    return [r, g, b, a];
  }
  if (col.startsWith("rgba") || col.startsWith("rgb")) {
    const match = col.match(/\d+(\.\d+)?/g);
    if (match) {
      const r = parseInt(match[0], 10);
      const g = parseInt(match[1], 10);
      const b = parseInt(match[2], 10);
      const a = match[3] ? parseFloat(match[3]) : 1;
      return [r, g, b, a];
    }
  }
  return [255, 255, 255, 1];
};

/**
 * Interpolates two color strings linearly by a factor between 0.0 and 1.0.
 * @param color1 - Back/Start color.
 * @param color2 - Front/End color.
 * @param factor - Interpolation step.
 * @returns The interpolated rgba color string.
 */
export const interpolateColor = (color1: string, color2: string, factor: number): string => {
  const c1 = parseColor(color1);
  const c2 = parseColor(color2);

  const r = Math.round(c1[0] + (c2[0] - c1[0]) * factor);
  const g = Math.round(c1[1] + (c2[1] - c1[1]) * factor);
  const b = Math.round(c1[2] + (c2[2] - c1[2]) * factor);
  const a = c1[3] + (c2[3] - c1[3]) * factor;

  return `rgba(${r}, ${g}, ${b}, ${a})`;
};

/**
 * Applies font configuration styles to a CanvasRenderingContext2D.
 * @param ctx - The target rendering context.
 * @param font - Font parameters.
 * @param fontSize - Font size in pixels.
 */
export const applyFontConfig = (ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D, font: TextEffectDefinition["font"], fontSize: number) => {
  let family = font.family;
  const f = family.toLowerCase();
  if (f.includes("inter")) {
    family = '"Inter Variable", sans-serif';
  } else if (f.includes("montserrat")) {
    family = '"Montserrat Variable", sans-serif';
  } else if (f.includes("geist")) {
    family = '"Geist Variable", sans-serif';
  } else if (f.includes("space grotesk") || f.includes("grotesk")) {
    family = '"Space Grotesk Variable", sans-serif';
  } else if (f.includes("outfit")) {
    family = '"Outfit Variable", sans-serif';
  } else if (f.includes("roboto")) {
    family = '"Roboto Variable", sans-serif';
  }

  ctx.font = `${font.style} ${font.weight} ${fontSize}px ${family}`;
  ctx.textBaseline = "middle";
  ctx.textAlign = "center";
  if (typeof (ctx as any).letterSpacing !== "undefined") {
    (ctx as any).letterSpacing = `${font.letterSpacing}px`;
  }
};

/**
 * Clips canvas context to text shape so inner shadows and texture fills don't bleed.
 * @param ctx - Canvas rendering context.
 * @param lines - Array of text lines.
 * @param fontSize - Size of font.
 * @param font - Font configuration block.
 * @param x - Center anchor X.
 * @param y - Center anchor Y.
 */
export const clipToText = (ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D, lines: string[], fontSize: number, font: TextEffectDefinition["font"], x: number, y: number) => {
  ctx.globalCompositeOperation = "source-atop";
};

export const getFontFamilyStack = (fontFamily: string) => {
  const f = fontFamily?.toLowerCase() || "";
  if (f.includes("inter")) return '"Inter Variable", sans-serif';
  if (f.includes("montserrat")) return '"Montserrat Variable", sans-serif';
  if (f.includes("geist")) return '"Geist Variable", sans-serif';
  if (f.includes("space grotesk") || f.includes("grotesk")) return '"Space Grotesk Variable", sans-serif';
  if (f.includes("outfit")) return '"Outfit Variable", sans-serif';
  if (f.includes("roboto")) return '"Roboto Variable", sans-serif';

  return fontFamily;
};
