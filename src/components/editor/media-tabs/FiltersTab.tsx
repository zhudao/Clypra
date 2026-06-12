import React, { useMemo, useState, useEffect } from "react";
import { Filter, Grid3X3, Plus, Search, SlidersHorizontal, Sparkles, Sun, Palette, Droplets, Camera, Loader2, AlertCircle, type LucideIcon } from "lucide-react";
import type { TabProps } from "./types";
import { useVideoEffectsStore, type EffectItem } from "@/store/videoEffectsStore";

const FILTER_CATEGORIES = [
  { id: "all", label: "All" },
  { id: "vintage", label: "Vintage" },
  { id: "modern", label: "Modern" },
  { id: "cinematic", label: "Cinematic" },
  { id: "bw", label: "B&W" },
  { id: "color", label: "Color" },
] as const;

type FilterCategory = (typeof FILTER_CATEGORIES)[number]["id"];
type FilterStatusFilter = "all" | "ready" | "soon";
type FilterIntensityFilter = "all" | "light" | "medium" | "bold";

const FILTER_ICONS: Record<string, LucideIcon> = {
  "filter-sepia": Sun,
  "filter-retro": Camera,
  "filter-aged": Grid3X3,
  "filter-crisp": Sparkles,
  "filter-vivid": Palette,
  "filter-cool": Droplets,
  "filter-cinematic-teal": SlidersHorizontal,
  "filter-bleach": Sun,
  "filter-moody": Camera,
  "filter-bw-classic": Grid3X3,
  "filter-high-contrast": SlidersHorizontal,
  "filter-soft-bw": Droplets,
  "filter-warm": Sun,
  "filter-cool-blue": Droplets,
  "filter-purple-haze": Sparkles,
};

const DEFAULT_ICON = Filter;

export const FiltersTab: React.FC<TabProps> = ({ onAddToTimeline }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<FilterCategory>("all");
  const [statusFilter, setStatusFilter] = useState<FilterStatusFilter>("all");
  const [intensityFilter, setIntensityFilter] = useState<FilterIntensityFilter>("all");

  const { categoryItems, loading, errors, loadCategory } = useVideoEffectsStore();

  const categoriesToLoad = useMemo(() => {
    return FILTER_CATEGORIES.filter((c) => c.id !== "all").map((c) => c.id);
  }, []);

  // Fetch filter category items dynamically
  useEffect(() => {
    if (activeCategory === "all") {
      categoriesToLoad.forEach((cat) => {
        loadCategory(cat);
      });
    } else {
      loadCategory(activeCategory);
    }
  }, [activeCategory, loadCategory, categoriesToLoad]);

  // Consolidate list based on active category selection
  const allFilters = useMemo(() => {
    if (activeCategory === "all") {
      // Flatten all loaded categories
      return Object.values(categoryItems).flat();
    }
    return categoryItems[activeCategory] || [];
  }, [activeCategory, categoryItems]);

  // Filter out any video effects (e.g. fx-brightness) that might share the 'color' category endpoint
  const cleanFilters = useMemo(() => {
    return allFilters.filter((item) => item.id.startsWith("filter-"));
  }, [allFilters]);

  const filteredFilters = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return cleanFilters.filter((filter) => {
      const matchesStatus = statusFilter === "all" || filter.status === statusFilter;
      const matchesIntensity = intensityFilter === "all" || filter.intensity?.toLowerCase() === intensityFilter;
      const matchesSearch =
        !query ||
        filter.name.toLowerCase().includes(query) ||
        filter.description.toLowerCase().includes(query) ||
        filter.category.includes(query);
      return matchesStatus && matchesIntensity && matchesSearch;
    });
  }, [cleanFilters, searchQuery, statusFilter, intensityFilter]);

  const readyCount = filteredFilters.filter((filter) => filter.status === "ready").length;

  const isCategoryLoading = useMemo(() => {
    if (activeCategory === "all") {
      return categoriesToLoad.some((cat) => loading[cat]);
    }
    return loading[activeCategory] || false;
  }, [activeCategory, loading, categoriesToLoad]);

  const categoryError = useMemo(() => {
    if (activeCategory === "all") {
      // Return first error found, if any
      return categoriesToLoad.map((cat) => errors[cat]).find(Boolean) || null;
    }
    return errors[activeCategory] || null;
  }, [activeCategory, errors, categoriesToLoad]);

  return (
    <div className="flex-1 min-h-0 flex flex-col overflow-hidden bg-surface/5 select-none">
      <div className="flex items-center gap-2.5 p-1 border-b border-border/50 shrink-0 bg-surface/10">
        <div className="shrink-0 flex items-center gap-1.5 px-2 py-1 rounded-sm bg-accent/10 border border-accent/20 text-accent-soft">
          <Filter className="w-3.5 h-3.5" />
          <span className="text-[12px] font-semibold">Filters</span>
        </div>
        <div className="w-px h-5 bg-border/80 shrink-0" />
        <div className="grow overflow-x-auto flex items-center gap-2 pb-0.5 whitespace-nowrap" style={{ scrollbarWidth: "none" }}>
          {FILTER_CATEGORIES.map((category) => (
            <button
              key={category.id}
              onClick={() => setActiveCategory(category.id)}
              className={`px-2 py-0.5 rounded-sm text-xs font-semibold transition-all cursor-pointer ${
                activeCategory === category.id
                  ? "bg-accent text-white"
                  : "text-text-muted hover:text-text-primary hover:bg-surface-raised/40"
              }`}
            >
              {category.label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-1 border-b border-border/50 bg-surface/5">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input
            type="text"
            placeholder="Search filters..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-surface-raised/70 border border-border rounded-lg pl-9 pr-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent"
          />
        </div>
        <div className="mt-1.5 flex items-center gap-1 overflow-x-auto whitespace-nowrap pb-0.5" style={{ scrollbarWidth: "none" }}>
          <FilterChip active={statusFilter === "all"} onClick={() => setStatusFilter("all")}>All states</FilterChip>
          <FilterChip active={statusFilter === "ready"} onClick={() => setStatusFilter("ready")}>Ready</FilterChip>
          <FilterChip active={statusFilter === "soon"} onClick={() => setStatusFilter("soon")}>Soon</FilterChip>
          <div className="mx-1 h-4 w-px shrink-0 bg-border/70" />
          <FilterChip active={intensityFilter === "all"} onClick={() => setIntensityFilter("all")}>Any intensity</FilterChip>
          <FilterChip active={intensityFilter === "light"} onClick={() => setIntensityFilter("light")}>Light</FilterChip>
          <FilterChip active={intensityFilter === "medium"} onClick={() => setIntensityFilter("medium")}>Medium</FilterChip>
          <FilterChip active={intensityFilter === "bold"} onClick={() => setIntensityFilter("bold")}>Bold</FilterChip>
        </div>
      </div>

      <div className="grow overflow-y-auto scrollbar-thin p-2">
        {categoryError && (
          <div className="mb-3 p-3 rounded-lg border border-red-500/20 bg-red-500/5 text-red-200 flex items-start gap-2.5 text-xs">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Failed to load filters</p>
              <p className="opacity-80 mt-0.5">{categoryError}</p>
            </div>
          </div>
        )}

        <div className="mb-2 rounded-lg border border-border/40 bg-surface-raised/35 px-2.5 py-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <SlidersHorizontal className="w-3.5 h-3.5 text-accent-soft shrink-0" />
              <p className="text-[11px] font-semibold text-text-primary truncate">
                {isCategoryLoading && filteredFilters.length === 0 ? "Loading..." : `${filteredFilters.length} filters`}
              </p>
            </div>
            {!isCategoryLoading && <p className="text-[10px] text-text-muted shrink-0">{readyCount} ready</p>}
          </div>
        </div>

        {isCategoryLoading && filteredFilters.length === 0 ? (
          <div className="grid grid-cols-2 gap-2">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        ) : filteredFilters.length === 0 ? (
          <div className="h-40 flex flex-col items-center justify-center text-text-muted gap-1 text-xs">
            <Filter className="w-5 h-5" />
            <p>No matching filters found</p>
            <p className="opacity-60">Try another category or search</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {filteredFilters.map((filter) => (
              <FilterCard
                key={filter.id}
                filter={filter}
                onAddToTimeline={() => onAddToTimeline?.(filter as any, "filters")}
              />
            ))}
            {isCategoryLoading && <SkeletonCard />}
          </div>
        )}
      </div>
    </div>
  );
};

const FilterChip: React.FC<{ active: boolean; onClick: () => void; children: React.ReactNode }> = ({ active, onClick, children }) => (
  <button
    type="button"
    onClick={onClick}
    className={`shrink-0 rounded-sm border px-2 py-1 text-[10px] font-semibold transition-colors cursor-pointer ${
      active ? "border-accent/30 bg-accent/15 text-accent-soft" : "border-border/40 text-text-muted hover:bg-surface-raised/60 hover:text-text-primary"
    }`}
  >
    {children}
  </button>
);

const SkeletonCard = () => (
  <div className="animate-pulse rounded-lg border border-border/30 bg-surface-raised/40 overflow-hidden h-[180px] flex flex-col justify-between">
    <div className="h-16 bg-white/5 relative overflow-hidden">
      <div className="absolute left-2 top-2 h-7 w-7 rounded-md bg-white/10" />
    </div>
    <div className="p-2 space-y-2 flex-1 flex flex-col justify-between">
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

const FilterCard: React.FC<{ filter: EffectItem; onAddToTimeline: () => void }> = ({ filter, onAddToTimeline }) => {
  const Icon = FILTER_ICONS[filter.id] || DEFAULT_ICON;
  const isReady = filter.status === "ready";
  return (
    <button
      onClick={isReady ? onAddToTimeline : undefined}
      disabled={!isReady}
      className={`group text-left rounded-lg border bg-surface-raised/60 transition-all overflow-hidden flex flex-col h-[180px] justify-between ${
        isReady ? "border-border/50 hover:bg-surface-raised hover:border-accent/30 cursor-pointer" : "border-border/30 opacity-70 cursor-not-allowed"
      }`}
    >
      <div className={`h-16 w-full bg-linear-to-br ${filter.swatch} relative overflow-hidden shrink-0`}>
        <div className="absolute inset-0 opacity-40 bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.42),transparent_38%)]" />
        <div className="absolute left-2 top-2 h-7 w-7 rounded-md bg-black/30 border border-white/10 flex items-center justify-center backdrop-blur-sm">
          <Icon className="w-4 h-4 text-white" />
        </div>
        <span
          className={`absolute right-2 top-2 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ${
            filter.status === "ready"
              ? "bg-emerald-500/20 text-emerald-200 border border-emerald-400/20"
              : "bg-white/10 text-white/70 border border-white/10"
          }`}
        >
          {filter.status === "ready" ? "Ready" : "Soon"}
        </span>
      </div>
      <div className="p-2 flex-1 flex flex-col justify-between">
        <div>
          <div className="flex items-start justify-between gap-2">
            <p className="text-[13px] font-semibold text-text-primary leading-tight truncate">{filter.name}</p>
            <Plus className={`w-3.5 h-3.5 text-text-muted shrink-0 transition-colors ${isReady ? "group-hover:text-accent" : ""}`} />
          </div>
          <p className="mt-1 text-[11px] leading-snug text-text-muted line-clamp-2">{filter.description}</p>
        </div>
        <div className="mt-2 flex items-center justify-between border-t border-border/40 pt-1.5">
          <span className="text-[10px] capitalize text-text-muted truncate mr-1">{filter.category}</span>
          {filter.intensity && <span className="text-[10px] text-text-muted shrink-0">{filter.intensity}</span>}
        </div>
      </div>
    </button>
  );
};
