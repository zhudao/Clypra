# Clip Resize Debug Log Guide

## Overview

Comprehensive logging has been added to trace the clip resize interaction flow. All logs are prefixed with `[RESIZE]` and use emojis for quick visual scanning.

## How to Test

1. Open the app
2. Open browser DevTools Console (Cmd+Option+J)
3. Try resizing a clip's left or right trim handle
4. Watch the console output

## Expected Log Flow (Working Correctly)

### Step 1: User Clicks Handle

```
[RESIZE] ✅ handleResizeStart INITIATED {
  clipId: "clip-xyz",
  side: "right",
  pointerId: 1,
  clientX: 450,
  currentClipState: {
    startTime: 2.5,
    duration: 5.0,
    trimIn: 0,
    trimOut: 5.0
  },
  ripple: false
}
[RESIZE]   ✓ Pointer capture set
[RESIZE]   ✓ resizeStartRef set { x: 450, startTime: 2.5, duration: 5.0, ... }
[RESIZE]   ✓ setIsResizing called with "right"
```

### Step 2: useEffect Triggered

```
[RESIZE] 🚀 useEffect: RESIZE EFFECT SETUP STARTING {
  clipId: "clip-xyz",
  trackId: "track-1",
  side: "right",
  pointerId: 1,
  resizeStart: { x: 450, startTime: 2.5, duration: 5.0, ... },
  effectDeps: { pixelsPerSecond: 100, mediaAsset: true, ... }
}
[RESIZE]   ✅ Document event listeners ATTACHED {
  clipId: "clip-xyz",
  side: "right",
  listeners: ["pointermove", "pointerup", "pointercancel"]
}
```

### Step 3: User Drags Handle

```
[RESIZE] 📍 pointermove {
  clipId: "clip-xyz",
  clientX: 460,
  deltaX: 10,
  deltaTime: 0.1,
  resizeStart: { x: 450, startTime: 2.5, duration: 5.0, ... },
  isRippleActive: false
}
[RESIZE] 💾 CALLING updateClip (right trim) {
  clipId: "clip-xyz",
  updates: { duration: 5.1, trimOut: 5.1 },
  oldValues: { duration: 5.0, trimOut: 5.0 }
}
[RESIZE]   ✓ updateClip called successfully
[RESIZE] 🔄 CLIP RENDER {
  clipId: "clip-xyz",
  currentState: { startTime: 2.5, duration: 5.1, ... },
  displayDimensions: { left: 250, width: 510 },
  isResizing: "right"
}
```

### Step 4: User Releases Handle

```
[RESIZE] pointerup {
  clipId: "clip-xyz",
  side: "right",
  pointerId: 1
}
[RESIZE] 🧹 useEffect: CLEANUP - removing document event listeners {
  clipId: "clip-xyz",
  side: "right"
}
```

## Failure Patterns to Look For

### ❌ Pattern 1: Effect Not Running

If you see handleResizeStart but NO "useEffect: RESIZE EFFECT SETUP", then:

- `isResizing` state is not being set properly
- `resizeStartRef.current` is null when effect checks it

### ❌ Pattern 2: Effect Runs But No Listeners

If you see "RESIZE EFFECT SETUP" but NO "Document event listeners ATTACHED":

- Check for errors between setup and listener attachment
- Effect might be returning early

### ❌ Pattern 3: No Pointermove Events

If you see listeners attached but NO "📍 pointermove" logs:

- Pointer events are not reaching the document
- Pointer ID mismatch (check the ignored message)
- Pointer capture might be interfering

### ❌ Pattern 4: Pointermove Fires But No updateClip

If you see "📍 pointermove" but NO "💾 CALLING updateClip":

- Check for early returns in the move handler
- resizeStartRef might be null mid-drag

### ❌ Pattern 5: Effect Cleanup During Drag

If you see "🧹 useEffect: CLEANUP" BEFORE pointerup:

- **This is the stale closure bug!**
- Effect is re-running mid-drag
- Check that `clip` is not in dependency array

### ❌ Pattern 6: updateClip Calls But No Visual Update

If you see "💾 CALLING updateClip" and "✓ updateClip called successfully" but NO "🔄 CLIP RENDER":

- Store is not updating state properly
- Component is not subscribed to store changes
- Check timelineStore.updateClip implementation

## Quick Diagnosis

**Problem:** Handle doesn't respond at all **Look for:** ❌ handleResizeStart BLOCKED messages

**Problem:** Handle responds initially then stops **Look for:** Missing "📍 pointermove" logs after first few

**Problem:** Visual updates lag or snap back **Look for:** Multiple "🧹 useEffect: CLEANUP" during single drag operation

**Problem:** Handle moves but clip doesn't **Look for:** "💾 CALLING updateClip" without corresponding "🔄 CLIP RENDER"

## Console Filter

To see only resize logs:

```
[RESIZE]
```

To see specific phases:

- Initialization: `✅ handleResizeStart`
- Effect setup: `🚀 useEffect`
- Move events: `📍 pointermove`
- Store updates: `💾 CALLING updateClip`
- Renders: `🔄 CLIP RENDER`
- Cleanup: `🧹 useEffect: CLEANUP`
