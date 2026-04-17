/**
 * Unit Tests for VideoPool
 * Tests specific examples and edge cases
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { VideoPool } from "../utils/VideoPool";
import { CanvasPreviewErrorCode } from "../types/errors";

// Mock HTMLVideoElement for testing
class MockVideoElement {
  src = "";
  preload = "";
  muted = false;
  private _readyState = 0;
  error: { message: string } | null = null;
  videoWidth = 1920;
  videoHeight = 1080;
  private _currentTime = 0;
  private listeners: Map<string, Set<EventListener>> = new Map();

  get readyState(): number {
    return this._readyState;
  }

  set readyState(value: number) {
    this._readyState = value;
  }

  get currentTime(): number {
    return this._currentTime;
  }

  set currentTime(value: number) {
    this._currentTime = value;
    // Trigger seeked event when currentTime is set (use Promise for async)
    Promise.resolve().then(() => {
      const seekedListeners = this.listeners.get("seeked");
      if (seekedListeners) {
        seekedListeners.forEach((listener) => listener(new Event("seeked")));
      }
    });
  }

  addEventListener(event: string, listener: EventListener, options?: any): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(listener);

    // Auto-trigger loadedmetadata for successful loads (only if readyState < 1)
    if (event === "loadedmetadata" && !this.src.includes("invalid") && this._readyState < 1) {
      Promise.resolve().then(() => {
        if (this._readyState < 1) {
          this._readyState = 1;
        }
        listener(new Event("loadedmetadata"));
      });
    }

    // Auto-trigger error for invalid sources
    if (event === "error" && this.src.includes("invalid")) {
      Promise.resolve().then(() => {
        this.error = { message: "Failed to load" };
        listener(new Event("error"));
      });
    }

    // Auto-trigger loadeddata (first frame decoded) - only if readyState < 2
    if (event === "loadeddata" && !this.src.includes("invalid") && this._readyState < 2) {
      Promise.resolve().then(() => {
        if (this._readyState < 2) {
          this._readyState = 2;
        }
        listener(new Event("loadeddata"));
      });
    }

    // Auto-trigger seeked event when currentTime is set
    if (event === "seeked" && !this.src.includes("invalid")) {
      // Will be triggered when currentTime setter is called
    }
  }

  removeEventListener(event: string, listener: EventListener): void {
    this.listeners.get(event)?.delete(listener);
  }

  dispatchEvent(event: Event): boolean {
    const listeners = this.listeners.get(event.type);
    if (listeners) {
      listeners.forEach((listener) => listener(event));
    }
    return true;
  }
}

describe("VideoPool - Unit Tests", () => {
  beforeEach(() => {
    // Mock document.createElement for video elements
    vi.stubGlobal("document", {
      createElement: (tag: string) => {
        if (tag === "video") {
          return new MockVideoElement() as any;
        }
        return null;
      },
    });

    // Don't use fake timers - they interfere with async video loading
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Video Element Creation", () => {
    it("should create video element for specific source path", async () => {
      const pool = new VideoPool(10);
      const sourcePath = "test-video.mp4";

      const video = await pool.getVideo(sourcePath);

      expect(video).toBeDefined();
      expect(video.src).toBe(sourcePath);
      expect(video.preload).toBe("auto"); // Changed from "metadata" to "auto" for better frame loading
      expect(video.muted).toBe(true);

      pool.dispose();
    });

    it("should create video elements for multiple different source paths", async () => {
      const pool = new VideoPool(10);
      const paths = ["video1.mp4", "video2.mp4", "video3.mp4"];

      const videos = await Promise.all(paths.map((path) => pool.getVideo(path)));

      expect(videos).toHaveLength(3);
      expect(pool.getPoolSize()).toBe(3);

      // Verify each video has correct source
      for (let i = 0; i < paths.length; i++) {
        expect(videos[i].src).toBe(paths[i]);
      }

      pool.dispose();
    });

    it("should reuse existing video element for same source path", async () => {
      const pool = new VideoPool(10);
      const sourcePath = "test-video.mp4";

      const video1 = await pool.getVideo(sourcePath);
      const video2 = await pool.getVideo(sourcePath);

      expect(video1).toBe(video2);
      expect(pool.getPoolSize()).toBe(1);

      pool.dispose();
    });
  });

  describe("Reference Counting", () => {
    it("should increment reference count on each getVideo call", async () => {
      const pool = new VideoPool(10);
      const sourcePath = "test-video.mp4";

      await pool.getVideo(sourcePath);
      await pool.getVideo(sourcePath);
      await pool.getVideo(sourcePath);

      const entry = pool.getEntry(sourcePath);
      expect(entry).toBeDefined();
      expect(entry!.refCount).toBe(3);

      pool.dispose();
    });

    it("should decrement reference count on releaseVideo call", async () => {
      const pool = new VideoPool(10);
      const sourcePath = "test-video.mp4";

      await pool.getVideo(sourcePath);
      await pool.getVideo(sourcePath);
      pool.releaseVideo(sourcePath);

      const entry = pool.getEntry(sourcePath);
      expect(entry).toBeDefined();
      expect(entry!.refCount).toBe(1);

      pool.dispose();
    });

    it("should handle specific add/remove sequence correctly", async () => {
      const pool = new VideoPool(10);
      const path1 = "video1.mp4";
      const path2 = "video2.mp4";

      // Add video1 twice
      await pool.getVideo(path1);
      await pool.getVideo(path1);

      // Add video2 once
      await pool.getVideo(path2);

      // Release video1 once
      pool.releaseVideo(path1);

      // Verify counts
      expect(pool.getEntry(path1)!.refCount).toBe(1);
      expect(pool.getEntry(path2)!.refCount).toBe(1);

      pool.dispose();
    });
  });

  describe("LRU Eviction", () => {
    it("should evict least recently used video when pool reaches capacity", async () => {
      const pool = new VideoPool(3);

      // Fill pool to capacity
      await pool.getVideo("video1.mp4");
      await pool.getVideo("video2.mp4");
      await pool.getVideo("video3.mp4");

      // Release all videos
      pool.releaseVideo("video1.mp4");
      pool.releaseVideo("video2.mp4");
      pool.releaseVideo("video3.mp4");

      // Access video2 and video3 to update lastUsed
      await pool.getVideo("video2.mp4");
      await pool.getVideo("video3.mp4");
      pool.releaseVideo("video2.mp4");
      pool.releaseVideo("video3.mp4");

      // Add new video - should evict video1 (least recently used)
      await pool.getVideo("video4.mp4");

      expect(pool.getPoolSize()).toBe(3);
      expect(pool.getEntry("video1.mp4")).toBeUndefined();
      expect(pool.getEntry("video2.mp4")).toBeDefined();
      expect(pool.getEntry("video3.mp4")).toBeDefined();
      expect(pool.getEntry("video4.mp4")).toBeDefined();

      pool.dispose();
    });

    it("should not evict videos with non-zero reference count", async () => {
      const pool = new VideoPool(2);

      // Fill pool
      await pool.getVideo("video1.mp4");
      await pool.getVideo("video2.mp4");

      // Release video2 but keep video1 referenced
      pool.releaseVideo("video2.mp4");

      // Try to add new video - should evict video2, not video1
      await pool.getVideo("video3.mp4");

      expect(pool.getPoolSize()).toBe(2);
      expect(pool.getEntry("video1.mp4")).toBeDefined();
      expect(pool.getEntry("video2.mp4")).toBeUndefined();
      expect(pool.getEntry("video3.mp4")).toBeDefined();

      pool.dispose();
    });
  });

  describe("Error Handling", () => {
    it("should emit error for invalid source path", async () => {
      const pool = new VideoPool(10);
      const invalidPath = "invalid_video.mp4";
      let errorEmitted = false;
      let errorCode = "";
      let errorPath = "";

      pool.onError((error) => {
        errorEmitted = true;
        errorCode = error.code;
        errorPath = error.sourcePath || "";
      });

      try {
        await pool.getVideo(invalidPath);
        expect.fail("Should have thrown error");
      } catch (error) {
        // Expected
      }

      expect(errorEmitted).toBe(true);
      expect(errorCode).toBe(CanvasPreviewErrorCode.VIDEO_LOAD_FAILED);
      expect(errorPath).toBe(invalidPath);

      pool.dispose();
    });

    it("should remove video from pool after load failure", async () => {
      const pool = new VideoPool(10);
      const invalidPath = "invalid_video.mp4";

      try {
        await pool.getVideo(invalidPath);
      } catch (error) {
        // Expected
      }

      expect(pool.getEntry(invalidPath)).toBeUndefined();
      expect(pool.getPoolSize()).toBe(0);

      pool.dispose();
    });

    it("should continue operating after error", async () => {
      const pool = new VideoPool(10);

      // Try to load invalid video
      try {
        await pool.getVideo("invalid_video.mp4");
      } catch (error) {
        // Expected
      }

      // Load valid video
      const video = await pool.getVideo("valid_video.mp4");

      expect(video).toBeDefined();
      expect(pool.getPoolSize()).toBe(1);

      pool.dispose();
    });
  });

  describe("Delayed Eviction", () => {
    it("should schedule eviction 5 seconds after reference count reaches zero", async () => {
      vi.useFakeTimers();
      const pool = new VideoPool(10);
      const sourcePath = "test-video.mp4";

      await pool.getVideo(sourcePath);
      pool.releaseVideo(sourcePath);

      // Verify video still exists
      expect(pool.getEntry(sourcePath)).toBeDefined();

      // Advance time by 4 seconds - video should still exist
      vi.advanceTimersByTime(4000);
      expect(pool.getEntry(sourcePath)).toBeDefined();

      // Advance time by 1 more second - video should be evicted
      vi.advanceTimersByTime(1000);
      expect(pool.getEntry(sourcePath)).toBeUndefined();

      pool.dispose();
      vi.useRealTimers();
    });

    it("should cancel eviction if video is referenced again", async () => {
      vi.useFakeTimers();
      const pool = new VideoPool(10);
      const sourcePath = "test-video.mp4";

      await pool.getVideo(sourcePath);
      pool.releaseVideo(sourcePath);

      // Advance time by 3 seconds
      vi.advanceTimersByTime(3000);

      // Reference video again
      await pool.getVideo(sourcePath);

      // Advance time by 5 more seconds
      vi.advanceTimersByTime(5000);

      // Video should still exist (eviction was cancelled)
      expect(pool.getEntry(sourcePath)).toBeDefined();
      expect(pool.getEntry(sourcePath)!.refCount).toBe(1);

      pool.dispose();
      vi.useRealTimers();
    });
  });

  describe("Metadata Preloading", () => {
    it("should load metadata before returning video element", async () => {
      const pool = new VideoPool(10);
      const sourcePath = "test-video.mp4";

      const video = await pool.getVideo(sourcePath);

      const entry = pool.getEntry(sourcePath);
      expect(entry!.isLoaded).toBe(true);
      expect(entry!.isReady).toBe(true);
      expect(video.readyState).toBeGreaterThanOrEqual(2);

      pool.dispose();
    });

    it("should wait for video to be ready if not already ready", async () => {
      const pool = new VideoPool(10);
      const sourcePath = "test-video.mp4";

      // Get video first time (loads metadata)
      await pool.getVideo(sourcePath);

      // Manually set isReady to false to simulate not ready state
      const entry = pool.getEntry(sourcePath)!;
      entry.isReady = false;
      entry.video.readyState = 1;

      // Simulate the video becoming ready by manually triggering events
      // This mimics what would happen in a real browser
      const getVideoPromise = pool.getVideo(sourcePath);

      // Wait a bit then trigger loadeddata event
      await new Promise((resolve) => setTimeout(resolve, 10));
      const loadedDataEvent = new Event("loadeddata");
      entry.video.dispatchEvent(loadedDataEvent);
      entry.video.readyState = 2;

      // Wait a bit then trigger seeked event
      await new Promise((resolve) => setTimeout(resolve, 10));
      const seekedEvent = new Event("seeked");
      entry.video.dispatchEvent(seekedEvent);

      const video = await getVideoPromise;

      expect(video.readyState).toBeGreaterThanOrEqual(2);

      pool.dispose();
    });
  });

  describe("Cleanup", () => {
    it("should clear all videos on dispose", async () => {
      const pool = new VideoPool(10);

      await pool.getVideo("video1.mp4");
      await pool.getVideo("video2.mp4");
      await pool.getVideo("video3.mp4");

      expect(pool.getPoolSize()).toBe(3);

      pool.dispose();

      expect(pool.getPoolSize()).toBe(0);
    });

    it("should clear all eviction timers on dispose", async () => {
      vi.useFakeTimers();
      const pool = new VideoPool(10);

      await pool.getVideo("video1.mp4");
      pool.releaseVideo("video1.mp4");

      const entry = pool.getEntry("video1.mp4");
      expect(entry!.evictionTimer).not.toBeNull();

      pool.dispose();

      // Advance time - should not cause any issues
      vi.advanceTimersByTime(10000);
      vi.useRealTimers();
    });
  });
});
