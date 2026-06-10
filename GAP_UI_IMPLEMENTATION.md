# Gap UI Implementation - Phase 3 Complete ✅

**Date:** Implemented  
**Status:** Phase 3 Complete - Gap visualization and interaction features now functional

---

## Overview

Phase 3 of the Gap Data Model implementation adds visual rendering, selection, and keyboard shortcuts for gaps. Gaps are now fully interactive first-class timeline entities.

---

## What Was Built

### 1. GapIndicator Component ✅

**File:** `src/components/editor/timeline/GapIndicator.tsx`

**Features:**

- Visual gap rendering with diagonal stripe pattern
- Click to select gaps
- Double-click to remove (if not protected)
- Right-click context menu with operations
- Hover tooltips showing duration
- Protected gap indicator (lock icon)
- Selected state with accent ring
- Duration labels for gaps > 40px wide

**Styling:**

- Dashed border for visual distinction
- Blue/slate color scheme (selected: accent blue, hover: slate-700, default: slate-800)
- Diagonal stripes on hover/selection
- Small dot indicator for manual/protected gaps when narrow

**Context Menu Options:**

- Remove Gap (with keyboard shortcut hint)
- Protect/Unprotect Gap
- Gap information (duration, start time, type, source)

### 2. Gap Selection in UI Store ✅

**File:** `src/store/uiStore.ts`

**Changes:**

- Added `selectedGapId: string | null` to store state
- Added `selectGap(gapId: string | null)` action
- Gap and clip selection are mutually exclusive
- `clearSelection()` now clears both clips and gaps

**Behavior:**

- Selecting a gap clears clip selection
- Selecting a clip clears gap selection
- Delete key works on both clips and gaps

### 3. Gap Rendering in Track Component ✅

**File:** `src/components/editor/timeline/Track.tsx`

**Changes:**

- Import `GapIndicator` component
- Import `gaps` from timeline store
- Filter gaps by track ID
- Render gaps alongside clips
- Pass selection state to gap indicators
- Respect track locked state

**Integration:**

- Gaps render in their own layer (after clips, before drag preview)
- Gaps use same positioning system as clips
- Gaps respect track visibility and locked states

### 4. Keyboard Shortcuts ✅

**File:** `src/components/editor/timeline/Timeline.tsx`

**New Shortcuts:**

| Key                    | Action     | Description                                            |
| ---------------------- | ---------- | ------------------------------------------------------ |
| `I`                    | Insert Gap | Insert 2-second gap at playhead on selected track      |
| `,` (comma)            | Remove Gap | Remove gap at playhead or selected gap (ripple delete) |
| `Delete` / `Backspace` | Delete     | Delete selected clip(s) or gap                         |

**Smart Behaviors:**

- **Delete key** works on both clips and gaps (checks `selectedGapId` first)
- **I key** inserts gap at current playhead position on selected track (or first track)
- **Comma key** removes:
  - Selected gap (if any)
  - OR gap at playhead position on selected track
  - Only removes unprotected gaps

**Protection:**

- Protected gaps cannot be deleted via keyboard or double-click
- Must be unprotected via context menu first

### 5. Pack Track Button ✅

**File:** `src/components/editor/timeline/TrackList.tsx`

**Features:**

- "Pack Track" button appears on hover when track has unprotected gaps
- Uses `Minimize2` icon
- Calls `packTrackGaps(trackId)` operation
- Removes all unprotected gaps from track
- Protected gaps are preserved
- Shows tooltip: "Pack track - remove all unprotected gaps"

**Visual Design:**

- Only appears when track has unprotected gaps
- Hidden by default, shows on track hover (`group-hover:opacity-100`)
- Consistent with other track header buttons

---

## User Workflows

### Creating Gaps

**Method 1: Keyboard Shortcut**

```
1. Position playhead where you want the gap
2. Press 'I' key
3. 2-second gap inserted, clips shift right
```

**Method 2: Drag Clips Apart**

```
1. Drag clip away from another clip
2. Gap automatically detected and saved
3. Gap entity created with source: "clip-drag"
```

**Method 3: Delete Without Ripple**

```
1. Disable auto-ripple in settings
2. Delete a clip
3. Gap created in its place
```

### Selecting Gaps

**Click Selection:**

- Click on gap to select it
- Gap gets accent ring and shows duration
- Clip selection is cleared automatically

**Keyboard Selection:**

- Navigate timeline with playhead
- Press comma (,) to target gap at playhead

### Removing Gaps

**Method 1: Keyboard (Ripple Delete)**

```
1. Select gap (click or position playhead)
2. Press comma (,) or Delete/Backspace
3. Gap removed, clips shift left
```

**Method 2: Double-Click**

```
1. Double-click on gap
2. Gap removed immediately (if not protected)
```

**Method 3: Context Menu**

```
1. Right-click on gap
2. Select "Remove Gap"
3. Gap removed with ripple
```

**Method 4: Pack Track**

```
1. Hover over track header
2. Click Pack Track button (Minimize2 icon)
3. All unprotected gaps removed
4. Protected gaps remain
```

### Protecting Gaps

**Why Protect?**

- Preserve intentional spacing
- Survive Pack Track operations
- Mark important gaps (e.g., transition space, breathing room)

**How to Protect:**

```
1. Right-click on gap
2. Select "Protect Gap"
3. Lock icon appears on gap
4. Gap cannot be deleted (except via context menu)
```

**Unprotecting:**

```
1. Right-click on protected gap
2. Select "Unprotect Gap"
3. Lock icon disappears
4. Gap can now be deleted
```

---

## Visual Design

### Gap Appearance

**Default State:**

- Background: `rgba(30, 41, 59, 0.3)` (slate-800/30)
- Border: Dashed, `rgba(71, 85, 105, 1)` (slate-600)
- No stripes

**Hover State:**

- Background: `rgba(51, 65, 85, 0.4)` (slate-700/40)
- Border: Dashed, `rgba(100, 116, 139, 1)` (slate-500)
- Diagonal stripes: `rgba(100, 116, 139, 0.1)`
- Duration label appears (if width > 40px)

**Selected State:**

- Background: `rgba(59, 130, 246, 0.2)` (accent/20)
- Border: Solid, `rgba(59, 130, 246, 1)` (accent)
- Diagonal stripes: `rgba(59, 130, 246, 0.1)`
- Accent ring: 2px inset
- Duration label visible

**Protected Indicator:**

- Lock icon in top-left corner
- Color: `rgba(250, 204, 21, 0.7)` (yellow-400, 70% opacity)
- Size: 12px
- Always visible

**Duration Label:**

- Format: `MM:SS:FF` (minutes:seconds:frames @ 30fps)
- Examples: `2:15` (2.5 sec), `10:00` (10 sec), `1:30:15` (90.5 sec)
- Background: `rgba(0, 0, 0, 0.6)` with rounded corners
- Font: Monospace, 12px
- Shown on hover or selection (if width > 40px)

### Context Menu

**Menu Items:**

1. Remove Gap (Trash2 icon, comma shortcut hint)
   - Disabled if gap is protected
2. Protect/Unprotect Gap (Lock icon)
   - Text changes based on current state
3. Divider
4. Gap Info Section (muted text):
   - Duration
   - Start time
   - Type (manual/auto/protected)
   - Source (if not unknown)

**Positioning:**

- Fixed position at cursor location
- Z-index: 9999 (above all timeline elements)
- Min width: 160px
- Dark theme styling

---

## Integration Points

### Timeline Store

**Consumed Operations:**

- `insertGap(trackId, startTime, duration)` - Insert new gap
- `removeGap(gapId)` - Remove gap (ripple delete)
- `toggleGapProtection(gapId)` - Protect/unprotect gap
- `packTrackGaps(trackId)` - Remove all unprotected gaps
- `gaps: Gap[]` - Array of all gaps (read-only)

### UI Store

**Consumed State:**

- `selectedGapId: string | null` - Currently selected gap
- `selectedClipIds: string[]` - Currently selected clips (mutually exclusive)

**Consumed Actions:**

- `selectGap(gapId)` - Select a gap (clears clip selection)
- `selectClip(clipId)` - Select a clip (clears gap selection)
- `clearSelection()` - Clear both clip and gap selection

### Playback Store

**Consumed State:**

- `currentTime: number` - Playhead position (for insert gap, remove gap at playhead)

---

## Technical Implementation Notes

### Gap Rendering Order

```
Timeline
└─ Track
   ├─ Clips Layer (z-0 to z-10)
   ├─ Gaps Layer (z-0 to z-10)  ← GapIndicators render here
   └─ Drag Preview Layer (z-5, blue dashed)
```

- Gaps and clips share the same z-index range
- Selected items get z-10
- Hovered items get z-5
- Default items get z-0

### Selection Exclusivity

**Problem:** Users should not be able to select clips and gaps simultaneously (different interaction models).

**Solution:** Mutual exclusion in UI store:

- `selectGap()` clears `selectedClipIds`
- `selectClip()` clears `selectedGapId`
- Only one type can be selected at a time

**Future Enhancement:** Allow multi-select of same type (multiple gaps OR multiple clips).

### Keyboard Event Handling

**Event Filtering:**

- Ignore keyboard shortcuts when typing in inputs/textareas
- Check `target.tagName` and `target.isContentEditable`

**Execution Order:**

1. Check if in input/textarea → ignore
2. Check for gap selection → handle gap operations first
3. Check for clip selection → handle clip operations
4. Otherwise → no-op

### Protected Gap Behavior

**Cannot Delete Protected Gaps Via:**

- Delete/Backspace keys
- Double-click
- Comma (,) shortcut
- Pack Track button

**Can Delete Protected Gaps Via:**

- Context menu "Remove Gap" (always works)
- Direct store method call (programmatic)

**Why?** User intent is clear in context menu (deliberate action), but ambiguous in keyboard shortcuts (might be accidental).

---

## Testing Checklist

### Visual Rendering

- [x] Gaps render with diagonal stripes
- [x] Gaps show duration label on hover (width > 40px)
- [x] Protected gaps show lock icon
- [x] Selected gaps show accent ring
- [x] Gap color changes on hover

### Selection

- [x] Click gap to select
- [x] Selecting gap clears clip selection
- [x] Selecting clip clears gap selection
- [x] Selected gap shows accent styling

### Keyboard Shortcuts

- [x] I key inserts gap at playhead
- [x] Comma key removes gap at playhead
- [x] Comma key removes selected gap
- [x] Delete key removes selected gap
- [x] Protected gaps cannot be deleted via keyboard

### Context Menu

- [x] Right-click shows context menu
- [x] "Remove Gap" works (if not protected)
- [x] "Protect Gap" toggles protection
- [x] Gap info shows correct values
- [x] Menu closes on outside click

### Pack Track

- [x] Button appears when track has gaps
- [x] Button only visible on hover
- [x] Removes all unprotected gaps
- [x] Preserves protected gaps
- [x] Clips pack tightly after operation

### Edge Cases

- [x] Gap too narrow (< 40px) shows dot instead of label
- [x] Protected gap cannot be double-clicked to remove
- [x] Locked track disables gap interaction
- [x] No gaps → Pack Track button hidden

---

## Performance Considerations

### Rendering Optimization

**Memoization:**

- `trackGaps` filtered and memoized per track
- Only recalculates when `gaps` or `track.id` changes

**Component Count:**

- Each track renders N gap indicators (where N = gap count)
- Typical timeline: 5-10 tracks, 0-20 gaps per track
- Total: 0-200 gap components (acceptable)

**Heavy Operations:**

- Context menu only rendered when visible (conditional render)
- Diagonal stripes use CSS gradients (GPU accelerated)
- No animation or transitions on gaps (performance priority)

### Selection Performance

**Single Selection:**

- O(1) lookup for `selectedGapId` (direct ID comparison)
- No array iteration required

**Multi-selection (Future):**

- Would use `selectedGapIds: Set<string>` for O(1) lookups
- Array.includes() would be O(n) and too slow

---

## Known Limitations

### Current Phase 3 Limitations

1. **No Gap Resize:**
   - Gaps cannot be resized by dragging handles
   - Must use remove + insert to change duration
   - **Planned:** Phase 4 will add resize handles

2. **No Gap Drag:**
   - Gaps cannot be moved by dragging
   - Position is determined by surrounding clips
   - **Not planned:** Gaps are space, not movable objects

3. **No Multi-Select:**
   - Can only select one gap at a time
   - Cannot bulk-delete multiple gaps
   - **Planned:** Phase 4 will add multi-select

4. **Fixed Insert Duration:**
   - I key always inserts 2-second gap
   - No duration picker dialog
   - **Planned:** Phase 4 will add duration input

5. **No Gap Notes:**
   - Cannot add custom labels/notes to gaps
   - Only type and source metadata
   - **Planned:** Phase 5+ will add annotations

### Design Decisions

**Why No Gap Drag?**

- Gaps represent absence of content, not content itself
- Moving a gap is equivalent to moving the clips around it
- Clips should be moved, not gaps
- Matches professional NLE behavior (Premiere, Resolve, FCP)

**Why No Gap Animations?**

- Timeline performance is critical (60fps scrolling)
- Gaps are numerous (could be 50+ on screen)
- CSS transitions would cause jank
- Professional NLEs don't animate gaps either

---

## API Reference

### GapIndicator Component

```typescript
interface GapIndicatorProps {
  gap: Gap; // Gap entity to render
  pixelsPerSecond: number; // Timeline zoom scale
  selected?: boolean; // Whether gap is selected
  locked?: boolean; // Whether track is locked
}
```

**Example Usage:**

```tsx
<GapIndicator gap={gap} pixelsPerSecond={100} selected={selectedGapId === gap.id} locked={track.locked} />
```

### UI Store Actions

```typescript
// Select a gap (clears clip selection)
selectGap(gapId: string | null): void;

// Clear all selection (clips and gaps)
clearSelection(): void;
```

**Example Usage:**

```typescript
const { selectGap, clearSelection } = useUIStore();

// Select gap on click
const handleGapClick = () => {
  selectGap(gap.id);
};

// Clear selection on timeline background click
const handleBackgroundClick = () => {
  clearSelection();
};
```

### Keyboard Shortcuts

```typescript
// Insert gap at playhead
window.addEventListener("keydown", (e) => {
  if (e.key === "i" || e.key === "I") {
    insertGap(selectedTrackId, currentTime, 2.0);
  }
});

// Remove gap at playhead or selected gap
window.addEventListener("keydown", (e) => {
  if (e.key === ",") {
    if (selectedGapId) {
      removeGap(selectedGapId);
    } else {
      // Find gap at playhead
      const gap = findGapAtPlayhead(selectedTrackId, currentTime);
      if (gap) removeGap(gap.id);
    }
  }
});
```

---

## Next Steps - Phase 4

### Planned Features

1. **Gap Resize Handles**
   - Drag left/right edges to change duration
   - Shift downstream clips (ripple)
   - Snap to grid/other clips
   - ResizeGapCommand for undo/redo

2. **Duration Input Dialog**
   - I key opens duration picker
   - Input in seconds or timecode format
   - Preview gap before confirming
   - Remember last used duration

3. **Gap Multi-Select**
   - Shift+Click to select multiple gaps
   - Bulk operations (delete, protect, etc.)
   - Visual selection feedback
   - Keyboard navigation (Tab, Shift+Tab)

4. **Gap Info Panel**
   - Show gap details in Properties panel
   - Edit gap metadata (notes, type, etc.)
   - Gap history (when created, by what operation)
   - Gap statistics (total duration, count, etc.)

5. **Advanced Operations**
   - Distribute Gaps Evenly
   - Align Gaps to Grid
   - Convert Gap to Clip (placeholder/slug)
   - Gap Templates (saved gap configurations)

### Estimated Effort

- Gap Resize Handles: 3-4 days
- Duration Input Dialog: 2 days
- Gap Multi-Select: 2-3 days
- Gap Info Panel: 2 days
- Advanced Operations: 3-5 days

**Total:** 12-18 days for Phase 4

---

## Conclusion

Phase 3 is complete! Gaps are now fully visible and interactive first-class timeline entities. Users can:

✅ See gaps with visual distinction  
✅ Select gaps by clicking  
✅ Remove gaps via keyboard shortcuts  
✅ Protect important gaps  
✅ Pack tracks to remove gaps  
✅ View gap metadata

The Gap Data Model implementation is now functional for core editing workflows. Phase 4 will add advanced interaction features like resizing and multi-select.

---

**Files Modified:**

- `src/components/editor/timeline/GapIndicator.tsx` (NEW - 212 lines)
- `src/store/uiStore.ts` (MODIFIED - added gap selection)
- `src/components/editor/timeline/Track.tsx` (MODIFIED - render gaps)
- `src/components/editor/timeline/Timeline.tsx` (MODIFIED - keyboard shortcuts)
- `src/components/editor/timeline/TrackList.tsx` (MODIFIED - Pack Track button)

**Lines Added:** ~320 lines  
**Features Added:** 5 major features  
**User-Facing Changes:** Visible gaps, gap selection, 3 keyboard shortcuts, Pack Track button
