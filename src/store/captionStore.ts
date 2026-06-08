import { create } from "zustand";
import { persist } from "zustand/middleware";

export type WhisperModelSize = "tiny" | "base" | "small" | "medium" | "large-v3";
export type ModelDownloadStatus = "idle" | "downloading" | "downloaded" | "error";

export interface ModelDownloadState {
  status: ModelDownloadStatus;
  progressBytes: number;
  totalBytes: number;
  speedBytesPerSec: number;
  errorMessage?: string;
}

export interface CaptionSettings {
  language: string | "auto";
  activeModel: WhisperModelSize | null;
  models: Record<WhisperModelSize, ModelDownloadState>;
}

interface CaptionStore {
  captionSettings: CaptionSettings;
  setLanguage: (lang: string | "auto") => void;
  setActiveModel: (size: WhisperModelSize) => void;
  updateModelDownloadState: (size: WhisperModelSize, state: Partial<ModelDownloadState>) => void;
  resetModelState: (size: WhisperModelSize) => void;
}

const DEFAULT_MODEL_STATE: ModelDownloadState = {
  status: "idle",
  progressBytes: 0,
  totalBytes: 0,
  speedBytesPerSec: 0,
};

export const useCaptionStore = create<CaptionStore>()(
  persist(
    (set) => ({
      captionSettings: {
        language: "auto",
        activeModel: null,
        models: {
          tiny: { ...DEFAULT_MODEL_STATE },
          base: { ...DEFAULT_MODEL_STATE },
          small: { ...DEFAULT_MODEL_STATE },
          medium: { ...DEFAULT_MODEL_STATE },
          "large-v3": { ...DEFAULT_MODEL_STATE },
        },
      },

      setLanguage: (lang) =>
        set((state) => ({
          captionSettings: {
            ...state.captionSettings,
            language: lang,
          },
        })),

      setActiveModel: (size) =>
        set((state) => ({
          captionSettings: {
            ...state.captionSettings,
            activeModel: size,
          },
        })),

      updateModelDownloadState: (size, partialState) =>
        set((state) => ({
          captionSettings: {
            ...state.captionSettings,
            models: {
              ...state.captionSettings.models,
              [size]: {
                ...state.captionSettings.models[size],
                ...partialState,
              },
            },
          },
        })),

      resetModelState: (size) =>
        set((state) => ({
          captionSettings: {
            ...state.captionSettings,
            models: {
              ...state.captionSettings.models,
              [size]: { ...DEFAULT_MODEL_STATE },
            },
          },
        })),
    }),
    {
      name: "clypra-caption-settings",
      // Only persist language and model statuses, not download progress
      partialize: (state) => ({
        captionSettings: {
          language: state.captionSettings.language,
          activeModel: state.captionSettings.activeModel,
          models: Object.fromEntries(
            Object.entries(state.captionSettings.models).map(([key, value]) => [
              key,
              {
                status: value.status,
                progressBytes: value.status === "downloaded" ? value.totalBytes : 0,
                totalBytes: value.totalBytes,
                speedBytesPerSec: 0,
                errorMessage: value.errorMessage,
              },
            ]),
          ) as Record<WhisperModelSize, ModelDownloadState>,
        },
      }),
    },
  ),
);
