import lottie, { AnimationItem } from 'lottie-web';
import {
  useEffect, useRef, useImperativeHandle,
  forwardRef, useState
} from 'react';

export interface LottiePlayerHandle {
  play:        () => void;
  pause:       () => void;
  stop:        () => void;
  goToFrame:   (frame: number) => void;
  getAnimation: () => AnimationItem | null;
}

export interface LottiePlayerProps {
  lottieData:   object | null;
  autoplay?:    boolean;
  loop?:        boolean;
  speed?:       number;
  initialFrame?: number;
  width?:       number | string;
  height?:      number | string;
  onReady?:     () => void;
  onComplete?:  () => void;
  onError?:     (error: string) => void;
  className?:   string;
  onFrameChange?: (currentFrame: number, totalFrames: number) => void;
}

type LoadState = 'idle' | 'loading' | 'ready' | 'error';

function patchElementInstance(element: any) {
  if (element && !element.__isTextPatched) {
    element.__isTextPatched = true;

    // 1. Patch buildNewText to be fully crash-safe when vector glyph shapes are missing
    const originalBuildNewText = element.buildNewText;
    if (typeof originalBuildNewText === 'function') {
      element.buildNewText = function () {
        try {
          originalBuildNewText.call(this);
        } catch (e) {
          console.warn('[Clypra:Lottie] Caught error in buildNewText, executing safe fallback', e);
          const documentData = this.textProperty.currentData;
          const len = documentData.finalText ? documentData.finalText.length : 0;
          this.renderedLetters = new Array(documentData.l ? documentData.l.length : 0);
          this.textSpans = [];
          for (let i = 0; i < len; i++) {
            this.textSpans[i] = { elem: [] };
          }
        }
      };
    }

    // 2. Patch renderInnerContent to render beautiful native HTML5 text
    if (typeof element.renderInnerContent === 'function') {
      element.renderInnerContent = function () {
        const ctx = this.canvasContext;
        const textData = this.textProperty?.currentData;
        if (!textData || !textData.t) return;

        ctx.save();

        const fontSize = textData.s || 40;
        const fontName = textData.f || 'Arial';
        ctx.font = `${fontSize}px ${fontName}, sans-serif`;

        if (textData.fc) {
          const r = Math.min(255, Math.max(0, Math.round(textData.fc[0] * 255)));
          const g = Math.min(255, Math.max(0, Math.round(textData.fc[1] * 255)));
          const b = Math.min(255, Math.max(0, Math.round(textData.fc[2] * 255)));
          ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
        } else {
          ctx.fillStyle = '#ffffff';
        }

        if (textData.sc && textData.sw) {
          const sr = Math.min(255, Math.max(0, Math.round(textData.sc[0] * 255)));
          const sg = Math.min(255, Math.max(0, Math.round(textData.sc[1] * 255)));
          const sb = Math.min(255, Math.max(0, Math.round(textData.sc[2] * 255)));
          ctx.strokeStyle = `rgb(${sr}, ${sg}, ${sb})`;
          ctx.lineWidth = textData.sw;
        }

        // 0 = left, 1 = right, 2 = center
        if (textData.j === 1) {
          ctx.textAlign = 'right';
        } else if (textData.j === 2) {
          ctx.textAlign = 'center';
        } else {
          ctx.textAlign = 'left';
        }

        ctx.textBaseline = 'alphabetic';

        const lines = textData.t.split('\n');
        const lineHeight = textData.lh || fontSize * 1.2;

        lines.forEach((line: string, idx: number) => {
          const yOffset = idx * lineHeight;
          ctx.fillText(line, 0, yOffset);
          if (textData.sc && textData.sw) {
            ctx.strokeText(line, 0, yOffset);
          }
        });

        ctx.restore();
      };
    }
  }
}

export const LottiePlayer = forwardRef<LottiePlayerHandle, LottiePlayerProps>(
  ({
    lottieData,
    autoplay  = true,
    loop      = true,
    speed     = 1,
    initialFrame,
    width     = '100%',
    height    = '100%',
    onReady,
    onComplete,
    onError,
    className,
    onFrameChange,
  }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const animRef      = useRef<AnimationItem | null>(null);
    const [loadState, setLoadState] = useState<LoadState>('idle');
    const [error, setError]         = useState<string | null>(null);

    // Keep dynamic callbacks inside mutable refs to prevent re-initializing
    // the Lottie animation player whenever callback references change.
    const onReadyRef = useRef(onReady);
    const onCompleteRef = useRef(onComplete);
    const onErrorRef = useRef(onError);
    const onFrameChangeRef = useRef(onFrameChange);

    useEffect(() => {
      onReadyRef.current = onReady;
      onCompleteRef.current = onComplete;
      onErrorRef.current = onError;
      onFrameChangeRef.current = onFrameChange;
    });

    useImperativeHandle(ref, () => ({
      play:         () => {
        if (animRef.current?.isLoaded) {
          animRef.current.play();
        }
      },
      pause:        () => {
        if (animRef.current?.isLoaded) {
          animRef.current.pause();
        }
      },
      stop:         () => {
        if (animRef.current?.isLoaded) {
          animRef.current.stop();
        }
      },
      goToFrame:    (f) => {
        if (animRef.current?.isLoaded) {
          animRef.current.goToAndStop(f, true);
        }
      },
      getAnimation: () => animRef.current,
    }));

    useEffect(() => {
      // Guard: no data
      if (!lottieData) {
        setLoadState('error');
        setError('lottieData is null or undefined');
        onErrorRef.current?.('lottieData is null or undefined');
        return;
      }

      // Guard: no container
      if (!containerRef.current) {
        setLoadState('error');
        setError('Container ref not attached');
        onErrorRef.current?.('Container ref not attached');
        return;
      }

      // Guard: container has no dimensions
      const { offsetWidth, offsetHeight } = containerRef.current;
      if (offsetWidth === 0 || offsetHeight === 0) {
        console.warn(
          '[LottiePlayer] Container has zero dimensions.',
          { offsetWidth, offsetHeight },
          'Animation may not render. Pass explicit width/height props.'
        );
      }

      // Destroy previous instance
      if (animRef.current) {
        animRef.current.destroy();
        animRef.current = null;
      }

      setLoadState('loading');
      setError(null);

      let anim: AnimationItem;
      try {
        /**
         * ROOT CAUSE DOCUMENTATION:
         * 
         * The lottie-web 'canvas' renderer strictly requires a grouping/formatting
         * "more options" text block (`t.m`) in all text layers (`ty: 5`). Specifically,
         * it evaluates `data2.t.m.g` to determine character groupings.
         * If `t.m` is missing or undefined in the raw template JSON files, the canvas renderer
         * throws a silent BMRenderFrameErrorEvent / TypeError ("undefined is not an object evaluates data2.m.g"),
         * causing the player to crash and render blank boxes in high-DPI environments.
         * 
         * FIX: We validated and repaired all 15 JSON templates to force-define the
         * `t.m` block as `{ "g": 1, "a": { "a": 0, "k": [0, 0] } }`.
         */
        anim = lottie.loadAnimation({
          container:     containerRef.current,
          renderer:      'canvas',
          loop,
          autoplay,
          animationData: JSON.parse(JSON.stringify(lottieData)), // deep cloned to prevent mutation
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setLoadState('error');
        setError(`loadAnimation threw: ${msg}`);
        onErrorRef.current?.(msg);
        return;
      }

      animRef.current = anim;
      anim.setSpeed(speed);

      // Monkey-patch renderer.renderFrame to resolve critical text template issues:
      // 1. Prevent "undefined is not an object (evaluating 'this.elements[i].prepareFrame')" crashes
      // 2. Prevent "null is not an object (evaluating 'this.chars.length')" crashes by ensuring fontManager chars is never null
      // 3. Fallback to native 2D canvas text rendering when glyph/vector shapes (chars) are not embedded in the Lottie JSON
      if (anim && anim.renderer) {
        // Run prototype text creation patch to protect any future creations (especially during mounts/dynamic loads)
        const rendererProto = Object.getPrototypeOf(anim.renderer);
        if (rendererProto && typeof rendererProto.createText === 'function' && !rendererProto.__isCreateTextPatched) {
          rendererProto.__isCreateTextPatched = true;
          const originalCreateText = rendererProto.createText;
          rendererProto.createText = function (data: any) {
            const element = originalCreateText.call(this, data);
            if (element) {
              patchElementInstance(element);
            }
            return element;
          };
        }

        // Run instance patch for all elements already created in this animation instance
        const rendererInstance = anim.renderer as any;
        if (rendererInstance.elements) {
          rendererInstance.elements.forEach((el: any) => {
            if (el && (el.textProperty || el.data?.ty === 5)) {
              patchElementInstance(el);
            }
          });
        }

        const originalRenderFrame = anim.renderer.renderFrame;
        anim.renderer.renderFrame = function (num: number, forceRender?: boolean) {
          const currentRendererInstance = this as any;

          // Resolve FontManager null chars crash before any frame render attempts it
          if (currentRendererInstance.globalData && currentRendererInstance.globalData.fontManager) {
            const fm = currentRendererInstance.globalData.fontManager;
            if (fm.chars === null || fm.chars === undefined) {
              fm.chars = [];
            }
            if (!fm.__isCharsPatched) {
              fm.__isCharsPatched = true;
              let _chars = fm.chars || [];
              try {
                Object.defineProperty(fm, 'chars', {
                  get() { return _chars; },
                  set(val) { _chars = val || []; },
                  configurable: true
                });
              } catch (e) {
                console.warn('[Clypra:Lottie] Failed to define chars property', e);
              }
            }
          }

          // Force skip uninitialized elements during loops
          if (currentRendererInstance.elements) {
            const hasUndefinedElements = currentRendererInstance.elements.some((el: any) => !el);
            if (hasUndefinedElements) {
              currentRendererInstance.completeLayers = false;
            }

            // Ensure any new/dynamic text elements are fully patched before we render
            currentRendererInstance.elements.forEach((el: any) => {
              if (el && (el.textProperty || el.data?.ty === 5)) {
                patchElementInstance(el);
              }
            });
          }

          originalRenderFrame.call(this, num, forceRender);
        };
      }

      // Apply initial frame only after DOMLoaded guarantees elements exist
      anim.addEventListener('DOMLoaded', () => {
        setLoadState('ready');
        if (initialFrame !== undefined) {
          if (autoplay) {
            anim.goToAndPlay(initialFrame, true);
          } else {
            anim.goToAndStop(initialFrame, true);
          }
        }
        onReadyRef.current?.();
      });

      anim.addEventListener('complete', () => {
        onCompleteRef.current?.();
      });

      anim.addEventListener('enterFrame', (e: any) => {
        onFrameChangeRef.current?.(e.currentTime, anim.totalFrames);
      });

      anim.addEventListener('error', (e) => {
        const nativeErr = (e as any).nativeError || e;
        const msg = nativeErr instanceof Error 
          ? `${nativeErr.name}: ${nativeErr.message}\nStack: ${nativeErr.stack}` 
          : JSON.stringify(nativeErr);
        console.error('[LottiePlayer] animation error event:', e);
        console.error('[LottiePlayer] NATIVE ERROR DETAILS:', msg);
        // Do not crash card UI silently if minor frame errors occur, but log them
      });

      anim.addEventListener('data_failed', () => {
        const msg = 'Lottie rejected the animation data (data_failed)';
        setLoadState('error');
        setError(msg);
        onErrorRef.current?.(msg);
      });

      // Cleanup
      return () => {
        anim.destroy();
        animRef.current = null;
      };
    }, [lottieData, loop, autoplay, initialFrame]);

    // Speed change without reinitializing
    useEffect(() => {
      animRef.current?.setSpeed(speed);
    }, [speed]);

    const containerStyle: React.CSSProperties = {
      width: '100%',
      height: '100%',
    };

    return (
      <div style={{ position: 'relative', width, height }}>
        <div
          ref={containerRef}
          className={className}
          style={containerStyle}
        />
        {loadState === 'loading' && (
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center',
            justifyContent: 'center',
            color: '#666677', fontSize: 12,
            fontFamily: 'Inter, sans-serif'
          }}>
            Loading...
          </div>
        )}
        {loadState === 'error' && (
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center',
            justifyContent: 'center',
            color: '#FF6B6B', fontSize: 11,
            fontFamily: 'Inter, sans-serif',
            padding: 8, textAlign: 'center'
          }}>
            {error ?? 'Animation error'}
          </div>
        )}
      </div>
    );
  }
);

LottiePlayer.displayName = 'LottiePlayer';
export default LottiePlayer;
