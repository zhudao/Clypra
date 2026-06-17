import { describe, expect, it } from "vitest";
import { calculateTextClipSize, createTextClip } from "../text/textClip";
import type { TextEffectDefinition } from "@clypra/engine";

const inkGlowEffect = {
  id: "neon-crimson",
  name: "Neon Crimson",
  category: "built-in",
  description: "",
  tags: [],
  boundingBox: {
    mode: "ink",
    paddingX: 92,
    paddingY: 92,
  },
  font: {
    family: "Bebas Neue",
    weight: 400,
    style: "italic",
    letterSpacing: 8,
    lineHeight: 1.2,
  },
  fills: [{ type: "solid", color: "#ffffff" }],
  strokes: [],
  shadows: [],
  glows: [{ color: "#ff004c", blur: 80, opacity: 80, type: "outer" }],
} satisfies TextEffectDefinition;

describe("calculateTextClipSize", () => {
  it("uses text effect typography when creating a style clip without explicit overrides", () => {
    const clip = createTextClip({
      trackId: "track-1",
      startTime: 0,
      duration: 3,
      text: "NEON",
      canvasWidth: 1920,
      canvasHeight: 1080,
      styleId: inkGlowEffect.id,
      effectDefinition: inkGlowEffect,
    });

    expect(clip.fontFamily).toBe("Bebas Neue");
    expect(clip.fontWeight).toBe(400);
    expect(clip.fontStyle).toBe("italic");
    expect(clip.lineHeight).toBe(1.2);
    expect(clip.letterSpacing).toBe(8);
    expect(clip.styleDefinition).toBe(inkGlowEffect);
  });

  it("does not put ink-effect render bleed into the editable text box height", () => {
    const sized = calculateTextClipSize({
      text: "CLYPRA",
      fontFamily: "Bebas Neue",
      fontSize: 100,
      styleId: "neon-crimson",
      effectDefinition: inkGlowEffect,
      canvasWidth: 1080,
    });

    expect(sized.bleed.y).toBe(92);
    expect(sized.height).toBeCloseTo(135);
    expect(sized.height).toBeLessThan(220);
  });

  it("reserves additional height when massive text wraps inside the canvas width cap", () => {
    const singleLine = calculateTextClipSize({
      text: "A",
      fontFamily: "Inter, system-ui, sans-serif",
      fontSize: 520,
      styleId: "neon-outline",
      effectDefinition: inkGlowEffect,
      canvasWidth: 640,
    });

    const wrapped = calculateTextClipSize({
      text: "CLYPRA",
      fontFamily: "Inter, system-ui, sans-serif",
      fontSize: 520,
      styleId: "neon-outline",
      effectDefinition: inkGlowEffect,
      canvasWidth: 640,
    });

    expect(wrapped.width).toBeLessThanOrEqual(640 * 0.95);
    expect(wrapped.height).toBeGreaterThan(singleLine.height * 1.5);
  });
});
