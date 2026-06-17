const DEBUG_KEY = "clypra.debug.textRender";

export function isTextRenderTraceEnabled(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage?.getItem(DEBUG_KEY) === "1" || (window as any).__CLYPRA_TEXT_RENDER_DEBUG__ === true;
}

export function textRenderTrace(stage: string, payload: Record<string, unknown>): void {
  if (!isTextRenderTraceEnabled()) return;
  console.debug(`[TextRenderTrace:${stage}]`, payload);
}

export function textRenderWarn(stage: string, payload: Record<string, unknown>): void {
  if (!isTextRenderTraceEnabled()) return;
  console.warn(`[TextRenderTrace:${stage}]`, payload);
}

export function sampleCanvasAlpha(ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D, width: number, height: number): { visiblePixels: number; sampledPixels: number; alphaMax: number } | null {
  if (!isTextRenderTraceEnabled()) return null;

  try {
    const w = Math.max(1, Math.min(Math.floor(width), 512));
    const h = Math.max(1, Math.min(Math.floor(height), 512));
    const image = ctx.getImageData(0, 0, w, h);
    const step = Math.max(4, Math.floor(image.data.length / 4096 / 4) * 4);
    let visiblePixels = 0;
    let sampledPixels = 0;
    let alphaMax = 0;

    for (let i = 3; i < image.data.length; i += step) {
      const alpha = image.data[i];
      if (alpha > 8) visiblePixels++;
      if (alpha > alphaMax) alphaMax = alpha;
      sampledPixels++;
    }

    return { visiblePixels, sampledPixels, alphaMax };
  } catch (error) {
    textRenderWarn("alpha-sample-failed", { error });
    return null;
  }
}
