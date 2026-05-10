import { describe, it, expect, beforeEach } from "vitest";
import { useTimelineStore } from "../timelineStore";
import type { Clip } from "../../types";

describe("timelineStore clip operations", () => {
  beforeEach(() => {
    // Reset store before each test
    useTimelineStore.setState({
      tracks: [],
      clips: [],
      mainVideoTrackId: null,
      zoomLevel: 1,
      scrollLeft: 0,
      pixelsPerSecond: 100,
      rippleEditEnabled: false,
    });
  });

  describe("addClip", () => {
    it("preserves duration === trimOut - trimIn invariant", () => {
      const { addClip } = useTimelineStore.getState();

      const clip: Clip = {
        id: "clip-1",
        trackId: "track-1",
        mediaId: "media-1",
        startTime: 0,
        duration: 5,
        trimIn: 0,
        trimOut: 5,
        x: 0,
        y: 0,
        width: 1920,
        height: 1080,
        opacity: 1,
        rotation: 0,
      };

      addClip(clip);

      const { clips } = useTimelineStore.getState();
      expect(clips).toHaveLength(1);
      expect(clips[0].duration).toBe(clips[0].trimOut - clips[0].trimIn);
    });
  });

  describe("updateClip", () => {
    it("preserves duration === trimOut - trimIn when updating trim points", () => {
      const { addClip, updateClip } = useTimelineStore.getState();

      const clip: Clip = {
        id: "clip-1",
        trackId: "track-1",
        mediaId: "media-1",
        startTime: 0,
        duration: 10,
        trimIn: 0,
        trimOut: 10,
        x: 0,
        y: 0,
        width: 1920,
        height: 1080,
        opacity: 1,
        rotation: 0,
      };

      addClip(clip);

      // Update trim points and duration together
      updateClip("clip-1", {
        trimIn: 2,
        trimOut: 8,
        duration: 6,
      });

      const { clips } = useTimelineStore.getState();
      expect(clips[0].duration).toBe(6);
      expect(clips[0].duration).toBe(clips[0].trimOut - clips[0].trimIn);
    });
  });

  describe("splitClipAtTime", () => {
    it("preserves duration === trimOut - trimIn for both split clips", () => {
      const { addClip, addTrack, splitClipAtTime } = useTimelineStore.getState();

      addTrack("video");
      const { tracks } = useTimelineStore.getState();

      const clip: Clip = {
        id: "clip-1",
        trackId: tracks[0].id,
        mediaId: "media-1",
        startTime: 0,
        duration: 10,
        trimIn: 0,
        trimOut: 10,
        x: 0,
        y: 0,
        width: 1920,
        height: 1080,
        opacity: 1,
        rotation: 0,
      };

      addClip(clip);
      splitClipAtTime("clip-1", 4);

      const { clips } = useTimelineStore.getState();
      expect(clips).toHaveLength(2);

      // Left clip: 0-4
      const leftClip = clips.find((c) => c.startTime === 0);
      expect(leftClip).toBeDefined();
      expect(leftClip!.duration).toBe(4);
      expect(leftClip!.trimIn).toBe(0);
      expect(leftClip!.trimOut).toBe(4);
      expect(leftClip!.duration).toBe(leftClip!.trimOut - leftClip!.trimIn);

      // Right clip: 4-10
      const rightClip = clips.find((c) => c.startTime === 4);
      expect(rightClip).toBeDefined();
      expect(rightClip!.duration).toBe(6);
      expect(rightClip!.trimIn).toBe(4);
      expect(rightClip!.trimOut).toBe(10);
      expect(rightClip!.duration).toBe(rightClip!.trimOut - rightClip!.trimIn);
    });

    it("handles split with existing trim points", () => {
      const { addClip, addTrack, splitClipAtTime } = useTimelineStore.getState();

      addTrack("video");
      const { tracks } = useTimelineStore.getState();

      const clip: Clip = {
        id: "clip-1",
        trackId: tracks[0].id,
        mediaId: "media-1",
        startTime: 0,
        duration: 6, // trimmed from 10s source
        trimIn: 2,
        trimOut: 8,
        x: 0,
        y: 0,
        width: 1920,
        height: 1080,
        opacity: 1,
        rotation: 0,
      };

      addClip(clip);
      splitClipAtTime("clip-1", 3); // Split at 3s into the clip

      const { clips } = useTimelineStore.getState();
      expect(clips).toHaveLength(2);

      const leftClip = clips.find((c) => c.startTime === 0);
      expect(leftClip!.duration).toBe(3);
      expect(leftClip!.trimIn).toBe(2);
      expect(leftClip!.trimOut).toBe(5);
      expect(leftClip!.duration).toBe(leftClip!.trimOut - leftClip!.trimIn);

      const rightClip = clips.find((c) => c.startTime === 3);
      expect(rightClip!.duration).toBe(3);
      expect(rightClip!.trimIn).toBe(5);
      expect(rightClip!.trimOut).toBe(8);
      expect(rightClip!.duration).toBe(rightClip!.trimOut - rightClip!.trimIn);
    });
  });

  describe("normalizeTrack", () => {
    it("preserves duration === trimOut - trimIn when normalizing", () => {
      const { addClip, addTrack, normalizeTrack } = useTimelineStore.getState();

      addTrack("video");
      const { tracks } = useTimelineStore.getState();
      const trackId = tracks[0].id;

      // Add clips with gaps
      const clip1: Clip = {
        id: "clip-1",
        trackId,
        mediaId: "media-1",
        startTime: 5,
        duration: 3,
        trimIn: 1,
        trimOut: 4,
        x: 0,
        y: 0,
        width: 1920,
        height: 1080,
        opacity: 1,
        rotation: 0,
      };

      const clip2: Clip = {
        id: "clip-2",
        trackId,
        mediaId: "media-2",
        startTime: 15,
        duration: 5,
        trimIn: 0,
        trimOut: 5,
        x: 0,
        y: 0,
        width: 1920,
        height: 1080,
        opacity: 1,
        rotation: 0,
      };

      addClip(clip1);
      addClip(clip2);

      normalizeTrack(trackId);

      const { clips } = useTimelineStore.getState();

      // Clips should be packed to start, but durations preserved
      expect(clips[0].startTime).toBe(0);
      expect(clips[0].duration).toBe(3);
      expect(clips[0].duration).toBe(clips[0].trimOut - clips[0].trimIn);

      expect(clips[1].startTime).toBe(3);
      expect(clips[1].duration).toBe(5);
      expect(clips[1].duration).toBe(clips[1].trimOut - clips[1].trimIn);
    });
  });

  describe("insertClipAtIndex", () => {
    it("preserves duration === trimOut - trimIn when inserting", () => {
      const { addClip, addTrack, insertClipAtIndex } = useTimelineStore.getState();

      addTrack("video");
      const { tracks } = useTimelineStore.getState();
      const trackId = tracks[0].id;

      const clip1: Clip = {
        id: "clip-1",
        trackId,
        mediaId: "media-1",
        startTime: 0,
        duration: 5,
        trimIn: 0,
        trimOut: 5,
        x: 0,
        y: 0,
        width: 1920,
        height: 1080,
        opacity: 1,
        rotation: 0,
      };

      const clip2: Clip = {
        id: "clip-2",
        trackId,
        mediaId: "media-2",
        startTime: 5,
        duration: 3,
        trimIn: 1,
        trimOut: 4,
        x: 0,
        y: 0,
        width: 1920,
        height: 1080,
        opacity: 1,
        rotation: 0,
      };

      addClip(clip1);
      addClip(clip2);

      // Insert clip2 at index 0 (before clip1)
      insertClipAtIndex("clip-2", trackId, 0);

      const { clips } = useTimelineStore.getState();

      // clip2 should now be first
      const firstClip = clips.find((c) => c.startTime === 0);
      expect(firstClip!.id).toBe("clip-2");
      expect(firstClip!.duration).toBe(3);
      expect(firstClip!.duration).toBe(firstClip!.trimOut - firstClip!.trimIn);

      // clip1 should be second
      const secondClip = clips.find((c) => c.startTime === 3);
      expect(secondClip!.id).toBe("clip-1");
      expect(secondClip!.duration).toBe(5);
      expect(secondClip!.duration).toBe(secondClip!.trimOut - secondClip!.trimIn);
    });
  });

  describe("getTimelineEndTime", () => {
    it("returns 0 for empty timeline", () => {
      const { getTimelineEndTime } = useTimelineStore.getState();
      expect(getTimelineEndTime()).toBe(0);
    });

    it("returns actual content end time, not viewport padding", () => {
      const { addClip, addTrack, getTimelineEndTime } = useTimelineStore.getState();

      addTrack("video");
      const { tracks } = useTimelineStore.getState();

      const clip: Clip = {
        id: "clip-1",
        trackId: tracks[0].id,
        mediaId: "media-1",
        startTime: 0,
        duration: 4.365,
        trimIn: 0,
        trimOut: 4.365,
        x: 0,
        y: 0,
        width: 1920,
        height: 1080,
        opacity: 1,
        rotation: 0,
      };

      addClip(clip);

      // Should return 4.365, not 10 (viewport padding)
      expect(getTimelineEndTime()).toBe(4.365);
    });

    it("returns max clip end time for multiple clips", () => {
      const { addClip, addTrack, getTimelineEndTime } = useTimelineStore.getState();

      addTrack("video");
      const { tracks } = useTimelineStore.getState();

      const clip1: Clip = {
        id: "clip-1",
        trackId: tracks[0].id,
        mediaId: "media-1",
        startTime: 0,
        duration: 5,
        trimIn: 0,
        trimOut: 5,
        x: 0,
        y: 0,
        width: 1920,
        height: 1080,
        opacity: 1,
        rotation: 0,
      };

      const clip2: Clip = {
        id: "clip-2",
        trackId: tracks[0].id,
        mediaId: "media-2",
        startTime: 5,
        duration: 10,
        trimIn: 0,
        trimOut: 10,
        x: 0,
        y: 0,
        width: 1920,
        height: 1080,
        opacity: 1,
        rotation: 0,
      };

      addClip(clip1);
      addClip(clip2);

      expect(getTimelineEndTime()).toBe(15); // 5 + 10
    });
  });
});
