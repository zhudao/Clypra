import { TextEffectDefinition } from "./types";
import { applyFontConfig } from "./helpers";

/**
 * Procedural Canvas 2D Classic Engraved premium text renderer.
 * Letters sink inward — the visual opposite of Classic Ink.
 * Dark warm-bronze gradient fill, hairline pale-cream outer edge,
 * dark inner shadow on top-left, bright inner highlight on bottom-right.
 * Zero drop shadow. Zero glow. Depth is entirely internal.
 * Uses clip-then-shadow Canvas 2D technique for correct inner shadow clipping.
 */
export const renderClassicEngraved = (
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
  if (!effect.classicEngraved || !effect.classicEngraved.enabled) return;
  const config = effect.classicEngraved;

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

  // Helper to draw text across all lines (uppercase)
  const drawTextLines = (
    target: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
    mode: "fill" | "stroke"
  ) => {
    lines.forEach((line, index) => {
      const lineY = y - ((lines.length - 1) * lineHeightPx) / 2 + index * lineHeightPx;
      if (mode === "fill") {
        target.fillText(line.toUpperCase(), x, lineY);
      } else {
        target.strokeText(line.toUpperCase(), x, lineY);
      }
    });
  };

  // 1. Draw hairline pale-cream outer edge stroke (drawn first so fill covers its inner portion)
  ctx.save();
  ctx.strokeStyle = config.creamEdge;
  ctx.lineWidth = 1.5;
  ctx.lineJoin = "round";
  ctx.globalAlpha = 0.85;
  drawTextLines(ctx, "stroke");
  ctx.restore();

  // 2. Draw dark warm-bronze vertical gradient fill (the letter face)
  ctx.save();
  const faceGrad = ctx.createLinearGradient(x, bounds.y, x, bounds.y + bounds.h);
  faceGrad.addColorStop(0, config.bronzeDark);
  faceGrad.addColorStop(0.45, "#6B4C3A");
  faceGrad.addColorStop(1, config.bronzeLight);
  ctx.fillStyle = faceGrad;
  drawTextLines(ctx, "fill");
  ctx.restore();

  // 3. Inner shadow — dark top-left edges (clip-then-shadow technique)
  // Creates an inverted mask on an offscreen canvas, then draws it with shadow
  // using source-atop compositing to clip the shadow to the text shape.
  {
    const offscreen = document.createElement("canvas");
    offscreen.width = canvasWidth;
    offscreen.height = canvasHeight;
    const octx = offscreen.getContext("2d");
    if (octx) {
      applyFontConfig(octx, effect.font, fontSize);
      octx.textAlign = "center";
      octx.textBaseline = "middle";

      // Fill solid black (the "wall" that casts the shadow)
      octx.fillStyle = "black";
      octx.fillRect(0, 0, canvasWidth, canvasHeight);

      // Punch out the text shape — creating the "window" for the inner shadow
      octx.globalCompositeOperation = "destination-out";
      lines.forEach((line, index) => {
        const lineY = y - ((lines.length - 1) * lineHeightPx) / 2 + index * lineHeightPx;
        octx.fillText(line.toUpperCase(), x, lineY);
      });

      // Draw the inverted mask onto the main canvas with shadow, clipped to text
      ctx.save();
      ctx.globalCompositeOperation = "source-atop";
      ctx.shadowColor = config.innerShadowColor;
      ctx.shadowBlur = 4;
      ctx.shadowOffsetX = 2.5;   // Shadow offset from top-left (pushes shadow down-right into the letter)
      ctx.shadowOffsetY = 2.5;
      ctx.globalAlpha = 1;
      ctx.drawImage(offscreen, 0, 0);
      ctx.restore();
    }
  }

  // 4. Inner highlight — bright bottom-right edges (clip-then-shadow technique)
  {
    const offscreen2 = document.createElement("canvas");
    offscreen2.width = canvasWidth;
    offscreen2.height = canvasHeight;
    const octx2 = offscreen2.getContext("2d");
    if (octx2) {
      applyFontConfig(octx2, effect.font, fontSize);
      octx2.textAlign = "center";
      octx2.textBaseline = "middle";

      octx2.fillStyle = "black";
      octx2.fillRect(0, 0, canvasWidth, canvasHeight);

      octx2.globalCompositeOperation = "destination-out";
      lines.forEach((line, index) => {
        const lineY = y - ((lines.length - 1) * lineHeightPx) / 2 + index * lineHeightPx;
        octx2.fillText(line.toUpperCase(), x, lineY);
      });

      ctx.save();
      ctx.globalCompositeOperation = "source-atop";
      ctx.shadowColor = config.innerHighlightColor;
      ctx.shadowBlur = 3;
      ctx.shadowOffsetX = -2;    // Shadow offset from bottom-right (pushes highlight up-left into letter)
      ctx.shadowOffsetY = -2;
      ctx.globalAlpha = 1;
      ctx.drawImage(offscreen2, 0, 0);
      ctx.restore();
    }
  }

  ctx.restore();
};
