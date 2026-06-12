import { create } from "zustand";
import { ClypraApi } from "@/features/text-effects/api/clypraApi";

export interface EffectItem {
  id: string;
  name: string;
  category: string;
  description: string;
  strength?: "Subtle" | "Medium" | "Strong";
  intensity?: "Light" | "Medium" | "Bold";
  status: "ready" | "soon";
  swatch: string;
  isPremium?: boolean;
}

interface VideoEffectsStore {
  // Cache of items by category
  categoryItems: Record<string, EffectItem[]>;
  loading: Record<string, boolean>;
  errors: Record<string, string | null>;
  
  // Actions
  loadCategory: (category: string) => Promise<void>;
  clearCache: () => void;
}

export const useVideoEffectsStore = create<VideoEffectsStore>((set, get) => ({
  categoryItems: {},
  loading: {},
  errors: {},

  loadCategory: async (category: string) => {
    // If we already have items for this category and it's not currently loading, skip fetching
    if (get().categoryItems[category] && !get().loading[category]) {
      return;
    }

    set((state) => ({
      loading: { ...state.loading, [category]: true },
      errors: { ...state.errors, [category]: null },
    }));

    try {
      const data = await ClypraApi.getEffectsByCategory(category);
      // Map API response to our local EffectItem interface
      const items: EffectItem[] = data.map((item: any) => ({
        id: item.id,
        name: item.name,
        category: item.category,
        description: item.description || "",
        strength: item.strength,
        intensity: item.intensity,
        status: item.status || "ready",
        swatch: item.swatch || "from-zinc-500/20 to-zinc-700/20",
        isPremium: item.isPremium ?? false,
      }));

      set((state) => ({
        categoryItems: { ...state.categoryItems, [category]: items },
        loading: { ...state.loading, [category]: false },
      }));
    } catch (err) {
      set((state) => ({
        loading: { ...state.loading, [category]: false },
        errors: {
          ...state.errors,
          [category]: err instanceof Error ? err.message : "Failed to load effects",
        },
      }));
    }
  },

  clearCache: () => {
    set({ categoryItems: {}, loading: {}, errors: {} });
  },
}));
