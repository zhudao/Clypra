import type { Clip, TransitionTimelineItem } from "@/types";
import { getClipEndTime } from "@/lib/timeline/timelineClip";
import { computeClipVersion } from "@/core/evaluation/cache";

export const PREVIEW_MEDIA_LOOKAHEAD_SECONDS = 1.5;
export const PREVIEW_MEDIA_RETENTION_SECONDS = 0.25;

// ─── Memoize clip filtering ─────────────────────────────────────
// This function is called 60fps during playback, but results only change when
// clock crosses clip boundaries (rare - maybe 1-10 times/sec).
// Cache results keyed by rounded time + clip count + clip version hash to avoid repeated filtering and invalidation bugs.
const clipFilterCache = new Map<string, Clip[]>();
const MAX_CACHE_SIZE = 100; // Limit cache growth (100 entries = ~1.67 seconds at 60fps)

export function getPreviewMediaSyncClips(clips: Clip[], time: number, transitions: TransitionTimelineItem[] = []): Clip[] {
  // Use canonical computeClipVersion to construct a robust cache key that invalidates on any property changes.
  const clipVersion = computeClipVersion(clips, transitions);
  const cacheKey = `${time.toFixed(1)}-${clips.length}-${clipVersion}`;

  // Check cache first (hot path - saves ~0.5-1ms per frame × 60fps)
  if (clipFilterCache.has(cacheKey)) {
    return clipFilterCache.get(cacheKey)!;
  }

  // Cache miss - perform filtering
  const result = clips.filter((clip) => {
    const clipEnd = getClipEndTime(clip);
    const isCurrent = clip.startTime <= time && time < clipEnd;
    const isUpcoming = clip.startTime > time && clip.startTime <= time + PREVIEW_MEDIA_LOOKAHEAD_SECONDS;
    const isRecentlyEnded = clipEnd <= time && clipEnd >= time - PREVIEW_MEDIA_RETENTION_SECONDS;

    // Include clips that are actively in a transition window at the current time
    const isInTransition = transitions.some((t) => {
      const start = t.placement.startTime;
      const duration = t.placement.duration;
      const isActive = time >= start && time <= start + duration;
      return isActive && (t.fromItemId === clip.id || t.toItemId === clip.id);
    });

    return isCurrent || isUpcoming || isRecentlyEnded || isInTransition;
  });

  // Store in cache
  clipFilterCache.set(cacheKey, result);

  // Evict oldest entries if cache grows too large
  if (clipFilterCache.size > MAX_CACHE_SIZE) {
    const firstKey = clipFilterCache.keys().next().value;
    if (firstKey) clipFilterCache.delete(firstKey);
  }

  return result;
}

// Export for testing
export function clearClipFilterCache(): void {
  clipFilterCache.clear();
}
// ──────────────────────────────────────────────────────────────────────────────
