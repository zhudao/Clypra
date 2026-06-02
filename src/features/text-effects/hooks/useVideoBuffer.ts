// src/features/text-effects/hooks/useVideoBuffer.ts
import { useEffect, useRef, useCallback } from "react";

interface UseVideoBufferOptions {
  src:         string;
  poster:      string;
  playOnHover: boolean;    // templates: true | effect grid: false (autoplay)
}

export function useVideoBuffer(
  videoRef: React.RefObject<HTMLVideoElement | null>,
  cardRef:  React.RefObject<HTMLElement | null>,
  options:  UseVideoBufferOptions
) {
  const { playOnHover, src } = options;
  const isBuffered = useRef(false);

  // ── IntersectionObserver: buffer when visible ─────────────────
  useEffect(() => {
    const video = videoRef.current;
    const card  = cardRef.current;
    if (!video || !card) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          // Upgrade preload — browser starts downloading silently
          video.preload = "auto";

          const onCanPlay = () => {
            isBuffered.current = true;
            video.removeEventListener("canplay", onCanPlay);

            // Effect grid: autoplay as soon as buffered
            // Templates: wait for hover, play() is instant by then
            if (!playOnHover) {
              video.play().catch(() => {});
            }
          };

          video.addEventListener("canplay", onCanPlay);
          video.load();    // triggers download without playing

        } else {
          // Card left viewport: pause and release
          video.pause();
          video.currentTime = 0;
          isBuffered.current = false;

          // Reset to no-preload to free memory for off-screen cards
          video.preload = "none";
          video.src = "";
          video.src = src;   // reattach without downloading
        }
      },
      { threshold: 0.1, rootMargin: "50px" }
      //              ^                 ^
      //  fires when 10% visible   start buffering 50px before entering viewport
    );

    observer.observe(card);
    return () => {
      observer.disconnect();
      video.removeEventListener("canplay", () => {});
    };
  }, [src, playOnHover]);

  // ── Hover handlers ────────────────────────────────────────────
  const handleMouseEnter = useCallback(() => {
    const video = videoRef.current;
    if (!video || !playOnHover) return;
    // isBuffered means canplay already fired → play() is synchronous and instant
    // If somehow not buffered yet (slow connection), play() starts once enough arrives
    video.play().catch(() => {});
  }, [playOnHover]);

  const handleMouseLeave = useCallback(() => {
    const video = videoRef.current;
    if (!video || !playOnHover) return;
    video.pause();
    video.currentTime = 0;
  }, [playOnHover]);

  return { handleMouseEnter, handleMouseLeave };
}
