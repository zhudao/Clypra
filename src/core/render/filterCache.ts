import { Filter, BlurFilter } from "pixi.js";
import { AdjustmentFilter } from "pixi-filters";
import { createGPUPixelateFilter, createGPUScanlinesFilter, createGPURGBSplitFilter, createGPUFilmGrainFilter, createGPUVignetteFilter } from "./gpuFilters.js";
import { applyBodyEffectMask, createGPUBodyOutlineFilter, createGPUBodyGlowFilter, createGPUBodyParticlesFilter, ColorAdjustmentsEffect, mergeGradingParams, GradingParams } from "@clypra-studio/engine";
import type { EvaluatedMediaLayer } from "../evaluation/types.js";
import { filterCacheManager } from "../../features/filters/cache/filterCache.js";

interface FilterCacheEntry {
  /** Signature of WHICH effects are structurally active — not their live parameter values */
  structuralKey: string;
  filters: Filter[];
  /** effectId → filter instance, for targeted per-frame uniform updates without rebuilding */
  filterMap: Map<string, Filter>;
}

const filterCache = new Map<string, FilterCacheEntry>(); // keyed by clipId

let rebuildCounter = 0;

export function getRebuildCounter(): number {
  return rebuildCounter;
}

export function resetRebuildCounter(): void {
  rebuildCounter = 0;
}

function hexToRgbNormalized(hex: string): [number, number, number] {
  let clean = hex.replace("#", "");
  if (clean.length === 3) {
    clean = clean[0] + clean[0] + clean[1] + clean[1] + clean[2] + clean[2];
  }
  const num = parseInt(clean, 16);
  return [((num >> 16) & 255) / 255, ((num >> 8) & 255) / 255, (num & 255) / 255];
}

function buildStructuralKey(mediaLayer: EvaluatedMediaLayer, bodyMasks: Map<string, any>): string {
  const parts: string[] = [];
  const hasPreset = !!mediaLayer.filter && mediaLayer.filter.intensity > 0.001;
  const hasManualAdjustments = !!mediaLayer.adjustments && Object.keys(mediaLayer.adjustments).length > 0;

  if (hasPreset || hasManualAdjustments) {
    parts.push(`color_filter:${hasPreset ? mediaLayer.filter!.id : "none"}`);
  }
  for (const effect of mediaLayer.effects || []) {
    if (effect.intensity <= 0.001) continue;
    const rendererName = effect.renderer || effect.effectId;
    const norm = rendererName.replace(/^fx-/, "").replace(/-/g, "_").toLowerCase();
    if (norm === "body_outline" || norm === "body_glow" || norm === "body_segmentation_glow" || norm === "body_particles") {
      const hasMask = bodyMasks.has(`${mediaLayer.layerId}_${effect.effectId}`);
      parts.push(`effect:${effect.effectId}:masked:${hasMask}`);
    } else {
      parts.push(`effect:${effect.effectId}`);
    }
  }
  return parts.join("|");
}

/**
 * Returns the current frame's filter array for this clip.
 * Only reconstructs filter INSTANCES when the structural set of active effects changes.
 */
export function getOrUpdateFilters(mediaLayer: EvaluatedMediaLayer, width: number, height: number, bodyMasks: Map<string, any>): Filter[] {
  const clipId = mediaLayer.clipId;

  const structuralKey = buildStructuralKey(mediaLayer, bodyMasks);

  let entry = filterCache.get(clipId);

  if (!entry || entry.structuralKey !== structuralKey) {
    rebuildCounter++;

    // Structural change — full rebuild, but ONLY when the effect set actually changed
    if (entry) {
      entry.filters.forEach((f) => {
        try {
          f.destroy();
        } catch (err) {
          console.error("[Filters] error destroying filter:", err);
        }
      });
    }

    const filters: Filter[] = [];
    const filterMap = new Map<string, Filter>();

    const hasPreset = !!mediaLayer.filter && mediaLayer.filter.intensity > 0.001;
    const hasManualAdjustments = !!mediaLayer.adjustments && Object.keys(mediaLayer.adjustments).length > 0;

    if (hasPreset || hasManualAdjustments) {
      const filter = ColorAdjustmentsEffect.filterSpec!.create({}) as Filter;
      filters.push(filter);
      filterMap.set("__color_filter", filter);
    }

    for (const effect of mediaLayer.effects || []) {
      if (effect.intensity <= 0.001) continue;
      const rendererName = effect.renderer || effect.effectId;
      const norm = rendererName.replace(/^fx-/, "").replace(/-/g, "_").toLowerCase();
      let filter: Filter | null = null;

      if (norm === "brightness" || norm === "contrast" || norm === "saturation") {
        filter = new AdjustmentFilter();
      } else if (norm === "blur") {
        filter = new BlurFilter({ strength: 0 });
      } else if (norm === "pixelate") {
        filter = createGPUPixelateFilter(2);
      } else if (norm === "scanlines") {
        filter = createGPUScanlinesFilter(120, 0);
      } else if (norm === "rgb_split" || norm === "chromatic_aberration" || norm === "chromatic") {
        filter = createGPURGBSplitFilter(0, 0, width, height);
      } else if (norm === "film_grain" || norm === "grain") {
        filter = createGPUFilmGrainFilter(0, 0);
      } else if (norm === "vignette") {
        filter = createGPUVignetteFilter(0.7, 0);
      } else if (norm === "body_outline" || norm === "body_glow" || norm === "body_segmentation_glow" || norm === "body_particles") {
        const maskData = bodyMasks.get(`${mediaLayer.layerId}_${effect.effectId}`);
        if (maskData) {
          const maskTexture = applyBodyEffectMask(`${mediaLayer.clipId}_${effect.effectId}`, maskData);
          if (norm === "body_outline") {
            filter = createGPUBodyOutlineFilter(maskTexture, "#ffffff", 1);
          } else if (norm === "body_glow" || norm === "body_segmentation_glow") {
            filter = createGPUBodyGlowFilter(maskTexture, "#00ffff", 2, 0.8);
          } else if (norm === "body_particles") {
            filter = createGPUBodyParticlesFilter(maskTexture, "#00ffff", 40, 1.0, 0);
          }
        }
      }

      if (filter) {
        filters.push(filter);
        filterMap.set(effect.effectId, filter);
      }
    }

    entry = { structuralKey, filters, filterMap };
    filterCache.set(clipId, entry);
  }

  // Update parameters on the (possibly just-created, possibly reused) instances
  applyLiveParams(entry, mediaLayer, width, height, bodyMasks);

  return entry.filters;
}

function applyLiveParams(entry: FilterCacheEntry, mediaLayer: EvaluatedMediaLayer, width: number, height: number, bodyMasks: Map<string, any>): void {
  const hasPreset = !!mediaLayer.filter && mediaLayer.filter.intensity > 0.001;
  const hasManualAdjustments = !!mediaLayer.adjustments && Object.keys(mediaLayer.adjustments).length > 0;

  if (hasPreset || hasManualAdjustments) {
    const filter = entry.filterMap.get("__color_filter");

    if (filter) {
      const intensity = hasPreset ? mediaLayer.filter!.intensity : 1.0;
      let presetParams: GradingParams | undefined;

      if (hasPreset) {
        const cached = filterCacheManager.getCached(mediaLayer.filter!.id);
        const asset = cached?.filter;
        if (asset?.gradingParams) {
          presetParams = asset.gradingParams;
        }
      }

      const finalParams = mergeGradingParams(presetParams, mediaLayer.adjustments);
      const params: Record<string, number> = {};

      const scaleIfPreset = (key: keyof GradingParams, manualVal: number | boolean | undefined, presetVal: number | undefined, defaultVal: number): number => {
        if (manualVal !== undefined) {
          return typeof manualVal === "boolean" ? (manualVal ? 1.0 : 0.0) : manualVal;
        }
        if (presetVal !== undefined) {
          return presetVal * intensity;
        }
        return defaultVal;
      };

      params.exposure = scaleIfPreset("exposure", mediaLayer.adjustments?.exposure, presetParams?.exposure, 0.0);
      params.brightness = scaleIfPreset("brightness", mediaLayer.adjustments?.brightness, presetParams?.brightness, 0.0);
      params.contrast = scaleIfPreset("contrast", mediaLayer.adjustments?.contrast, presetParams?.contrast, 0.0);
      params.saturation = scaleIfPreset("saturation", mediaLayer.adjustments?.saturation, presetParams?.saturation, 0.0);
      params.temperature = scaleIfPreset("temperature", mediaLayer.adjustments?.temperature, presetParams?.temperature, 0.0);
      params.tint = scaleIfPreset("tint", mediaLayer.adjustments?.tint, presetParams?.tint, 0.0);
      params.sepia = scaleIfPreset("sepia", mediaLayer.adjustments?.sepia, presetParams?.sepia, 0.0);
      params.grayscale = scaleIfPreset("grayscale", mediaLayer.adjustments?.grayscale, presetParams?.grayscale, 0.0);
      params.hueRotate = scaleIfPreset("hueRotate", mediaLayer.adjustments?.hue !== undefined ? (mediaLayer.adjustments.hue * Math.PI) / 180 : undefined, presetParams?.hueRotate, 0.0);
      params.vignette = scaleIfPreset("vignette", mediaLayer.adjustments?.vignette, presetParams?.vignette, 0.0);
      params.invert = scaleIfPreset("invert", mediaLayer.adjustments?.invert, presetParams?.invert, 0.0);
      params.lift = scaleIfPreset("lift", mediaLayer.adjustments?.lift, presetParams?.lift, 0.0);

      // Channel mix (for B&W with custom channel weights)
      if (presetParams?.channelMix) {
        params.channelMixR = presetParams.channelMix.r ?? 0.0;
        params.channelMixG = presetParams.channelMix.g ?? 0.0;
        params.channelMixB = presetParams.channelMix.b ?? 0.0;
        params.useChannelMix = 1.0; // Enable channel mix
      } else {
        params.useChannelMix = 0.0;
      }

      // Film grain
      if (mediaLayer.adjustments?.grain) {
        params.grainIntensity = mediaLayer.adjustments.grain.intensity;
        params.grainSize = mediaLayer.adjustments.grain.size;
      } else if (presetParams?.grain) {
        params.grainIntensity = presetParams.grain.intensity * intensity;
        params.grainSize = presetParams.grain.size;
      } else {
        params.grainIntensity = 0.0;
        params.grainSize = 1.0;
      }

      // Split-toning
      if (presetParams?.splitTone) {
        const st = presetParams.splitTone;
        const [sr, sg, sb] = hexToRgbNormalized(st.shadowColor);
        const [hr, hg, hb] = hexToRgbNormalized(st.highlightColor);
        params.shadowTintR = sr;
        params.shadowTintG = sg;
        params.shadowTintB = sb;
        params.shadowTintStrength = st.shadowStrength * intensity;
        params.highlightTintR = hr;
        params.highlightTintG = hg;
        params.highlightTintB = hb;
        params.highlightTintStrength = st.highlightStrength * intensity;
        params.splitBalance = st.balance;
      } else {
        params.shadowTintR = 1.0;
        params.shadowTintG = 1.0;
        params.shadowTintB = 1.0;
        params.shadowTintStrength = 0.0;
        params.highlightTintR = 1.0;
        params.highlightTintG = 1.0;
        params.highlightTintB = 1.0;
        params.highlightTintStrength = 0.0;
        params.splitBalance = 0.5;
      }

      // Duotone
      if (presetParams?.duotone) {
        const [dr, dg, db] = hexToRgbNormalized(presetParams.duotone.darkColor);
        const [lr, lg, lb] = hexToRgbNormalized(presetParams.duotone.lightColor);
        params.duotoneDarkR = dr;
        params.duotoneDarkG = dg;
        params.duotoneDarkB = db;
        params.duotoneLightR = lr;
        params.duotoneLightG = lg;
        params.duotoneLightB = lb;
        params.useDuotone = 1.0;
      } else {
        params.duotoneDarkR = 0.0;
        params.duotoneDarkG = 0.0;
        params.duotoneDarkB = 0.0;
        params.duotoneLightR = 1.0;
        params.duotoneLightG = 1.0;
        params.duotoneLightB = 1.0;
        params.useDuotone = 0.0;
      }

      // Vibrance
      if (mediaLayer.adjustments?.vibrance) {
        params.vibranceAmount = mediaLayer.adjustments.vibrance.amount;
        const [vr, vg, vb] = hexToRgbNormalized(mediaLayer.adjustments.vibrance.protectedHue || "#E8B08C");
        params.vibranceProtectedHueR = vr;
        params.vibranceProtectedHueG = vg;
        params.vibranceProtectedHueB = vb;
      } else if (presetParams?.vibrance) {
        params.vibranceAmount = presetParams.vibrance.amount * intensity;
        const [vr, vg, vb] = hexToRgbNormalized(presetParams.vibrance.protectedHue || "#E8B08C");
        params.vibranceProtectedHueR = vr;
        params.vibranceProtectedHueG = vg;
        params.vibranceProtectedHueB = vb;
      } else {
        params.vibranceAmount = 0.0;
        params.vibranceProtectedHueR = 0.91;
        params.vibranceProtectedHueG = 0.69;
        params.vibranceProtectedHueB = 0.55;
      }

      // Cross-process
      if (mediaLayer.adjustments?.crossProcess) {
        params.crossProcessAmount = mediaLayer.adjustments.crossProcess.amount;
      } else if (presetParams?.crossProcess) {
        params.crossProcessAmount = presetParams.crossProcess.amount * intensity;
      } else {
        params.crossProcessAmount = 0.0;
      }

      ColorAdjustmentsEffect.filterSpec!.updateUniforms!(filter, params, 0);
    }
  }

  for (const effect of mediaLayer.effects || []) {
    const filter = entry.filterMap.get(effect.effectId);
    if (!filter) continue;
    const rendererName = effect.renderer || effect.effectId;
    const norm = rendererName.replace(/^fx-/, "").replace(/-/g, "_").toLowerCase();

    if (norm === "brightness" && filter instanceof AdjustmentFilter) {
      filter.brightness = Number(effect.parameters.brightness ?? 1.0) * effect.intensity;
    } else if (norm === "contrast" && filter instanceof AdjustmentFilter) {
      filter.contrast = Number(effect.parameters.contrast ?? 1.0) * effect.intensity;
    } else if (norm === "saturation" && filter instanceof AdjustmentFilter) {
      filter.saturation = Number(effect.parameters.saturation ?? 1.0) * effect.intensity;
    } else if (norm === "blur" && filter instanceof BlurFilter) {
      filter.strength = Number(effect.parameters.blur ?? effect.parameters.blurAmount ?? 10) * effect.intensity;
    } else if (norm === "pixelate" && filter.resources?.customUniforms?.uniforms) {
      filter.resources.customUniforms.uniforms.uPixelSize = Math.max(2, Math.floor(Number(effect.parameters.pixelSize ?? 18) * effect.intensity));
    } else if (norm === "scanlines" && filter.resources?.customUniforms?.uniforms) {
      filter.resources.customUniforms.uniforms.uCount = Math.max(20, Number(effect.parameters.scanlineCount ?? 120));
      filter.resources.customUniforms.uniforms.uIntensity = effect.intensity;
    } else if ((norm === "rgb_split" || norm === "chromatic_aberration" || norm === "chromatic") && filter.resources?.customUniforms?.uniforms) {
      const shift = Number(effect.parameters.rgbSplit ?? effect.parameters.splitDistance ?? 8) * effect.intensity;
      filter.resources.customUniforms.uniforms.uOffset = [shift / width, shift / height];
    } else if ((norm === "film_grain" || norm === "grain") && filter.resources?.customUniforms?.uniforms) {
      const intensityVal = Number(effect.parameters.grainIntensity ?? 1.0) * effect.intensity;
      filter.resources.customUniforms.uniforms.uIntensity = intensityVal * 0.15;
      filter.resources.customUniforms.uniforms.uTime = effect.localTime || 0;
    } else if (norm === "vignette" && filter.resources?.customUniforms?.uniforms) {
      filter.resources.customUniforms.uniforms.uRadius = Number(effect.parameters.radius ?? 0.7) * 0.5;
      filter.resources.customUniforms.uniforms.uIntensity = effect.intensity;
    } else if (norm === "body_outline" || norm === "body_glow" || norm === "body_segmentation_glow" || norm === "body_particles") {
      const maskData = bodyMasks.get(`${mediaLayer.layerId}_${effect.effectId}`);
      if (maskData) {
        const maskTexture = applyBodyEffectMask(`${mediaLayer.clipId}_${effect.effectId}`, maskData);
        if (filter.resources) {
          (filter as any).resources.uMask = maskTexture.source;
        }

        if (norm === "body_outline" && filter.resources?.customUniforms?.uniforms) {
          const color = String(effect.parameters.outlineColor ?? effect.parameters.glowColor ?? "#ffffff");
          const thickness = Math.max(1, Number(effect.parameters.thickness ?? 5) * effect.intensity);
          const rgb = hexToRgbNormalized(color);
          filter.resources.customUniforms.uniforms.uOutlineColor = [...rgb, 1.0];
          filter.resources.customUniforms.uniforms.uThickness = thickness;
        } else if ((norm === "body_glow" || norm === "body_segmentation_glow") && filter.resources?.customUniforms?.uniforms) {
          const color = String(effect.parameters.glowColor ?? "#00ffff");
          const radius = Math.max(2, Number(effect.parameters.glowRadius ?? 22) * effect.intensity);
          const alpha = Math.min(1, Number(effect.parameters.glowIntensity ?? 0.8) * effect.intensity);
          const rgb = hexToRgbNormalized(color);
          filter.resources.customUniforms.uniforms.uGlowColor = [...rgb, 1.0];
          filter.resources.customUniforms.uniforms.uGlowRadius = radius;
          filter.resources.customUniforms.uniforms.uGlowIntensity = alpha;
        } else if (norm === "body_particles" && filter.resources?.customUniforms?.uniforms) {
          const color = String(effect.parameters.particleColor ?? effect.parameters.glowColor ?? "#00ffff");
          const count = Math.floor(Number(effect.parameters.particleCount ?? 120) * effect.intensity);
          const time = effect.localTime || 0;
          const rgb = hexToRgbNormalized(color);
          filter.resources.customUniforms.uniforms.uParticleColor = [...rgb, 1.0];
          filter.resources.customUniforms.uniforms.uCount = Math.min(40, count);
          filter.resources.customUniforms.uniforms.uIntensity = effect.intensity;
          filter.resources.customUniforms.uniforms.uTime = time;
        }
      }
    }
  }
}

/** Call when a clip is released (see PixiSceneCompositor's reconciliation step) */
export function releaseFilterCache(clipId: string): void {
  const entry = filterCache.get(clipId);
  if (entry) {
    entry.filters.forEach((f) => {
      try {
        f.destroy();
      } catch (err) {
        console.error("[Filters] error destroying filter on release:", err);
      }
    });
    filterCache.delete(clipId);
  }
}

/** Call when PixiSceneCompositor is destroyed */
export function clearFilterCache(): void {
  for (const entry of filterCache.values()) {
    entry.filters.forEach((f) => {
      try {
        f.destroy();
      } catch (err) {
        console.error("[Filters] error destroying filter on clear:", err);
      }
    });
  }
  filterCache.clear();
}
