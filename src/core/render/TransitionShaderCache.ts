/**
 * Transition Shader Cache
 *
 * Tracks which GPU transition shaders have already been compiled (warmed) in
 * the current WebGL session so we never pay the GLSL compile cost twice.
 *
 * WebGL drivers cache compiled programs internally, but only within the same
 * WebGLRenderingContext. The cache therefore maps definition IDs to a boolean
 * per WebGL context. For simplicity we use a single module-level Set because
 * the app maintains one shared PixiJS WebGL context at a time.
 *
 * Lifecycle:
 *   - Populated by PixiSceneCompositor.prewarmTransitionShader()
 *   - Queried   by PixiSceneCompositor.composeActiveTransition() (skip re-mount guard)
 *   - Cleared   by PixiSceneCompositor.destroy() on WebGL context teardown
 */

const _warmedIds = new Set<string>();

export const TransitionShaderCache = {
  /**
   * Returns true if the shader for this transition definition has already
   * been compiled (i.e. mountTransition was called at least once).
   */
  has(definitionId: string): boolean {
    return _warmedIds.has(definitionId);
  },

  /**
   * Mark a transition definition's shader as compiled.
   * Called after a successful mountTransition() / unmountTransition() cycle.
   */
  markWarm(definitionId: string): void {
    _warmedIds.add(definitionId);
  },

  /**
   * Clear all warm entries.
   * Must be called when the WebGL context is destroyed so the next context
   * re-compiles all shaders from scratch.
   */
  clear(): void {
    _warmedIds.clear();
  },

  /** Diagnostic — returns the number of warmed shader programs. */
  size(): number {
    return _warmedIds.size;
  },
} as const;
