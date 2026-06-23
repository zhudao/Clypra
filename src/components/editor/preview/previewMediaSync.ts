import type { Clip } from "@/types";

export const PREVIEW_MEDIA_LOOKAHEAD_SECONDS = 0.75;
export const PREVIEW_MEDIA_RETENTION_SECONDS = 0.25;

export function getPreviewMediaSyncClips(clips: Clip[], time: number): Clip[] {
  return clips.filter((clip) => {
    const clipEnd = clip.startTime + clip.duration;
    const isCurrent = clip.startTime <= time && time < clipEnd;
    const isUpcoming = clip.startTime > time && clip.startTime <= time + PREVIEW_MEDIA_LOOKAHEAD_SECONDS;
    const isRecentlyEnded = clipEnd <= time && clipEnd >= time - PREVIEW_MEDIA_RETENTION_SECONDS;
    return isCurrent || isUpcoming || isRecentlyEnded;
  });
}
