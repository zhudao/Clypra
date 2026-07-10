// Pixi/WebGL is the single preview pipeline for all builds.
// Canvas 2D preview (ComplexProgramPreview) has been retired.
// If WebGL is unavailable, ProgramPreview renders WebGLUnavailableError.
export const PREVIEW_MODE = "complex-pixi" as const;
export type PreviewMode = typeof PREVIEW_MODE;
