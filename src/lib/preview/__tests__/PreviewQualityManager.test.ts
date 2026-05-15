/**
 * PreviewQualityManager tests
 *
 * Verifies resolution capping, DPR handling, and tier selection logic.
 */

import { describe, it, expect } from "vitest";
import { PreviewQualityManager, PreviewQualityTier } from "../PreviewQualityManager";

describe("PreviewQualityManager", () => {
  it("caps idle tier at viewport × DPR", () => {
    const manager = new PreviewQualityManager({
      sequenceWidth: 3840,
      sequenceHeight: 2160,
      viewportWidth: 800,
      viewportHeight: 450,
      dpr: 2,
    });

    const profile = manager.getRenderProfile(PreviewQualityTier.Idle);
    expect(profile.maxWidth).toBe(1600); // 800 × 2
    expect(profile.maxHeight).toBe(900); // 450 × 2
    expect(profile.useDpr).toBe(true);
  });

  it("prevents 4K × DPR VRAM explosion on retina", () => {
    const manager = new PreviewQualityManager({
      sequenceWidth: 3840,
      sequenceHeight: 2160,
      viewportWidth: 600,
      viewportHeight: 338,
      dpr: 3,
    });

    const profile = manager.getRenderProfile(PreviewQualityTier.Idle);
    expect(profile.maxWidth).toBe(1800); // 600 × 3, NOT 3840 × 3
    expect(profile.maxHeight).toBe(1014); // 338 × 3
  });

  it("playback tier uses half res without DPR", () => {
    const manager = new PreviewQualityManager({
      sequenceWidth: 1920,
      sequenceHeight: 1080,
      viewportWidth: 800,
      viewportHeight: 450,
      dpr: 2,
    });

    const profile = manager.getRenderProfile(PreviewQualityTier.Playback);
    expect(profile.maxWidth).toBe(800); // min(1920 × 0.5, viewport 800)
    expect(profile.maxHeight).toBe(450); // min(1080 × 0.5, viewport 450)
    expect(profile.useDpr).toBe(false);
  });

  it("interaction tier uses quarter res for latency", () => {
    const manager = new PreviewQualityManager({
      sequenceWidth: 1920,
      sequenceHeight: 1080,
      viewportWidth: 800,
      viewportHeight: 450,
      dpr: 2,
    });

    const profile = manager.getRenderProfile(PreviewQualityTier.Interaction);
    expect(profile.maxWidth).toBe(400); // min(1920 × 0.25, 800 × 0.5)
    expect(profile.maxHeight).toBe(225); // min(1080 × 0.25, 450 × 0.5)
    expect(profile.useDpr).toBe(false);
  });

  it("export tier uses full sequence resolution", () => {
    const manager = new PreviewQualityManager({
      sequenceWidth: 1920,
      sequenceHeight: 1080,
      viewportWidth: 400,
      viewportHeight: 225,
      dpr: 2,
    });

    const profile = manager.getRenderProfile(PreviewQualityTier.Export);
    expect(profile.maxWidth).toBe(1920);
    expect(profile.maxHeight).toBe(1080);
    expect(profile.useDpr).toBe(false);
  });

  it("selects correct tier for interaction states", () => {
    const manager = new PreviewQualityManager({
      sequenceWidth: 1920,
      sequenceHeight: 1080,
      viewportWidth: 800,
      viewportHeight: 450,
      dpr: 1,
    });

    expect(manager.selectTierForInteraction(false, false, false)).toBe(PreviewQualityTier.Idle);
    expect(manager.selectTierForInteraction(false, true, false)).toBe(PreviewQualityTier.Interaction);
    expect(manager.selectTierForInteraction(true, false, false)).toBe(PreviewQualityTier.Playback);
    expect(manager.selectTierForInteraction(false, false, true)).toBe(PreviewQualityTier.Export);
  });

  it("updates viewport dimensions", () => {
    const manager = new PreviewQualityManager({
      sequenceWidth: 1920,
      sequenceHeight: 1080,
      viewportWidth: 800,
      viewportHeight: 450,
      dpr: 2,
    });

    manager.updateViewport(400, 225, 1);
    const profile = manager.getRenderProfile(PreviewQualityTier.Idle);
    expect(profile.maxWidth).toBe(400); // 400 × 1
    expect(profile.maxHeight).toBe(225); // 225 × 1
  });

  it("getSafeMaxDimensions returns idle-tier caps", () => {
    const manager = new PreviewQualityManager({
      sequenceWidth: 3840,
      sequenceHeight: 2160,
      viewportWidth: 800,
      viewportHeight: 450,
      dpr: 2,
    });

    const dims = manager.getSafeMaxDimensions();
    expect(dims.width).toBe(1600);
    expect(dims.height).toBe(900);
  });
});
