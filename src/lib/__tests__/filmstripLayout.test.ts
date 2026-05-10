import { describe, expect, it } from "vitest";
import {
  DEFAULT_FILMSTRIP_TILE_WIDTH_PX,
  computeFilmstripTileCount,
  generateFilmstripSlotTimestamps,
  getFilmstripTileWidthForTier,
  getFrameAspectRatio,
} from "../filmstripLayout";
import { SpatialTier } from "../renderEngine/types";

describe("filmstripLayout", () => {
  it("uses fixed readability tile widths per spatial tier", () => {
    expect(getFilmstripTileWidthForTier(SpatialTier.L0)).toBe(48);
    expect(getFilmstripTileWidthForTier(SpatialTier.L1)).toBe(72);
    expect(getFilmstripTileWidthForTier(SpatialTier.L2)).toBe(96);
    expect(getFilmstripTileWidthForTier(SpatialTier.L3)).toBe(128);
  });

  it("changes tile count, not tile width, when clip width changes", () => {
    expect(computeFilmstripTileCount(130, 60)).toBe(3);
    expect(computeFilmstripTileCount(300, 60)).toBe(5);
  });

  it("keeps media aspect ratio helper for crop policy, not cadence", () => {
    expect(getFrameAspectRatio(1080, 1920)).toBeCloseTo(0.5625);
    expect(getFrameAspectRatio(undefined, 1080)).toBeNull();
    expect(getFilmstripTileWidthForTier(null)).toBe(DEFAULT_FILMSTRIP_TILE_WIDTH_PX);
  });

  it("derives timestamps from visible tile slots", () => {
    expect(generateFilmstripSlotTimestamps({
      trimIn: 0,
      trimOut: 10,
      duration: 10,
      clipWidthPx: 300,
      tileWidthPx: 100,
    })).toEqual([1.667, 5, 8.333]);
  });
});
