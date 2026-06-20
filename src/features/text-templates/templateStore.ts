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
}));
