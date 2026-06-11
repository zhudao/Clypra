/**
 * Text Animation Controls Component
 *
 * UI controls for applying entrance and exit animations to text clips
 */

import React from "react";
import type { TextClip, TextAnimation } from "@/types";
import { ENTRANCE_PRESETS, EXIT_PRESETS, createDefaultAnimation } from "@/lib/textAnimation";
import { useTimelineStore } from "@/store/timelineStore";

interface TextAnimationControlsProps {
  clip: TextClip;
}

export const TextAnimationControls: React.FC<TextAnimationControlsProps> = ({ clip }) => {
  const updateClip = useTimelineStore((state) => state.updateClip);

  const handleEntranceChange = (type: string) => {
    const animation = type === "none" ? undefined : createDefaultAnimation(type as any);

    updateClip(clip.id, { entranceAnimation: animation } as Partial<TextClip>);
  };

  const handleExitChange = (type: string) => {
    const animation = type === "none" ? undefined : createDefaultAnimation(type as any);

    updateClip(clip.id, { exitAnimation: animation } as Partial<TextClip>);
  };

  const handleEntranceDurationChange = (duration: number) => {
    if (clip.entranceAnimation) {
      updateClip(clip.id, {
        entranceAnimation: {
          ...clip.entranceAnimation,
          duration: Math.max(0.1, Math.min(duration, clip.duration / 2)),
        },
      } as Partial<TextClip>);
    }
  };

  const handleExitDurationChange = (duration: number) => {
    if (clip.exitAnimation) {
      updateClip(clip.id, {
        exitAnimation: {
          ...clip.exitAnimation,
          duration: Math.max(0.1, Math.min(duration, clip.duration / 2)),
        },
      } as Partial<TextClip>);
    }
  };

  const handleEntranceEasingChange = (easing: TextAnimation["easing"]) => {
    if (clip.entranceAnimation) {
      updateClip(clip.id, {
        entranceAnimation: {
          ...clip.entranceAnimation,
          easing,
        },
      } as Partial<TextClip>);
    }
  };

  const handleExitEasingChange = (easing: TextAnimation["easing"]) => {
    if (clip.exitAnimation) {
      updateClip(clip.id, {
        exitAnimation: {
          ...clip.exitAnimation,
          easing,
        },
      } as Partial<TextClip>);
    }
  };

  return (
    <div className="space-y-4 p-3 bg-surface/30 rounded-lg border border-border/50">
      <div className="flex items-center gap-2 pb-2 border-b border-border/30">
        <span className="text-xs font-bold text-text-primary uppercase tracking-wide">Text Animations</span>
      </div>

      {/* Entrance Animation */}
      <div className="space-y-2">
        <label className="text-xs font-semibold text-text-muted uppercase">Entrance</label>
        <select value={clip.entranceAnimation?.type || "none"} onChange={(e) => handleEntranceChange(e.target.value)} className="w-full px-2 py-1.5 text-xs bg-surface-raised border border-border rounded-md text-text-primary focus:outline-none focus:ring-1 focus:ring-accent">
          {ENTRANCE_PRESETS.map((preset) => (
            <option key={preset.type} value={preset.type}>
              {preset.name}
            </option>
          ))}
        </select>

        {clip.entranceAnimation && clip.entranceAnimation.type !== "none" && (
          <div className="space-y-2 pl-2 border-l-2 border-accent/30">
            <div>
              <label className="text-[10px] font-medium text-text-muted block mb-1">Duration (seconds)</label>
              <input type="number" min="0.1" max={clip.duration / 2} step="0.1" value={clip.entranceAnimation.duration} onChange={(e) => handleEntranceDurationChange(parseFloat(e.target.value))} className="w-full px-2 py-1 text-xs bg-surface-raised border border-border rounded text-text-primary focus:outline-none focus:ring-1 focus:ring-accent" />
            </div>
            <div>
              <label className="text-[10px] font-medium text-text-muted block mb-1">Easing</label>
              <select value={clip.entranceAnimation.easing} onChange={(e) => handleEntranceEasingChange(e.target.value as any)} className="w-full px-2 py-1 text-xs bg-surface-raised border border-border rounded text-text-primary focus:outline-none focus:ring-1 focus:ring-accent">
                <option value="linear">Linear</option>
                <option value="ease-in">Ease In</option>
                <option value="ease-out">Ease Out</option>
                <option value="ease-in-out">Ease In-Out</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Exit Animation */}
      <div className="space-y-2">
        <label className="text-xs font-semibold text-text-muted uppercase">Exit</label>
        <select value={clip.exitAnimation?.type || "none"} onChange={(e) => handleExitChange(e.target.value)} className="w-full px-2 py-1.5 text-xs bg-surface-raised border border-border rounded-md text-text-primary focus:outline-none focus:ring-1 focus:ring-accent">
          {EXIT_PRESETS.map((preset) => (
            <option key={preset.type} value={preset.type}>
              {preset.name}
            </option>
          ))}
        </select>

        {clip.exitAnimation && clip.exitAnimation.type !== "none" && (
          <div className="space-y-2 pl-2 border-l-2 border-accent/30">
            <div>
              <label className="text-[10px] font-medium text-text-muted block mb-1">Duration (seconds)</label>
              <input type="number" min="0.1" max={clip.duration / 2} step="0.1" value={clip.exitAnimation.duration} onChange={(e) => handleExitDurationChange(parseFloat(e.target.value))} className="w-full px-2 py-1 text-xs bg-surface-raised border border-border rounded text-text-primary focus:outline-none focus:ring-1 focus:ring-accent" />
            </div>
            <div>
              <label className="text-[10px] font-medium text-text-muted block mb-1">Easing</label>
              <select value={clip.exitAnimation.easing} onChange={(e) => handleExitEasingChange(e.target.value as any)} className="w-full px-2 py-1 text-xs bg-surface-raised border border-border rounded text-text-primary focus:outline-none focus:ring-1 focus:ring-accent">
                <option value="linear">Linear</option>
                <option value="ease-in">Ease In</option>
                <option value="ease-out">Ease Out</option>
                <option value="ease-in-out">Ease In-Out</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Animation Info */}
      {(clip.entranceAnimation?.type !== "none" || clip.exitAnimation?.type !== "none") && <div className="text-[10px] text-text-muted/70 italic pt-2 border-t border-border/20">Animations preview during playback</div>}
    </div>
  );
};
