import React, { useState, useEffect } from "react";
import { Trash2, HardDrive, RefreshCw, AlertCircle, CheckCircle, Cloud, Database, Music2 } from "lucide-react";
import { useCacheManager } from "@/hooks/useCacheManager";
import { ClypraApi } from "@/features/text-effects/api/clypraApi";
import { useAudioLibraryStore } from "@/features/audio-library/store/audioLibraryStore";

export const CacheSettings: React.FC = () => {
  const { isClearing, cacheInfo, lastResult, clearAllCaches, clearAppCache, clearWebViewCache, clearGPUCache } = useCacheManager();
  const { getCacheStats, clearAllCache: clearAudioCache } = useAudioLibraryStore();

  const [apiCacheStatus, setApiCacheStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [isClearingApi, setIsClearingApi] = useState(false);
  const [audioCacheStats, setAudioCacheStats] = useState({ count: 0, totalSize: 0, items: [] as any[] });
  const [isClearingAudio, setIsClearingAudio] = useState(false);

  // Load audio cache stats
  useEffect(() => {
    const stats = getCacheStats();
    setAudioCacheStats(stats);
  }, [getCacheStats]);

  // Refresh audio cache stats
  const refreshAudioStats = () => {
    const stats = getCacheStats();
    setAudioCacheStats(stats);
  };

  const handleClearLocalApiCache = () => {
    try {
      ClypraApi.clearLocalCache();
      setApiCacheStatus({ type: "success", message: "Local API cache cleared successfully" });
      setTimeout(() => setApiCacheStatus(null), 3000);
    } catch (error) {
      setApiCacheStatus({ type: "error", message: "Failed to clear local API cache" });
      setTimeout(() => setApiCacheStatus(null), 5000);
    }
  };

  const handleClearAudioCache = async () => {
    setIsClearingAudio(true);
    try {
      await clearAudioCache();
      refreshAudioStats();
      setApiCacheStatus({ type: "success", message: "Audio library cache cleared successfully" });
      setTimeout(() => setApiCacheStatus(null), 3000);
    } catch (error) {
      setApiCacheStatus({ type: "error", message: "Failed to clear audio cache" });
      setTimeout(() => setApiCacheStatus(null), 5000);
    } finally {
      setIsClearingAudio(false);
    }
  };

  const handleClearServerCache = async () => {
    setIsClearingApi(true);
    setApiCacheStatus(null);

    try {
      const result = await ClypraApi.purgeAllCaches();
      const { local, server } = result;

      const kvDeleted = server.kv?.totalDeleted || 0;
      const cacheApiPurged = server.cacheApi?.purged || 0;

      setApiCacheStatus({
        type: "success",
        message: `All caches cleared: Local ✓, KV (${kvDeleted} keys), Cache API (${cacheApiPurged} entries)`,
      });
    } catch (error: any) {
      console.error("[CacheSettings] Cache purge failed:", error);

      // Provide helpful error messages
      let errorMessage = "Failed to clear server caches.";

      if (error.message?.includes("404")) {
        errorMessage = "Cache endpoint not found (404). The API may need to be deployed. Check DEPLOYMENT_STEPS.md";
      } else if (error.message?.includes("401")) {
        errorMessage = "Unauthorized (401). Check that VITE_CLYPRA_API_KEY is configured correctly.";
      } else if (error.message?.includes("403")) {
        errorMessage = "Forbidden (403). Your API key doesn't have admin permissions.";
      } else if (error.message?.includes("429")) {
        errorMessage = "Rate limited (429). Too many requests. Please wait a minute and try again.";
      } else if (error.message) {
        errorMessage = error.message;
      }

      setApiCacheStatus({
        type: "error",
        message: errorMessage,
      });
    } finally {
      setIsClearingApi(false);
      setTimeout(() => setApiCacheStatus(null), 10000); // Keep error visible longer
    }
  };

  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-[13px] font-semibold uppercase tracking-wider text-text-muted mb-2">Cache Management</h3>
        <p className="text-[11px] text-text-muted">Clear cached data to free up disk space or resolve performance issues.</p>
      </div>

      {/* Cache Info */}
      {cacheInfo && (
        <div className="bg-surface-raised/30 border border-white/6 rounded-lg p-4 space-y-3">
          <div className="flex items-center gap-2 text-xs">
            <HardDrive className="w-4 h-4 text-accent" />
            <span className="font-semibold text-text-primary">Cache Status</span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-[11px]">
            <div className="bg-surface-raised/50 rounded p-2 border border-white/5">
              <div className="text-text-muted">localStorage Items</div>
              <div className="text-text-primary font-semibold mt-1">{cacheInfo.localStorage}</div>
            </div>

            <div className="bg-surface-raised/50 rounded p-2 border border-white/5">
              <div className="text-text-muted">sessionStorage Items</div>
              <div className="text-text-primary font-semibold mt-1">{cacheInfo.sessionStorage}</div>
            </div>

            {cacheInfo.gpuCache && (
              <>
                <div className="bg-surface-raised/50 rounded p-2 border border-white/5">
                  <div className="text-text-muted">GPU Textures</div>
                  <div className="text-text-primary font-semibold mt-1">{cacheInfo.gpuCache.textureCount || 0}</div>
                </div>

                <div className="bg-surface-raised/50 rounded p-2 border border-white/5">
                  <div className="text-text-muted">GPU Memory</div>
                  <div className="text-text-primary font-semibold mt-1">{cacheInfo.gpuCache.memoryMB || "0"} MB</div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Clear Result Message */}
      {lastResult && (
        <div className={`flex items-center gap-3 p-2 rounded-lg border text-xs ${lastResult.success ? "bg-green-500/10 border-green-500/30 text-green-400" : "bg-red-500/10 border-red-500/30 text-red-400"}`}>
          {lastResult.success ? <CheckCircle className="w-5 h-5 shrink-0 mt-0.5" /> : <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />}
          <div className="flex-1">
            <p className="font-medium">{lastResult.message}</p>
            {lastResult.stats?.errors && lastResult.stats.errors.length > 0 && (
              <ul className="mt-2 text-[10px] space-y-1">
                {lastResult.stats.errors.map((error: string, idx: number) => (
                  <li key={idx}>• {error}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* Clear Cache Actions */}
      <div className="space-y-3">
        <button onClick={() => clearAllCaches({ localStorage: false })} disabled={isClearing} className="w-full flex items-center justify-between p-4 bg-surface-raised/30 hover:bg-surface-raised/50 border border-white/6 hover:border-accent/40 rounded-lg transition-all group disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center group-hover:bg-accent/30 transition-colors">
              <Trash2 className="w-5 h-5 text-accent" />
            </div>
            <div className="text-left">
              <div className="font-medium text-text-primary text-xs">Clear All Caches</div>
              <div className="text-[10px] text-text-muted">App cache, WebView, GPU, and IndexedDB</div>
            </div>
          </div>
          {isClearing && <RefreshCw className="w-5 h-5 text-accent animate-spin" />}
        </button>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button onClick={() => clearAppCache()} disabled={isClearing} className="flex flex-col items-center gap-2 p-4 bg-surface-raised/20 hover:bg-surface-raised/40 border border-white/6 hover:border-accent/30 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer">
            <HardDrive className="w-5 h-5 text-accent" />
            <div className="text-[11px] font-medium text-text-primary">App Cache</div>
          </button>

          <button onClick={() => clearWebViewCache()} disabled={isClearing} className="flex flex-col items-center gap-2 p-4 bg-surface-raised/20 hover:bg-surface-raised/40 border border-white/6 hover:border-accent/30 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer">
            <RefreshCw className="w-5 h-5 text-accent" />
            <div className="text-[11px] font-medium text-text-primary">WebView</div>
          </button>

          <button onClick={() => clearGPUCache()} disabled={isClearing} className="flex flex-col items-center gap-2 p-4 bg-surface-raised/20 hover:bg-surface-raised/40 border border-white/6 hover:border-accent/30 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer">
            <Trash2 className="w-5 h-5 text-accent" />
            <div className="text-[11px] font-medium text-text-primary">GPU Cache</div>
          </button>
        </div>
      </div>

      {/* API Cache Management */}
      <div className="space-y-3 pt-4 border-t border-white/6">
        <div>
          <h3 className="text-[13px] font-semibold uppercase tracking-wider text-text-muted mb-2">API Cache</h3>
          <p className="text-[11px] text-text-muted">Clear effects and templates cache from Clypra API servers.</p>
        </div>

        {apiCacheStatus && (
          <div className={`flex items-center gap-3 p-2 rounded-lg border text-xs ${apiCacheStatus.type === "success" ? "bg-green-500/10 border-green-500/30 text-green-400" : "bg-red-500/10 border-red-500/30 text-red-400"}`}>
            {apiCacheStatus.type === "success" ? <CheckCircle className="w-5 h-5 shrink-0 mt-0.5" /> : <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />}
            <p className="font-medium flex-1">{apiCacheStatus.message}</p>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button onClick={handleClearLocalApiCache} disabled={isClearingApi} className="flex items-center gap-3 p-4 bg-surface-raised/20 hover:bg-surface-raised/40 border border-white/6 hover:border-blue-500/30 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer">
            <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <Database className="w-5 h-5 text-blue-400" />
            </div>
            <div className="text-left flex-1">
              <div className="font-medium text-text-primary text-xs">Local API Cache</div>
              <div className="text-[10px] text-text-muted">Clear in-memory cache</div>
            </div>
          </button>

          <button onClick={handleClearServerCache} disabled={isClearingApi} className="flex items-center gap-3 p-4 bg-surface-raised/20 hover:bg-surface-raised/40 border border-white/6 hover:border-purple-500/30 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer">
            <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">{isClearingApi ? <RefreshCw className="w-5 h-5 text-purple-400 animate-spin" /> : <Cloud className="w-5 h-5 text-purple-400" />}</div>
            <div className="text-left flex-1">
              <div className="font-medium text-text-primary text-xs">Server Cache</div>
              <div className="text-[10px] text-text-muted">Clear KV + Cache API</div>
            </div>
          </button>
        </div>

        <div className="flex items-start gap-3 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
          <AlertCircle className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
          <p className="text-[11px] text-blue-200/90">Server cache clearing requires an API key with admin permissions. If you see errors, verify your API key is configured correctly.</p>
        </div>
      </div>

      {/* Audio Library Cache Management */}
      <div className="space-y-3 pt-4 border-t border-white/6">
        <div>
          <h3 className="text-[13px] font-semibold uppercase tracking-wider text-text-muted mb-2">Audio Library Cache</h3>
          <p className="text-[11px] text-text-muted">Manage downloaded audio files from the audio library.</p>
        </div>

        {/* Audio Cache Stats */}
        <div className="bg-surface-raised/30 border border-white/6 rounded-lg p-4 space-y-3">
          <div className="flex items-center gap-2 text-xs">
            <Music2 className="w-4 h-4 text-accent" />
            <span className="font-semibold text-text-primary">Cached Audio Files</span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-[11px]">
            <div className="bg-surface-raised/50 rounded p-2 border border-white/5">
              <div className="text-text-muted">Files</div>
              <div className="text-text-primary font-semibold mt-1">{audioCacheStats.count}</div>
            </div>

            <div className="bg-surface-raised/50 rounded p-2 border border-white/5">
              <div className="text-text-muted">Total Size</div>
              <div className="text-text-primary font-semibold mt-1">{(audioCacheStats.totalSize / (1024 * 1024)).toFixed(2)} MB</div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button onClick={refreshAudioStats} disabled={isClearingAudio} className="flex items-center gap-3 p-4 bg-surface-raised/20 hover:bg-surface-raised/40 border border-white/6 hover:border-accent/30 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer">
            <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center">
              <RefreshCw className="w-5 h-5 text-accent" />
            </div>
            <div className="text-left flex-1">
              <div className="font-medium text-text-primary text-xs">Refresh Stats</div>
              <div className="text-[10px] text-text-muted">Update cache information</div>
            </div>
          </button>

          <button onClick={handleClearAudioCache} disabled={isClearingAudio} className="flex items-center gap-3 p-4 bg-surface-raised/20 hover:bg-surface-raised/40 border border-white/6 hover:border-red-500/30 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer">
            <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">{isClearingAudio ? <RefreshCw className="w-5 h-5 text-red-400 animate-spin" /> : <Trash2 className="w-5 h-5 text-red-400" />}</div>
            <div className="text-left flex-1">
              <div className="font-medium text-text-primary text-xs">Clear Audio Cache</div>
              <div className="text-[10px] text-text-muted">Delete all downloaded files</div>
            </div>
          </button>
        </div>

        <div className="flex items-start gap-3 p-3 bg-orange-500/10 border border-orange-500/30 rounded-lg">
          <AlertCircle className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
          <p className="text-[11px] text-orange-200/90">Clearing audio cache will remove all downloaded library files. You'll need to download them again when adding to timeline.</p>
        </div>
      </div>

      {/* Warning Note */}
      <div className="flex items-start gap-3 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
        <AlertCircle className="w-5 h-5 text-yellow-400 shrink-0 mt-0.5" />
        <div className="text-[11px] text-yellow-200/90">
          <p className="font-semibold mb-1">Important Notes:</p>
          <ul className="space-y-1 list-disc list-inside">
            <li>Clearing cache may require an application restart for full effect</li>
            <li>WebView cache (Windows) may be locked by running processes</li>
            <li>Your settings and preferences will be preserved</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
