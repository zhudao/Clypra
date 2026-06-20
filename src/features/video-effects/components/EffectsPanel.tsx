/**
 * Main Effects Panel Component
 * Video Effects (renderer-based) and Body Effects only
 */

import React, { useState } from "react";
import { EffectPicker } from "./EffectPicker";
import { RendererEffectsBrowser } from "./RendererEffectsBrowser";
import type { EffectPreset } from "../types";
import type { EffectRenderer as EffectRendererType } from "@clypra/engine";
import type { TabType } from "@/components/editor/media-tabs/types";

type EffectTab = "video" | "body";

const VIDEO_EFFECT_CATEGORIES = [
  { id: "essentials", name: "Essentials" },
  { id: "glitch", name: "Glitch" },
  { id: "retro", name: "Retro" },
  { id: "light", name: "Light" },
  { id: "motion", name: "Motion" },
  { id: "color", name: "Color" },
];

const BODY_EFFECT_CATEGORIES = [
  { id: "trending", name: "Trending" },
  { id: "motion", name: "Motion" },
  { id: "aura", name: "Aura" },
  { id: "wings", name: "Wings" },
  { id: "energy", name: "Energy" },
  { id: "fun", name: "Fun" },
];

export interface EffectsPanelProps {
  onAddToTimeline?: (item: any, type: TabType) => void;
}

export function EffectsPanel({ onAddToTimeline }: EffectsPanelProps) {
  const [activeTab, setActiveTab] = useState<EffectTab>("video");
  const [selectedVideoCategory, setSelectedVideoCategory] = useState<string>("essentials");
  const [selectedBodyCategory, setSelectedBodyCategory] = useState<string>("aura");

  const handleEffectSelect = (effect: EffectPreset) => {
    if (onAddToTimeline) {
      onAddToTimeline(effect, "body-effects");
    }
  };

  const handleRendererEffectSelect = (effectId: EffectRendererType) => {
    console.log("Renderer effect selected:", effectId);
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col overflow-hidden bg-surface/5 select-none">
      {/* Top Header Control Navigation Row */}
      <div className="flex items-center justify-between gap-2 p-1 border-b border-border/50 shrink-0 bg-surface/10 w-full overflow-hidden">
        {/* Tab switcher: Video / Body */}
        <div className="flex items-center gap-1 shrink-0 border-r border-border/30 pr-1.5 mr-0.5">
          <button onClick={() => setActiveTab("video")} className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-all cursor-pointer ${activeTab === "video" ? "bg-accent text-white" : "text-text-muted hover:text-text-primary hover:bg-surface-raised/40"}`}>
            Video
          </button>
          <button onClick={() => setActiveTab("body")} className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-all cursor-pointer ${activeTab === "body" ? "bg-accent text-white" : "text-text-muted hover:text-text-primary hover:bg-surface-raised/40"}`}>
            Body
          </button>
        </div>

        {/* Categories list in the right empty space */}
        <div className="flex-1 flex items-center overflow-x-auto scrollbar-none gap-1 py-px whitespace-nowrap" style={{ scrollbarWidth: "none" }}>
          {activeTab === "video" ? (
            VIDEO_EFFECT_CATEGORIES.map((cat) => (
              <button key={cat.id} onClick={() => setSelectedVideoCategory(cat.id)} className={`shrink-0 cursor-pointer rounded px-2 py-0.5 text-[10px] font-semibold transition-colors flex items-center ${selectedVideoCategory === cat.id ? "bg-accent text-white" : "text-text-muted hover:bg-surface-raised hover:text-text-primary"}`}>
                <span>{cat.name}</span>
              </button>
            ))
          ) : (
            BODY_EFFECT_CATEGORIES.map((cat) => (
              <button key={cat.id} onClick={() => setSelectedBodyCategory(cat.id)} className={`shrink-0 cursor-pointer rounded px-2 py-0.5 text-[10px] font-semibold transition-colors flex items-center ${selectedBodyCategory === cat.id ? "bg-accent text-white" : "text-text-muted hover:bg-surface-raised hover:text-text-primary"}`}>
                <span>{cat.name}</span>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Tab Content */}
      <div className="grow overflow-y-auto scrollbar-thin">
        {activeTab === "video" && (
          <RendererEffectsBrowser
            selectedCategory={selectedVideoCategory}
            onEffectSelect={handleRendererEffectSelect}
            onAddToTimeline={onAddToTimeline}
            showApplyButton={true}
          />
        )}
        {activeTab === "body" && (
          <EffectPicker
            selectedCategory={selectedBodyCategory}
            onSelect={handleEffectSelect}
          />
        )}
      </div>
    </div>
  );
}
