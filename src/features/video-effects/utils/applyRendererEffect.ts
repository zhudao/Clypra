/**
 * Apply Renderer-Based Effects to Timeline as Separate Clips
 *
 * Creates effect clips that can be independently positioned, trimmed, and layered
 */

import { useTimelineStore } from "@/store/timelineStore";
import { useProjectStore } from "@/store/projectStore";
import { generateId } from "@/lib/utils/id";
import type { VideoEffectClip } from "@/types";
import type { EffectRenderer as EffectRendererType, EffectParameters } from "@clypra/engine";

/**
 * Create a renderer-based effect as a separate clip on the timeline
 */
export function applyRendererEffectToClip(clipId: string, effectId: EffectRendererType, parameters: EffectParameters = {}, intensity: number = 0.8): void {
  const timelineStore = useTimelineStore.getState();
  const sourceClip = timelineStore.clips.find((c) => c.id === clipId);

  if (!sourceClip) {
    throw new Error(`Source clip not found: ${clipId}`);
  }

  // Find or create a video-effect track
  let effectTrack = timelineStore.tracks.find((t) => t.type === "video-effect");

  if (!effectTrack) {
    // Create video-effect track above the source clip's track
    const sourceTrackIndex = timelineStore.tracks.findIndex((t) => t.id === sourceClip.trackId);
    const trackId = timelineStore.insertTrackAt("video-effect", sourceTrackIndex);
    effectTrack = timelineStore.tracks.find((t) => t.id === trackId)!;
  }

  // Get canvas dimensions from project store
  const project = useProjectStore.getState().project;
  const canvasWidth = project?.canvasWidth ?? 1920;
  const canvasHeight = project?.canvasHeight ?? 1080;

  // Create effect clip with same timing as source clip
  const effectClip: VideoEffectClip = {
    id: generateId("clip"),
    name: formatEffectName(effectId as string),
    trackId: effectTrack.id,
    mediaId: "", // Effect clips don't need media
    kind: "video-effect",

    // Timing - match source clip
    startTime: sourceClip.startTime,
    duration: sourceClip.duration,
    trimIn: 0,
    trimOut: sourceClip.duration,

    // Transform - match canvas
    x: 0,
    y: 0,
    width: canvasWidth,
    height: canvasHeight,
    opacity: 1,
    rotation: 0,

    // Effect properties
    renderer: effectId as string,
    params: parameters,
    intensity,
  };

  // Add effect clip to timeline
  timelineStore.addClip(effectClip);
}

/**
 * Apply a renderer-based effect with preview download
 */
export async function applyRendererEffectWithPreview(clipId: string, effectId: EffectRendererType, parameters: EffectParameters = {}, intensity: number = 0.8, category: string = "light"): Promise<void> {
  // Apply the effect as a separate clip
  applyRendererEffectToClip(clipId, effectId, parameters, intensity);

  // Try to download preview if available
  try {
    const { VideoEffectsApi } = await import("../api/videoEffectsApi");
    await VideoEffectsApi.downloadEffectPreview(effectId as string, category);
    // console.log(`✓ Effect preview cached: ${effectId}`);
  } catch (error) {
    console.warn(`No preview available for effect: ${effectId}`);
  }
}

/**
 * Update effect clip parameters
 */
export function updateEffectClipParams(effectClipId: string, parameters: Partial<EffectParameters>): void {
  const timelineStore = useTimelineStore.getState();
  const effectClip = timelineStore.clips.find((c) => c.id === effectClipId && c.kind === "video-effect") as VideoEffectClip | undefined;

  if (!effectClip) {
    throw new Error(`Effect clip not found: ${effectClipId}`);
  }

  const updated: VideoEffectClip = {
    ...effectClip,
    params: { ...effectClip.params, ...parameters },
  };

  timelineStore.updateClip(effectClipId, updated as any);
}

/**
 * Update effect clip intensity
 */
export function updateEffectClipIntensity(effectClipId: string, intensity: number): void {
  const timelineStore = useTimelineStore.getState();
  const effectClip = timelineStore.clips.find((c) => c.id === effectClipId && c.kind === "video-effect") as VideoEffectClip | undefined;

  if (!effectClip) {
    throw new Error(`Effect clip not found: ${effectClipId}`);
  }

  const updated: VideoEffectClip = {
    ...effectClip,
    intensity,
  };

  timelineStore.updateClip(effectClipId, updated as any);
}

/**
 * Remove effect clip from timeline
 */
export function removeEffectClip(effectClipId: string): void {
  const timelineStore = useTimelineStore.getState();
  timelineStore.removeClip(effectClipId);
}

/**
 * Get all effect clips on the timeline
 */
export function getAllEffectClips(): VideoEffectClip[] {
  const timelineStore = useTimelineStore.getState();
  return timelineStore.clips.filter((clip) => clip.kind === "video-effect") as VideoEffectClip[];
}

/**
 * Get effect clips that overlap with a specific time range
 */
export function getEffectClipsInRange(startTime: number, endTime: number): VideoEffectClip[] {
  const allEffects = getAllEffectClips();
  return allEffects.filter((effect) => {
    const effectEnd = effect.startTime + effect.duration;
    return effect.startTime < endTime && effectEnd > startTime;
  });
}

/**
 * Check if there's already an effect of this type at the current time
 */
export function hasEffectAtTime(effectRenderer: EffectRendererType, time: number): boolean {
  const effects = getAllEffectClips();
  return effects.some((effect) => {
    const effectEnd = effect.startTime + effect.duration;
    return effect.renderer === effectRenderer && time >= effect.startTime && time < effectEnd;
  });
}

/**
 * Format effect name for display
 */
function formatEffectName(effectId: string): string {
  return effectId.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}
