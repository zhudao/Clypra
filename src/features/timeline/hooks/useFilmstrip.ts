/**
 * Hook for generating filmstrip visualization from video files
 * Uses Rust FFmpeg backend for batch frame extraction (much faster than HTML5 seeking)
 */

import { useEffect, useState, useRef } from "react";
import { extractFilmstripFrames } from "../../../lib/tauri";
import { VIDEO_CONFIG } from "../../../constants/config";
import type { FilmstripResult } from "../../../types";

const { FPS, FILMSTRIP } = VIDEO_CONFIG;

/**
 * Convert Tauri asset URL to file system path for Rust backend
 */
function assetUrlToFilePath(assetUrl: string): string {
  if (assetUrl.startsWith("asset://")) {
    const path = assetUrl.replace(/^asset:\/\/[^/]+\//, "");
    return decodeURIComponent(path);
  }
  return assetUrl;
}

/**
 * Generate filmstrip of video thumbnails for timeline visualization
 * Uses Rust FFmpeg batch extraction - 10-50x faster than HTML5 video seeking
 *
 * @param videoUrl - Path to video file (null to disable)
 * @param durationSec - Duration of the clip in seconds
 * @returns Filmstrip data URL and loading state
 */
export function useFilmstrip(videoUrl: string | null, durationSec: number): FilmstripResult {
  const [stripUrl, setStripUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    if (!videoUrl || durationSec <= 0) {
      setStripUrl(null);
      setLoading(false);
      return;
    }

    // Create new abort controller for this request
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    setLoading(true);

    const frames = Math.min(FILMSTRIP.MAX_FRAMES, Math.max(FILMSTRIP.MIN_FRAMES, Math.ceil((durationSec * FPS) / 8)));
    const cellW = FILMSTRIP.CELL_WIDTH;
    const cellH = FILMSTRIP.CELL_HEIGHT;
    const w = frames * cellW;
    const h = cellH;

    const filePath = assetUrlToFilePath(videoUrl);

    void (async () => {
      try {
        // Extract all frames via Rust FFmpeg backend
        const frameDataUrls = await extractFilmstripFrames(filePath, frames, cellW, cellH);

        if (abortController.signal.aborted) return;

        // Composite frames onto filmstrip canvas
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          setStripUrl(null);
          return;
        }

        // Load and draw each frame
        for (let i = 0; i < frameDataUrls.length; i++) {
          if (abortController.signal.aborted) return;

          const img = new Image();
          img.src = frameDataUrls[i];

          await new Promise<void>((resolve) => {
            img.onload = () => resolve();
            img.onerror = () => resolve();
          });

          ctx.drawImage(img, i * cellW, 0, cellW, cellH);
        }

        if (!abortController.signal.aborted) {
          setStripUrl(canvas.toDataURL("image/jpeg", FILMSTRIP.JPEG_QUALITY));
          setLoading(false);
        }
      } catch (error) {
        console.error("Filmstrip generation failed:", error);
        if (!abortController.signal.aborted) {
          setStripUrl(null);
          setLoading(false);
        }
      }
    })();

    return () => {
      abortController.abort();
      if (abortControllerRef.current === abortController) {
        abortControllerRef.current = null;
      }
    };
  }, [videoUrl, durationSec]);

  return { stripUrl, loading };
}
