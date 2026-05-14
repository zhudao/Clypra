import React, { useRef, useState, useEffect, useCallback } from "react";
import { Plus, X, RotateCcw, Play } from "lucide-react";
import { convertFileSrc } from "@tauri-apps/api/core";
import { useUIStore } from "../../store/uiStore";
import { useTimelineStore } from "../../store/timelineStore";
import { useProjectStore } from "../../store/projectStore";
import { createClipFromAsset } from "../../lib/timelineClip";
import { GPUPreview } from "./GPUPreview";
import { AudioWaveform } from "./AudioWaveform";
import { PreviewTransport } from "./PreviewTransport";

// GPU preview for scrubbing only (precise frame-accurate seeking)
// Use HTML5 video for playback (hardware decode, buffering, smooth playback)
const USE_GPU_PREVIEW = false;

export const SourcePreview: React.FC = () => {
  const { sourceAsset, sourceInPoint, sourceOutPoint, exitSourceMode, markSourceIn, markSourceOut } = useUIStore();
  const { tracks, clips, addClip, addTrack } = useTimelineStore();
  const { project } = useProjectStore();
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [useGPU, setUseGPU] = useState(USE_GPU_PREVIEW && sourceAsset?.type === "video");
  const [gpuFailed, setGpuFailed] = useState(false);

  // Reset when asset changes
  useEffect(() => {
    setCurrentTime(0);
    setIsPlaying(false);
    setUseGPU(USE_GPU_PREVIEW && sourceAsset?.type === "video");
    setGpuFailed(false);
  }, [sourceAsset?.id]); // Only depend on asset ID, not type

  const handleSeek = useCallback((time: number) => {
    if (videoRef.current) videoRef.current.currentTime = time;
    if (audioRef.current) audioRef.current.currentTime = time;
    setCurrentTime(time);
  }, []);

  // Play/pause handler
  const handlePlayPause = useCallback(() => {
    if (useGPU) {
      // GPU preview: just toggle state, GPUPreview handles playback
      setIsPlaying((prev) => !prev);
    } else if (sourceAsset?.type === "audio") {
      // Audio: control audio element
      const audio = audioRef.current;
      if (!audio) return;
      if (isPlaying) {
        audio.pause();
        setIsPlaying(false);
      } else {
        audio.play();
        setIsPlaying(true);
      }
    } else {
      // HTML5 video: control video element
      const video = videoRef.current;
      if (!video) return;
      if (isPlaying) {
        video.pause();
        setIsPlaying(false);
      } else {
        video.play();
        setIsPlaying(true);
      }
    }
  }, [useGPU, sourceAsset?.type, isPlaying]);

  // Play marked region (In to Out)
  const handlePlayMarkedRegion = useCallback(() => {
    if (sourceInPoint === null || sourceOutPoint === null) return;

    // Seek to In point
    handleSeek(sourceInPoint);

    // Start playback if not already playing
    if (!isPlaying) {
      handlePlayPause();
    }
  }, [sourceInPoint, sourceOutPoint, isPlaying, handleSeek, handlePlayPause]);

  // Monitor playback and stop at Out point
  useEffect(() => {
    if (!isPlaying || sourceOutPoint === null) return;

    const checkInterval = setInterval(() => {
      if (currentTime >= sourceOutPoint) {
        // Stop playback
        if (videoRef.current) videoRef.current.pause();
        if (audioRef.current) audioRef.current.pause();
        setIsPlaying(false);
      }
    }, 50); // Check every 50ms

    return () => clearInterval(checkInterval);
  }, [isPlaying, currentTime, sourceOutPoint]);

  // Clear In/Out points
  const handleClearMarks = useCallback(() => {
    markSourceIn(null);
    markSourceOut(null);
  }, [markSourceIn, markSourceOut]);

  // Handle space key for play/pause in source preview
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't capture shortcuts when typing in input fields
      const target = e.target as HTMLElement;
      const isTyping = target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable;
      if (isTyping) return;

      // Space key for play/pause
      if (e.code === "Space") {
        e.preventDefault();
        handlePlayPause();
        return;
      }

      // Arrow keys for seeking (1 second increments)
      const seekAmount = 1.0; // 1 second
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        const newTime = Math.max(0, currentTime - seekAmount);
        handleSeek(newTime);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        const newTime = Math.min(duration, currentTime + seekAmount);
        handleSeek(newTime);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handlePlayPause, currentTime, duration, handleSeek]);

  // Video event listeners (only for HTML5 video, not GPU preview)
  useEffect(() => {
    if (useGPU) return; // Skip if using GPU preview

    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => setCurrentTime(video.currentTime);
    const handleLoadedMetadata = () => setDuration(video.duration);
    const handleEnded = () => setIsPlaying(false);

    video.addEventListener("timeupdate", handleTimeUpdate);
    video.addEventListener("loadedmetadata", handleLoadedMetadata);
    video.addEventListener("ended", handleEnded);

    return () => {
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.removeEventListener("loadedmetadata", handleLoadedMetadata);
      video.removeEventListener("ended", handleEnded);
    };
  }, [useGPU]);

  // Audio event listeners
  useEffect(() => {
    if (sourceAsset?.type !== "audio") return;

    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleLoadedMetadata = () => setDuration(audio.duration);
    const handleEnded = () => setIsPlaying(false);

    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("ended", handleEnded);
    };
  }, [sourceAsset?.type]);

  if (!sourceAsset) return null;

  const handleAddToTimeline = () => {
    if (!project) return;
    const targetTrackType = sourceAsset.type === "audio" ? "audio" : "video";
    let targetTrack = tracks.find((track) => track.type === targetTrackType && !track.locked);
    if (!targetTrack) {
      addTrack(targetTrackType);
      targetTrack = useTimelineStore.getState().tracks.find((t) => t.type === targetTrackType && !t.locked);
    }
    if (!targetTrack) return;

    const trackClips = clips.filter((c) => c.trackId === targetTrack.id);
    const startTime = trackClips.length > 0 ? Math.max(...trackClips.map((c) => c.startTime + c.duration)) : 0;
    const newClip = createClipFromAsset({
      asset: sourceAsset,
      trackId: targetTrack.id,
      startTime,
      width: project.canvasWidth,
      height: project.canvasHeight,
    });

    const trimIn = sourceInPoint ?? 0;
    const trimOut = sourceOutPoint ?? newClip.duration;
    newClip.trimIn = trimIn;
    newClip.trimOut = trimOut;
    newClip.duration = trimOut - trimIn;

    addClip(newClip);
    exitSourceMode();
  };

  /** Format time as HH:MM:SS:FF (frame-accurate) */
  const formatTC = (seconds: number): string => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    const f = Math.floor((seconds % 1) * 30);
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}:${String(f).padStart(2, "0")}`;
  };

  // Calculate marked duration
  const markedDuration = sourceInPoint !== null && sourceOutPoint !== null ? sourceOutPoint - sourceInPoint : null;
  const hasMarks = sourceInPoint !== null || sourceOutPoint !== null;
  const hasCompleteMarks = sourceInPoint !== null && sourceOutPoint !== null;

  const sourcePath = convertFileSrc(sourceAsset.path);
  const mediaLabel = sourceAsset.type === "video" ? "video" : sourceAsset.type === "audio" ? "audio" : "image";

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-bg">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 h-10 shrink-0 border-b border-border/50">
        <div className="flex items-baseline gap-2">
          <span className="text-[13px] font-semibold text-text-primary tracking-tight">Previewing</span>
          <span className="text-[13px] text-text-muted">— {mediaLabel}</span>
        </div>
        <button onClick={exitSourceMode} className="w-7 h-7 flex items-center justify-center rounded hover:bg-white/6 transition-colors text-text-muted hover:text-text-primary" title="Close (Esc)">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* ── Mark Info Bar ──────────────────────────────────────────── */}
      {hasMarks && (
        <div className="px-4 py-2 bg-surface/50 border-b border-border/30 flex items-center justify-between text-[11px]">
          <div className="flex items-center gap-4">
            {sourceInPoint !== null && (
              <div className="flex items-center gap-1.5">
                <span className="text-text-muted">In:</span>
                <span className="font-mono text-accent">{formatTC(sourceInPoint)}</span>
              </div>
            )}
            {sourceOutPoint !== null && (
              <div className="flex items-center gap-1.5">
                <span className="text-text-muted">Out:</span>
                <span className="font-mono text-accent">{formatTC(sourceOutPoint)}</span>
              </div>
            )}
            {hasCompleteMarks && markedDuration !== null && (
              <div className="flex items-center gap-1.5">
                <span className="text-text-muted">Duration:</span>
                <span className="font-mono text-text-primary font-semibold">{markedDuration.toFixed(2)}s</span>
              </div>
            )}
          </div>
          <button onClick={handleClearMarks} className="flex items-center gap-1 px-2 h-5 rounded text-[10px] font-medium text-text-muted hover:text-text-primary hover:bg-white/6 transition-colors" title="Clear marks">
            <RotateCcw className="w-3 h-3" />
            Clear
          </button>
        </div>
      )}

      {/* ── Video Area ─────────────────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center overflow-hidden bg-[#06080a] relative">
        <div className="absolute inset-0 checkerboard opacity-[0.15] pointer-events-none" />
        <div className="w-full h-full flex items-center justify-center relative z-10">
          {sourceAsset.type === "video" ? (
            useGPU && !gpuFailed ? (
              <GPUPreview
                videoPath={sourceAsset.path}
                currentTime={currentTime}
                isPlaying={isPlaying}
                width={sourceAsset.width || 1920}
                height={sourceAsset.height || 1080}
                duration={sourceAsset.duration}
                frameRate={30}
                onTimeUpdate={(time) => {
                  setCurrentTime(time);
                  // Stop playing when reaching end
                  if (time >= duration && duration > 0) {
                    setIsPlaying(false);
                  }
                }}
                className="max-w-full max-h-full shadow-[0_0_40px_rgba(0,0,0,0.8)] ring-1 ring-white/10 bg-black"
              />
            ) : (
              <video ref={videoRef} src={sourcePath} className="max-w-full max-h-full shadow-[0_0_40px_rgba(0,0,0,0.8)] ring-1 ring-white/10 bg-black" playsInline preload="auto" />
            )
          ) : sourceAsset.type === "image" ? (
            <img src={sourcePath} alt={sourceAsset.name} className="max-w-full max-h-full rounded shadow-[0_0_40px_rgba(0,0,0,0.8)] ring-1 ring-white/10 bg-black object-contain" />
          ) : (
            <AudioWaveform audioElement={audioRef.current} isPlaying={isPlaying} coverImage={sourceAsset.coverArt} audioName={sourceAsset.name} className="w-full h-full" />
          )}
        </div>
        {/* Hidden audio element for audio playback */}
        {sourceAsset.type === "audio" && <audio ref={audioRef} src={sourcePath} preload="auto" style={{ display: "none" }} />}
      </div>

      <PreviewTransport
        currentTime={currentTime}
        duration={duration}
        isPlaying={isPlaying}
        onPlayPause={handlePlayPause}
        onSeek={handleSeek}
        formatTime={formatTC}
        inPoint={sourceInPoint}
        outPoint={sourceOutPoint}
        rightActions={
          <>
            <button onClick={() => markSourceIn(currentTime)} className={`px-2 h-6 rounded text-[10px] font-medium transition-colors cursor-pointer ${sourceInPoint !== null && Math.abs(currentTime - sourceInPoint) < 0.1 ? "bg-accent text-white" : "text-text-muted hover:text-text-primary hover:bg-white/6"}`} title="Mark In (I)">
              IN
            </button>
            <button onClick={() => markSourceOut(currentTime)} className={`px-2 h-6 rounded text-[10px] font-medium transition-colors cursor-pointer ${sourceOutPoint !== null && Math.abs(currentTime - sourceOutPoint) < 0.1 ? "bg-accent text-white" : "text-text-muted hover:text-text-primary hover:bg-white/6"}`} title="Mark Out (O)">
              OUT
            </button>
            {hasCompleteMarks && (
              <button onClick={handlePlayMarkedRegion} className="flex items-center gap-1 px-2 h-6 rounded text-[10px] font-medium text-text-muted hover:text-text-primary hover:bg-white/6 transition-colors cursor-pointer" title="Play marked region">
                <Play className="w-3 h-3" />
                Play
              </button>
            )}
            <div className="w-px h-4 bg-white/10 mx-1" />
            <button onClick={handleAddToTimeline} disabled={!hasCompleteMarks} className={`flex items-center gap-1 px-2.5 h-6 rounded text-[10px] font-semibold transition-colors ${hasCompleteMarks ? "bg-green-600/90 hover:bg-green-600 text-white cursor-pointer" : "bg-text-muted/70 hover:bg-text-muted/90 text-white cursor-not-allowed"}`} title={hasCompleteMarks ? `Add ${markedDuration?.toFixed(2)}s to Timeline` : "Add to Timeline"}>
              <Plus className="w-3 h-3" />
              Add
            </button>
          </>
        }
      />
    </div>
  );
};
