import { useState } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";
import { useProjectStore } from "../store/projectStore";
import type { MediaAsset, VideoMetadata } from "../types";
import { generateSimpleWaveform } from "../lib/audioWaveformGenerator";
import { generateId } from "@/lib/id";

export const useMediaImport = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ type: "success" | "warning"; message: string } | null>(null);
  const { addMediaAsset, mediaAssets } = useProjectStore();

  const importMedia = async () => {
    try {
      setIsLoading(true);
      const selected = await open({
        multiple: true,
        filters: [
          {
            name: "Media",
            extensions: ["mp4", "mov", "avi", "mkv", "mp3", "wav", "aac", "jpg", "png", "webp"],
          },
        ],
      });

      if (!selected) return;

      const files = Array.isArray(selected) ? selected : [selected];
      let importedCount = 0;
      let skippedCount = 0;
      let failedCount = 0;

      for (const path of files) {
        try {
          // Check if asset already exists
          const existingAsset = mediaAssets.find((a) => a.path === path);
          if (existingAsset) {
            skippedCount++;
            continue;
          }

          const filename = path.split("/").pop() || "Unknown";
          const type = getMediaType(path);

          try {
            // Use unified metadata extraction for all media types
            const metadata: VideoMetadata = await invoke("get_media_metadata", { path });

            if (type === "video" || type === "audio") {
              // Generate poster frame/thumbnail
              let posterFrame: string | undefined;
              let coverArt: string | undefined;

              if (type === "video") {
                // Use extract_poster_frame_command which extracts at 15% of duration
                // Heuristic: avoid first GOP/black frames (floor 1s), cap at 30s
                posterFrame = (await invoke("extract_poster_frame_command", {
                  videoPath: path,
                  duration: metadata.duration,
                  dpr: window.devicePixelRatio || 1.0,
                }).catch((err) => {
                  console.error("Failed to extract poster frame:", err);
                  return undefined;
                })) as string | undefined;
              } else if (type === "audio") {
                // Try to extract album artwork from audio file
                try {
                  coverArt = (await invoke("extract_audio_artwork", { path })) as string | undefined;
                } catch (err) {
                  // Ignore, fallback to waveform
                }

                // Generate waveform thumbnail for audio files
                try {
                  posterFrame = generateSimpleWaveform({
                    width: 160,
                    height: 90,
                    barCount: 32,
                    barColor: "#22d3ee",
                    backgroundColor: "#1e293b",
                  });
                } catch (err) {
                  // Ignore
                }
              }

              const asset: MediaAsset = {
                id: generateId("asset"),
                name: filename,
                path,
                type,
                duration: metadata.duration,
                width: metadata.width,
                height: metadata.height,
                posterFrame,
                coverArt,
                size: metadata.size,
              };
              addMediaAsset(asset);
            } else {
              // Image - metadata already extracted by Rust backend
              const { convertFileSrc } = await import("@tauri-apps/api/core");
              const { DEFAULT_STILL_DURATION_SECONDS } = await import("../constants/config");

              const asset: MediaAsset = {
                id: generateId("asset"),
                name: filename,
                path,
                type: "image",
                duration: DEFAULT_STILL_DURATION_SECONDS,
                width: metadata.width,
                height: metadata.height,
                size: metadata.size,
                posterFrame: convertFileSrc(path), // Use the image itself as preview
              };
              addMediaAsset(asset);
              importedCount++;
            }
          } catch (metadataError) {
            console.error(`[MediaImport] Failed to extract metadata for ${path}:`, metadataError);
            failedCount++;
            continue;
          }
        } catch (fileError) {
          console.error(`[MediaImport] Failed to import ${path}:`, fileError);
          failedCount++;
          // Continue with next file instead of stopping
        }
      }

      // Show appropriate toast message
      if (failedCount > 0) {
        setToastMessage({
          type: "warning",
          message: `${failedCount} file(s) failed to import.${importedCount > 0 ? ` ${importedCount} succeeded.` : ""}`,
        });
      } else if (importedCount > 0 && skippedCount > 0) {
        setToastMessage({
          type: "warning",
          message: `Imported ${importedCount} file(s). ${skippedCount} duplicate(s) skipped.`,
        });
      } else if (skippedCount > 0) {
        setToastMessage({
          type: "warning",
          message: `${skippedCount} file(s) already imported.`,
        });
      } else if (importedCount > 0) {
        setToastMessage({
          type: "success",
          message: `Successfully imported ${importedCount} file(s).`,
        });
      }
    } catch (error) {
      console.error("[MediaImport] Import failed:", error);
      setToastMessage({ type: "warning", message: "Failed to open file picker" });
    } finally {
      setIsLoading(false);
    }
  };

  const getMediaType = (path: string): "video" | "audio" | "image" => {
    const lower = path.toLowerCase();
    if (/\.(mp4|mov|avi|mkv|webm|flv)$/i.test(lower)) return "video";
    if (/\.(mp3|wav|aac|flac|m4a)$/i.test(lower)) return "audio";
    return "image";
  };

  return {
    importMedia,
    isLoading,
    toastMessage,
    clearToast: () => setToastMessage(null),
  };
};
