/**
 * useFilmstrip — hook for ClipFilmstrip
 *
 * Replaces the inline extraction orchestration in ClipFilmstrip.
 * ClipFilmstrip becomes a pure canvas consumer.
 *
 * Responsibilities:
 *   - Subscribe to RenderRuntime epoch for this clip
 *   - Request artifacts via transport layer (requestBatchArtifacts)
 *   - Re-request on epoch change (triggers on zoom-tier-commit, scroll, trim)
 *   - Cancel in-flight requests on epoch change or unmount
 *   - Return sorted TransportArtifacts for RasterSurface to render
 *
 * Non-responsibilities (intentionally excluded):
 *   - Tile layout math (RasterSurface handles this)
 *   - Canvas drawing (RasterSurface handles this)
 *   - Zoom level → tier mapping (SRP via RenderRuntime handles this)
 *   - Epoch computation (RenderRuntime handles this)
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { useRenderEngineStore } from "../store/renderEngineStore";
import { useRenderState } from "./renderEngine/hooks";
import { SpatialTier, InteractionState } from "./renderEngine/types";
import { requestProgressiveTiers, type TransportArtifact } from "./renderEngine/transport";
import { generateTimestampGrid } from "./timelineUtils";

// ─── Config ───────────────────────────────────────────────────────────────────

const DEFAULT_INTERVAL_SECS = 1.0;

function getExtractionInterval(durationSecs: number): number {
  if (durationSecs <= 60) return 0.5;
  if (durationSecs <= 300) return 1.0;
  if (durationSecs <= 600) return 2.0;
  return Math.ceil(durationSecs / 200);
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export interface UseFilmstripOptions {
  clipId: string;
  videoPath: string;
  trimIn: number;
  trimOut: number;
  duration: number;
  posterFrame?: string;
  enabled?: boolean;
}

export interface UseFilmstripResult {
  /** Sorted TransportArtifacts ready to pass to RasterSurface.drawFilmstrip() */
  artifacts: readonly TransportArtifact[];
  /** True while the first batch is loading */
  isLoading: boolean;
  /** True if no tier has been decoded yet — show posterFrame fallback */
  isFallback: boolean;
  /** Current interaction state — surface can dim during ballistic scroll */
  interactionState: InteractionState;
}

export function useFilmstrip(opts: UseFilmstripOptions): UseFilmstripResult {
  const { clipId, videoPath, trimIn, trimOut, duration, enabled = true } = opts;

  const runtime = useRenderEngineStore((s) => s.runtime);
  const renderState = useRenderState(clipId);
  const cancelRef = useRef<(() => void) | null>(null);

  // Sorted artifacts, keyed by timestamp+tier so we never duplicate
  const [artifacts, setArtifacts] = useState<readonly TransportArtifact[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Track previous epoch to avoid re-requesting when epoch hasn't changed
  const prevEpochRef = useRef<string>("");

  // Clear previous bitmaps on unmount or re-request
  const disposePrev = useCallback(() => {
    cancelRef.current?.();
    cancelRef.current = null;
  }, []);

  useEffect(() => {
    // Don't request frames if we're still in fallback state (waiting for real runtime state)
    if (!enabled || !videoPath || !duration || !runtime || renderState.isFallback) return;

    const { epochId, currentTier, interactionState } = renderState;

    // Skip re-request if epoch hasn't changed
    if (epochId === prevEpochRef.current) return;
    prevEpochRef.current = epochId;

    // Cancel any in-flight request for the previous epoch
    disposePrev();

    // Don't request during ballistic scroll — wait for Converging state
    if (interactionState === InteractionState.Scrubbing) return;

    const { spatialTier } = currentTier;
    const interval = getExtractionInterval(duration);
    const timestampsSecs = generateTimestampGrid(trimIn, trimOut, interval, duration);
    if (timestampsSecs.length === 0) return;

    const timestampsMs = timestampsSecs.map((t) => Math.round(t * 1000));

    // Keep previous artifacts visible during upgrade (don't clear on re-request)
    setIsLoading(true);

    // Accumulated artifacts for this epoch — keyed by `${timestampMs}:${spatialTier}`
    // Higher-tier arrivals naturally replace lower-tier entries for the same timestamp.
    const accumulated = new Map<string, TransportArtifact>();

    // RAF-batched flush: coalesce all artifacts arriving within the same frame
    // into a single setArtifacts() call. Without this, every artifact triggers
    // a React re-render → full canvas redraw, causing visible flickering as
    // L0/L1/L2/L3 thumbnails replace each other one-by-one.
    let rafId: number | null = null;
    let flushDirty = false;

    const scheduleFlush = () => {
      if (rafId !== null) return; // already scheduled
      rafId = requestAnimationFrame(() => {
        rafId = null;
        if (!flushDirty) return;
        flushDirty = false;

        // For each timestamp, keep only the highest tier received so far
        const bestByTime = new Map<number, TransportArtifact>();
        for (const a of accumulated.values()) {
          const existing = bestByTime.get(a.timestampMs);
          if (!existing || a.spatialTier > existing.spatialTier) {
            bestByTime.set(a.timestampMs, a);
          }
        }
        const sorted = Array.from(bestByTime.values()).sort((a, b) => a.timestampMs - b.timestampMs);
        setArtifacts(sorted);
        setIsLoading(false);
      });
    };

    // Progressive tier sequence respects current zoom level for priority rendering.
    // When zoomed in, start at the appropriate spatial tier to avoid unnecessary low‑tier flicker.
    const startTier = spatialTier;
    const targetTier = spatialTier;

    cancelRef.current = requestProgressiveTiers({
      videoPath,
      timestampsMs,
      startTier,
      targetTier,
      epochId,
      clipId,
      onArtifact: (artifact) => {
        const key = `${artifact.timestampMs}:${artifact.spatialTier}`;
        accumulated.set(key, artifact);
        flushDirty = true;
        scheduleFlush();
      },
      onComplete: () => {
        // Final flush — ensure all remaining artifacts are committed
        if (rafId !== null) {
          cancelAnimationFrame(rafId);
          rafId = null;
        }
        // Synchronous final flush to guarantee nothing is dropped
        const bestByTime = new Map<number, TransportArtifact>();
        for (const a of accumulated.values()) {
          const existing = bestByTime.get(a.timestampMs);
          if (!existing || a.spatialTier > existing.spatialTier) {
            bestByTime.set(a.timestampMs, a);
          }
        }
        const sorted = Array.from(bestByTime.values()).sort((a, b) => a.timestampMs - b.timestampMs);
        setArtifacts(sorted);
        setIsLoading(false);
      },
    });

    return () => {
      // Cancel pending RAF flush before cancelling requests
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      disposePrev();
    };
  }, [
    enabled,
    videoPath,
    duration,
    trimIn,
    trimOut,
    // Re-run when epoch changes (covers zoom-tier, scroll, trim)
    renderState.epochId,
    runtime,
    clipId,
    disposePrev,
  ]);

  // Unmount cleanup
  useEffect(() => () => disposePrev(), [disposePrev]);

  return {
    artifacts,
    isLoading,
    isFallback: renderState.isFallback || artifacts.length === 0,
    interactionState: renderState.interactionState,
  };
}
