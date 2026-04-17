/**
 * FrameExtractor - Native FFmpeg-based frame extraction for Tauri desktop app
 *
 * Replaces VideoPool + SeekManager with Rust FFmpeg frame extraction.
 * Provides frame-accurate, low-latency frame retrieval with caching.
 */

import { extractFrameAtTime } from "../../../lib/tauri";

export interface FrameCacheEntry {
  dataUrl: string;
  timestamp: number;
  lastAccessed: number;
  bitmap: ImageBitmap | null;
}

export interface ActiveClip {
  id: string;
  sourceMediaPath: string;
  startTime: number;
  duration: number;
  sourceStart: number;
  sourceEnd: number;
  trackIndex: number;
  clipTime: number;
}

/**
 * Manages frame extraction from Rust backend with LRU caching
 */
export class FrameExtractor {
  private cache: Map<string, FrameCacheEntry> = new Map();
  private pendingRequests: Map<string, Promise<string>> = new Map();
  private maxCacheSize: number;
  private canvasWidth: number;
  private canvasHeight: number;
  private playbackMode: boolean = false;
  private playbackScaleFactor: number = 0.5; // Extract at 50% resolution during playback

  constructor(canvasWidth: number, canvasHeight: number, maxCacheSize: number = 50) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    this.maxCacheSize = maxCacheSize;
  }

  /**
   * Set playback mode - reduces resolution for smoother playback
   */
  setPlaybackMode(isPlaying: boolean): void {
    this.playbackMode = isPlaying;
  }

  /**
   * Get a frame for a clip at a specific timeline time
   * Returns cached frame if available, otherwise extracts via FFmpeg
   */
  async getFrame(clip: ActiveClip, timelineTime: number): Promise<ImageBitmap | null> {
    const cacheKey = this.getCacheKey(clip, timelineTime);

    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached?.bitmap) {
      cached.lastAccessed = Date.now();
      return cached.bitmap;
    }

    // Check for pending request
    const pending = this.pendingRequests.get(cacheKey);
    if (pending) {
      const dataUrl = await pending;
      return this.createBitmap(dataUrl);
    }

    // Extract frame via Rust/FFmpeg
    const extractPromise = this.extractFrame(clip, timelineTime);
    this.pendingRequests.set(cacheKey, extractPromise);

    try {
      const dataUrl = await extractPromise;
      this.pendingRequests.delete(cacheKey);

      // Cache the result
      this.addToCache(cacheKey, dataUrl, timelineTime);

      return this.createBitmap(dataUrl);
    } catch (error) {
      this.pendingRequests.delete(cacheKey);
      console.error("Frame extraction failed:", {
        clipId: clip.id,
        timelineTime,
        sourcePath: clip.sourceMediaPath,
        error,
      });
      return null;
    }
  }

  /**
   * Extract a single frame via Rust backend
   * During playback, uses lower resolution for performance
   */
  private async extractFrame(clip: ActiveClip, timelineTime: number): Promise<string> {
    // Calculate time within the source media
    const timeIntoClip = timelineTime - clip.startTime;
    const sourceTime = clip.sourceStart + timeIntoClip;

    // Clamp to source boundaries
    const clampedTime = Math.max(clip.sourceStart, Math.min(sourceTime, clip.sourceEnd));

    // Call Rust backend to extract frame
    // Note: clip.sourceMediaPath is a Tauri asset URL, need to convert to file path
    const filePath = this.assetUrlToFilePath(clip.sourceMediaPath);

    // Use lower resolution during playback for smoother performance
    const width = this.playbackMode ? Math.max(320, Math.floor(this.canvasWidth * this.playbackScaleFactor)) : this.canvasWidth;
    const height = this.playbackMode ? Math.max(180, Math.floor(this.canvasHeight * this.playbackScaleFactor)) : this.canvasHeight;

    return extractFrameAtTime(filePath, clampedTime, width, height);
  }

  /**
   * Convert Tauri asset URL to file system path
   * asset://localhost/Users/... -> /Users/...
   */
  private assetUrlToFilePath(assetUrl: string): string {
    if (assetUrl.startsWith("asset://")) {
      // Remove asset://localhost/ prefix
      const path = assetUrl.replace(/^asset:\/\/[^/]+\//, "");
      // URL decode
      return decodeURIComponent(path);
    }
    return assetUrl;
  }

  /**
   * Create ImageBitmap from data URL
   */
  private async createBitmap(dataUrl: string): Promise<ImageBitmap | null> {
    try {
      const response = await fetch(dataUrl);
      const blob = await response.blob();
      return await createImageBitmap(blob);
    } catch (error) {
      console.error("Failed to create bitmap:", error);
      return null;
    }
  }

  /**
   * Add extracted frame to cache with LRU eviction
   */
  private addToCache(key: string, dataUrl: string, timestamp: number): void {
    // Evict oldest if at capacity
    if (this.cache.size >= this.maxCacheSize) {
      this.evictLRU();
    }

    this.cache.set(key, {
      dataUrl,
      timestamp,
      lastAccessed: Date.now(),
      bitmap: null, // Will be created on demand
    });
  }

  /**
   * Evict least recently used entry
   */
  private evictLRU(): void {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      const entry = this.cache.get(oldestKey);
      if (entry?.bitmap) {
        entry.bitmap.close();
      }
      this.cache.delete(oldestKey);
    }
  }

  /**
   * Generate cache key for a frame
   */
  private getCacheKey(clip: ActiveClip, timelineTime: number): string {
    // Round to millisecond precision for cache consistency
    const roundedTime = Math.round(timelineTime * 1000) / 1000;
    return `${clip.sourceMediaPath}@${roundedTime}`;
  }

  /**
   * Preload frames for upcoming timeline segment
   * Useful for playback smoothness
   */
  async preloadFrames(clips: ActiveClip[], startTime: number, endTime: number, fps: number = 30): Promise<void> {
    const frameDuration = 1 / fps;
    const preloadPromises: Promise<void>[] = [];

    for (let t = startTime; t <= endTime; t += frameDuration) {
      for (const clip of clips) {
        const clipEnd = clip.startTime + clip.duration;
        if (t >= clip.startTime && t < clipEnd) {
          // Fire off preload without awaiting
          preloadPromises.push(
            this.getFrame(clip, t)
              .then(() => {})
              .catch(() => {}),
          );
        }
      }
    }

    // Wait for all preloads to complete
    await Promise.allSettled(preloadPromises);
  }

  /**
   * Update canvas dimensions (call when canvas resizes)
   */
  setCanvasDimensions(width: number, height: number): void {
    if (this.canvasWidth !== width || this.canvasHeight !== height) {
      this.canvasWidth = width;
      this.canvasHeight = height;
      // Clear cache since frames are resolution-specific
      this.clearCache();
    }
  }

  /**
   * Clear all cached frames and release resources
   */
  clearCache(): void {
    for (const entry of this.cache.values()) {
      if (entry.bitmap) {
        entry.bitmap.close();
      }
    }
    this.cache.clear();
    this.pendingRequests.clear();
  }

  /**
   * Get current cache size for debugging
   */
  getCacheSize(): number {
    return this.cache.size;
  }

  /**
   * Cleanup all resources
   */
  dispose(): void {
    this.clearCache();
  }
}
