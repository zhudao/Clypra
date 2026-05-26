import { TextEffectDefinition } from "./types";
import { applyFontConfig } from "./helpers";

/**
 * Procedural Canvas 2D Classic Stamp premium text renderer.
 * Rubber stamp pressed with heavy ink. Bold sans-serif.
 * Flat solid deep red fill. Rough outer edge simulating ink bleed.
 * Mild inner shadow top-left edges (dark red). Hard drop shadow
 * offset (4,4) zero blur — stamp physical impression.
 * Imperfect is correct. Precise is wrong.
 */
export const renderClassicStamp = (
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
  if (!effect.classicStamp || !effect.classicStamp.enabled) return;
  const config = effect.classicStamp;

  ctx.save();
  applyFontConfig(ctx, effect.font, fontSize);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  // Seeded pseudo-random for reproducible roughness across renders
  const seededRandom = (seed: number): number => {
    const x = Math.sin(seed * 12.9898 + seed * 78.233) * 43758.5453;
    return x - Math.floor(x);
  };

  // 1. Hard drop shadow — stamp physical impression (offset 4,4, zero blur)
  ctx.save();
  ctx.fillStyle = "rgba(0, 0, 0, 0.45)";
  const offset = config.hardShadowOffset;
  lines.forEach((line, index) => {
    const lineY = y - ((lines.length - 1) * lineHeightPx) / 2 + index * lineHeightPx;
    ctx.fillText(line.toUpperCase(), x + offset, lineY + offset);
  });
  ctx.restore();

  // 2. Rough outer edge — simulate ink bleed by rendering multiple slightly
  //    jittered stroke passes at low opacity with the ink color
  ctx.save();
  const roughness = config.roughness;
  const jitterPasses = 8;
  ctx.strokeStyle = config.inkColor;
  ctx.lineWidth = 2.5;
  ctx.lineJoin = "round";
  ctx.globalAlpha = 0.25;

  for (let pass = 0; pass < jitterPasses; pass++) {
    const jx = (seededRandom(pass * 7 + 1) - 0.5) * 3.0 * roughness;
    const jy = (seededRandom(pass * 7 + 2) - 0.5) * 3.0 * roughness;

    lines.forEach((line, index) => {
      const lineY = y - ((lines.length - 1) * lineHeightPx) / 2 + index * lineHeightPx;
      ctx.strokeText(line.toUpperCase(), x + jx, lineY + jy);
    });
  }
  ctx.restore();

  // 3. Main flat solid deep red fill — no gradient
  ctx.save();
  ctx.fillStyle = config.inkColor;
  lines.forEach((line, index) => {
    const lineY = y - ((lines.length - 1) * lineHeightPx) / 2 + index * lineHeightPx;
    ctx.fillText(line.toUpperCase(), x, lineY);
  });
  ctx.restore();

  // 4. Faint ink texture overlay — subtle noise using multiply blend
  //    Draw tiny semi-transparent dots across the text area clipped to letterforms
  ctx.save();
  ctx.globalCompositeOperation = "source-atop";
  ctx.globalAlpha = 0.12;
  const dotCount = Math.floor(textWidth * textHeight * 0.015);
  for (let i = 0; i < dotCount; i++) {
    const dx = (seededRandom(i * 3 + 100) - 0.5) * textWidth + x;
    const dy = (seededRandom(i * 3 + 200) - 0.5) * textHeight + y;
    const radius = seededRandom(i * 3 + 300) * 1.5 + 0.3;
    const alpha = seededRandom(i * 3 + 400) * 0.6;
    ctx.fillStyle = `rgba(0, 0, 0, ${alpha})`;
    ctx.beginPath();
    ctx.arc(dx, dy, radius, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // 5. Mild inner shadow on top-left edges (dark red, not black)
  //    Uses the clip-then-shadow technique
  {
    const offscreen = document.createElement("canvas");
    offscreen.width = canvasWidth;
    offscreen.height = canvasHeight;
    const octx = offscreen.getContext("2d");
    if (octx) {
      applyFontConfig(octx, effect.font, fontSize);
      octx.textAlign = "center";
      octx.textBaseline = "middle";

      // Fill solid black — the wall
      octx.fillStyle = "black";
      octx.fillRect(0, 0, canvasWidth, canvasHeight);

      // Punch out text shape
      octx.globalCompositeOperation = "destination-out";
      lines.forEach((line, index) => {
        const lineY = y - ((lines.length - 1) * lineHeightPx) / 2 + index * lineHeightPx;
        octx.fillText(line.toUpperCase(), x, lineY);
      });

      // Draw inverted mask with inner shadow clipped to text
      ctx.save();
      ctx.globalCompositeOperation = "source-atop";
      ctx.shadowColor = config.innerShadowColor;
      ctx.shadowBlur = 3;
      ctx.shadowOffsetX = 2;
      ctx.shadowOffsetY = 2;
      ctx.globalAlpha = 1;
      ctx.drawImage(offscreen, 0, 0);
      ctx.restore();
    }
  }

  ctx.restore();
};
