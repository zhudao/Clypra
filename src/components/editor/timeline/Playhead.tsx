import React, { useRef, useEffect, useState } from "react";
import { usePlaybackStore } from "../../../store/playbackStore";

interface PlayheadProps {
  pixelsPerSecond: number;
  duration: number;
}

export const Playhead: React.FC<PlayheadProps> = ({ pixelsPerSecond, duration }) => {
  const { currentTime, seek } = usePlaybackStore();
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const left = Math.max(0, currentTime * pixelsPerSecond);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      e.preventDefault(); // Prevent text selection
      const parent = containerRef.current?.parentElement;
      if (!parent) return;
      const rect = parent.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const newTime = Math.max(0, Math.min(x / pixelsPerSecond, duration));
      seek(newTime);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      document.body.style.cursor = ""; // Reset cursor
      document.body.style.userSelect = ""; // Re-enable text selection
    };

    // Prevent text selection during drag
    document.body.style.cursor = "ew-resize";
    document.body.style.userSelect = "none";

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isDragging, duration, pixelsPerSecond, seek]);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent text selection
    setIsDragging(true);
  };

  return (
    <div
      ref={containerRef}
      data-playhead
      className="absolute z-80 inset-y-0 select-none"
      style={{
        left: `${left}px`,
        width: "8px", // Wider hit area
        marginLeft: "-3px", // Center the visual line
        cursor: "ew-resize", // Inline style for cursor
      }}
      onMouseDown={handleMouseDown}
    >
      {/* Visual line */}
      <div
        className="absolute inset-y-0 left-1/2 -translate-x-1/2 pointer-events-none"
        style={{
          width: "2px",
          backgroundColor: "#f1f4f8",
          boxShadow: "0 0 0 1px rgba(0,0,0,0.25)",
        }}
      />

      {/* Triangle handle at top */}
      <div
        className="absolute w-4 h-3 rounded-[2px] pointer-events-none"
        style={{
          left: "50%",
          transform: "translateX(-50%)",
          top: "-5px",
          backgroundColor: "#f1f4f8",
          clipPath: "polygon(0 100%, 50% 0, 100% 100%)",
          boxShadow: "0 0 0 1px rgba(0,0,0,0.35)",
        }}
      />
    </div>
  );
};
