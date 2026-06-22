import { describe, expect, it } from "vitest";
import { getPreviewMediaSyncClips } from "../previewMediaSync";
import type { Clip } from "@/types";

const makeClip = (id: string, startTime: number, duration = 5): Clip => ({
  id,
  trackId: "track-1",
  mediaId: `media-${id}`,
  startTime,
  duration,
  trimIn: startTime,
  trimOut: startTime + duration,
  x: 0,
  y: 0,
  width: 1920,
  height: 1080,
  opacity: 1,
  rotation: 0,
});

describe("preview media sync window", () => {
  it("keeps the outgoing split clip briefly while prewarming the incoming clip at a cut", () => {
    const left = makeClip("left", 0, 5);
    const right = makeClip("right", 5, 5);

    expect(getPreviewMediaSyncClips([left, right], 5).map((clip) => clip.id)).toEqual(["left", "right"]);
  });

  it("prewarms an upcoming clip before the playhead reaches it", () => {
    const left = makeClip("left", 0, 5);
    const right = makeClip("right", 5, 5);

    expect(getPreviewMediaSyncClips([left, right], 4.5).map((clip) => clip.id)).toEqual(["left", "right"]);
  });

  it("drops clips outside the active, lookahead, and retention windows", () => {
    const stale = makeClip("stale", 0, 5);
    const current = makeClip("current", 10, 5);
    const future = makeClip("future", 20, 5);

    expect(getPreviewMediaSyncClips([stale, current, future], 12).map((clip) => clip.id)).toEqual(["current"]);
  });
});
