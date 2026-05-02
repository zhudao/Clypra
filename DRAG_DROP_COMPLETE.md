# Drag & Drop Implementation - Complete ✅

## Overview

Clypra now supports drag-and-drop from the operating system (Finder/Explorer) to both the MediaPanel and Timeline. Files are automatically imported and added to the appropriate location.

## Features

### 🎯 Two Drop Zones

1. **MediaPanel** - Imports files to media library
2. **Timeline** - Imports files AND adds them directly to timeline

### ✨ Smart Behavior

- **Position-based detection** - Only the container being hovered shows highlight
- **Duplicate prevention** - Files already imported are reused (not re-imported)
- **Smart track routing** - Audio files go to audio tracks, video/images go to video tracks
- **Auto-positioning** - Files dropped on timeline are placed at the end of existing content

## How It Works

### MediaPanel Drop

```
User drags file from OS
    ↓
Hovers over MediaPanel → Shows cyan highlight
    ↓
Drops file
    ↓
File imported to media library
    ↓
Appears in MediaPanel grid
```

### Timeline Drop

```
User drags file from OS
    ↓
Hovers over Timeline → Shows highlight
    ↓
Drops file
    ↓
File imported to media library (if not already imported)
    ↓
Clip automatically added to timeline at end
    ↓
Appears on appropriate track (audio/video)
```

## Technical Implementation

### Both Components Use:

1. **Tauri Events**
   - `tauri://drag-over` - Mouse position during drag
   - `tauri://drag-drop` - File paths when dropped
   - `tauri://drag-cancelled` - Drag cancelled

2. **Position Detection**
   - `getBoundingClientRect()` to get container bounds
   - Compare mouse position with container bounds
   - Only show hover state when mouse is inside

3. **File Processing**
   - Extract file metadata (duration, dimensions, etc.)
   - Generate poster frames for videos
   - Create asset objects
   - Add to media library

### Timeline-Specific Logic

```typescript
// 1. Import file to media library (if needed)
if (!existingAsset) {
  const metadata = await invoke("get_video_metadata", { path });
  const asset = { id, name, path, type, duration, ... };
  addMediaAsset(asset);
}

// 2. Create clip at end of timeline
const dropTime = getTimelineEndTime();
const newClip = {
  id: `clip-${Date.now()}`,
  trackId: targetTrack.id,
  mediaId: asset.id,
  startTime: dropTime,
  duration: asset.duration,
  ...
};

// 3. Add clip to timeline
addClip(newClip);
```

## Supported File Types

### Video

- `.mp4`, `.mov`, `.avi`, `.mkv`, `.webm`, `.flv`

### Audio

- `.mp3`, `.wav`, `.aac`, `.flac`, `.m4a`

### Images

- All other files (default 5 seconds duration)

## User Experience

### Visual Feedback

| State        | MediaPanel         | Timeline                   |
| ------------ | ------------------ | -------------------------- |
| **Idle**     | Normal             | Normal                     |
| **Hovering** | Cyan highlight     | Subtle highlight           |
| **Dropped**  | Imports to library | Imports + adds to timeline |

### Hover States

- **Cyan ring** - `ring-2 ring-cyan-500/50`
- **Background tint** - `bg-cyan-500/10` (MediaPanel) or `bg-surface-raised/80` (Timeline)
- **Smooth transitions** - `transition-colors duration-300`

## Architecture

```
OS File Drop
    ↓
Tauri Backend (Rust)
    ↓
Tauri Events (Frontend)
    ↓
    ├─→ MediaPanel
    │   ├─ Position check
    │   ├─ Show hover state
    │   └─ Import to library ✅
    │
    └─→ Timeline
        ├─ Position check
        ├─ Show hover state
        ├─ Import to library ✅
        └─ Add to timeline ✅
```

## Key Differences

| Feature              | MediaPanel     | Timeline        |
| -------------------- | -------------- | --------------- |
| **Imports files**    | ✅ Yes         | ✅ Yes          |
| **Adds to timeline** | ❌ No          | ✅ Yes          |
| **Use case**         | Organize media | Quick editing   |
| **Positioning**      | N/A            | End of timeline |

## Files Involved

### Core Implementation

- `src/hooks/useFileDrop.ts` - Reusable hook for MediaPanel
- `src/components/editor/MediaPanel.tsx` - Media library drop zone
- `src/components/editor/timeline/Timeline.tsx` - Timeline drop zone

### Stores

- `src/store/projectStore.ts` - Media asset management
- `src/store/timelineStore.ts` - Clip management

### Types

- `src/types/index.ts` - MediaAsset, Clip, VideoMetadata types

## Testing Checklist

- [x] Drop video on MediaPanel → imports to library
- [x] Drop video on Timeline → imports + adds to timeline
- [x] Drop audio on Timeline → goes to audio track
- [x] Drop image on Timeline → goes to video track (5s duration)
- [x] Hover over MediaPanel → only MediaPanel highlights
- [x] Hover over Timeline → only Timeline highlights
- [x] Drop duplicate file → reuses existing asset
- [x] Multiple files → all processed correctly
- [x] Clips positioned at end of timeline
- [x] No duplicate imports

## Future Enhancements

### Planned Features

1. **Drop Position Awareness**
   - Drop at specific time on timeline (not just at end)
   - Calculate time from mouse X position
   - Snap to grid/beats

2. **Multi-track Drop**
   - Drop on specific track
   - Detect track from mouse Y position

3. **Drag Reordering**
   - Drag clips within timeline
   - Pointer events for internal dragging
   - Snap to other clips

4. **Visual Improvements**
   - Ghost preview while dragging
   - Drop indicator line
   - Animated clip insertion

## Known Limitations

1. **Timeline Drop Position** - Currently drops at end, not at mouse position
2. **Track Selection** - Auto-selects track by type, can't choose specific track
3. **No Undo** - Dropped clips can't be undone (yet)

## Performance Notes

- **Duplicate Prevention** - Checks existing assets before importing
- **Async Processing** - File metadata extraction is async
- **Position Checking** - Efficient rect comparison on every drag-over event
- **No Re-renders** - Uses refs to prevent unnecessary re-renders

## Accessibility

- Visual feedback for drag state
- Console logging for debugging
- Error handling for failed imports
- Type-safe implementation

## Conclusion

The drag-and-drop system provides a professional, intuitive way to import media and build timelines. Both MediaPanel and Timeline support drops, giving users flexibility in their workflow.

**Quick Workflow:**

1. Drag files from Finder/Explorer
2. Drop on Timeline for instant editing
3. Or drop on MediaPanel to organize first

Enjoy seamless media importing! 🎉
