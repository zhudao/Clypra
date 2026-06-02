// src/features/text-effects/hooks/useEffectCanvas.ts
import { useEffect, useRef } from "react";
import { useEffectsStore } from "../store/effectsStore";
import { renderTextEffectToContext } from "../renderer";

export function useEffectCanvas(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  text: string
) {
  const { selectedEffect } = useEffectsStore();
  const rafId = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !selectedEffect) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const startTime = performance.now();

    const hasAnimation = selectedEffect.animation && selectedEffect.animation.type !== "none";

    if (hasAnimation) {
      // ── Animated effect: drive a rAF loop ──────────────────
      const loop = (now: number) => {
        const elapsedSec = (now - startTime) / 1000;
        const durationSec = (selectedEffect.durationMs ?? 2000) / 1000;
        const loopTime = elapsedSec % durationSec;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        renderTextEffectToContext(
          ctx,
          text,
          selectedEffect,
          48, // font size suited for 600x200 canvas preview
          canvas.width / 2,
          canvas.height / 2,
          canvas.width,
          canvas.height,
          loopTime,
          0,
          durationSec
        );

        rafId.current = requestAnimationFrame(loop);
      };

      rafId.current = requestAnimationFrame(loop);
    } else {
      // ── Static effect: single draw ──────────────────────────
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      renderTextEffectToContext(
        ctx,
        text,
        selectedEffect,
        48,
        canvas.width / 2,
        canvas.height / 2,
        canvas.width,
        canvas.height
      );
    }

    return () => {
      cancelAnimationFrame(rafId.current);
    };
  }, [selectedEffect, text]);   // re-render if user types new text
}
