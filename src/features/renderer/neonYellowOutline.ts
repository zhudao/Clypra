import { TextEffectDefinition } from "./types";
import { applyFontConfig } from "./helpers";

/**
 * Procedural Canvas 2D Neon Yellow Outline premium text renderer.
 * White body, crisp black stroke, and dual radiating yellow bloom glows.
 * Renders glows using modern hardware-accelerated Canvas context blurs to bypass WebKit native text shadow clipping.
 */
export const renderNeonYellowOutline = (
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
  if (!effect.neonYellowOutline || !effect.neonYellowOutline.enabled) return;
  const config = effect.neonYellowOutline;

  applyFontConfig(ctx, effect.font, fontSize);

  // Phase 1: Draw Wide Glow (Blur 10)
  ctx.save();
  ctx.globalAlpha = 0.4;
  if (config.glowWideBlur > 0) {
    (ctx as any).filter = `blur(${config.glowWideBlur}px)`;
  }
  lines.forEach((line, index) => {
    const lineY = y - ((lines.length - 1) * lineHeightPx) / 2 + index * lineHeightPx;
    
    // Grow wide glow from stroke shape
    ctx.strokeStyle = config.glowColor;
    ctx.lineWidth = config.strokeWidth * 2;
    ctx.lineJoin = "round";
    ctx.strokeText(line, x, lineY);

    // Fill shape for center density
    ctx.fillStyle = config.glowColor;
    ctx.fillText(line, x, lineY);
  });
  ctx.restore();

  // Phase 2: Draw Tight Glow (Blur 4)
  ctx.save();
  ctx.globalAlpha = 0.9;
  if (config.glowTightBlur > 0) {
    (ctx as any).filter = `blur(${config.glowTightBlur}px)`;
  }
  
  // Double-pass iterations for tight glow spread/opacity simulation
  for (let i = 0; i < 2; i++) {
    lines.forEach((line, index) => {
      const lineY = y - ((lines.length - 1) * lineHeightPx) / 2 + index * lineHeightPx;
      
      // Grow tight glow from stroke shape
      ctx.strokeStyle = config.glowColor;
      ctx.lineWidth = config.strokeWidth * 2;
      ctx.lineJoin = "round";
      ctx.strokeText(line, x, lineY);

      // Fill shape for core density
      ctx.fillStyle = config.glowColor;
      ctx.fillText(line, x, lineY);
    });
  }
  ctx.restore();

  // Phase 3: Draw Crisp Black Outside Stroke
  ctx.save();
  ctx.strokeStyle = config.strokeColor;
  ctx.lineWidth = config.strokeWidth * 2;
  ctx.lineJoin = "round";
  ctx.globalAlpha = 1.0;
  lines.forEach((line, index) => {
    const lineY = y - ((lines.length - 1) * lineHeightPx) / 2 + index * lineHeightPx;
    ctx.strokeText(line, x, lineY);
  });
  ctx.restore();

  // Phase 4: Draw White Text Body Fill
  ctx.save();
  ctx.fillStyle = config.fillColor;
  lines.forEach((line, index) => {
    const lineY = y - ((lines.length - 1) * lineHeightPx) / 2 + index * lineHeightPx;
    ctx.fillText(line, x, lineY);
  });
  ctx.restore();
};
