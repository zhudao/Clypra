// src/features/text-effects/store/effectsStore.ts
import { create } from "zustand";
import type { EffectIndexItem, EffectFullDefinition } from "../types/types";
import { TextEffectsApi } from "../api/textEffectsApi";
import { builtInPresets } from "@clypra/engine";
import type { TextEffectConfig } from "@clypra/engine";
import { getTextEffectCache } from "../cache/persistentCache";
import { getApiHeaders, getApiBaseUrl } from "@/lib/api";

const API_BASE = getApiBaseUrl();

type BoundingBoxSpec = {
  paddingX: number;
  paddingY: number;
  mode?: "ink" | "panel";
};

type EffectDefinitionWithBounds = EffectFullDefinition & {
  boundingBox?: BoundingBoxSpec;
};

function convertConfigToDefinition(preset: any): EffectDefinitionWithBounds {
  const cfg = preset.config;

  // Font
  const font = {
    family: cfg.fontFamily || "Poppins",
    weight: cfg.fontWeight || 700,
    style: (cfg.fontStyle || "normal") as "normal" | "italic",
    letterSpacing: cfg.letterSpacing || 0,
    lineHeight: cfg.lineHeight || 1.2,
  };

  // Fills
  const fills = [];
  if (cfg.fillType !== "none") {
    fills.push({
      type: cfg.fillType || "solid",
      color: cfg.fillColor || "#FFFFFF",
      gradient: cfg.fillGradientStops
        ? {
            angle: cfg.fillGradientAngle ?? 90,
            stops: cfg.fillGradientStops,
          }
        : undefined,
      patternType: cfg.patternType,
      perCharFillEnabled: cfg.perCharFillEnabled,
      charFillColors: cfg.charFillColors,
    });
  }

  // Strokes
  const strokes = [];
  if (cfg.strokeEnabled) {
    strokes.push({
      color: cfg.strokeColor || "#000000",
      width: cfg.strokeWidth || 0,
      position: cfg.strokePosition || "outside",
      opacity: cfg.strokeOpacity || 100,
      lineJoin: cfg.strokeLineJoin || "round",
      blur: cfg.strokeBlur || 0,
      type: cfg.strokeType || "single",
      colorSecondary: cfg.strokeColorSecondary,
      widthSecondary: cfg.strokeWidthSecondary,
      fadeRange: cfg.strokeFadeRange,
    });
  }

  // Shadows
  const shadows = [];
  if (cfg.shadowEnabled) {
    shadows.push({
      color: cfg.shadowColor || "#000000",
      blur: cfg.shadowBlur || 0,
      offsetX: cfg.shadowOffsetX || 0,
      offsetY: cfg.shadowOffsetY || 0,
      opacity: cfg.shadowOpacity || 80,
      type: cfg.shadowType || "drop",
    });
  }

  // Bevel
  let bevel = undefined;
  if (cfg.bevelEnabled) {
    bevel = {
      depth: cfg.bevelDepth || 5,
      highlightColor: cfg.bevelHighlight || "#FFFFFF",
      shadowColor: cfg.bevelShadow || "#000000",
      direction: cfg.bevelDirection || "bottom-right",
      coreColor: cfg.bevelCoreColor || "#000000",
      edgeColor: cfg.bevelEdgeColor || "#2A2A38",
      edgeWidth: cfg.bevelEdgeWidth || 0,
      blur: cfg.bevelBlur || 0,
      blurColor: cfg.bevelBlurColor || "#000000",
      perspectiveEnabled: cfg.bevelPerspectiveEnabled || false,
      vanishingPointX: cfg.bevelVanishingPointX || 40,
      vanishingPointY: cfg.bevelVanishingPointY || 80,
      focalLength: cfg.bevelFocalLength || 400,
    };
  }

  // Glows
  let glows = undefined;
  if (cfg.glowLayers) {
    glows = cfg.glowLayers
      .filter((g: any) => g.enabled)
      .map((g: any) => ({
        color: g.color,
        blur: g.blur,
        opacity: g.opacity,
        type: g.type,
        strength: g.strength,
        spread: g.spread,
      }));
  }

  // Panel
  let panel = undefined;
  if (cfg.panelEnabled) {
    panel = {
      color: cfg.panelColor || "#1E1E26",
      opacity: cfg.panelOpacity || 80,
      radius: cfg.panelRadius || 12,
      paddingX: cfg.panelPaddingX || 40,
      paddingY: cfg.panelPaddingY || 20,
      stroke: cfg.panelStrokeEnabled
        ? {
            color: cfg.panelStrokeColor || "#2A2A38",
            width: cfg.panelStrokeWidth || 2,
          }
        : undefined,
    };
  }

  // Stack
  let stack = undefined;
  if (cfg.stackEnabled) {
    stack = {
      count: cfg.stackCount || 3,
      offsetX: cfg.stackOffsetX || 10,
      offsetY: cfg.stackOffsetY || -10,
      opacityDecay: cfg.stackOpacityDecay || 20,
      color1: cfg.stackColor1,
      color2: cfg.stackColor2,
      color3: cfg.stackColor3,
      color4: cfg.stackColor4,
    };
  }

  return {
    id: preset.id,
    name: preset.name,
    category: preset.category,
    description: "",
    tags: [],
    boundingBox: calculateBoundingBox(cfg),
    font,
    fills,
    strokes,
    shadows,
    bevel,
    glows,
    panel,
    stack,
  };
}

/**
 * Convert raw API config (flat structure) to EffectFullDefinition (nested structure)
 * API returns: { fontFamily, fontWeight, strokeEnabled, strokeColor, ... }
 * Engine expects: { font: {}, strokes: [], shadows: [], ... }
 */
function convertRawConfigToDefinition(rawConfig: any): EffectDefinitionWithBounds {
  // If it already has nested structure, return as-is
  if (rawConfig.font && Array.isArray(rawConfig.fills)) {
    return rawConfig as EffectDefinitionWithBounds;
  }

  // Transform flat API structure to nested engine structure
  return convertConfigToDefinition({ ...rawConfig, config: rawConfig });
}

function calculateBoundingBox(cfg: TextEffectConfig): BoundingBoxSpec {
  if (cfg.panelEnabled) {
    const strokeWidth = cfg.panelStrokeEnabled ? cfg.panelStrokeWidth || 0 : 0;
    return {
      mode: "panel",
      paddingX: (cfg.panelPaddingX || 0) + strokeWidth,
      paddingY: (cfg.panelPaddingY || 0) + strokeWidth,
    };
  }

  let paddingX = 0;
  let paddingY = 0;

  if (cfg.strokeEnabled) {
    paddingX = Math.max(paddingX, cfg.strokeWidth || 0);
    paddingY = Math.max(paddingY, cfg.strokeWidth || 0);
    paddingX += cfg.strokeBlur || 0;
    paddingY += cfg.strokeBlur || 0;
  }

  if (cfg.shadowEnabled) {
    paddingX = Math.max(paddingX, Math.abs(cfg.shadowOffsetX || 0) + (cfg.shadowBlur || 0));
    paddingY = Math.max(paddingY, Math.abs(cfg.shadowOffsetY || 0) + (cfg.shadowBlur || 0));
  }

  cfg.glowLayers?.forEach((glow) => {
    if (!glow.enabled) return;
    const glowPadding = (glow.blur || 0) + (glow.spread || 0);
    paddingX = Math.max(paddingX, glowPadding);
    paddingY = Math.max(paddingY, glowPadding);
  });

  if (cfg.bevelEnabled) {
    paddingX = Math.max(paddingX, cfg.bevelDepth || 0);
    paddingY = Math.max(paddingY, cfg.bevelDepth || 0);
    paddingX += cfg.bevelBlur || 0;
    paddingY += cfg.bevelBlur || 0;
  }

  if (cfg.stackEnabled) {
    paddingX = Math.max(paddingX, Math.abs((cfg.stackOffsetX || 0) * (cfg.stackCount || 1)));
    paddingY = Math.max(paddingY, Math.abs((cfg.stackOffsetY || 0) * (cfg.stackCount || 1)));
  }

  return {
    mode: "ink",
    paddingX: Math.max(10, Math.ceil(paddingX * 1.15)),
    paddingY: Math.max(10, Math.ceil(paddingY * 1.15)),
  };
}

const initialDefinitions = builtInPresets.reduce<Record<string, EffectDefinitionWithBounds>>((acc, preset) => {
  acc[preset.id] = convertConfigToDefinition(preset);
  return acc;
}, {});

interface EffectsState {
  // ── Phase 1: Grid index ─────────────────────────────────────────
  index: Record<string, EffectIndexItem[]>; // category → items
  indexLoading: boolean;
  indexError: string | null;

  // ── Phase 2: Full definitions ───────────────────────────────────
  definitions: Record<string, EffectDefinitionWithBounds>; // id → definition
  loadingId: string | null; // which card shows a spinner
  prefetchingIds: Set<string>; // silent background fetches

  // ── Selected effect ─────────────────────────────────────────────
  selectedEffect: EffectFullDefinition | null;
  selectedCategory: string | null;

  // ── Actions ─────────────────────────────────────────────────────
  loadCategory: (category: string) => Promise<void>;
  getDefinitionById: (id: string, category: string) => Promise<EffectFullDefinition>;
  selectEffect: (id: string, category: string) => Promise<void>;
  prefetchEffect: (id: string, category: string) => void; // fire and forget
  clearSelected: () => void;
  fetchDefinitionOnlyById: (id: string) => Promise<EffectFullDefinition>;
}

export const useEffectsStore = create<EffectsState>((set, get) => ({
  index: {},
  indexLoading: false,
  indexError: null,
  definitions: initialDefinitions,
  loadingId: null,
  prefetchingIds: new Set(),
  selectedEffect: null,
  selectedCategory: null,

  // ── loadCategory ──────────────────────────────────────────────
  // Called on panel open or tab switch
  // No-ops if category already in memory
  loadCategory: async (category) => {
    // Standardize category lookup (e.g. lowercase)
    const catKey = category.toLowerCase();
    if (get().index[catKey]) return;

    set({ indexLoading: true, indexError: null });

    try {
      const res = await fetch(`${API_BASE}/text-effects/${catKey}`, {
        cache: "reload",
        headers: getApiHeaders(),
      });

      // Handle 404 as empty category (category doesn't exist yet on API)
      if (res.status === 404) {
        set((state) => ({
          index: { ...state.index, [catKey]: [] },
          indexLoading: false,
        }));
        return;
      }

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as EffectIndexItem[];

      set((state) => ({
        index: { ...state.index, [catKey]: data },
        indexLoading: false,
      }));
    } catch (err) {
      set({
        indexLoading: false,
        indexError: "Failed to load effects. Tap to retry.",
      });
    }
  },

  getDefinitionById: async (id, category) => {
    console.log(`[EffectsStore:Cache] 🔍 Looking for effect: ${id}`);

    // 1. Check memory cache (Zustand state)
    const cached = get().definitions[id];
    if (cached) {
      console.log(`[EffectsStore:Cache] ✅ CACHE HIT (Memory) - Effect "${id}" loaded from in-memory cache`);
      return cached;
    }

    console.log(`[EffectsStore:Cache] ⚠️ Cache miss (Memory) - Effect "${id}" not in memory`);

    // 2. Check built-in presets (bundled)
    const localPreset = builtInPresets.find((p) => p.id === id);
    if (localPreset) {
      console.log(`[EffectsStore:Cache] ✅ CACHE HIT (Built-in) - Effect "${id}" found in built-in presets`);
      const def = convertConfigToDefinition(localPreset);
      set((state) => ({
        definitions: { ...state.definitions, [id]: def },
      }));
      return def;
    }

    console.log(`[EffectsStore:Cache] ⚠️ Cache miss (Built-in) - Effect "${id}" not in presets`);

    // 3. Check persistent cache (IndexedDB)
    const persistentCache = getTextEffectCache();
    const persistedDef = await persistentCache.get(id);
    if (persistedDef) {
      console.log(`[EffectsStore:Cache] ✅ CACHE HIT (IndexedDB) - Effect "${id}" loaded from persistent storage`);
      // Populate memory cache
      set((state) => ({
        definitions: { ...state.definitions, [id]: persistedDef },
      }));
      return persistedDef;
    }

    console.log(`[EffectsStore:Cache] ⚠️ Cache miss (IndexedDB) - Effect "${id}" not in persistent storage`);
    console.log(`[EffectsStore:Cache] 🌐 Fetching from API: ${id} (category: ${category})`);

    // 4. Fetch from API (last resort)
    // API returns raw TextEffectConfig format (flat structure)
    const catKey = category.toLowerCase();
    const startTime = performance.now();
    const res = await fetch(`${API_BASE}/text-effects/${catKey}/${id}`, {
      cache: "reload",
      headers: getApiHeaders(),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const fetchTime = (performance.now() - startTime).toFixed(2);

    console.log(`[EffectsStore:Cache] ✅ API FETCH SUCCESS - Effect "${id}" downloaded in ${fetchTime}ms`);
    console.log(`[EffectsStore:Cache] 📦 Raw data has fontFamily:`, data.fontFamily);
    console.log(`[EffectsStore:Cache] 💾 Caching effect "${id}" to memory + IndexedDB (raw format)`);

    // Store raw data in all cache layers (no transformation)
    set((state) => ({
      definitions: { ...state.definitions, [id]: data },
    }));
    await persistentCache.set(id, data); // Persist to disk

    console.log(`[EffectsStore:Cache] ✅ CACHE SAVED - Effect "${id}" now available in all cache layers`);

    return data;
    return data;
  },

  // ── selectEffect ─────────────────────────────────────────────
  // Called on card click
  // Shows spinner on card if definition not yet cached
  selectEffect: async (id, category) => {
    console.log(`[EffectsStore:Select] 🎯 Selecting effect: ${id}`);
    const catKey = category.toLowerCase();

    // Show loading state on the clicked card
    set({ loadingId: id });

    try {
      const startTime = performance.now();
      const data = await get().getDefinitionById(id, catKey);
      const loadTime = (performance.now() - startTime).toFixed(2);

      console.log(`[EffectsStore:Select] ✅ Effect loaded in ${loadTime}ms`);

      set({
        selectedEffect: data,
        selectedCategory: catKey,
        loadingId: null,
      });
    } catch (err) {
      console.error(`[EffectsStore:Select] ❌ Failed to load effect ${id}:`, err);
      set({ loadingId: null });
    }
  },

  // ── prefetchEffect ────────────────────────────────────────────
  // Called on 300ms hover hold — fire and forget, no loading state
  // Primes the cache so that selectEffect() is instant on click
  prefetchEffect: (id, category) => {
    console.log(`[EffectsStore:Prefetch] 🔮 Prefetching effect: ${id}`);
    const catKey = category.toLowerCase();
    const state = get();
    if (state.definitions[id]) {
      console.log(`[EffectsStore:Prefetch] ⏭️ Skipped - already cached: ${id}`);
      return; // already cached
    }
    if (state.prefetchingIds.has(id)) {
      console.log(`[EffectsStore:Prefetch] ⏭️ Skipped - already prefetching: ${id}`);
      return; // already in flight
    }

    set((s) => {
      const nextPrefetching = new Set(s.prefetchingIds);
      nextPrefetching.add(id);
      return { prefetchingIds: nextPrefetching };
    });

    console.log(`[EffectsStore:Prefetch] 🌐 Starting background fetch: ${id}`);
    const startTime = performance.now();

    fetch(`${API_BASE}/text-effects/${catKey}/${id}`, {
      cache: "reload",
      headers: getApiHeaders(),
    })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data: EffectFullDefinition) => {
        const prefetchTime = (performance.now() - startTime).toFixed(2);
        console.log(`[EffectsStore:Prefetch] ✅ Prefetch complete for ${id} in ${prefetchTime}ms`);

        set((s) => {
          const nextPrefetching = new Set(s.prefetchingIds);
          nextPrefetching.delete(id);
          return {
            definitions: { ...s.definitions, [id]: data },
            prefetchingIds: nextPrefetching,
          };
        });
      })
      .catch((error) => {
        console.error(`[EffectsStore:Prefetch] ❌ Prefetch failed for ${id}:`, error);
        set((s) => {
          const nextPrefetching = new Set(s.prefetchingIds);
          nextPrefetching.delete(id);
          return { prefetchingIds: nextPrefetching };
        });
      });
  },

  clearSelected: () => set({ selectedEffect: null, selectedCategory: null }),
  fetchDefinitionOnlyById: async (id) => {
    // 1. Check memory cache
    const cached = get().definitions[id];
    if (cached) return cached;

    // 2. Check built-in presets
    const localPreset = builtInPresets.find((p) => p.id === id);
    if (localPreset) {
      const def = convertConfigToDefinition(localPreset);
      set((state) => ({
        definitions: { ...state.definitions, [id]: def },
      }));
      return def;
    }

    // 3. Check persistent cache (IndexedDB)
    const persistentCache = getTextEffectCache();
    const persistedDef = await persistentCache.get(id);
    if (persistedDef) {
      set((state) => ({
        definitions: { ...state.definitions, [id]: persistedDef },
      }));
      return persistedDef;
    }

    // 4. Try finding in currently loaded category indexes
    const localIndexItem = Object.values(get().index)
      .flat()
      .find((x) => x.id === id);
    if (localIndexItem) {
      const def = await get().getDefinitionById(id, localIndexItem.category);
      return def;
    }

    // 5. Try global index
    let globalIndexItem = null;
    try {
      const globalIndex = await TextEffectsApi.getEffectsIndex();
      globalIndexItem = globalIndex.find((x) => x.id === id);
    } catch (e) {
      console.warn("[EffectsStore] Failed to load global effects index:", e);
    }

    if (globalIndexItem) {
      const def = await get().getDefinitionById(id, globalIndexItem.category);
      return def;
    }

    // 6. Fallback: Scan known categories
    const ALL_CATEGORIES = ["3d", "neon", "metallic", "glitch", "retro", "gradient", "grunge", "outline", "shadow", "elements", "luxury"];
    for (const cat of ALL_CATEGORIES) {
      try {
        const categoryManifest = await TextEffectsApi.getEffectsByCategory(cat);
        const found = categoryManifest.find((x) => x.id === id);
        if (found) {
          set((state) => ({
            index: { ...state.index, [cat]: categoryManifest },
          }));
          const def = await get().getDefinitionById(id, cat);
          return def;
        }
      } catch (err) {
        // Continue scanning
      }
    }

    throw new Error(`Effect with ID ${id} not found in index or any category manifest`);
  },
}));
