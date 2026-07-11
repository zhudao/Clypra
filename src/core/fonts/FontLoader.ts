/**
 * Font Loading System — Delegated to `@clypra-studio/engine`
 *
 * Ensures deterministic font availability before rendering.
 * Re-exports the unified font loader from `@clypra-studio/engine`.
 */

export type { FontDescriptor, FontLoadResult } from "@clypra-studio/engine";

export { FontLoader, getFontLoader, resetFontLoader, ensureFontsLoaded } from "@clypra-studio/engine";
