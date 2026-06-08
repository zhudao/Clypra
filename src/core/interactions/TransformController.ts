/**
 * Transform Controller - Imperative Transform State Management
 *
 * ARCHITECTURE: Signal Plane
 * - Transform state updates at 60fps during drag (>4Hz)
 * - RAF loop reads imperatively (no React re-renders)
 * - Only commits to Zustand on mouseup (discrete user action)
 *
 * This is NOT React state. This is an imperative transform engine.
 *
 * Key principles:
 * - Transform is a continuous signal during drag, not discrete state
 * - Consumers read imperatively via getActiveTransform()
 * - No React re-renders on every mouse move
 * - High-frequency updates (60fps) without React overhead
 *
 * Architecture:
 *   TransformController (signal source)
 *       ↓
 *   Imperative consumers (overlay render, canvas preview)
 *       ↓
 *   Commit to timeline store (on mouseup only)
 *
 * This prevents:
 * - React render storms during drag
 * - Transform lag (mousemove → setState → re-render → overlay update)
 * - Effect cancellation loops
 */

import type { TransformState, TransformHandle } from "@/types";

export type TransformListener = (state: TransformState | null) => void;

/**
 * Transform Controller - Imperative transform state.
 *
 * This is the SINGLE SOURCE OF TRUTH for active transform operations.
 * It is NOT React state. It is a continuous signal during drag.
 */
export class TransformController {
  private _activeTransform: TransformState | null = null;

  // Listeners (for UI snapshots only, not every frame)
  private _listeners = new Set<TransformListener>();
  private _lastNotifyTime: number = 0;
  private _notifyThrottleMs: number = 100; // Notify UI max 10fps

  constructor() {
    // Bind methods for stable references
    this.startTransform = this.startTransform.bind(this);
    this.updateTransform = this.updateTransform.bind(this);
    this.endTransform = this.endTransform.bind(this);
  }

  // ─── Getters (Imperative reads) ────────────────────────────────────────────

  /**
   * Get active transform (imperative read).
   * This is how consumers should read transform - NOT via React state.
   */
  getActiveTransform(): TransformState | null {
    return this._activeTransform;
  }

  /**
   * Get transform mode.
   */
  getTransformMode(): "select" | "transform" | null {
    return this._activeTransform ? "transform" : null;
  }

  // ─── Transform Control ─────────────────────────────────────────────────────

  /**
   * Start transform operation.
   */
  startTransform(state: TransformState): void {
    this._activeTransform = state;
    this._notifyListeners();
  }

  /**
   * Update transform during drag.
   * This runs at 60fps and does NOT notify listeners (no React re-renders).
   * RAF loop reads imperatively via getActiveTransform().
   */
  updateTransform(state: TransformState): void {
    this._activeTransform = state;
    // No notification during drag - render loop reads imperatively
  }

  /**
   * End transform operation.
   * Clears active transform and notifies listeners.
   */
  endTransform(): void {
    this._activeTransform = null;
    this._notifyListeners();
  }

  // ─── Subscription (For UI snapshots only) ──────────────────────────────────

  /**
   * Subscribe to transform state changes.
   * NOTE: This is for UI updates only (throttled to 10fps).
   * Render loops should read getActiveTransform() imperatively, not via subscription.
   */
  subscribe(listener: TransformListener): () => void {
    this._listeners.add(listener);
    return () => this._listeners.delete(listener);
  }

  /**
   * Notify listeners (throttled).
   */
  private _notifyListeners(): void {
    const now = Date.now();
    if (now - this._lastNotifyTime > this._notifyThrottleMs) {
      const state = this._activeTransform;
      this._listeners.forEach((listener) => listener(state));
      this._lastNotifyTime = now;
    }
  }

  // ─── Cleanup ───────────────────────────────────────────────────────────────

  /**
   * Dispose controller (cleanup).
   */
  dispose(): void {
    this._activeTransform = null;
    this._listeners.clear();
  }
}

/**
 * Global transform controller instance.
 */
let globalController: TransformController | null = null;

/**
 * Get or create global transform controller.
 */
export function getTransformController(): TransformController {
  if (!globalController) {
    globalController = new TransformController();
  }
  return globalController;
}

/**
 * Reset global transform controller (for testing).
 */
export function resetTransformController(): void {
  if (globalController) {
    globalController.dispose();
  }
  globalController = null;
}
