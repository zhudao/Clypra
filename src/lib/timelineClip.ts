import { DEFAULT_STILL_DURATION_SECONDS } from "../constants/config";
import type { Clip, MediaAsset } from "../types";

export const resolveClipDuration = (asset: MediaAsset): number => {
  if (asset.type === "image") return DEFAULT_STILL_DURATION_SECONDS;
  if (asset.duration > 0) return asset.duration;
  return DEFAULT_STILL_DURATION_SECONDS;
};

// Centralized timeline timing helpers

export function getClipVisibleDuration(clip: Pick<Clip, "trimIn" | "trimOut">): number {
  return Math.max(0, clip.trimOut - clip.trimIn);
}

export function normalizeClipTiming(clip: Clip, asset?: MediaAsset): Clip {
  const sourceDuration = asset ? resolveClipDuration(asset) : Infinity;
  // Ensure trim bounds are within source duration
  const trimIn = Math.max(0, Math.min(clip.trimIn, sourceDuration));
  const trimOut = Math.max(trimIn, Math.min(clip.trimOut, sourceDuration));
  
  // Calculate new duration
  const duration = Math.max(0, trimOut - trimIn);

  return {
    ...clip,
    trimIn,
    trimOut,
    duration
  };
}

export function getClipEndTime(clip: Pick<Clip, "startTime" | "trimIn" | "trimOut">): number {
  return clip.startTime + getClipVisibleDuration(clip);
}

export function getTimelineContentEnd(clips: Pick<Clip, "startTime" | "trimIn" | "trimOut">[]): number {
  if (!clips || clips.length === 0) return 0;
  return Math.max(...clips.map(getClipEndTime), 0);
}

export function getTimelineViewportEnd(contentEnd: number): number {
  return Math.max(contentEnd, 10);
}


interface CreateClipFromAssetParams {
  asset: MediaAsset;
  trackId: string;
  startTime: number;
  width: number;
  height: number;
}

export const createClipFromAsset = ({ asset, trackId, startTime, width, height }: CreateClipFromAssetParams): Clip => {
  const duration = resolveClipDuration(asset);

  return {
    id: `clip-${Date.now()}-${Math.random()}`,
    trackId,
    mediaId: asset.id,
    startTime,
    duration,
    trimIn: 0,
    trimOut: duration,
    x: 0,
    y: 0,
    width,
    height,
    opacity: 1,
    rotation: 0,
  };
};
