/**
 * Sprite Lifecycle Manager
 *
 * Manages sprite visibility and cleanup based on frame activity.
 * Automatically hides unused sprites and releases stale resources.
 */

import type { Container } from "pixi.js";
import { getActiveMediaSpriteKeys, getMediaSpriteRecord, releaseMediaSprite } from "@clypra-studio/engine";
import { releaseFilterCache } from "../filterCache";

export interface SpriteLifecycleStats {
  /** Number of sprites hidden this frame */
  hidden: number;
  /** Number of sprites released this frame */
  released: number;
}

export class SpriteLifecycleManager {
  private readonly SPRITE_RETENTION_FRAMES: number;

  /**
   * @param retentionFrames - Number of frames to retain inactive sprites (default: 180 = ~6 seconds at 30fps)
   */
  constructor(retentionFrames: number = 180) {
    this.SPRITE_RETENTION_FRAMES = retentionFrames;
  }

  /**
   * Reconcile sprite states based on current frame.
   *
   * - Hides sprites not seen this frame
   * - Releases sprites not seen for retention period
   *
   * @param currentFrameId - Current frame ID
   * @param container - Pixi container holding sprites
   * @returns Statistics about sprite lifecycle operations
   */
  reconcileSprites(currentFrameId: number, container: Container): SpriteLifecycleStats {
    const stats: SpriteLifecycleStats = { hidden: 0, released: 0 };
    const activeKeys = getActiveMediaSpriteKeys();

    for (const clipId of activeKeys) {
      const record = getMediaSpriteRecord(clipId);
      if (!record) continue;

      const framesSinceLastSeen = currentFrameId - record.lastSeenFrame;

      // Hide sprites not seen this frame
      if (framesSinceLastSeen > 0 && record.sprite.visible) {
        record.sprite.visible = false;
        stats.hidden++;
      }

      // Release sprites not seen for retention period
      if (framesSinceLastSeen > this.SPRITE_RETENTION_FRAMES) {
        this.releaseSprite(clipId, container);
        stats.released++;
      }
    }

    return stats;
  }

  /**
   * Release a sprite and its associated resources.
   *
   * @param clipId - Clip identifier
   * @param container - Pixi container holding the sprite
   */
  private releaseSprite(clipId: string, container: Container): void {
    releaseMediaSprite(clipId, container);
    releaseFilterCache(clipId);
  }

  /**
   * Force release all sprites (used for cleanup).
   *
   * @param container - Pixi container holding sprites
   * @returns Number of sprites released
   */
  releaseAll(container: Container): number {
    let count = 0;
    const activeKeys = getActiveMediaSpriteKeys();

    for (const clipId of activeKeys) {
      this.releaseSprite(clipId, container);
      count++;
    }

    return count;
  }
}
