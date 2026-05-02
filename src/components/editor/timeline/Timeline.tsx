import React, { useRef, useEffect, useState } from "react";
import { FolderOpen } from "lucide-react";
import { listen } from "@tauri-apps/api/event";
import { TimelineToolbar } from "./TimelineToolbar";
import { TimelineRuler } from "./TimelineRuler";
import { TrackList } from "./TrackList";
import { Track } from "./Track";
import { Playhead } from "./Playhead";
import { useTimelineStore } from "../../../store/timelineStore";
import { usePlayback } from "../../../hooks/usePlayback";

export const Timeline: React.FC = () => {
  const { tracks, clips, pixelsPerSecond, scrollLeft, setScrollLeft, getTimelineEndTime } = useTimelineStore();
  const { currentTime, duration, seek, setDuration } = usePlayback();
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  const totalHeight = tracks.reduce((sum, t) => sum + t.height, 0);
  const contentWidth = Math.max(1000, duration * pixelsPerSecond);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    setScrollLeft(target.scrollLeft);
  };

  useEffect(() => {
    const timelineEnd = getTimelineEndTime();
    setDuration(Math.max(timelineEnd, 10));
  }, [clips, getTimelineEndTime, setDuration]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const playheadX = currentTime * pixelsPerSecond;
    const containerWidth = container.clientWidth;
    const scrollPadding = 100;

    if (playheadX < scrollLeft + scrollPadding) {
      setScrollLeft(Math.max(0, playheadX - scrollPadding));
    } else if (playheadX > scrollLeft + containerWidth - scrollPadding) {
      setScrollLeft(Math.min(playheadX - containerWidth + scrollPadding, contentWidth - containerWidth));
    }
  }, [currentTime, pixelsPerSecond, scrollLeft, setScrollLeft, contentWidth]);

  // Listen for drag events for visual feedback only (MediaPanel handles actual imports)
  useEffect(() => {
    let unlisten: (() => void) | undefined;

    const setupListener = async () => {
      try {
        console.log("[Timeline] Setting up drag listeners for visual feedback");

        // Listen for drag over
        const unlistenHover = await listen<{ position: { x: number; y: number } }>("tauri://drag-over", (event) => {
          if (!containerRef.current) return;

          const rect = containerRef.current.getBoundingClientRect();
          const { x, y } = event.payload.position;

          // Check if mouse is over this container
          const isOver = x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
          setIsDraggingOver(isOver);
        });

        // Listen for drop (just to clear hover state, MediaPanel handles import)
        const unlistenDrop = await listen("tauri://drag-drop", () => {
          console.log("[Timeline] Drag drop detected - clearing hover state (MediaPanel handles import)");
          setIsDraggingOver(false);
        });

        // Listen for drag cancelled
        const unlistenCancel = await listen("tauri://drag-cancelled", () => {
          console.log("[Timeline] Drag cancelled");
          setIsDraggingOver(false);
        });

        unlisten = () => {
          unlistenHover();
          unlistenDrop();
          unlistenCancel();
        };
      } catch (error) {
        console.error("[Timeline] Failed to setup drag listeners:", error);
      }
    };

    setupListener();

    return () => {
      if (unlisten) {
        console.log("[Timeline] Cleaning up drag listeners");
        unlisten();
      }
    };
  }, []);

  return (
    <div className="h-80 bg-[#161a20] border-t border-[#2c2f34] flex flex-col">
      <TimelineToolbar />

      <div className="flex-1 flex overflow-hidden">
        <TrackList />

        <div ref={containerRef} onScroll={handleScroll} className="flex-1 overflow-x-auto overflow-y-hidden scrollbar-thin px-1 relative">
          {/* Visual feedback overlay when dragging over timeline */}
          <div className={`absolute inset-0 transition-colors pointer-events-none ${isDraggingOver ? "bg-cyan-500/10 ring-2 ring-cyan-500/50 ring-inset" : ""}`} style={{ zIndex: isDraggingOver ? 10 : -1 }} />

          {clips.length === 0 ? (
            <div className="absolute inset-0 flex items-center justify-center bg-[#1b1f25]">
              <div className="flex items-center gap-3 text-[#6b7280] pointer-events-none">
                <FolderOpen className="w-5 h-5" />
                <span className="text-sm">Drag material here and start to create</span>
              </div>
            </div>
          ) : (
            <div
              style={{
                width: `${contentWidth}px`,
                minHeight: `${totalHeight + 32}px`,
              }}
              className="bg-[#1b1f25]"
            >
              <TimelineRuler pixelsPerSecond={pixelsPerSecond} scrollLeft={scrollLeft} onSeek={seek} />

              <div style={{ position: "relative", height: totalHeight }} className="bg-[#1b1f25]">
                {tracks.map((track) => (
                  <Track key={track.id} track={track} pixelsPerSecond={pixelsPerSecond} clips={clips} />
                ))}

                <Playhead pixelsPerSecond={pixelsPerSecond} duration={duration} trackHeight={totalHeight} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
