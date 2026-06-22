import { create } from "zustand";
import { TemplateDefinition, TemplateCustomization, TemplateCategory, RenderedFrameSequence } from "./types";
import { renderToFrameSequence } from "./FrameRenderer";
import { TextEffectsApi } from "@/features/text-effects/api/textEffectsApi";
import { ALL_TEMPLATES } from "./templates/index";

interface TemplateState {
  templates: TemplateDefinition[];
  selectedTemplate: TemplateDefinition | null;
  customization: TemplateCustomization;
  isRendering: boolean;
  isLoading: boolean;
  isApiConnected: boolean;
  renderProgress: number; // 0–100
  activeCategory: TemplateCategory | "all";
  searchQuery: string;

  // Actions
  loadTemplates: () => Promise<void>;
  selectTemplate: (template: TemplateDefinition | null) => Promise<void>;
  updateCustomization: (partial: Partial<TemplateCustomization>) => void;
  setCategory: (category: TemplateCategory | "all") => void;
  setSearchQuery: (query: string) => void;
  startRender: () => Promise<RenderedFrameSequence>;
  cancelRender: () => void;
  preloadTemplatesAndFontsForClips: (clips: any[]) => Promise<void>;
}

let renderCancelToken = { cancelled: false };

export const useTemplateStore = create<TemplateState>((set, get) => ({
  templates: [],
  selectedTemplate: null,
  customization: {
    primaryText: "Clypra",
    secondaryText: "",
    accentText: "",
  },
  isRendering: false,
  isLoading: false,
  isApiConnected: false,
  renderProgress: 0,
  activeCategory: "all",
  searchQuery: "",

  loadTemplates: async () => {
    set({ isLoading: true });
    try {
      const apiTemplates = await TextEffectsApi.getTemplatesIndex();
      // Initially, the API templates won't have templateData populated.
      // We will fetch their templateData on-demand when selected or previewed.
      set({
        templates: apiTemplates,
        isApiConnected: true,
        isLoading: false,
      });
    } catch (err) {
      console.warn("[Clypra:TemplateStore] Failed to fetch templates from API, falling back to static templates:", err);
      set({
        templates: ALL_TEMPLATES,
        isApiConnected: false,
        isLoading: false,
      });
    }
  },

  selectTemplate: async (template) => {
    if (!template) {
      set({
        selectedTemplate: null,
        customization: { primaryText: "Clypra", secondaryText: "", accentText: "" },
      });
      return;
    }

    let loadedTemplate = { ...template };

    // On-demand fetch of template JSON data if it is not yet loaded
    const templateData = loadedTemplate.templateData || loadedTemplate.lottieData;
    if (!templateData) {
      try {
        set({ isLoading: true });
        // The clypra-api expects category and template ID to load template JSON
        const data = await TextEffectsApi.getTemplateData(loadedTemplate.category, loadedTemplate.id);
        loadedTemplate.templateData = data;
        loadedTemplate.lottieData = data; // for backwards compatibility

        // Cache the fetched template data in the templates list
        set((state) => ({
          templates: state.templates.map((t) => (t.id === loadedTemplate.id ? { ...t, templateData: data, lottieData: data } : t)),
          isLoading: false,
        }));
      } catch (err) {
        console.error(`[Clypra:TemplateStore] Failed to load template data for template ${loadedTemplate.id}:`, err);
        set({ isLoading: false });

        // If dynamic loading failed, look up in the static templates fallback as absolute safety net
        const fallback = ALL_TEMPLATES.find((t) => t.id === loadedTemplate.id);
        const fallbackData = fallback?.templateData || fallback?.lottieData;
        if (fallbackData) {
          loadedTemplate.templateData = fallbackData;
          loadedTemplate.lottieData = fallbackData;
        } else {
          // If no fallback is found, proceed with empty data to avoid hard crashes
          loadedTemplate.templateData = {};
          loadedTemplate.lottieData = {};
        }
      }
    }

    // Initialize customisation with defaults from the selected template
    const fullTemplate = loadedTemplate.templateData || loadedTemplate.lottieData || loadedTemplate;
    const textLayers = (fullTemplate.layers || []).filter((l: any) => l.kind === "text") as any[];
    const primary = textLayers.find((tl) => tl.role === "primary")?.content || "Clypra";
    const secondary = textLayers.find((tl) => tl.role === "secondary")?.content || "";
    const accent = textLayers.find((tl) => tl.role === "accent")?.content || "";

    set({
      selectedTemplate: loadedTemplate,
      customization: {
        primaryText: primary,
        secondaryText: secondary,
        accentText: accent,
      },
    });
  },

  updateCustomization: (partial) => {
    set((state) => ({
      customization: {
        ...state.customization,
        ...partial,
      },
    }));
  },

  setCategory: (category) => {
    set({ activeCategory: category });
  },

  setSearchQuery: (query) => {
    set({ searchQuery: query });
  },

  startRender: async (): Promise<RenderedFrameSequence> => {
    const selected = get().selectedTemplate;
    if (!selected) {
      throw new Error("No template selected for rendering");
    }

    set({ isRendering: true, renderProgress: 0 });
    renderCancelToken.cancelled = false;
    const activeToken = renderCancelToken;

    try {
      // 1. Prepare customizable Template object
      let data = selected.templateData || selected.lottieData || selected;

      // Ensure template data is dynamically fetched if we bypass standard select
      if (!data.layers || data.layers.length === 0) {
        try {
          data = await TextEffectsApi.getTemplateData(selected.category, selected.id);
        } catch (e) {
          // Fallback to static meta
          const staticFallback = ALL_TEMPLATES.find((t) => t.id === selected.id);
          data = staticFallback?.templateData || staticFallback?.lottieData || staticFallback || selected;
        }
      }

      // 2. Perform the frame-by-frame render
      const sequence = await renderToFrameSequence(data, get().customization, (progress) => {
        if (activeToken.cancelled) {
          throw new Error("Render cancelled by user");
        }
        set({ renderProgress: progress });
      });

      set({ isRendering: false, renderProgress: 100 });
      return sequence;
    } catch (err: any) {
      set({ isRendering: false, renderProgress: 0 });
      throw err;
    }
  },

  cancelRender: () => {
    renderCancelToken.cancelled = true;
    set({ isRendering: false, renderProgress: 0 });
  },

  preloadTemplatesAndFontsForClips: async (clips: any[]) => {
    if (!clips?.length) return;

    // Filter clips that have templateId
    const templateIds = Array.from(new Set(clips.map((clip) => clip?.templateId).filter((id): id is string => typeof id === "string" && id.length > 0)));

    if (templateIds.length === 0) return;

    try {
      // 1. Ensure templates list is loaded
      let templates = get().templates;
      if (templates.length === 0) {
        await get().loadTemplates();
        templates = get().templates;
      }

      // 2. Fetch template data for each missing template
      const fontDescriptors: { family: string; weight: number; style: "normal" | "italic" }[] = [];

      await Promise.all(
        templateIds.map(async (id) => {
          const rawTemplate = templates.find((t) => t.id === id);
          if (!rawTemplate) return;

          let templateData = rawTemplate.templateData || rawTemplate.lottieData;
          if (!templateData) {
            try {
              templateData = await TextEffectsApi.getTemplateData(rawTemplate.category, rawTemplate.id);
              // Cache in store
              set((state) => ({
                templates: state.templates.map((t) => (t.id === id ? { ...t, templateData, lottieData: templateData } : t)),
              }));
              import("@/store/timelineStore").then(({ useTimelineStore }) => {
                useTimelineStore.getState().incrementEpoch();
              }).catch(() => {});
            } catch (err) {
              console.error(`[Clypra:TemplateStore] Preload failed for template ${id}:`, err);
              return;
            }
          }

          // Collect fonts from template layers
          if (templateData && templateData.layers) {
            for (const layer of templateData.layers) {
              if (layer.kind === "text" && layer.fontFamily) {
                fontDescriptors.push({
                  family: layer.fontFamily,
                  weight: layer.fontWeight || 400,
                  style: "normal" as const,
                });
              }
            }
          }
        }),
      );

      // 3. Preload all collected fonts
      if (fontDescriptors.length > 0) {
        const { getFontLoader } = await import("@/core/fonts/FontLoader");
        try {
          await getFontLoader().ensureFonts(fontDescriptors);
          const { useTimelineStore } = await import("@/store/timelineStore");
          useTimelineStore.getState().incrementEpoch();
        } catch (fontErr) {
          console.warn("[Clypra:TemplateStore] Failed to preload template fonts:", fontErr);
        }
      }
    } catch (err) {
      console.warn("[Clypra:TemplateStore] Preload templates and fonts failed:", err);
    }
  },
}));
