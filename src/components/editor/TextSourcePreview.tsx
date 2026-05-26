import { useRef, useEffect } from "react";
import { LottiePlayer } from "@/features/text-templates/LottiePlayer";
import { renderTextEffect } from "@/features/renderer/renderer";
import { allEffects } from "@/features/renderer/definitions";

export const TextSourcePreview: React.FC<{ preset: any }> = ({ preset }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previewText = "Default text";
  const isTemplate = preset?.presetType === "template" || !!preset?.lottieData;
  const styleId = preset?.styleId || preset?.id;
  const premiumEffect = styleId ? allEffects.find((e) => e.id === styleId) : null;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !premiumEffect || isTemplate) return;
    canvas.width = 640;
    canvas.height = 360;

    renderTextEffect(canvas, previewText, premiumEffect, 44);

    if (typeof document !== "undefined" && document.fonts) {
      document.fonts.ready.then(() => {
        // Redraw once fonts have finished loading
        renderTextEffect(canvas, previewText, premiumEffect, 44);
      });
    }
  }, [previewText, premiumEffect, isTemplate]);

  if (!preset) return null;

  if (isTemplate) {
    return (
      <div className="w-full aspect-video bg-black flex items-center justify-center relative p-8 shadow-[0_0_40px_rgba(0,0,0,0.8)] border border-white/5 overflow-hidden">
        <LottiePlayer lottieData={preset.injectedData || preset.lottieData} autoplay={true} loop={true} className="w-full h-full object-contain" />
      </div>
    );
  }

  // Always use Canvas display since all effects are registered procedurally
  return (
    <div className="w-full aspect-video bg-black flex items-center justify-center relative p-8 shadow-[0_0_40px_rgba(0,0,0,0.8)] border border-white/5 overflow-hidden">
      <canvas ref={canvasRef} className="max-w-full max-h-full block select-none pointer-events-none" />
    </div>
  );
};
