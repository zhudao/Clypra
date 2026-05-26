import { TextEffectDefinition } from "./types";
import { applyFontConfig } from "./helpers";

/**
 * Procedural Canvas 2D Classic Neon Sign premium text renderer.
 * 1950s diner neon. Hollow letters — strokeText() only, never fillText()
 * on the letter body. Interior is fully transparent.
 * Warm white core stroke with three glow layers.
 *
 * KEY TECHNIQUE: All glow + stroke layers are rendered to an offscreen
 * canvas, then the letter interiors are punched out with destination-out
 * + fillText. This prevents shadowBlur from bleeding inward and filling
 * the letter shapes. The punched result is then composited onto the
 * main canvas.
 *
 * Floor reflection: full effect rendered to a second offscreen canvas,
 * flipped vertically, drawn below baseline at reduced opacity with
 * vertical fade mask. Background glow paints onto transparent canvas —
 * fades to alpha, never to black.
 */
export const renderClassicNeonSign = (
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
  if (!effect.classicNeonSign || !effect.classicNeonSign.enabled) return;
  const config = effect.classicNeonSign;

  // Helper to stroke text across all lines (uppercase) — NEVER fill on letter body
  const strokeAllLines = (
    target: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
    cx: number,
    cy: number
  ) => {
    lines.forEach((line, index) => {
      const lineY = cy - ((lines.length - 1) * lineHeightPx) / 2 + index * lineHeightPx;
      target.strokeText(line.toUpperCase(), cx, lineY);
    });
  };

  // Helper to fill text across all lines (used ONLY for interior punch-out mask)
  const fillAllLines = (
    target: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
    cx: number,
    cy: number
  ) => {
    lines.forEach((line, index) => {
      const lineY = cy - ((lines.length - 1) * lineHeightPx) / 2 + index * lineHeightPx;
      target.fillText(line.toUpperCase(), cx, lineY);
    });
  };

  /**
   * Renders the complete neon effect (glows + core) onto a given context,
   * then punches out the letter interiors so they remain fully transparent.
   * Returns: nothing — draws directly to the target context.
   */
  const renderNeonToContext = (
    target: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
    cx: number,
    cy: number,
    w: number,
    h: number
  ) => {
    // Phase A: Render all glow + stroke layers to a temp offscreen canvas
    const glowCanvas = document.createElement("canvas");
    glowCanvas.width = w;
    glowCanvas.height = h;
    const gctx = glowCanvas.getContext("2d");
    if (!gctx) return;

    applyFontConfig(gctx, effect.font, fontSize);
    gctx.textAlign = "center";
    gctx.textBaseline = "middle";
    gctx.lineCap = "round";
    gctx.lineJoin = "round";

    // Glow Layer 3 — Wide deep orange-red ambient glow
    gctx.save();
    gctx.strokeStyle = config.glowWide;
    gctx.lineWidth = config.coreWidth + 6;
    gctx.shadowColor = config.glowWide;
    gctx.shadowBlur = config.glowWideBlur;
    gctx.shadowOffsetX = 0;
    gctx.shadowOffsetY = 0;
    gctx.globalAlpha = 0.5;
    strokeAllLines(gctx, cx, cy);
    // Second pass for stronger bloom
    strokeAllLines(gctx, cx, cy);
    gctx.restore();

    // Glow Layer 2 — Mid warm amber glow
    gctx.save();
    gctx.strokeStyle = config.glowMid;
    gctx.lineWidth = config.coreWidth + 3;
    gctx.shadowColor = config.glowMid;
    gctx.shadowBlur = config.glowMidBlur;
    gctx.shadowOffsetX = 0;
    gctx.shadowOffsetY = 0;
    gctx.globalAlpha = 0.7;
    strokeAllLines(gctx, cx, cy);
    gctx.restore();

    // Glow Layer 1 — Tight white glow
    gctx.save();
    gctx.strokeStyle = config.glowTight;
    gctx.lineWidth = config.coreWidth + 1;
    gctx.shadowColor = config.glowTight;
    gctx.shadowBlur = config.glowTightBlur;
    gctx.shadowOffsetX = 0;
    gctx.shadowOffsetY = 0;
    gctx.globalAlpha = 0.9;
    strokeAllLines(gctx, cx, cy);
    gctx.restore();

    // Core stroke — warm white, sharp, no shadow
    gctx.save();
    gctx.strokeStyle = config.coreColor;
    gctx.lineWidth = config.coreWidth;
    gctx.shadowColor = "transparent";
    gctx.shadowBlur = 0;
    gctx.globalAlpha = 1;
    strokeAllLines(gctx, cx, cy);
    gctx.restore();

    // Phase B: Punch out letter interiors using destination-out + fillText.
    // This removes any glow bleed that filled the inside of the letters,
    // making the interior fully transparent (checkerboard shows through).
    // We inset the punch slightly (by drawing with a very thin stroke first
    // as the "keep" mask) so the tube outline itself is preserved.
    const punchCanvas = document.createElement("canvas");
    punchCanvas.width = w;
    punchCanvas.height = h;
    const pctx = punchCanvas.getContext("2d");
    if (!pctx) return;

    // Draw the text fill shape — this is the area to punch out
    applyFontConfig(pctx, effect.font, fontSize);
    pctx.textAlign = "center";
    pctx.textBaseline = "middle";
    pctx.fillStyle = "white";
    fillAllLines(pctx, cx, cy);

    // Shrink the punch mask inward by erasing the outline edge.
    // This keeps a thin ring of glow on the inner edge of the stroke.
    pctx.save();
    pctx.globalCompositeOperation = "destination-out";
    pctx.strokeStyle = "white";
    pctx.lineWidth = config.coreWidth + 1; // match the tube width
    pctx.lineCap = "round";
    pctx.lineJoin = "round";
    strokeAllLines(pctx, cx, cy);
    pctx.restore();

    // Apply the punch to the glow canvas
    gctx.save();
    gctx.globalCompositeOperation = "destination-out";
    gctx.drawImage(punchCanvas, 0, 0);
    gctx.restore();

    // Phase C: Composite the punched neon onto the target context
    target.drawImage(glowCanvas, 0, 0);
  };

  // ── Step 1: Render main neon effect ─────────────────────────────────
  ctx.save();
  renderNeonToContext(ctx, x, y, canvasWidth, canvasHeight);
  ctx.restore();

  // ── Step 2: Floor reflection ────────────────────────────────────────
  // Render the full neon effect to an offscreen canvas, then flip vertically
  // and draw below baseline with fade-out opacity mask.
  {
    const reflCanvas = document.createElement("canvas");
    reflCanvas.width = canvasWidth;
    reflCanvas.height = canvasHeight;
    const rctx = reflCanvas.getContext("2d");
    if (rctx) {
      // Render the complete punched neon effect onto the offscreen canvas
      renderNeonToContext(rctx, x, y, canvasWidth, canvasHeight);

      // Apply vertical fade mask using destination-in compositing
      rctx.save();
      rctx.globalCompositeOperation = "destination-in";

      // The fade gradient: partial opacity at the text baseline, fading to 0 below
      const fadeLength = config.reflectionFade;
      const baselineY = y + textHeight / 2;
      const fadeGrad = rctx.createLinearGradient(0, baselineY - fontSize * 0.3, 0, baselineY + fadeLength);
      fadeGrad.addColorStop(0, `rgba(0, 0, 0, ${config.reflectionOpacity})`);
      fadeGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
      rctx.fillStyle = fadeGrad;
      rctx.fillRect(0, 0, canvasWidth, canvasHeight);
      rctx.restore();

      // Draw the reflection: translate to flip point and scale Y by -1
      ctx.save();
      const reflOffset = textHeight + fontSize * 0.6;
      ctx.translate(0, y * 2 + reflOffset);
      ctx.scale(1, -1);
      ctx.drawImage(reflCanvas, 0, 0);
      ctx.restore();
    }
  }
};
