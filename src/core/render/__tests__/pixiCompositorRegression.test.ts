/**
 * Pixi Compositor Regression Tests
 *
 * Promotes the previously-orphaned pixiCompositorValidation.ts QA tooling into a
 * real test suite. Originally these utilities were scaffolded to compare Canvas2D
 * output against Pixi WebGL output but were never wired up.
 *
 * Context (architecture):
 *   - PixiProgramPreview (WebGL) is the single preview pipeline for all users (all builds).
 *   - ComplexProgramPreview (Canvas2D) is scheduled for deletion (Step 8 of the migration).
 *   - The error boundary fallback is now WebGLUnavailableError — no Canvas2D fallback renderer.
 *   - Export is being migrated to PixiSceneCompositor (headless, Step 7). Until then,
 *     export still uses rasterizeScene (Canvas2D).
 *
 * TODO: Once a snapshot mechanism is available (e.g. Playwright / Vitest browser mode),
 * extend this file with tests that render a known scene through rasterizeScene()
 * and PixiSceneCompositor.composeFrame(), then assert pixelDiff < 1%.
 */

import { describe, it, expect, beforeAll } from "vitest";

// ── ImageData polyfill for jsdom (browser API not available in Node test env) ──
beforeAll(() => {
  if (typeof globalThis.ImageData === "undefined") {
    class ImageDataPolyfill {
      readonly data: Uint8ClampedArray;
      readonly width: number;
      readonly height: number;
      constructor(data: Uint8ClampedArray, width: number, height?: number) {
        this.data = data;
        this.width = width;
        this.height = height ?? data.length / 4 / width;
      }
    }
    // @ts-expect-error — jsdom polyfill
    globalThis.ImageData = ImageDataPolyfill;
  }
});

// ── Inline the pixelDiff logic (was pixiCompositorValidation.ts, now deleted) ──

interface ComparisonResult {
  match: boolean;
  mismatchPercentage: number;
  totalPixels: number;
  differentPixels: number;
}

function pixelDiff(imgData1: ImageData, imgData2: ImageData, threshold = 15): ComparisonResult {
  if (imgData1.width !== imgData2.width || imgData1.height !== imgData2.height) {
    return {
      match: false,
      mismatchPercentage: 100,
      totalPixels: imgData1.width * imgData1.height,
      differentPixels: imgData1.width * imgData1.height,
    };
  }

  const d1 = imgData1.data;
  const d2 = imgData2.data;
  const total = imgData1.width * imgData1.height;
  let diffCount = 0;

  for (let i = 0; i < d1.length; i += 4) {
    const dr = Math.abs(d1[i] - d2[i]);
    const dg = Math.abs(d1[i + 1] - d2[i + 1]);
    const db = Math.abs(d1[i + 2] - d2[i + 2]);
    const da = Math.abs(d1[i + 3] - d2[i + 3]);

    if (dr > threshold || dg > threshold || db > threshold || da > threshold) {
      diffCount++;
    }
  }

  const mismatchPercentage = (diffCount / total) * 100;

  return {
    match: mismatchPercentage < 1.0, // "match" requires strictly less than 1%
    mismatchPercentage,
    totalPixels: total,
    differentPixels: diffCount,
  };
}

/** Create a solid-colour ImageData (RGBA) */
function makeImageData(width: number, height: number, r: number, g: number, b: number, a = 255): ImageData {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = r;
    data[i + 1] = g;
    data[i + 2] = b;
    data[i + 3] = a;
  }
  return new ImageData(data, width, height);
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("pixelDiff", () => {
  it("returns match=true for identical images", () => {
    const a = makeImageData(4, 4, 128, 64, 32);
    const b = makeImageData(4, 4, 128, 64, 32);
    const result = pixelDiff(a, b);
    expect(result.match).toBe(true);
    expect(result.differentPixels).toBe(0);
    expect(result.mismatchPercentage).toBe(0);
  });

  it("returns match=false and 100% mismatch for dimension mismatch", () => {
    const a = makeImageData(4, 4, 0, 0, 0);
    const b = makeImageData(8, 8, 0, 0, 0);
    const result = pixelDiff(a, b);
    expect(result.match).toBe(false);
    expect(result.mismatchPercentage).toBe(100);
  });

  it("detects completely different images", () => {
    const a = makeImageData(4, 4, 0, 0, 0);
    const b = makeImageData(4, 4, 255, 255, 255);
    const result = pixelDiff(a, b);
    expect(result.match).toBe(false);
    expect(result.differentPixels).toBe(16);
    expect(result.mismatchPercentage).toBe(100);
  });

  it("accepts images within the threshold as matching", () => {
    const a = makeImageData(4, 4, 100, 100, 100);
    const b = makeImageData(4, 4, 110, 110, 110); // delta=10, threshold=15: no pixel differs
    const result = pixelDiff(a, b, 15);
    expect(result.match).toBe(true);
    expect(result.differentPixels).toBe(0);
  });

  it("rejects images exceeding the threshold", () => {
    const a = makeImageData(4, 4, 100, 100, 100);
    const b = makeImageData(4, 4, 120, 120, 120); // delta=20 exceeds threshold=15
    const result = pixelDiff(a, b, 15);
    expect(result.match).toBe(false);
    expect(result.differentPixels).toBe(16);
  });

  it("treats exactly 1% mismatch as not a match (strict < 1.0 threshold)", () => {
    // 1 out of 100 pixels corrupted → 1.0% which is NOT < 1.0, so match=false
    const width = 10;
    const height = 10;
    const data1 = new Uint8ClampedArray(width * height * 4).fill(128);
    const data2 = new Uint8ClampedArray(data1);
    data2[0] = 0;
    data2[1] = 0;
    data2[2] = 0;
    const a = new ImageData(data1, width, height);
    const b = new ImageData(data2, width, height);
    const result = pixelDiff(a, b);
    expect(result.differentPixels).toBe(1);
    expect(result.mismatchPercentage).toBe(1.0);
    expect(result.match).toBe(false); // exactly 1.0% fails the < 1.0 threshold
  });

  it("matches when fewer than 1% of pixels differ", () => {
    // 0 out of 100 pixels corrupted (channels all within threshold) → 0% mismatch
    const width = 10;
    const height = 10;
    const data1 = new Uint8ClampedArray(width * height * 4).fill(128);
    const data2 = new Uint8ClampedArray(data1); // identical
    const a = new ImageData(data1, width, height);
    const b = new ImageData(data2, width, height);
    const result = pixelDiff(a, b);
    expect(result.differentPixels).toBe(0);
    expect(result.mismatchPercentage).toBe(0);
    expect(result.match).toBe(true);
  });
});

// ── Placeholder for future snapshot regression tests ───────────────────────────
//
// describe("PixiSceneCompositor vs rasterizeScene regression", () => {
//   it("renders a known scene within 1% pixel diff", async () => {
//     // TODO: Requires Vitest browser mode or a headless WebGL environment.
//     // Steps:
//     //   1. Build a simple EvaluatedScene (solid image clip, no effects)
//     //   2. Call rasterizeScene(scene, { width: 320, height: 240 }) -> ImageData (reference)
//     //   3. Create PixiSceneCompositor on an OffscreenCanvas
//     //   4. Call compositor.composeFrame(scene, viewport, videoElements)
//     //   5. Read back pixels from Pixi canvas -> ImageData
//     //   6. Assert pixelDiff(reference, pixi).mismatchPercentage < 1.0
//   });
// });
