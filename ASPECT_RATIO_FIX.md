# Professional Aspect Ratio Preservation Fix

## The Problem

When clips were added to the timeline, they were being stretched to fill the entire sequence canvas dimensions, regardless of their original aspect ratio. This is **unprofessional behavior** that destroys the visual integrity of source media.

### Example of the Bug

- **Source video**: 1920x1080 (16:9 landscape)
- **Sequence**: 1080x1920 (9:16 portrait)
- **Bug behavior**: Video stretched to 1080x1920 → distorted, unprofessional
- **Expected behavior**: Video scaled to fit within 1080x1920, preserving 16:9 aspect ratio → letterboxed/pillarboxed

### Screenshots from User Report

**Source Preview (Correct):**

- Video displays in original aspect ratio
- Circular portrait video shown correctly

**Program Preview (Broken - Before Fix):**

- Same video stretched to fill 9:16 canvas
- Aspect ratio destroyed
- Unprofessional appearance

## Professional Editor Behavior

### The Three Spaces

Professional NLEs (Premiere, Resolve, FCP) distinguish between:

1. **Source Space**: Raw media dimensions (never changes)
2. **Sequence Space**: Editing canvas/program dimensions
3. **Viewport Space**: Display/preview fitting (UI only)

### Key Principle

**Sequence dimensions ≠ Clip dimensions**

When a 16:9 clip is placed in a 9:16 sequence:

- ✅ Preserve aspect ratio
- ✅ Fit safely within sequence bounds
- ✅ Letterbox/pillarbox as needed
- ❌ Never stretch by default

## The Fix

### Core Change: Aspect-Ratio-Preserving Clip Creation

**File**: `src/lib/timelineClip.ts`

Added `calculateClipDimensions()` function that implements professional fit modes:

```typescript
export type ClipFitMode = "contain" | "cover" | "stretch" | "original";

function calculateClipDimensions(asset: MediaAsset, canvasWidth: number, canvasHeight: number, fitMode: ClipFitMode = "contain"): { x: number; y: number; width: number; height: number };
```

### Fit Modes Explained

| Mode         | Behavior                                                     | Use Case                            |
| ------------ | ------------------------------------------------------------ | ----------------------------------- |
| **contain**  | Fit entire media inside canvas, preserve aspect ratio        | **Default** - Professional standard |
| **cover**    | Fill canvas completely, preserve aspect ratio, crop overflow | Full-bleed effects                  |
| **stretch**  | Force to canvas dimensions (destructive)                     | Rarely used, explicit only          |
| **original** | Use source dimensions 1:1                                    | May exceed canvas bounds            |

### Default Behavior: "contain"

This is the professional standard:

- Preserves aspect ratio
- Fits media safely within canvas
- Centers media on canvas
- Letterboxes/pillarboxes as needed

### Implementation Details

**Before (Broken):**

```typescript
export const createClipFromAsset = ({ asset, trackId, startTime, width, height }) => {
  return {
    // ...
    x: 0,
    y: 0,
    width, // ❌ Always uses canvas width
    height, // ❌ Always uses canvas height
    // ...
  };
};
```

**After (Fixed):**

```typescript
export const createClipFromAsset = ({ asset, trackId, startTime, width, height }) => {
  // Calculate dimensions that preserve aspect ratio
  const {
    x,
    y,
    width: clipWidth,
    height: clipHeight,
  } = calculateClipDimensions(
    asset,
    width,
    height,
    "contain", // Professional default
  );

  return {
    // ...
    x, // ✅ Centered on canvas
    y, // ✅ Centered on canvas
    width: clipWidth, // ✅ Preserves aspect ratio
    height: clipHeight, // ✅ Preserves aspect ratio
    // ...
  };
};
```

### Example Calculations

**Scenario 1: Landscape video in portrait sequence**

- Asset: 1920x1080 (16:9)
- Canvas: 1080x1920 (9:16)
- Result:
  - Clip width: 1080 (fit to canvas width)
  - Clip height: 607.5 (preserves 16:9)
  - X: 0 (left-aligned)
  - Y: 656.25 (centered vertically)
  - Effect: Letterboxed top and bottom

**Scenario 2: Portrait video in landscape sequence**

- Asset: 1080x1920 (9:16)
- Canvas: 1920x1080 (16:9)
- Result:
  - Clip width: 607.5 (preserves 9:16)
  - Clip height: 1080 (fit to canvas height)
  - X: 656.25 (centered horizontally)
  - Y: 0 (top-aligned)
  - Effect: Pillarboxed left and right

**Scenario 3: Square video in any sequence**

- Asset: 1080x1080 (1:1)
- Canvas: 1920x1080 (16:9)
- Result:
  - Clip width: 1080 (fit to canvas height)
  - Clip height: 1080 (preserves 1:1)
  - X: 420 (centered horizontally)
  - Y: 0 (top-aligned)
  - Effect: Pillarboxed left and right

## Files Changed

### 1. `src/lib/timelineClip.ts`

- Added `ClipFitMode` type
- Added `calculateClipDimensions()` function
- Modified `createClipFromAsset()` to use aspect-ratio-preserving dimensions

### 2. `src/lib/timelineUtils.ts`

- Added import for `createClipFromAsset`
- Replaced inline clip creation with `createClipFromAsset()` call
- Ensures drag-and-drop clips also preserve aspect ratio

### 3. `src/hooks/useTimeline.ts`

- Already used `createClipFromAsset()` - automatically fixed ✅

## Testing

### Test Cases

1. **Landscape video in portrait sequence**
   - Add 16:9 video to 9:16 sequence
   - Expected: Video fits width, letterboxed top/bottom
   - Verify: No stretching, aspect ratio preserved

2. **Portrait video in landscape sequence**
   - Add 9:16 video to 16:9 sequence
   - Expected: Video fits height, pillarboxed left/right
   - Verify: No stretching, aspect ratio preserved

3. **Square video in any sequence**
   - Add 1:1 video to any sequence
   - Expected: Video fits to smaller dimension, centered
   - Verify: No stretching, aspect ratio preserved

4. **Matching aspect ratios**
   - Add 16:9 video to 16:9 sequence
   - Expected: Video fills canvas exactly
   - Verify: No letterboxing, perfect fit

5. **Program preview "Original" mode**
   - Switch preview aspect to "Original"
   - Expected: Viewport adjusts to show source aspect ratio
   - Verify: Clip dimensions unchanged (sequence space preserved)

### Manual Testing Steps

1. Create a new project with 9:16 (portrait) sequence
2. Import a 16:9 (landscape) video
3. Drag video to timeline
4. Check program preview:
   - ✅ Video should be letterboxed (black bars top/bottom)
   - ✅ Video should NOT be stretched
   - ✅ Aspect ratio should match source
5. Switch preview aspect to "Original"
   - ✅ Viewport should adjust to show 16:9
   - ✅ Clip dimensions should remain unchanged
6. Export and verify output matches preview

## Future Enhancements

### 1. Per-Clip Fit Mode Override

Allow users to change fit mode per clip:

```typescript
interface Clip {
  // ... existing properties
  fitMode?: ClipFitMode; // Optional override
}
```

UI: Right-click clip → Transform → Fit Mode → [Contain | Cover | Stretch | Original]

### 2. Sequence Auto-Fit Settings

Project-level default fit mode:

```typescript
interface Project {
  // ... existing properties
  defaultClipFitMode?: ClipFitMode; // Default: "contain"
}
```

UI: Project Settings → Timeline → Default Clip Fit Mode

### 3. Smart Reframe (AI Crop)

For "cover" mode, add AI-powered reframing:

- Detect faces/subjects
- Intelligently crop to keep important content in frame
- Similar to Premiere's Auto Reframe

### 4. Transform Presets

Common transform presets:

- "Center Crop" (cover mode, centered)
- "Ken Burns" (animated zoom/pan)
- "Picture-in-Picture" (scaled down, positioned)
- "Split Screen" (multiple clips, positioned)

### 5. Aspect Ratio Guides

Visual guides in program preview:

- Show safe areas
- Show letterbox/pillarbox regions
- Show crop regions for "cover" mode

## Professional Principles Applied

### 1. Non-Destructive Editing

- Source media never modified
- All transforms are reversible
- Aspect ratio preserved by default

### 2. Predictable Behavior

- Clips always behave the same way
- No unexpected stretching
- Clear visual feedback

### 3. Sequence Space Integrity

- Sequence dimensions define export format
- Clips fit within sequence bounds
- Letterboxing/pillarboxing is expected and correct

### 4. Transform Transparency

- Users can see and modify all transforms
- X, Y, Width, Height are explicit properties
- No hidden "smart" behavior that surprises users

### 5. Professional Defaults

- "contain" mode is the industry standard
- Preserves aspect ratio unless explicitly changed
- Matches Premiere, Resolve, FCP behavior

## Related Issues

This fix addresses the core issue, but related improvements needed:

1. **Transform Controls**: Add UI for adjusting clip position/scale
2. **Fit Mode Selector**: Add UI for changing fit mode per clip
3. **Aspect Ratio Indicators**: Show aspect ratio in clip properties
4. **Export Validation**: Warn if clips exceed canvas bounds
5. **Undo/Redo**: Ensure transform changes are undoable

## References

### Professional NLE Behavior

**Adobe Premiere Pro:**

- Default: Fit to frame (contain)
- Option: Fill frame (cover)
- Option: Set to frame size (stretch)

**DaVinci Resolve:**

- Default: Fit (contain)
- Option: Fill (cover)
- Option: Stretch to fit

**Final Cut Pro:**

- Default: Fit (contain)
- Option: Fill (cover)
- Option: Spatial conform (various modes)

All professional NLEs default to aspect-ratio-preserving behavior.

## Conclusion

This fix brings Clypra in line with professional NLE standards:

- ✅ Aspect ratio preserved by default
- ✅ Clips fit safely within sequence bounds
- ✅ Predictable, non-destructive behavior
- ✅ Matches industry expectations

Users can now confidently add media to any sequence format without worrying about unexpected stretching or distortion.
