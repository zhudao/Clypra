// src/features/text-effects/store/effectsStore.test.ts
import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { useEffectsStore } from "./effectsStore";

const mockIndexItems = [
  {
    id: "solaris-ink",
    name: "Solaris Ink",
    category: "metallic",
    isPremium: false,
    previewType: "static",
    thumbnailUrl: "https://raw.githubusercontent.com/AIEraDev/clypra-api/main/data/thumbnails/solaris-ink.png",
  }
];

const mockFullDefinition = {
  id: "solaris-ink",
  name: "Solaris Ink",
  category: "metallic",
  isPremium: false,
  previewType: "static",
  thumbnailUrl: "https://raw.githubusercontent.com/AIEraDev/clypra-api/main/data/thumbnails/solaris-ink.png",
  font: {
    family: "Montserrat",
    weight: 700,
    style: "normal",
    letterSpacing: 1,
    lineHeight: 1.2,
  },
  fills: [],
  strokes: [],
  shadows: [],
};

describe("useEffectsStore", () => {
  beforeEach(() => {
    // Reset store state
    useEffectsStore.setState({
      index: {},
      indexLoading: false,
      indexError: null,
      definitions: {},
      loadingId: null,
      prefetchingIds: new Set(),
      selectedEffect: null,
      selectedCategory: null,
    });
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test("loadCategory - success and state mapping", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => mockIndexItems,
    } as any);

    await useEffectsStore.getState().loadCategory("metallic");

    const state = useEffectsStore.getState();
    expect(state.indexLoading).toBe(false);
    expect(state.indexError).toBeNull();
    expect(state.index["metallic"]).toEqual(mockIndexItems);
    expect(fetchMock).toHaveBeenCalledWith("https://clypra-worker-api.abdulkabirmusa.com/effects/metallic", expect.any(Object));
  });

  test("loadCategory - failure", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 500,
    } as any);

    await useEffectsStore.getState().loadCategory("metallic");

    const state = useEffectsStore.getState();
    expect(state.indexLoading).toBe(false);
    expect(state.indexError).toBe("Failed to load effects. Tap to retry.");
    expect(state.index["metallic"]).toBeUndefined();
  });

  test("selectEffect - from network when not cached", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => mockFullDefinition,
    } as any);

    const selectPromise = useEffectsStore.getState().selectEffect("solaris-ink", "metallic");
    
    // Check in-flight loading state
    expect(useEffectsStore.getState().loadingId).toBe("solaris-ink");
    
    await selectPromise;

    const state = useEffectsStore.getState();
    expect(state.loadingId).toBeNull();
    expect(state.definitions["solaris-ink"]).toEqual(mockFullDefinition);
    expect(state.selectedEffect).toEqual(mockFullDefinition);
    expect(state.selectedCategory).toBe("metallic");
  });

  test("selectEffect - instant from cache", async () => {
    const fetchMock = vi.mocked(fetch);
    useEffectsStore.setState({
      definitions: { "solaris-ink": mockFullDefinition as any },
    });

    await useEffectsStore.getState().selectEffect("solaris-ink", "metallic");

    const state = useEffectsStore.getState();
    expect(state.selectedEffect).toEqual(mockFullDefinition);
    expect(state.selectedCategory).toBe("metallic");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test("prefetchEffect - background fetch hold to cache", async () => {
    const fetchMock = vi.mocked(fetch);
    
    // Create a deferred promise to control when fetch resolves
    let resolveFetch: any;
    const fetchPromise = new Promise((resolve) => {
      resolveFetch = resolve;
    });

    fetchMock.mockReturnValueOnce(
      fetchPromise.then(() => ({
        ok: true,
        json: async () => mockFullDefinition,
      })) as any
    );

    useEffectsStore.getState().prefetchEffect("solaris-ink", "metallic");

    // prefetchingIds should record active background requests
    expect(useEffectsStore.getState().prefetchingIds.has("solaris-ink")).toBe(true);

    // Resolve network request
    resolveFetch();
    
    // Wait for event loop ticks
    await new Promise((r) => setTimeout(r, 10));

    const state = useEffectsStore.getState();
    expect(state.prefetchingIds.has("solaris-ink")).toBe(false);
    expect(state.definitions["solaris-ink"]).toEqual(mockFullDefinition);
  });

  test("clearSelected - resets state", () => {
    useEffectsStore.setState({
      selectedEffect: mockFullDefinition as any,
      selectedCategory: "metallic",
    });

    useEffectsStore.getState().clearSelected();

    const state = useEffectsStore.getState();
    expect(state.selectedEffect).toBeNull();
    expect(state.selectedCategory).toBeNull();
  });
});
