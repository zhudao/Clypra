import { TextEffectDefinition } from "./types";
import { applyFontConfig, interpolateColor } from "./helpers";

/**
 * Procedural Canvas 2D Classic Serif Gold premium text renderer.
 * Luxury editorial gold with multi-stop vertical gradient, warm-brown
 * outer stroke, soft drop shadow, 5-layer bevel extrusion, and
 * diagonal specular highlight clipped to letterforms.
 */
export const renderClassicSerifGold = (
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
  if (!effect.classicSerifGold || !effect.classicSerifGold.enabled) return;
  const config = effect.classicSerifGold;

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
  const drawTextLines = (mode: "fill" | "stroke") => {
    lines.forEach((line, index) => {
      const lineY = y - ((lines.length - 1) * lineHeightPx) / 2 + index * lineHeightPx;
      if (mode === "fill") {
        ctx.fillText(line.toUpperCase(), x, lineY);
      } else {
        ctx.strokeText(line.toUpperCase(), x, lineY);
      }
    });
  };

  // 1. Soft warm drop shadow
  ctx.save();
  ctx.shadowColor = "rgba(40, 25, 10, 0.65)";
  ctx.shadowBlur = 8;
  ctx.shadowOffsetX = 3;
  ctx.shadowOffsetY = 5;
  ctx.fillStyle = "rgba(40, 25, 10, 0.65)";
  drawTextLines("fill");
  ctx.restore();

  // 2. Bevel extrusion — 5 stacked offset copies interpolating dark-amber to pale-gold
  ctx.save();
  const bevelDepth = config.bevelDepth;
  for (let d = bevelDepth; d > 0; d--) {
    const factor = (bevelDepth - d) / bevelDepth;
    const layerColor = interpolateColor(config.bevelDark, config.bevelLight, factor);
    ctx.fillStyle = layerColor;

    lines.forEach((line, index) => {
      const lineY = y - ((lines.length - 1) * lineHeightPx) / 2 + index * lineHeightPx;
      ctx.fillText(line.toUpperCase(), x + d, lineY + d);
    });
  }
  ctx.restore();

  // 3. Medium warm-brown outer stroke (2px)
  ctx.save();
  ctx.strokeStyle = config.strokeColor;
  ctx.lineWidth = 4; // 2px on outside (Canvas lineWidth is center-aligned, so 4 total)
  ctx.lineJoin = "round";
  drawTextLines("stroke");
  ctx.restore();

  // 4. Core gold gradient fill — champagne top → rich gold mid → deep amber bottom → slight base brightening
  ctx.save();
  const goldGrad = ctx.createLinearGradient(x, bounds.y, x, bounds.y + bounds.h);
  goldGrad.addColorStop(0, config.champagneTop);
  goldGrad.addColorStop(0.35, config.richGold);
  goldGrad.addColorStop(0.7, config.deepAmber);
  goldGrad.addColorStop(1.0, config.baseBright);
  ctx.fillStyle = goldGrad;
  drawTextLines("fill");
  ctx.restore();

  // 5. Diagonal specular highlight clipped to letterforms via source-atop
  ctx.save();
  ctx.globalCompositeOperation = "source-atop";

  const specGrad = ctx.createLinearGradient(
    bounds.x,
    bounds.y,
    bounds.x + bounds.w * 0.45,
    bounds.y + bounds.h * 0.3
  );
  specGrad.addColorStop(0, `rgba(255, 255, 240, ${config.highlightIntensity})`);
  specGrad.addColorStop(0.6, `rgba(255, 255, 240, ${config.highlightIntensity * 0.5})`);
  specGrad.addColorStop(1, "rgba(255, 255, 240, 0)");

  ctx.fillStyle = specGrad;
  drawTextLines("fill");
  ctx.restore();

  ctx.restore();
};
