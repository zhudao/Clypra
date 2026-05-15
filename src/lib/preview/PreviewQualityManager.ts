/**
 * Preview Quality Manager
 *
 * Prevents 4K × DPR VRAM explosion by capping preview render resolution
 * based on interaction state. Separates:
 *   - Sequence resolution (authoring space, e.g. 1920×1080)
 *   - Render resolution (quality tier)
 *   - Display resolution (viewport size)
 *   - Device pixel ratio (retina scaling)
 *
 * Usage:
 *   const manager = new PreviewQualityManager({
 *     sequenceWidth: 1920, sequenceHeight: 1080,
 *     viewportWidth: 800, viewportHeight: 450, dpr: 2,
 *   });
 *   const profile = manager.getRenderProfile(PreviewQualityTier.Playback);
 *   // profile.maxWidth = capped at viewport × DPR, never exceeds sequence
 */

export enum PreviewQualityTier {
  /** Playback: half res, no DPR — prioritizes frame rate */
  Playback = "playback",
  /** Interaction: quarter res, prioritizes latency */
  Interaction = "interaction",
  /** Idle: full res, capped at viewport × DPR */
  Idle = "idle",
  /** Export: full res, no caps */
  Export = "export",
}

export interface PreviewRenderProfile {
  /** Maximum render width in pixels */
  maxWidth: number;
  /** Maximum render height in pixels */
  maxHeight: number;
  /** DPR multiplier applied to render resolution */
  dprScale: number;
  /** True if this tier uses DPR scaling */
  useDpr: boolean;
  /** Estimated VRAM per frame (bytes) */
  estimatedVRAMBytes: number;
}

interface PreviewQualityManagerOptions {
  sequenceWidth: number;
  sequenceHeight: number;
  viewportWidth: number;
  viewportHeight: number;
  dpr: number;
}

export class PreviewQualityManager {
  private sequenceWidth: number;
  private sequenceHeight: number;
  private viewportWidth: number;
  private viewportHeight: number;
  private dpr: number;

  constructor(options: PreviewQualityManagerOptions) {
    this.sequenceWidth = options.sequenceWidth;
    this.sequenceHeight = options.sequenceHeight;
    this.viewportWidth = options.viewportWidth;
    this.viewportHeight = options.viewportHeight;
    this.dpr = options.dpr;
  }

  /**
   * Update viewport dimensions (e.g. on resize).
   * Does NOT change sequence dimensions.
   */
  updateViewport(viewportWidth: number, viewportHeight: number, dpr?: number): void {
    this.viewportWidth = viewportWidth;
    this.viewportHeight = viewportHeight;
    if (dpr !== undefined) this.dpr = dpr;
  }

  /**
   * Get render profile for a quality tier.
   * All profiles are capped at viewport × DPR to prevent VRAM explosion,
   * except Export which is capped at sequence resolution only.
   */
  getRenderProfile(tier: PreviewQualityTier): PreviewRenderProfile {
    const viewportMaxWidth = this.viewportWidth * this.dpr;
    const viewportMaxHeight = this.viewportHeight * this.dpr;

    switch (tier) {
      case PreviewQualityTier.Playback: {
        // Half resolution, NO DPR — frame rate over fidelity
        const w = Math.min(this.sequenceWidth * 0.5, this.viewportWidth);
        const h = Math.min(this.sequenceHeight * 0.5, this.viewportHeight);
        return {
          maxWidth: Math.floor(w),
          maxHeight: Math.floor(h),
          dprScale: 1.0,
          useDpr: false,
          estimatedVRAMBytes: w * h * 4,
        };
      }

      case PreviewQualityTier.Interaction: {
        // Quarter resolution, prioritizes latency
        const w = Math.min(this.sequenceWidth * 0.25, this.viewportWidth * 0.5);
        const h = Math.min(this.sequenceHeight * 0.25, this.viewportHeight * 0.5);
        return {
          maxWidth: Math.floor(w),
          maxHeight: Math.floor(h),
          dprScale: 1.0,
          useDpr: false,
          estimatedVRAMBytes: w * h * 4,
        };
      }

      case PreviewQualityTier.Idle: {
        // Full resolution, capped at viewport × DPR
        const w = Math.min(this.sequenceWidth, viewportMaxWidth);
        const h = Math.min(this.sequenceHeight, viewportMaxHeight);
        return {
          maxWidth: Math.floor(w),
          maxHeight: Math.floor(h),
          dprScale: this.dpr,
          useDpr: true,
          estimatedVRAMBytes: w * h * 4,
        };
      }

      case PreviewQualityTier.Export: {
        // Full resolution, no viewport cap — used for final render
        return {
          maxWidth: this.sequenceWidth,
          maxHeight: this.sequenceHeight,
          dprScale: 1.0,
          useDpr: false,
          estimatedVRAMBytes: this.sequenceWidth * this.sequenceHeight * 4,
        };
      }
    }
  }

  /**
   * Select quality tier based on interaction state.
   *   - Playback → Playback (half res)
   *   - Scrubbing/Scrolling → Interaction (quarter res)
   *   - Idle → Idle (full res, viewport-capped)
   *   - Export mode → Export (full res, no cap)
   */
  selectTierForInteraction(
    isPlaying: boolean,
    isInteracting: boolean,
    isExporting: boolean = false,
  ): PreviewQualityTier {
    if (isExporting) return PreviewQualityTier.Export;
    if (isPlaying) return PreviewQualityTier.Playback;
    if (isInteracting) return PreviewQualityTier.Interaction;
    return PreviewQualityTier.Idle;
  }

  /**
   * Get the maximum safe render dimensions given current viewport and DPR.
   * This is the "never exceed" boundary to prevent VRAM exhaustion.
   */
  getSafeMaxDimensions(): { width: number; height: number } {
    const profile = this.getRenderProfile(PreviewQualityTier.Idle);
    return { width: profile.maxWidth, height: profile.maxHeight };
  }
}
