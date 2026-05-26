import { TextEffectDefinition } from "./types";
import { applyFontConfig } from "./helpers";

/**
 * Procedural Canvas 2D Gold Foil Stamp premium text renderer.
 * Draws a highly-realistic metallic stamp debossed into custom paper textures.
 */
export const renderGoldFoilStamp = (
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
  if (!effect.goldFoilStamp || !effect.goldFoilStamp.enabled) return;
  const config = effect.goldFoilStamp;
  const w = canvasWidth;
  const h = canvasHeight;

  // Safe color parsing helper
  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : { r: 229, g: 193, b: 88 };
  };

  ctx.save();
  ctx.globalCompositeOperation = "source-over";

  // Background and full-canvas paper texture removed to ensure 100% transparency
  // so the text effect overlays perfectly on top of timeline video.

  // 3. Configure master typography details
  applyFontConfig(ctx, effect.font, fontSize);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const debossDepth = config.debossDepth;
  const bevelHighlight = config.bevelHighlight;
  const foilContrast = config.foilContrast;

  // 4. Draw Deboss Shadow Layer (shifts top-left, heavy dark drop shadow, fill black)
  ctx.save();
  ctx.shadowColor = "rgba(0, 0, 0, 0.9)";
  ctx.shadowBlur = debossDepth * 1.5;
  ctx.shadowOffsetX = -debossDepth * 0.45;
  ctx.shadowOffsetY = -debossDepth * 0.45;
  ctx.fillStyle = "#000000";

  lines.forEach((line, index) => {
    const lineY = y - ((lines.length - 1) * lineHeightPx) / 2 + index * lineHeightPx;
    ctx.fillText(line, x + debossDepth, lineY + debossDepth);
  });
  ctx.restore();

  // 5. Draw Bevel Specular Highlight Layer (shifts bottom-right, clean white shadow, fill white)
  ctx.save();
  ctx.shadowColor = `rgba(255, 255, 255, ${bevelHighlight * 0.5})`;
  ctx.shadowBlur = debossDepth * 0.85;
  ctx.shadowOffsetX = debossDepth * 0.55;
  ctx.shadowOffsetY = debossDepth * 0.55;
  ctx.fillStyle = "#ffffff";

  lines.forEach((line, index) => {
    const lineY = y - ((lines.length - 1) * lineHeightPx) / 2 + index * lineHeightPx;
    ctx.fillText(line, x - debossDepth * 0.2, lineY - debossDepth * 0.2);
  });
  ctx.restore();

  // 6. Draw Premium Molten Gold Foil Gradient Layer
  ctx.save();
  ctx.shadowColor = "transparent";
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;

  const baseGold = hexToRgb(config.goldTone);
  const bounds = {
    x: x - textWidth / 2,
    y: y - textHeight / 2,
    w: textWidth,
    h: textHeight,
  };

  // Create linear metal reflection gradient spanning slightly wider than the text bounds
  const goldGrad = ctx.createLinearGradient(
    bounds.x - 100,
    bounds.y - 50,
    bounds.x + bounds.w + 100,
    bounds.y + bounds.h + 50
  );

  goldGrad.addColorStop(
    0,
    `rgb(${Math.max(0, baseGold.r - 120 * foilContrast)}, ${Math.max(
      0,
      baseGold.g - 100 * foilContrast
    )}, ${Math.max(0, baseGold.b - 60 * foilContrast)})`
  );
  goldGrad.addColorStop(
    0.2,
    `rgb(${Math.min(255, baseGold.r + 20)}, ${Math.min(
      255,
      baseGold.g + 20
    )}, ${Math.min(255, baseGold.b + 10)})`
  );
  goldGrad.addColorStop(
    0.4,
    `rgb(${Math.min(255, baseGold.r + 110 * foilContrast)}, ${Math.min(
      255,
      baseGold.g + 110 * foilContrast
    )}, ${Math.min(255, baseGold.b + 90 * foilContrast)})`
  );
  goldGrad.addColorStop(0.45, "rgb(255, 255, 220)");
  goldGrad.addColorStop(
    0.5,
    `rgb(${Math.max(0, baseGold.r - 40 * foilContrast)}, ${Math.max(
      0,
      baseGold.g - 35 * foilContrast
    )}, ${Math.max(0, baseGold.b - 20 * foilContrast)})`
  );
  goldGrad.addColorStop(0.7, `rgb(${baseGold.r}, ${baseGold.g}, ${baseGold.b})`);
  goldGrad.addColorStop(
    1,
    `rgb(${Math.max(0, baseGold.r - 130 * foilContrast)}, ${Math.max(
      0,
      baseGold.g - 110 * foilContrast
    )}, ${Math.max(0, baseGold.b - 70 * foilContrast)})`
  );

  ctx.fillStyle = goldGrad;
  lines.forEach((line, index) => {
    const lineY = y - ((lines.length - 1) * lineHeightPx) / 2 + index * lineHeightPx;
    ctx.fillText(line, x, lineY);
  });

  // 7. Draw Specular Foil Micro-Noise/Shimmer (Using radial gradient and source-atop compositing)
  const foilNoise = ctx.createRadialGradient(
    x,
    y,
    10,
    x,
    y,
    Math.max(textWidth * 0.8, textHeight * 1.5, 300)
  );
  foilNoise.addColorStop(0, "rgba(255, 255, 255, 0.08)");
  foilNoise.addColorStop(1, "rgba(0, 0, 0, 0.15)");
  ctx.fillStyle = foilNoise;

  ctx.globalCompositeOperation = "source-atop";
  lines.forEach((line, index) => {
    const lineY = y - ((lines.length - 1) * lineHeightPx) / 2 + index * lineHeightPx;
    ctx.fillText(line, x, lineY);
  });

  ctx.restore();
  ctx.restore();
};
