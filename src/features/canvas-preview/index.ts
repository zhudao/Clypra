/**
 * Canvas Preview System v2 - Main barrel export
 *
 * A professional-grade multi-clip rendering engine for the Kyro video editor.
 * Provides frame-accurate, multi-track video preview synchronized with Timeline Engine v1.
 */

// Export types
export type { ActiveClip, VideoPoolEntry, FrameCacheEntry, RenderState, CanvasPreviewConfig, CanvasPreviewErrorCodeType, CanvasPreviewErrorEvent } from "./types";

export { CanvasPreviewError, CanvasPreviewErrorCode } from "./types";

// Components
export { CanvasRenderer } from "./components/CanvasRenderer";
export type { CanvasRendererProps } from "./components/CanvasRenderer";

// Utils - FFmpeg-based frame extraction (new architecture)
export { FrameExtractor } from "./utils/FrameExtractor";
export { FrameResolver } from "./utils/FrameResolver";
export { RenderEngine } from "./utils/RenderEngine";

// Deprecated - kept for backwards compatibility, will be removed
/** @deprecated Use FrameExtractor instead */
export { VideoPool } from "./utils/VideoPool";
/** @deprecated Seeking is now handled by FFmpeg in Rust backend */
export { SeekManager } from "./utils/SeekManager";
/** @deprecated Frame caching is now handled by FrameExtractor */
export { FrameCache } from "./utils/FrameCache";
export { CanvasCompositorParser } from "./utils/CanvasCompositorParser";
export type { VideoPoolState, SerializableVideoPoolEntry } from "./utils/CanvasCompositorParser";
