/**
 * Transitions Tab Component
 * Displays available transitions that can be applied between clips on timeline
 */

import React, { useState, useEffect, useMemo } from "react";
import { Wand2, Plus, AlertCircle } from "lucide-react";
import type { TabProps } from "./types";
import { useProjectStore } from "@/store/projectStore";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/Tooltip";
import { TransitionsApi } from "@/features/transitions/api/transitionsApi";
import type { TransitionAsset } from "@/features/transitions/types";

// Hardcoded transition categories for instant UI rendering
const TRANSITION_CATEGORIES = [
  { id: "fade", label: "Fade" },
  { id: "dissolve", label: "Dissolve" },
  { id: "slide", label: "Slide" },
  { id: "wipe", label: "Wipe" },
  { id: "zoom", label: "Zoom" },
  { id: "creative", label: "Creative" },
] as const;

type TransitionCategory = (typeof TRANSITION_CATEGORIES)[number]["id"];

export const TransitionsTab: React.FC<TabProps> = ({ onAddToTimeline }) => {
  const [activeCategory, setActiveCategory] = useState<TransitionCategory>("fade");
  const [transitions, setTransitions] = useState<TransitionAsset[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch transitions when category changes
  useEffect(() => {
    const fetchTransitions = async () => {
      setLoading(true);
      setError(null);

      try {
        const data = await TransitionsApi.getByCategory(activeCategory);
        setTransitions(data);
      } catch (err) {
        console.error(`[TransitionsTab] Failed to load category ${activeCategory}:`, err);
        setError(err instanceof Error ? err.message : "Failed to load transitions");
      } finally {
        setLoading(false);
      }
    };

    fetchTransitions();
  }, [activeCategory]);

  // Filter transitions based on category
  const filteredTransitions = useMemo(() => transitions, [transitions]);

  return (
    <div className="flex-1 min-h-0 flex flex-col overflow-hidden bg-surface/5 select-none">
      {/* Header with category tabs */}
      <div className="flex items-center gap-2.5 p-1 border-b border-border/50 shrink-0 bg-surface/10">
        <div className="grow overflow-x-auto flex items-center gap-2 pb-0.5 whitespace-nowrap" style={{ scrollbarWidth: "none" }}>
          {TRANSITION_CATEGORIES.map((category) => (
            <button key={category.id} onClick={() => setActiveCategory(category.id)} className={`px-2 py-1 rounded text-xs font-semibold transition-all cursor-pointer shrink-0 hover:bg-accent/10 hover:text-accent ${activeCategory === category.id ? "bg-accent/10 text-accent" : "text-text-muted"}`}>
              {category.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content area */}
      <div className="grow overflow-y-auto scrollbar-thin p-1" style={{ scrollbarWidth: "none" }}>
        {error && (
          <div className="mb-3 p-3 rounded-lg border border-red-500/20 bg-red-500/5 text-red-200 flex items-start gap-2.5 text-xs">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Failed to load transitions</p>
              <p className="opacity-80 mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {loading && filteredTransitions.length === 0 ? (
          <div className="grid grid-cols-2 gap-2">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        ) : filteredTransitions.length === 0 ? (
          <div className="h-40 flex flex-col items-center justify-center text-text-muted gap-1 text-xs">
            <Wand2 className="w-5 h-5" />
            <p>No matching transitions found</p>
            <p className="opacity-60">Try another category or search</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-1.5">
            {filteredTransitions.map((transition) => (
              <TransitionCard key={transition.id} transition={transition} onAddToTimeline={() => onAddToTimeline?.(transition as any, "transitions")} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const SkeletonCard = () => (
  <div className="animate-pulse rounded-lg border border-border/30 bg-surface-raised/40 overflow-hidden flex flex-col justify-between">
    <div className="h-28 bg-white/5 relative overflow-hidden">
      <div className="absolute right-2 top-2 h-5 w-12 rounded bg-white/10" />
    </div>
    <div className="p-2.5 space-y-2 flex-1 flex flex-col justify-between">
      <div className="space-y-2">
        <div className="h-3.5 bg-white/10 rounded w-3/4" />
        <div className="h-3 bg-white/5 rounded w-full" />
        <div className="h-3 bg-white/5 rounded w-5/6" />
      </div>
      <div className="flex justify-between items-center mt-2 pt-2 border-t border-white/5">
        <div className="h-2.5 bg-white/5 rounded w-1/3" />
        <div className="h-2.5 bg-white/5 rounded w-1/4" />
      </div>
    </div>
  </div>
);

const TransitionCard: React.FC<{ transition: TransitionAsset; onAddToTimeline: () => void }> = ({ transition, onAddToTimeline }) => {
  const previewSrc = transition.thumbnail || "/transition-previews/sample.jpg";

  const handleAddToTimeline = (e: React.MouseEvent) => {
    e.stopPropagation();
    onAddToTimeline();
    useProjectStore.getState().showToast(`Added ${transition.name} transition`);
  };

  return (
    <div className="group text-left rounded-xl border bg-surface-raised/40 transition-all overflow-hidden flex flex-col h-[200px] shadow-[0_4px_16px_rgba(0,0,0,0.3)] hover:bg-surface-raised/80 hover:border-accent/40 cursor-pointer border-border/40">
      {/* Preview Area */}
      <div className="h-28 w-full relative overflow-hidden bg-surface/60 shrink-0">
        {/* Preview Image */}
        <img
          src={previewSrc}
          alt={`${transition.name} preview`}
          className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.05]"
          loading="lazy"
          onError={(e) => {
            const img = e.target as HTMLImageElement;
            img.style.display = "none";
          }}
        />

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-linear-to-t from-black/60 via-transparent to-transparent" />

        {/* Transition Type Badge */}
        <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-full backdrop-blur-sm border bg-purple-600/80 border-white/20">
          <span className="text-[9px] font-semibold text-white uppercase tracking-wide">{transition.renderer}</span>
        </div>
      </div>

      {/* Content Area */}
      <div className="p-2 flex-1 flex flex-col justify-between">
        <div>
          <div className="flex items-start justify-between gap-2">
            <p className="text-[13px] font-semibold text-text-primary leading-tight truncate">{transition.name}</p>

            {/* Add to Timeline Button */}
            <div className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button onClick={handleAddToTimeline} className="w-7 h-7 rounded-full flex items-center justify-center transition-all bg-accent/20 hover:bg-accent border border-accent text-accent hover:text-white cursor-pointer">
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p>Add to Timeline</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
          <p className="mt-1 text-[11px] leading-snug text-text-muted line-clamp-2">{transition.description}</p>
        </div>

        <div className="mt-2 flex items-center justify-between border-t border-border/40 pt-1.5">
          <span className="text-[10px] capitalize text-text-muted group-hover:text-text-primary transition-colors truncate mr-1">{transition.category}</span>
          {transition.duration && <span className="text-[10px] text-text-muted shrink-0">{transition.duration.default}s</span>}
        </div>
      </div>
    </div>
  );
};
