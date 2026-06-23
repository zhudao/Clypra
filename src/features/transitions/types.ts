/**
 * Transitions Types
 * Re-exported from @clypra/engine for single source of truth
 */

// Re-export all transition types from @clypra/engine (transitions module)
export type { TransitionRenderer as TransitionRendererType, TransitionPreset, TransitionParameters, EasingFunction, AppliedTransition } from "@clypra/engine/transitions";

// Legacy type for backwards compatibility with timeline
export type TransitionType = "fade" | "dissolve" | "slide" | "wipe" | "zoom" | "creative";

// App-specific types (not in engine)
export interface TransitionAsset {
  id: string;
  name: string;
  type: "transition";
  category: string;
  description: string;
  thumbnail: string;
  preview: string;
  renderer: import("@clypra/engine").TransitionRendererType;
  duration?: {
    min: number;
    max: number;
    default: number;
  };
  tags?: string[];
  isPremium?: boolean;
  published?: boolean;
}

export interface TransitionCategory {
  id: string;
  name: string;
  description: string;
}
