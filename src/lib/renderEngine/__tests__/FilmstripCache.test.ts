/**
 * FilmstripCache.test.ts — RAF batching tests
 *
 * Verifies that artifact updates are batched per frame to prevent rerender storms.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { SpatialTier, VelocityState } from "../types";
import type { RenderEpochId } from "../types";

// Mock requestProgressiveTiers BEFORE importing FilmstripCache
const mockRequestProgressiveTiers = vi.fn();
vi.mock("../transport", () => ({
  requestProgressiveTiers: mockRequestProgressiveTiers,
}));

// Import AFTER mock is registered
const { FilmstripCache } = await import("../FilmstripCache");

const eid = (s: string) => s as RenderEpochId;

describe("FilmstripCache RAF Batching", () => {
  let cache: FilmstripCache;
  let rafCallbacks: Map<number, FrameRequestCallback>;
  let nextRafId: number;

  beforeEach(() => {
    cache = new FilmstripCache(100);
    rafCallbacks = new Map();
    nextRafId = 1;

    // Mock RAF
    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
      const id = nextRafId++;
      rafCallbacks.set(id, cb);
      return id;
    });

    vi.stubGlobal("cancelAnimationFrame", (id: number) => {
      rafCallbacks.delete(id);
    });

    mockRequestProgressiveTiers.mockClear();
  });

  afterEach(() => {
    cache.dispose();
    vi.unstubAllGlobals();
  });

  function flushRaf() {
    const callbacks = Array.from(rafCallbacks.values());
    rafCallbacks.clear();
    callbacks.forEach((cb) => cb(performance.now()));
  }

  function makeArtifact(timestampMs: number, spatialTier = SpatialTier.L1) {
    return {
      frameId: `f-${timestampMs}`,
      contentHash: `h-${timestampMs}`,
      spatialTier,
      bitmap: { width: 80, height: 45, close: vi.fn() } as unknown as ImageBitmap,
      width: 80,
      height: 45,
      timestampMs,
      epochId: eid("epoch-1"),
      source: "fresh-decode" as const,
    };
  }

  it("batches multiple artifacts into single update per frame", () => {
    let capturedOnArtifact: ((artifact: any) => void) | null = null;
    const onUpdate = vi.fn();

    mockRequestProgressiveTiers.mockImplementation((opts: any) => {
      capturedOnArtifact = opts.onArtifact;
      return vi.fn();
    });

    cache.requestFilmstrip({
      clipId: "clip-1",
      videoPath: "/test.mp4",
      trimIn: 0,
      trimOut: 10,
      duration: 10,
      clipStartTime: 0,
      clipWidthPx: 300,
      spatialTier: SpatialTier.L1,
      epochId: eid("epoch-1"),
      viewportScrollLeft: 0,
      viewportWidth: 1920,
      pixelsPerSecond: 30,
      onUpdate,
    });

    // Deliver 3 artifacts rapidly
    capturedOnArtifact?.(makeArtifact(1000));
    capturedOnArtifact?.(makeArtifact(2000));
    capturedOnArtifact?.(makeArtifact(3000));

    // Should NOT have called onUpdate yet (waiting for RAF)
    expect(onUpdate).not.toHaveBeenCalled();

    // Flush RAF
    flushRaf();

    // Should have called onUpdate ONCE with all 3 artifacts
    expect(onUpdate).toHaveBeenCalledTimes(1);
    expect(onUpdate).toHaveBeenCalledWith(expect.arrayContaining([expect.objectContaining({ timestampMs: 1000 }), expect.objectContaining({ timestampMs: 2000 }), expect.objectContaining({ timestampMs: 3000 })]));
  });

  it("deduplicates artifacts by timestamp during batch", () => {
    let capturedOnArtifact: ((artifact: any) => void) | null = null;
    const onUpdate = vi.fn();

    mockRequestProgressiveTiers.mockImplementation((opts: any) => {
      capturedOnArtifact = opts.onArtifact;
      return vi.fn();
    });

    cache.requestFilmstrip({
      clipId: "clip-1",
      videoPath: "/test.mp4",
      trimIn: 0,
      trimOut: 10,
      duration: 10,
      clipStartTime: 0,
      clipWidthPx: 300,
      spatialTier: SpatialTier.L1,
      epochId: eid("epoch-1"),
      viewportScrollLeft: 0,
      viewportWidth: 1920,
      pixelsPerSecond: 30,
      onUpdate,
    });

    // Deliver same timestamp at different tiers
    const artifact1 = makeArtifact(1000, SpatialTier.L0);
    const artifact2 = makeArtifact(1000, SpatialTier.L1);

    capturedOnArtifact?.(artifact1);
    capturedOnArtifact?.(artifact2);

    flushRaf();

    // Should have called onUpdate once with only the higher tier
    expect(onUpdate).toHaveBeenCalledTimes(1);
    const artifacts = onUpdate.mock.calls[0][0];
    expect(artifacts).toHaveLength(1);
    expect(artifacts[0].spatialTier).toBe(SpatialTier.L1);

    // Lower tier bitmap should be closed
    expect(artifact1.bitmap.close).toHaveBeenCalled();
  });

  it("cancels pending RAF on dispose", () => {
    let capturedOnArtifact: ((artifact: any) => void) | null = null;
    const onUpdate = vi.fn();

    mockRequestProgressiveTiers.mockImplementation((opts: any) => {
      capturedOnArtifact = opts.onArtifact;
      return vi.fn();
    });

    cache.requestFilmstrip({
      clipId: "clip-1",
      videoPath: "/test.mp4",
      trimIn: 0,
      trimOut: 10,
      duration: 10,
      clipStartTime: 0,
      clipWidthPx: 300,
      spatialTier: SpatialTier.L1,
      epochId: eid("epoch-1"),
      viewportScrollLeft: 0,
      viewportWidth: 1920,
      pixelsPerSecond: 30,
      onUpdate,
    });

    const artifact = makeArtifact(1000);
    capturedOnArtifact?.(artifact);

    // Dispose before RAF flush
    cache.dispose();

    // Flush RAF (should be no-op)
    flushRaf();

    // Should NOT have called onUpdate
    expect(onUpdate).not.toHaveBeenCalled();

    // Pending artifact bitmap should be closed
    expect(artifact.bitmap.close).toHaveBeenCalled();
  });

  it("cleans up pending artifacts on clip invalidation", () => {
    let capturedOnArtifact: ((artifact: any) => void) | null = null;
    const onUpdate = vi.fn();

    mockRequestProgressiveTiers.mockImplementation((opts: any) => {
      capturedOnArtifact = opts.onArtifact;
      return vi.fn();
    });

    cache.requestFilmstrip({
      clipId: "clip-1",
      videoPath: "/test.mp4",
      trimIn: 0,
      trimOut: 10,
      duration: 10,
      clipStartTime: 0,
      clipWidthPx: 300,
      spatialTier: SpatialTier.L1,
      epochId: eid("epoch-1"),
      viewportScrollLeft: 0,
      viewportWidth: 1920,
      pixelsPerSecond: 30,
      onUpdate,
    });

    const artifact = makeArtifact(1000);
    capturedOnArtifact?.(artifact);

    // Invalidate clip before RAF flush
    cache.invalidateClip("clip-1");

    // Flush RAF
    flushRaf();

    // Should NOT have called onUpdate
    expect(onUpdate).not.toHaveBeenCalled();

    // Pending artifact bitmap should be closed
    expect(artifact.bitmap.close).toHaveBeenCalled();
  });
});

describe("FilmstripCache Aggressive Cheating", () => {
  let cache: FilmstripCache;
  let rafCallbacks: Map<number, FrameRequestCallback>;
  let nextRafId: number;

  beforeEach(() => {
    cache = new FilmstripCache(100);
    rafCallbacks = new Map();
    nextRafId = 1;

    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
      const id = nextRafId++;
      rafCallbacks.set(id, cb);
      return id;
    });

    vi.stubGlobal("cancelAnimationFrame", (id: number) => {
      rafCallbacks.delete(id);
    });

    mockRequestProgressiveTiers.mockClear();
  });

  afterEach(() => {
    cache.dispose();
    vi.unstubAllGlobals();
  });

  function flushRaf() {
    const callbacks = Array.from(rafCallbacks.values());
    rafCallbacks.clear();
    callbacks.forEach((cb) => cb(performance.now()));
  }

  function makeArtifact(timestampMs: number, spatialTier = SpatialTier.L1) {
    return {
      frameId: `f-${timestampMs}`,
      contentHash: `h-${timestampMs}`,
      spatialTier,
      bitmap: { width: 80, height: 45, close: vi.fn() } as unknown as ImageBitmap,
      width: 80,
      height: 45,
      timestampMs,
      epochId: eid("epoch-1"),
      source: "fresh-decode" as const,
    };
  }

  it("shows stale tiles during fast scroll without requesting", () => {
    let capturedOnArtifact: ((artifact: any) => void) | null = null;
    const onUpdate = vi.fn();

    mockRequestProgressiveTiers.mockImplementation((opts: any) => {
      capturedOnArtifact = opts.onArtifact;
      return vi.fn();
    });

    // First request at stable velocity — populates tile cache
    cache.requestFilmstrip({
      clipId: "clip-1",
      videoPath: "/test.mp4",
      trimIn: 0,
      trimOut: 30,
      duration: 30,
      clipStartTime: 0,
      clipWidthPx: 1500,
      spatialTier: SpatialTier.L1, // 5s interval
      epochId: eid("epoch-1"),
      viewportScrollLeft: 0,
      viewportWidth: 1920,
      pixelsPerSecond: 50,
      onUpdate,
    });

    // Deliver artifacts to populate tile cache
    capturedOnArtifact?.(makeArtifact(0));
    capturedOnArtifact?.(makeArtifact(5000));
    capturedOnArtifact?.(makeArtifact(10000));
    flushRaf();

    // Now set fast velocity and request again (simulating scroll)
    cache.setVelocityState(VelocityState.Fast);
    onUpdate.mockClear();
    mockRequestProgressiveTiers.mockClear();

    cache.requestFilmstrip({
      clipId: "clip-1",
      videoPath: "/test.mp4",
      trimIn: 0,
      trimOut: 30,
      duration: 30,
      clipStartTime: 0,
      clipWidthPx: 1500,
      spatialTier: SpatialTier.L1,
      epochId: eid("epoch-1"),
      viewportScrollLeft: 100, // Slightly different viewport
      viewportWidth: 1920,
      pixelsPerSecond: 50,
      onUpdate,
    });

    // During fast scroll, should show cached tiles immediately (no RAF wait needed)
    expect(onUpdate).toHaveBeenCalled();
    // Should NOT have made a new request since all tiles are cached
    expect(mockRequestProgressiveTiers).not.toHaveBeenCalled();
  });

  it("requests missing tiles during fast scroll when not all cached", () => {
    const onUpdate = vi.fn();

    mockRequestProgressiveTiers.mockImplementation(() => vi.fn());

    // Fast velocity, no prior cache
    cache.setVelocityState(VelocityState.Fast);

    cache.requestFilmstrip({
      clipId: "clip-1",
      videoPath: "/test.mp4",
      trimIn: 0,
      trimOut: 30,
      duration: 30,
      clipStartTime: 0,
      clipWidthPx: 1500,
      spatialTier: SpatialTier.L1,
      epochId: eid("epoch-1"),
      viewportScrollLeft: 0,
      viewportWidth: 1920,
      pixelsPerSecond: 50,
      onUpdate,
    });

    // Not all cached, so should still request
    expect(mockRequestProgressiveTiers).toHaveBeenCalledTimes(1);
    // But should also have called onUpdate with whatever is available (empty)
    expect(onUpdate).toHaveBeenCalled();
  });

  it("skips aggressive cheating at stable velocity", () => {
    let capturedOnArtifact: ((artifact: any) => void) | null = null;
    const onUpdate = vi.fn();

    mockRequestProgressiveTiers.mockImplementation((opts: any) => {
      capturedOnArtifact = opts.onArtifact;
      return vi.fn();
    });

    // Stable velocity
    cache.setVelocityState(VelocityState.Stable);

    cache.requestFilmstrip({
      clipId: "clip-1",
      videoPath: "/test.mp4",
      trimIn: 0,
      trimOut: 30,
      duration: 30,
      clipStartTime: 0,
      clipWidthPx: 1500,
      spatialTier: SpatialTier.L1,
      epochId: eid("epoch-1"),
      viewportScrollLeft: 0,
      viewportWidth: 1920,
      pixelsPerSecond: 50,
      onUpdate,
    });

    expect(mockRequestProgressiveTiers).toHaveBeenCalledTimes(1);
    // Should request normally, not show stale tiles
  });
});
