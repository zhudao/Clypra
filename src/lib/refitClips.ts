/**
 * Re-fit Clips for Canvas Change
 *
 * When the project aspect ratio / canvas dimensions change, existing clips
 * retain their old {x, y, width, height} values computed for the previous
 * canvas. This utility re-calculates placement for each visual clip using
 * its stored fitMode against the NEW canvas dimensions.
 *
 * Professional NLEs (CapCut, Premiere, Resolve) all re-fit on aspect change.
 */

import { useTimelineStore } from "@/store/timelineStore";
import { useProjectStore } from "@/store/projectStore";
import { calculateClipDimensions, type ClipFitModeExtended } from "./timelineClip";

/**
 * Re-fit all visual clips to the new canvas dimensions.
 * Call this AFTER updateProject() has set the new canvasWidth/canvasHeight.
 *
 * Text clips are excluded — they have independent positioning that should
 * not be overridden by a fit algorithm.
 */
export function refitClipsForCanvasChange(newCanvasWidth: number, newCanvasHeight: number): void {
  const { clips, updateClip } = useTimelineStore.getState();
  const { mediaAssets } = useProjectStore.getState();

  const assetMap = new Map(mediaAssets.map((a) => [a.id, a]));

  for (const clip of clips) {
    // Skip text clips — they have user-positioned text boxes
    if (clip.kind === "text") continue;

    const asset = assetMap.get(clip.mediaId);
    if (!asset) continue;
    if (asset.type !== "video" && asset.type !== "image") continue;

    const fitMode: ClipFitModeExtended = (clip as any).fitMode ?? "cover";
    const newDims = calculateClipDimensions(asset, newCanvasWidth, newCanvasHeight, fitMode);

    // Only update if dimensions actually changed
    if (
      clip.x !== newDims.x ||
      clip.y !== newDims.y ||
      clip.width !== newDims.width ||
      clip.height !== newDims.height
    ) {
      updateClip(clip.id, newDims);
    }
  }
}
