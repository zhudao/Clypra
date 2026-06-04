import React, { useState } from "react";
import { Plus, Library as LibraryIcon, Type, Music, Sliders, Undo2, Redo2, Shuffle } from "lucide-react";
import { TopBar } from "./TopBar";
import { EnhancedMediaPanel } from "./media-panel/EnhancedMediaPanel";
import { PreviewPanel } from "./preview/PreviewPanel";
import { PropertiesPanel } from "./PropertiesPanel";
import { Timeline } from "./timeline/Timeline";
import { BottomSheet } from "../ui/BottomSheet";
import { getInsertIndexForNewTrack, useTimelineStore } from "@/store/timelineStore";
import { useProjectStore } from "@/store/projectStore";
import { useUIStore } from "@/store/uiStore";
import { useHistoryStore } from "@/store/historyStore";
import { useMediaImport } from "@/hooks/useMediaImport";
import { createClipFromAsset } from "@/lib/timelineClip";
import { createTextClip, TEXT_PRESETS } from "@/lib/textClip";
import { autoAdaptSequenceForFirstVisualClip } from "@/lib/sequenceAutoAspect";
import { DEFAULT_PLACEMENT_POLICY, resolveAddToTimelinePlacement, resolveDefaultFitModeForAsset } from "@/lib/placementPolicy";
import { getPlaybackClock } from "@/hooks/usePlaybackClock";
import type { TabType } from "./media-tabs";

export const MobileEditorLayout: React.FC = () => {
  const { tracks, clips, addClip, addTrack, insertTrackAt, getTimelineEndTime } = useTimelineStore();
  const { mediaAssets, project, updateProject } = useProjectStore();
  const { selectedClipIds } = useUIStore();
  const { undo, redo, state: historyState } = useHistoryStore();
  const { importMedia, isLoading: isImporting } = useMediaImport();

  const [mediaSheetOpen, setMediaSheetOpen] = useState(false);
  const [activeMediaTab, setActiveMediaTab] = useState<TabType>("media");
  const [propertiesSheetOpen, setPropertiesSheetOpen] = useState(false);

  const handleAddToTimeline = (item: any, type: string) => {
    // Close sheet when adding an item to timeline to reveal change
    setMediaSheetOpen(false);

    if (type === "media") {
      const mediaAsset = mediaAssets.find((asset) => asset.id === item.id);
      if (!mediaAsset) return;

      const placement = resolveAddToTimelinePlacement({
        asset: mediaAsset,
        tracks,
        clips,
        playheadTime: getPlaybackClock().time,
        sequenceEndTime: getTimelineEndTime(),
      });
      let targetTrackId = placement.targetTrackId;
      if (placement.shouldCreateTrack || !targetTrackId) {
        const latestTracks = useTimelineStore.getState().tracks;
        const insertIndex = getInsertIndexForNewTrack(latestTracks, placement.trackType);
        targetTrackId = insertTrackAt(placement.trackType, insertIndex);
      }

      if (!targetTrackId) return;

      if (DEFAULT_PLACEMENT_POLICY.autoAdaptSequenceForFirstVisualClip) {
        autoAdaptSequenceForFirstVisualClip({
          project,
          existingClips: clips,
          asset: mediaAsset,
          updateProject,
        });
      }

      const nextProject = useProjectStore.getState().project;

      const newClip = createClipFromAsset({
        asset: mediaAsset,
        trackId: targetTrackId,
        startTime: placement.startTime,
        width: nextProject?.canvasWidth || project?.canvasWidth || 1920,
        height: nextProject?.canvasHeight || project?.canvasHeight || 1080,
        fitMode: resolveDefaultFitModeForAsset(mediaAsset),
      });

      addClip(newClip);
    } else if (type === "text") {
      const sequenceEndTime = getTimelineEndTime();
      const playheadTime = getPlaybackClock().time;
      const startTime = Math.max(0, Math.min(playheadTime, Math.max(0, sequenceEndTime)));
      const firstUnlockedTextTrack = tracks.find((track) => track.type === "text" && !track.locked);
      let targetTrackId: string | null = firstUnlockedTextTrack?.id ?? null;

      if (targetTrackId) {
        const targetTrackClips = clips.filter((clip) => clip.trackId === targetTrackId);
        const occupiedAtPlayhead = targetTrackClips.some((clip) => clip.startTime <= startTime && startTime < clip.startTime + clip.duration);
        if (occupiedAtPlayhead) {
          targetTrackId = null;
        }
      }

      if (!targetTrackId) {
        const latestTracks = useTimelineStore.getState().tracks;
        const insertIndex = getInsertIndexForNewTrack(latestTracks, "text");
        targetTrackId = insertTrackAt("text", insertIndex);
      }

      if (!targetTrackId) return;

      let presetConfig = {};
      if (item.id && item.id.startsWith("text-")) {
        const presetName = item.name?.toLowerCase().replace(/\s+/g, "") as keyof typeof TEXT_PRESETS;
        if (TEXT_PRESETS[presetName]) {
          presetConfig = TEXT_PRESETS[presetName];
        }
      }

      const textClip = createTextClip({
        trackId: targetTrackId,
        startTime,
        duration: 5.0,
        text: item.text || item.name || "Text",
        canvasWidth: project?.canvasWidth || 1920,
        canvasHeight: project?.canvasHeight || 1080,
        ...presetConfig,
        fontFamily: item.fontFamily,
        color: item.color,
        fontSize: item.fontSize,
        fontWeight: item.fontWeight,
        fontStyle: item.fontStyle,
        stroke: item.stroke,
        shadow: item.shadow,
        background: item.background,
        styleId: item.styleId,
        templateId: item.templateId,
      });

      addClip(textClip);
    }
  };

  const openLibraryWithTab = (tab: TabType) => {
    setActiveMediaTab(tab);
    setMediaSheetOpen(true);
  };

  const hasSelectedClip = selectedClipIds.length > 0;

  return (
    <div className="w-full h-full flex flex-col app-shell overflow-hidden p-1">
      <TopBar />

      <div className="flex-1 min-h-0 flex flex-col overflow-hidden gap-2">
        {/* Top Section: Video Preview */}
        <div className="flex-1 min-h-[200px] flex flex-col overflow-hidden panel-shell">
          <PreviewPanel />
        </div>

        {/* Middle Section: Touch Action Toolbar */}
        <div className="h-14 shrink-0 panel-shell flex items-center justify-between px-3 md:px-4 bg-surface/50 backdrop-blur-sm select-none">
          {/* History Controls */}
          <div className="flex items-center gap-1">
            <button
              onClick={undo}
              disabled={!historyState.canUndo}
              className={`w-9 h-9 flex items-center justify-center rounded-lg transition-colors cursor-pointer ${
                historyState.canUndo
                  ? "text-text-primary hover:bg-white/6 hover:text-accent"
                  : "text-text-muted cursor-not-allowed"
              }`}
              title="Undo"
              aria-label="Undo"
            >
              <Undo2 className="w-4 h-4" />
            </button>
            <button
              onClick={redo}
              disabled={!historyState.canRedo}
              className={`w-9 h-9 flex items-center justify-center rounded-lg transition-colors cursor-pointer ${
                historyState.canRedo
                  ? "text-text-primary hover:bg-white/6 hover:text-accent"
                  : "text-text-muted cursor-not-allowed"
              }`}
              title="Redo"
              aria-label="Redo"
            >
              <Redo2 className="w-4 h-4" />
            </button>
          </div>

          <div className="w-px h-6 bg-white/10" />

          {/* Action Tabs */}
          <div className="flex items-center gap-1.5 flex-1 justify-center max-w-sm overflow-x-auto scrollbar-none px-1">
            <button
              onClick={importMedia}
              disabled={isImporting}
              className="flex flex-col items-center justify-center w-11 h-11 rounded-lg hover:bg-white/6 text-text-primary active:bg-white/10 transition-colors cursor-pointer shrink-0"
              title="Import Files"
            >
              <Plus className="w-4 h-4 text-accent-soft" />
              <span className="text-[9px] font-medium mt-0.5">Import</span>
            </button>

            <button
              onClick={() => openLibraryWithTab("media")}
              className="flex flex-col items-center justify-center w-11 h-11 rounded-lg hover:bg-white/6 text-text-primary active:bg-white/10 transition-colors cursor-pointer shrink-0"
              title="Media Assets"
            >
              <LibraryIcon className="w-4 h-4" />
              <span className="text-[9px] font-medium mt-0.5">Media</span>
            </button>

            <button
              onClick={() => openLibraryWithTab("text")}
              className="flex flex-col items-center justify-center w-11 h-11 rounded-lg hover:bg-white/6 text-text-primary active:bg-white/10 transition-colors cursor-pointer shrink-0"
              title="Add Text"
            >
              <Type className="w-4 h-4" />
              <span className="text-[9px] font-medium mt-0.5">Text</span>
            </button>

            <button
              onClick={() => openLibraryWithTab("audio")}
              className="flex flex-col items-center justify-center w-11 h-11 rounded-lg hover:bg-white/6 text-text-primary active:bg-white/10 transition-colors cursor-pointer shrink-0"
              title="Add Audio"
            >
              <Music className="w-4 h-4" />
              <span className="text-[9px] font-medium mt-0.5">Audio</span>
            </button>

            <button
              onClick={() => openLibraryWithTab("transitions")}
              className="flex flex-col items-center justify-center w-11 h-11 rounded-lg hover:bg-white/6 text-text-primary active:bg-white/10 transition-colors cursor-pointer shrink-0"
              title="Transitions"
            >
              <Shuffle className="w-4 h-4" />
              <span className="text-[9px] font-medium mt-0.5">Transitions</span>
            </button>
          </div>

          <div className="w-px h-6 bg-white/10" />

          {/* Properties Toggle */}
          <button
            onClick={() => setPropertiesSheetOpen(true)}
            disabled={!hasSelectedClip}
            className={`w-11 h-11 flex flex-col items-center justify-center rounded-lg transition-colors cursor-pointer shrink-0 ${
              hasSelectedClip
                ? "text-text-primary hover:bg-white/6 active:bg-white/10"
                : "text-text-muted cursor-not-allowed"
            }`}
            title="Clip Properties"
          >
            <Sliders className={`w-4 h-4 ${hasSelectedClip ? "text-accent-soft" : ""}`} />
            <span className="text-[9px] font-medium mt-0.5">Adjust</span>
          </button>
        </div>

        {/* Bottom Section: Compact Timeline */}
        <div className="h-60 panel-shell overflow-hidden shrink-0">
          <Timeline />
        </div>
      </div>

      {/* Library Bottom Sheet Drawer */}
      <BottomSheet
        title="Asset Library"
        isOpen={mediaSheetOpen}
        onClose={() => setMediaSheetOpen(false)}
      >
        <div className="p-3 h-[50vh] flex flex-col">
          <EnhancedMediaPanel
            onAddToTimeline={handleAddToTimeline}
            initialTab={activeMediaTab}
          />
        </div>
      </BottomSheet>

      {/* Properties/Adjust Bottom Sheet Drawer */}
      <BottomSheet
        title="Clip Adjustments"
        isOpen={propertiesSheetOpen}
        onClose={() => setPropertiesSheetOpen(false)}
      >
        <div className="p-3 h-[50vh] flex flex-col">
          <PropertiesPanel />
        </div>
      </BottomSheet>
    </div>
  );
};
