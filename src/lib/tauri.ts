import { invoke } from "@tauri-apps/api/core";

/**
 * Generates audio waveform peaks for visualization.
 */
export async function getAudioWaveformPeaks(inputPath: string, bucketCount: number): Promise<number[]> {
  return invoke<number[]>("audio_waveform_peaks", {
    inputPath,
    bucketCount,
  });
}

/**
 * Exports a trimmed video segment.
 */
export async function exportTrimmedVideo(inputPath: string, outputPath: string, startSec: number, endSec: number): Promise<void> {
  return invoke("trim_export", {
    inputPath,
    outputPath,
    startSec,
    endSec,
  });
}

/**
 * Extract a single video frame at a specific time using FFmpeg.
 * Returns a base64-encoded PNG data URL.
 */
export async function extractFrameAtTime(inputPath: string, timeSecs: number, width: number, height: number): Promise<string> {
  return invoke<string>("extract_frame_at_time", {
    inputPath,
    timeSecs,
    width,
    height,
  });
}

/**
 * Extract multiple frames for filmstrip generation.
 * More efficient than multiple individual frame extractions.
 * Returns an array of base64-encoded PNG data URLs.
 */
export async function extractFilmstripFrames(inputPath: string, frameCount: number, width: number, height: number): Promise<string[]> {
  return invoke<string[]>("extract_filmstrip_frames", {
    inputPath,
    frameCount,
    width,
    height,
  });
}
