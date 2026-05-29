import { applyFontConfig } from "./lib/helpers";
import { TextEffectDefinition } from "./types/types";
import { hasRegisteredEngine, renderRegisteredEffect } from "./registry";

/**
 * Core Canvas 2D Text Effects Rendering Context Engine.
 * Renders full text layers onto any rendering context.
 *
 * Effect dispatch is driven entirely by the registry — no per-effect if-blocks here.
 * To add a new effect: drop its file in effects/ and add two lines to registry.ts.
 */
export const renderTextEffectToContext = (ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D, text: string, effect: TextEffectDefinition, fontSize: number, _x: number, _y: number, canvasWidth: number, canvasHeight: number) => {
  // Registry dispatch — covers all studio-generated engine effects.
  // Registered engines set their own ctx.font and expect default textBaseline ("alphabetic").
  // Do NOT call applyFontConfig here — it sets textBaseline = "middle" which breaks
  // the engines' vertical centering math (fontSize * 0.8 offset assumes "alphabetic").
  if (hasRegisteredEngine(effect?.id)) {
    renderRegisteredEffect(ctx, effect, text, fontSize, canvasWidth, canvasHeight);
    return;
  }

  // Apply baseline font config only for the fallback generic renderer
  applyFontConfig(ctx, effect.font, fontSize);

  // ── Fallback generic renderer ────────────────────────────────────────────
  // Reached only for effects that are not registered in the registry.
  const lines = text.split("\n");
  const lineHeightPx = fontSize * (effect.font.lineHeight || 1.2);
  const totalHeight = (lines.length - 1) * lineHeightPx;
  const startY = _y - totalHeight / 2;

  const fill = effect.fills?.[0];
  const stroke = effect.strokes?.[0];
  const shadow = effect.shadows?.[0];

  ctx.save();

  // Apply Drop Shadow
  if (shadow) {
    ctx.shadowColor = shadow.color || "rgba(0,0,0,0.5)";
    ctx.shadowBlur = shadow.blur ?? 5;
    ctx.shadowOffsetX = shadow.offsetX ?? 0;
    ctx.shadowOffsetY = shadow.offsetY ?? 0;
  }

  // Set Fill Style
  const hasFill = !fill || fill.type !== "none";
  if (hasFill) {
    if (fill && fill.type === "gradient") {
      const stops = fill.gradient?.stops || [];
      const grad = ctx.createLinearGradient(_x, startY - fontSize / 2, _x, startY + totalHeight + fontSize / 2);
      stops.forEach((stop: any) => {
        const offset = typeof stop.offset === "number" ? stop.offset : (stop.position ?? 0);
        grad.addColorStop(offset, stop.color);
      });
      ctx.fillStyle = grad;
    } else {
      ctx.fillStyle = fill?.color || "#ffffff";
    }
  }

  // Set Stroke Style
  const hasStroke = !!stroke;
  if (hasStroke) {
    ctx.strokeStyle = stroke.color || "#000000";
    ctx.lineWidth = stroke.width ?? 2;
    ctx.lineJoin = stroke.lineJoin || "round";
  }

  // Draw lines
  lines.forEach((line, i) => {
    const currentY = startY + i * lineHeightPx;
    if (hasFill) {
      ctx.fillText(line, _x, currentY);
    }
    if (hasStroke) {
      // Disable shadow for outline/stroke to keep it crisp
      ctx.shadowColor = "transparent";
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
      ctx.strokeText(line, _x, currentY);
    }
  });

  ctx.restore();
};

/**
 * Core Canvas 2D Text Effects Rendering Engine.
 * Renders full text layers in premium NLE composition order.
 * @param canvas - The HTMLCanvasElement to render onto.
 * @param text - The text string, supporting newlines.
 * @param effect - The text effect definition block.
 * @param fontSize - Master font size in pixels.
 */
export const renderTextEffect = (canvas: HTMLCanvasElement, text: string, effect: TextEffectDefinition, fontSize: number) => {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  console.log("RENDER TEXT: ", effect);

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  renderTextEffectToContext(ctx, text, effect, fontSize, canvas.width / 2, canvas.height / 2, canvas.width, canvas.height);
};

/**
 * Renders the full text effect on a configurable offscreen canvas and returns a high-resolution export PNG data URL.
 * @param text - The text string.
 * @param effect - The text effect definition block.
 * @param fontSize - Master font size in pixels.
 * @param width - Canvas export width in px (default: 800).
 * @param height - Canvas export height in px (default: 400).
 * @returns A base64 PNG data URL string.
 */
export const renderTextEffectToDataURL = (text: string, effect: TextEffectDefinition, fontSize: number, width: number = 800, height: number = 400): string => {
  const offscreen = document.createElement("canvas");
  offscreen.width = width;
  offscreen.height = height;

  renderTextEffect(offscreen, text, effect, fontSize);
  return offscreen.toDataURL("image/png");
};
