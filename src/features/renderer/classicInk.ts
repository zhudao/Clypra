import { TextEffectDefinition } from "./types";
import { applyFontConfig } from "./helpers";

/**
 * Procedural Canvas 2D Classic Ink premium text renderer.
 * Draws an old Hollywood editorial title style with a vertical ivory-silver gradient,
 * sharp miter outside stroke, soft charcoal drop shadow, and a diagonal specular highlight.
 */
export const renderClassicInk = (
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  text: string,
  effect: TextEffectDefinition,
  fontSize: number,
  x: number,
  y: number,
  canvasWidth: number,
  canvasHeight: number,
  lines: string[],
  lineHeightPx: number,
  textWidth: number,
  textHeight: number
) => {
  if (!effect.classicInk || !effect.classicInk.enabled) return;
  const config = effect.classicInk;

  // 1. Configure master typography details (Georgia Bold uppercase serif)
  ctx.save();
  applyFontConfig(ctx, effect.font, fontSize);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const bounds = {
    x: x - textWidth / 2,
    y: y - textHeight / 2,
    w: textWidth,
    h: textHeight,
  };

  // 2. Draw Soft Dimensional Drop Shadow (Shifted downward & slightly right)
  ctx.save();
  ctx.shadowColor = config.shadowColor;
  ctx.shadowBlur = 5;
  ctx.shadowOffsetX = 2.5; // Rightward offset
  ctx.shadowOffsetY = 5.0; // Downward offset (~twice the rightward)
  ctx.fillStyle = config.shadowColor;

  lines.forEach((line, index) => {
    const lineY = y - ((lines.length - 1) * lineHeightPx) / 2 + index * lineHeightPx;
    ctx.fillText(line.toUpperCase(), x, lineY);
  });
  ctx.restore();

  // 3. Draw Outside Outline (Sharp graphite gray line)
  // We draw this slightly thicker before drawing the fill on top.
  // This achieves a crisp "outside" stroke alignment without eating into letterforms.
  ctx.save();
  ctx.strokeStyle = config.strokeColor;
  ctx.lineWidth = 3.5; // leaving exactly 1.75px on the outside
  ctx.lineJoin = "miter";
  ctx.miterLimit = 10;

  lines.forEach((line, index) => {
    const lineY = y - ((lines.length - 1) * lineHeightPx) / 2 + index * lineHeightPx;
    ctx.strokeText(line.toUpperCase(), x, lineY);
  });
  ctx.restore();

  // 4. Draw Core Face Gradient (Warm ivory white to silver-gray spoon)
  ctx.save();
  const faceGrad = ctx.createLinearGradient(x, bounds.y, x, bounds.y + bounds.h);
  faceGrad.addColorStop(0, config.ivoryTone);
  faceGrad.addColorStop(0.5, config.midTone);
  faceGrad.addColorStop(1, config.darkTone);

  ctx.fillStyle = faceGrad;
  lines.forEach((line, index) => {
    const lineY = y - ((lines.length - 1) * lineHeightPx) / 2 + index * lineHeightPx;
    ctx.fillText(line.toUpperCase(), x, lineY);
  });
  ctx.restore();

  // 5. Draw Diagonal Specular Highlight (Subtle reflection over top 35% height)
  // Clipped strictly inside text shape using source-atop
  ctx.save();
  ctx.globalCompositeOperation = "source-atop";

  const specGrad = ctx.createLinearGradient(
    bounds.x,
    bounds.y,
    bounds.x + bounds.w * 0.4,
    bounds.y + bounds.h * 0.35
  );
  specGrad.addColorStop(0, `rgba(255, 255, 255, ${config.highlightIntensity})`);
  specGrad.addColorStop(0.7, `rgba(255, 255, 255, ${config.highlightIntensity * 0.5})`);
  specGrad.addColorStop(1, "rgba(255, 255, 255, 0)");

  ctx.fillStyle = specGrad;
  lines.forEach((line, index) => {
    const lineY = y - ((lines.length - 1) * lineHeightPx) / 2 + index * lineHeightPx;
    ctx.fillText(line.toUpperCase(), x, lineY);
  });
  ctx.restore();

  ctx.restore();
};
