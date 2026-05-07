import React, { useRef, useCallback, useEffect, useState } from "react";
import { usePlayback } from "../../../hooks/usePlayback";

interface TimelineRulerProps {
  pixelsPerSecond: number;
  scrollLeft: number;
}

/**
 * TimelineRuler renders time markers aligned to the timeline content.
 *
 * It sits inside the scrollable container, so markers are positioned absolutely
 * with `left = time × pixelsPerSecond`. The scroll container handles viewport offset.
 *
 * Marker density adapts to zoom:
 *   - Zoomed out (<30 px/s): every 10s
 *   - Normal (<80 px/s): every 5s
 *   - Closer (<200 px/s): every 1s
 *   - Close (<500 px/s): every 0.5s
 *   - Very close: frame-accurate (1/fps)
 */
export const TimelineRuler: React.FC<TimelineRulerProps> = ({ pixelsPerSecond, scrollLeft }) => {
  const { frameRate } = usePlayback();
  const containerRef = useRef<HTMLDivElement>(null);
  const [viewportWidth, setViewportWidth] = useState(1200);

  // Measure the actual viewport width on mount and resize
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const measure = () => setViewportWidth(el.clientWidth || 1200);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const getMarkerInterval = useCallback((): number => {
    if (pixelsPerSecond < 30) return 10;
    if (pixelsPerSecond < 80) return 5;
    if (pixelsPerSecond < 200) return 1;
    if (pixelsPerSecond < 500) return 0.5;
    return Math.max(1 / frameRate, 0.01); // frame-accurate at extreme zoom
  }, [pixelsPerSecond, frameRate]);

  const markerInterval = getMarkerInterval();

  // Major marker = every 4th marker (or every 1s when interval is sub-second)
  const majorEvery = markerInterval >= 1 ? 4 : Math.round(1 / markerInterval);

  // Compute visible range from actual viewport width (with padding)
  const paddingPx = 100; // render a bit outside viewport for smooth scrolling
  const startTime = Math.max(0, (scrollLeft - paddingPx) / pixelsPerSecond);
  const visibleRange = (viewportWidth + paddingPx * 2) / pixelsPerSecond;
  const endTime = startTime + visibleRange;

  // Generate markers
  const markers: number[] = [];
  const firstMarker = Math.floor(startTime / markerInterval) * markerInterval;
  for (let time = firstMarker; time <= endTime; time += markerInterval) {
    // Avoid negative timestamps and float drift
    const t = Math.round(time * 1000) / 1000;
    if (t < 0) continue;
    markers.push(t);
  }

  /**
   * Format time label with appropriate precision for the current zoom level.
   * - At ≥1s intervals: show M:SS
   * - At sub-second intervals: show M:SS.f or M:SS.ff
   */
  const formatTime = useCallback(
    (seconds: number): string => {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;

      if (markerInterval >= 1) {
        // Integer seconds
        return `${mins}:${String(Math.floor(secs)).padStart(2, "0")}`;
      }

      if (markerInterval >= 0.1) {
        // One decimal place: 0:03.5
        const whole = Math.floor(secs);
        const frac = Math.floor((secs - whole) * 10);
        return `${mins}:${String(whole).padStart(2, "0")}.${frac}`;
      }

      // Two decimal places for frame-accurate zoom
      const whole = Math.floor(secs);
      const frac = Math.floor((secs - whole) * 100);
      return `${mins}:${String(whole).padStart(2, "0")}.${String(frac).padStart(2, "0")}`;
    },
    [markerInterval]
  );

  return (
    <div
      ref={containerRef}
      className="relative h-8 bg-[#171a1f] border-b border-[#2c2f34] select-none overflow-hidden"
    >
      {markers.map((time, i) => {
        const markerIndex = Math.round(time / markerInterval);
        const isMajor = markerIndex % majorEvery === 0;
        // ✅ Round to avoid subpixel rendering issues
        const x = Math.round(time * pixelsPerSecond);
        return (
          <div
            key={time}
            style={{
              position: "absolute",
              left: `${x}px`,
              top: 0,
              height: "100%",
              userSelect: "none",
            }}
            className="group"
          >
            <div
              className={`w-px ${isMajor ? "h-4 bg-[#3c424c]" : "h-2 bg-[#333941]"} mt-0`}
            />
            {isMajor && (
              <span className="absolute top-4 left-1 text-[10px] leading-none text-[#7f8894] whitespace-nowrap group-hover:text-[#d0d6de]">
                {formatTime(time)}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
};
