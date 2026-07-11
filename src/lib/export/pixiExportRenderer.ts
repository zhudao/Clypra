/**
 * Pixi Export Renderer
 *
 * Renders one video frame through a headless PixiSceneCompositor and returns
 * the resulting pixel data as an ImageData.
 *
 * Architecture:
 *   videoExport.ts
 *     → createPixiExportCompositor()     (once per export session)
 *     → renderFrameWithPixi()            (once per frame)
 *     → destroyPixiExportCompositor()    (on completion or error)
 *
 * The compositor wraps a fresh HTMLCanvasElement that is appended to a hidden
 * container so the GPU context can be created, but never appears in the UI.
 * WebGL's preserveDrawingBuffer is already enabled on PixiRenderer (required for
 * pixel readback via the draw-into-2D-canvas approach below).
 *
 * Why not OffscreenCanvas?
 *   PixiRenderer.init() requires an HTMLCanvasElement so it can attach WebGL
 *   context-loss event listeners. OffscreenCanvas support would require a
 *   PixiRenderer refactor that is out of scope here.
 *
 * Pixel readback strategy:
 *   After Pixi renders the frame onto the WebGL canvas, we blit the WebGL canvas
 *   into a pooled 2D canvas via drawImage() and call getImageData(). This avoids
 *   the lower-level WebGL readPixels() call and works correctly with the
 *   preserveDrawingBuffer=true setting that is already configured in PixiRenderer.
 */

import { PixiSceneCompositor } from "@/core/render/pixiSceneCompositor";
import type { EvaluatedScene } from "@/core/evaluation/types";

// ── Minimal pool adapter for export ──────────────────────────────────────────
// The real PreviewMediaPool tracks frame callbacks from requestVideoFrameCallback
// to avoid redundant GPU texture uploads during live preview. For export every
// video frame is fully seeked and ready, so we always want a fresh upload.
// This adapter satisfies PixiSceneCompositor's mediaPool interface without the
// overhead of the full PreviewMediaPool.
const ALWAYS_DIRTY_POOL = {
  shouldUpdateTexture: (_clipId: string, _video: HTMLVideoElement) => true,
  markTextureClean: (_clipId: string) => {
    /* no-op for export */
  },
} as const;

// ── Export compositor handle ──────────────────────────────────────────────────

export interface PixiExportCompositor {
  compositor: PixiSceneCompositor;
  canvas: HTMLCanvasElement;
  readbackCanvas: HTMLCanvasElement;
  readbackCtx: CanvasRenderingContext2D;
  container: HTMLDivElement;
}

/**
 * Create a headless PixiSceneCompositor for export.
 *
 * Must be called once per export session and destroyed when the export
 * completes or fails (see destroyPixiExportCompositor).
 *
 * @param width  - Output frame width in pixels
 * @param height - Output frame height in pixels
 * @returns      - Handle to the compositor and its supporting resources
 */
export function createPixiExportCompositor(width: number, height: number): PixiExportCompositor {
  // Create an invisible DOM container — browsers suspend GPU decoding for
  // completely offscreen elements, so we keep it at 1×1 visible size.
  const container = document.createElement("div");
  container.style.cssText = "position:fixed;left:0;top:0;width:1px;height:1px;opacity:0.001;pointer-events:none;z-index:-9999;overflow:hidden;";
  document.body.appendChild(container);

  // WebGL render target
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  container.appendChild(canvas);

  // 2D readback surface
  const readbackCanvas = document.createElement("canvas");
  readbackCanvas.width = width;
  readbackCanvas.height = height;
  const readbackCtx = readbackCanvas.getContext("2d", { willReadFrequently: true });
  if (!readbackCtx) {
    container.remove();
    throw new Error("[PixiExportRenderer] Failed to create 2D readback context");
  }

  // Cast: PixiSceneCompositor's private field `canvas` is typed as
  // `HTMLCanvasElement | null`, and the constructor accepts `HTMLCanvasElement`.
  // The ALWAYS_DIRTY_POOL satisfies the structural PreviewMediaPool interface.
  const compositor = new PixiSceneCompositor(
    canvas,
    width,
    height,
    ALWAYS_DIRTY_POOL as any,
  );

  return { compositor, canvas, readbackCanvas, readbackCtx, container };
}

/**
 * Destroy a headless compositor and clean up all associated DOM and GPU resources.
 * Always call this in a finally block after createPixiExportCompositor.
 */
export function destroyPixiExportCompositor(handle: PixiExportCompositor): void {
  try {
    handle.compositor.destroy();
  } catch (err) {
    console.error("[PixiExportRenderer] Compositor destroy error:", err);
  }
  handle.container.remove();
}

/**
 * Render one frame through the Pixi compositor and return the pixel data.
 *
 * @param handle        - Compositor handle from createPixiExportCompositor
 * @param scene         - Evaluated scene for this frame (from evaluateTimelineSceneCached)
 * @param videoElements - Map of `${clipId}-${mediaId}` → HTMLVideoElement (pre-seeked)
 * @returns             - ImageData containing RGBA pixels for this frame
 */
export async function renderFrameWithPixi(
  handle: PixiExportCompositor,
  scene: EvaluatedScene,
  videoElements: Map<string, HTMLVideoElement>,
): Promise<ImageData> {
  const { compositor, canvas, readbackCanvas, readbackCtx } = handle;

  // Unit viewport: scale=1, no pan offset, pixel ratio=1.
  // For export we always render at the project's native resolution.
  const viewport = {
    scale: 1,
    offsetX: 0,
    offsetY: 0,
    pixelRatio: 1,
    projectWidth: scene.metadata.canvasWidth ?? canvas.width,
    projectHeight: scene.metadata.canvasHeight ?? canvas.height,
  };

  await compositor.composeFrame(
    scene,
    viewport,
    videoElements,
    undefined,  // resourceHandleMap (unused during export)
    new Map(),  // bodyMasks (no body segmentation during export)
  );

  // Blit WebGL canvas → 2D canvas and read pixels.
  // drawImage() from a WebGL canvas works because preserveDrawingBuffer=true
  // is set on the PixiRenderer Application — without it the canvas would be
  // cleared after each render call and the readback would return black pixels.
  readbackCtx.clearRect(0, 0, readbackCanvas.width, readbackCanvas.height);
  readbackCtx.drawImage(canvas, 0, 0);

  return readbackCtx.getImageData(0, 0, readbackCanvas.width, readbackCanvas.height);
}
