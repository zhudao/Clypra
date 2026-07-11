/**
 * Filter Manager
 *
 * Manages filter application to sprites, with support for
 * performance optimizations (skipping filters under load).
 */

import type { Sprite } from "pixi.js";
import type { EvaluatedMediaLayer } from "../../evaluation/types";
import { getOrUpdateFilters } from "../filterCache";

export class FilterManager {
  /**
   * Apply filters to a sprite based on media layer effects.
   *
   * @param sprite - Pixi sprite to apply filters to
   * @param mediaLayer - Evaluated media layer with effect definitions
   * @param bodyMasks - Body mask data for body effects
   */
  applyFilters(sprite: Sprite, mediaLayer: EvaluatedMediaLayer, bodyMasks: Map<string, any>): void {
    const width = sprite.texture.source.width || mediaLayer.width;
    const height = sprite.texture.source.height || mediaLayer.height;

    const filters = getOrUpdateFilters(mediaLayer, width, height, bodyMasks);
    sprite.filters = filters.length > 0 ? filters : null;
  }

  /**
   * Apply filters conditionally based on performance requirements.
   *
   * Useful for Phase 1 optimization: skip expensive filters when
   * frame budget is exceeded.
   *
   * @param sprite - Pixi sprite to apply filters to
   * @param mediaLayer - Evaluated media layer with effect definitions
   * @param bodyMasks - Body mask data for body effects
   * @param shouldSkip - Whether to skip filters (performance override)
   */
  applyFiltersConditional(sprite: Sprite, mediaLayer: EvaluatedMediaLayer, bodyMasks: Map<string, any>, shouldSkip: boolean): void {
    if (shouldSkip) {
      sprite.filters = null;
      return;
    }

    this.applyFilters(sprite, mediaLayer, bodyMasks);
  }
}
