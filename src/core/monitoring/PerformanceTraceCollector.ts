/**
 * Performance Trace Collector
 *
 * Collects structured performance traces for offline analysis.
 * Uses bounded ring buffers to prevent memory growth.
 *
 * CRITICAL: Uses structured JSON export, NOT console logging.
 * Console logging changes timing and becomes unusable under load.
 *
 * Architecture:
 * - Frame samples: High-frequency metrics (per RAF)
 * - Clip events: Discrete operations (seek, play, frame arrival)
 * - Export: Structured JSON for offline analysis tools
 */

import type { Clip } from "@/types";

// ─── Types ───────────────────────────────────────────────────────────────

export interface PreviewTraceSample {
  /** performance.now() timestamp */
  timestampMs: number;
  /** Timeline playhead position (seconds) */
  playheadSeconds: number;
  /** Time since last RAF (target: 16.67ms @ 60fps) */
  rafDeltaMs: number;

  // Pipeline breakdown (measured)
  /** Timeline evaluation duration */
  sceneEvaluateMs: number;
  /** PreviewPlaybackScheduler duration */
  schedulerMs: number;
  /** Pixi GPU composition duration */
  pixiRenderMs: number;

  // Media state
  /** Currently active video elements */
  activeVideoCount: number;
  /** Seeks issued this frame */
  seekCount: number;
  /** GPU texture uploads this frame */
  textureUploadCount: number;
  /** Frames reusing old texture */
  staleFrameCount: number;

  // Quality tier
  qualityTier: "full" | "balanced" | "draft" | "survival";
}

export type SeekReason = "drift-recovery" | "scrubbing" | "transport-jump" | "clip-enter" | "trim-change" | "rate-change" | "post-throttling" | "prewarm";

export interface PerClipEvent {
  timestampMs: number;
  clipId: string;
  event: { type: "seek-requested"; sourceTime: number; reason: SeekReason } | { type: "seek-completed"; latencyMs: number } | { type: "frame-arrived"; mediaTime: number; frameSerial: number } | { type: "frame-uploaded"; textureId: string } | { type: "clip-released"; reason: string } | { type: "clip-attached"; mediaId: string } | { type: "play-requested" } | { type: "play-succeeded" } | { type: "play-failed"; error: string } | { type: "pause-requested" };
}

export interface TraceMetadata {
  recordingStartMs: number;
  recordingDurationMs?: number;
  targetHardware: string;
  browserInfo: string;
  pixiVersion?: string;
  scenarioDescription?: string;
  projectId?: string;
  sessionId?: string;
}

export interface PerformanceTrace {
  samples: PreviewTraceSample[];
  clipEvents: PerClipEvent[];
  metadata: TraceMetadata;
}

export interface TraceStats {
  /** Total samples collected */
  totalSamples: number;
  /** Total clip events collected */
  totalEvents: number;
  /** p50 frame time */
  p50FrameTime: number;
  /** p95 frame time (critical metric) */
  p95FrameTime: number;
  /** p99 frame time */
  p99FrameTime: number;
  /** Frames that exceeded 33ms budget */
  droppedFrames: number;
  /** Average seeks per second */
  avgSeeksPerSecond: number;
  /** Average texture uploads per frame */
  avgTextureUploads: number;
  /** Stale frame reuse rate */
  staleFrameReuseRate: number;
}

// ─── Performance Trace Collector ────────────────────────────────────────

export class PerformanceTraceCollector {
  private samples: PreviewTraceSample[] = [];
  private clipEvents: PerClipEvent[] = [];
  private metadata: TraceMetadata;

  private readonly MAX_SAMPLES: number;
  private readonly MAX_EVENTS: number;

  private recording = false;
  private startTime: number | null = null;
  private lastRafTime: number | null = null;

  constructor(
    maxSamples: number = 1800, // 60 seconds @ 30fps
    maxEvents: number = 5000,
    metadata?: Partial<TraceMetadata>,
  ) {
    this.MAX_SAMPLES = maxSamples;
    this.MAX_EVENTS = maxEvents;

    this.metadata = {
      recordingStartMs: performance.now(),
      targetHardware: this.detectHardware(),
      browserInfo: this.detectBrowser(),
      pixiVersion: this.detectPixiVersion(),
      ...metadata,
    };
  }

  /**
   * Start recording trace data.
   */
  startRecording(scenarioDescription?: string): void {
    if (this.recording) return;

    this.recording = true;
    this.startTime = performance.now();
    this.lastRafTime = null;
    this.samples = [];
    this.clipEvents = [];

    if (scenarioDescription) {
      this.metadata.scenarioDescription = scenarioDescription;
    }

    this.metadata.recordingStartMs = this.startTime;
  }

  /**
   * Stop recording trace data.
   */
  stopRecording(): void {
    if (!this.recording) return;

    this.recording = false;

    if (this.startTime) {
      this.metadata.recordingDurationMs = performance.now() - this.startTime;
    }
  }

  /**
   * Check if currently recording.
   */
  isRecording(): boolean {
    return this.recording;
  }

  /**
   * Record a frame sample (called per RAF).
   *
   * Returns RAF delta for convenience.
   */
  recordSample(sample: Omit<PreviewTraceSample, "rafDeltaMs" | "timestampMs">): number {
    if (!this.recording) return 0;

    const now = performance.now();
    const rafDeltaMs = this.lastRafTime ? now - this.lastRafTime : 16.67;
    this.lastRafTime = now;

    const fullSample: PreviewTraceSample = {
      timestampMs: now,
      rafDeltaMs,
      ...sample,
    };

    if (this.samples.length >= this.MAX_SAMPLES) {
      this.samples.shift(); // Bounded ring buffer
    }

    this.samples.push(fullSample);

    return rafDeltaMs;
  }

  /**
   * Record a clip event.
   */
  recordClipEvent(event: PerClipEvent): void {
    if (!this.recording) return;

    if (this.clipEvents.length >= this.MAX_EVENTS) {
      this.clipEvents.shift(); // Bounded ring buffer
    }

    this.clipEvents.push(event);
  }

  /**
   * Record seek request event.
   */
  recordSeekRequest(clipId: string, sourceTime: number, reason: SeekReason): void {
    this.recordClipEvent({
      timestampMs: performance.now(),
      clipId,
      event: { type: "seek-requested", sourceTime, reason },
    });
  }

  /**
   * Record seek completed event.
   */
  recordSeekCompleted(clipId: string, requestTime: number): void {
    const latencyMs = performance.now() - requestTime;
    this.recordClipEvent({
      timestampMs: performance.now(),
      clipId,
      event: { type: "seek-completed", latencyMs },
    });
  }

  /**
   * Record frame arrival event (from RVFC).
   */
  recordFrameArrival(clipId: string, mediaTime: number, frameSerial: number): void {
    this.recordClipEvent({
      timestampMs: performance.now(),
      clipId,
      event: { type: "frame-arrived", mediaTime, frameSerial },
    });
  }

  /**
   * Record texture upload event.
   */
  recordTextureUpload(clipId: string, textureId: string): void {
    this.recordClipEvent({
      timestampMs: performance.now(),
      clipId,
      event: { type: "frame-uploaded", textureId },
    });
  }

  /**
   * Export trace as structured JSON.
   */
  exportTrace(): PerformanceTrace {
    return {
      samples: [...this.samples],
      clipEvents: [...this.clipEvents],
      metadata: { ...this.metadata },
    };
  }

  /**
   * Export trace as JSON string.
   */
  exportTraceJSON(pretty: boolean = false): string {
    const trace = this.exportTrace();
    return JSON.stringify(trace, null, pretty ? 2 : undefined);
  }

  /**
   * Download trace as JSON file.
   */
  downloadTrace(filename?: string): void {
    const json = this.exportTraceJSON(true);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = filename || `performance-trace-${Date.now()}.json`;
    a.click();

    URL.revokeObjectURL(url);
  }

  /**
   * Calculate statistics from collected samples.
   */
  calculateStats(): TraceStats {
    if (this.samples.length === 0) {
      return {
        totalSamples: 0,
        totalEvents: 0,
        p50FrameTime: 0,
        p95FrameTime: 0,
        p99FrameTime: 0,
        droppedFrames: 0,
        avgSeeksPerSecond: 0,
        avgTextureUploads: 0,
        staleFrameReuseRate: 0,
      };
    }

    // Sort frame times for percentile calculation
    const frameTimes = this.samples.map((s) => s.rafDeltaMs).sort((a, b) => a - b);
    const p50Index = Math.floor(frameTimes.length * 0.5);
    const p95Index = Math.floor(frameTimes.length * 0.95);
    const p99Index = Math.floor(frameTimes.length * 0.99);

    const p50FrameTime = frameTimes[p50Index];
    const p95FrameTime = frameTimes[p95Index];
    const p99FrameTime = frameTimes[p99Index];

    // Count dropped frames (>33ms = missed 30fps target)
    const droppedFrames = frameTimes.filter((t) => t > 33).length;

    // Calculate average seeks per second
    const seekEvents = this.clipEvents.filter((e) => e.event.type === "seek-requested");
    const durationSeconds = this.metadata.recordingDurationMs ? this.metadata.recordingDurationMs / 1000 : (this.samples[this.samples.length - 1].timestampMs - this.samples[0].timestampMs) / 1000;
    const avgSeeksPerSecond = seekEvents.length / Math.max(1, durationSeconds);

    // Calculate average texture uploads per frame
    const totalUploads = this.samples.reduce((sum, s) => sum + s.textureUploadCount, 0);
    const avgTextureUploads = totalUploads / this.samples.length;

    // Calculate stale frame reuse rate
    const totalStale = this.samples.reduce((sum, s) => sum + s.staleFrameCount, 0);
    const totalActive = this.samples.reduce((sum, s) => sum + s.activeVideoCount, 0);
    const staleFrameReuseRate = totalActive > 0 ? totalStale / totalActive : 0;

    return {
      totalSamples: this.samples.length,
      totalEvents: this.clipEvents.length,
      p50FrameTime,
      p95FrameTime,
      p99FrameTime,
      droppedFrames,
      avgSeeksPerSecond,
      avgTextureUploads,
      staleFrameReuseRate,
    };
  }

  /**
   * Reset all collected data.
   */
  reset(): void {
    this.samples = [];
    this.clipEvents = [];
    this.recording = false;
    this.startTime = null;
    this.lastRafTime = null;
    this.metadata.recordingStartMs = performance.now();
    delete this.metadata.recordingDurationMs;
    delete this.metadata.scenarioDescription;
  }

  /**
   * Get current sample count.
   */
  getSampleCount(): number {
    return this.samples.length;
  }

  /**
   * Get current event count.
   */
  getEventCount(): number {
    return this.clipEvents.length;
  }

  // ─── Private Methods ─────────────────────────────────────────────────────

  private detectHardware(): string {
    if (typeof navigator === "undefined") return "unknown";

    const cores = navigator.hardwareConcurrency || "unknown";
    const memory = (navigator as any).deviceMemory || "unknown";

    return `${cores} cores, ${memory}GB RAM`;
  }

  private detectBrowser(): string {
    if (typeof navigator === "undefined") return "unknown";

    return navigator.userAgent;
  }

  private detectPixiVersion(): string | undefined {
    try {
      // @ts-ignore - PIXI may or may not be available
      if (typeof PIXI !== "undefined" && PIXI.VERSION) {
        // @ts-ignore
        return PIXI.VERSION;
      }
    } catch {
      // Ignore
    }
    return undefined;
  }
}

// ─── Singleton Export ────────────────────────────────────────────────────

let globalTraceCollector: PerformanceTraceCollector | null = null;

/**
 * Get or create global trace collector.
 */
export function getTraceCollector(): PerformanceTraceCollector {
  if (!globalTraceCollector) {
    globalTraceCollector = new PerformanceTraceCollector();
  }
  return globalTraceCollector;
}

/**
 * Reset global trace collector.
 */
export function resetTraceCollector(): void {
  if (globalTraceCollector) {
    globalTraceCollector.reset();
  }
}
