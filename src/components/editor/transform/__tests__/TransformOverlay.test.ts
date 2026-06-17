import { describe, expect, it } from "vitest";
import { isClipActiveAtTime, shouldScaleTextFontForHandle } from "../TransformOverlay";
import type { TransformHandle } from "@/types";

describe("TransformOverlay resize policy", () => {
  it("keeps text font size stable for side handles so wrapping does not feed back into scaling", () => {
    const sideHandles: TransformHandle[] = ["n", "s", "e", "w"];

    for (const handle of sideHandles) {
      expect(shouldScaleTextFontForHandle(handle)).toBe(false);
    }
  });

  it("scales text font size only for corner handles", () => {
    const cornerHandles: TransformHandle[] = ["nw", "ne", "sw", "se"];

    for (const handle of cornerHandles) {
      expect(shouldScaleTextFontForHandle(handle)).toBe(true);
    }
  });
});

describe("TransformOverlay visibility policy", () => {
  it("shows selected handles only while the selected clip is active at the playhead", () => {
    const clip = { startTime: 3, duration: 5 };

    expect(isClipActiveAtTime(clip, 2.999)).toBe(false);
    expect(isClipActiveAtTime(clip, 3)).toBe(true);
    expect(isClipActiveAtTime(clip, 7.999)).toBe(true);
    expect(isClipActiveAtTime(clip, 8)).toBe(false);
  });
});
