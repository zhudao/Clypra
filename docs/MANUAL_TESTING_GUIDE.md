# Clypra Manual Testing Guide - Complete End-to-End Testing

## Prerequisites

- Ensure FFmpeg is installed on your system
- Have test media files ready:
  - Video files: MP4, MOV, WebM, MKV, M4V, AVI
  - Audio files: MP3, WAV, AAC
  - Image files: JPG, PNG, WebP
- Ensure `.env` file is configured with `VITE_CLYPRA_API_KEY`

## Starting the Application

```bash
# Start the development server
npm run tauri dev
```

---

## 1. Launch Screen & Project Setup

### Test Cases:

- [ ] **Launch Screen Display**
  - Application opens with Launch Screen
  - "New Project" button is visible
  - "Open Project" button is visible
  - Recent projects list displays (if any exist)

- [ ] **Create New Project**
  - Click "New Project"
  - Should navigate to main editor interface
  - Timeline should be empty
  - Media panel should show "Import Media" prompt

- [ ] **Open Existing Project**
  - Click "Open Project"
  - File picker dialog opens
  - Navigate to a `.clypra` project file
  - Project loads with all previous clips and settings

---

## 2. Media Import & Management

### Test Cases:

- [ ] **Import Video Files**
  - Click "Import Media" or drag-and-drop
  - Select multiple video files (MP4, MOV, WebM, MKV, M4V, AVI)
  - Files appear in media library with thumbnails
  - Verify duration display is correct

- [ ] **Import Audio Files**
  - Import audio files (MP3, WAV, AAC)
  - Audio files show waveform icon
  - Duration displays correctly

- [ ] **Import Image Files**
  - Import images (JPG, PNG, WebP)
  - Images display as thumbnails
  - Default duration should be applied

- [ ] **Drag & Drop Import**
  - Drag files from file explorer into the media panel
  - Files import successfully
  - Multiple files can be dropped at once

- [ ] **Media Library Navigation**
  - Scroll through imported media
  - Click on media items to preview
  - Right-click options (if available)

---

## 3. Timeline Operations

### Test Cases:

- [ ] **Add Clips to Timeline**
  - Drag video from media library to timeline
  - Clip appears on video track
  - Drag audio to timeline
  - Audio appears on audio track
  - Drag image to timeline
  - Image appears as video clip

- [ ] **Multi-Track Timeline**
  - Add multiple clips to different tracks
  - Verify tracks are properly labeled
  - Clips on different tracks don't interfere

- [ ] **Clip Positioning**
  - Drag clips left/right on timeline
  - Clips snap to other clips (if snap enabled)
  - Drop clips at specific timestamps
  - Verify position updates in properties panel

- [ ] **Clip Trimming**
  - Hover over clip edge until resize cursor appears
  - Drag left edge to adjust start time
  - Drag right edge to adjust end time
  - Verify trimmed content updates in preview

- [ ] **Clip Selection**
  - Click on clip to select
  - Selected clip shows highlight/border
  - Properties panel updates with clip details
  - Click empty space to deselect

- [ ] **Multi-Clip Selection**
  - Hold Shift/Cmd and click multiple clips
  - All selected clips highlight
  - Delete/move operations affect all selected

- [ ] **Copy/Paste Clips**
  - Select clip
  - Cmd/Ctrl+C to copy
  - Move playhead to new position
  - Cmd/Ctrl+V to paste
  - Duplicate appears at playhead position

- [ ] **Delete Clips**
  - Select clip
  - Press Delete/Backspace key
  - Clip removes from timeline
  - Or right-click → Delete

---

## 4. Timeline Navigation & Zoom

### Test Cases:

- [ ] **Playhead Movement**
  - Click anywhere on timeline ruler
  - Playhead jumps to clicked position
  - Preview updates to show frame at playhead

- [ ] **Zoom Controls**
  - Use Cmd/Ctrl+Scroll to zoom in/out
  - Timeline magnification changes
  - Ruler time markers adjust accordingly
  - Use trackpad pinch gesture to zoom
  - Zoom level indicator updates

- [ ] **Timeline Scrolling**
  - Scroll horizontally through timeline
  - Playhead stays in view (if auto-scroll enabled)
  - Clips outside viewport can be accessed

- [ ] **Ruler & Time Markers**
  - Verify time markers show correct timestamps
  - Frame numbers or timecode visible
  - Major/minor tick marks display properly

---

## 5. Video Playback & Preview

### Test Cases:

- [ ] **Play/Pause**
  - Click Play button
  - Video plays from playhead position
  - Press Space bar to play/pause
  - Playhead moves along timeline during playback
  - Click Pause to stop

- [ ] **Scrubbing**
  - Drag playhead along timeline
  - Preview updates in real-time
  - Frame-accurate scrubbing

- [ ] **Playback Speed**
  - Normal speed plays correctly
  - Audio syncs with video
  - All tracks play simultaneously

- [ ] **Preview Quality**
  - Video renders clearly in preview panel
  - No visible artifacts or glitches
  - Aspect ratio maintained

- [ ] **Multi-Track Playback**
  - Add clips on multiple video tracks
  - Upper tracks overlay lower tracks correctly
  - Audio from all tracks mixes together

---

## 6. Audio Features

### Test Cases:

- [ ] **Audio Waveform Display**
  - Audio clips show waveform visualization
  - Waveform matches actual audio content
  - Waveform updates when clip is trimmed

- [ ] **Audio Waveform Generation**
  - Import new audio file
  - Waveform generates automatically
  - Loading indicator shows during generation

- [ ] **Audio Volume Control**
  - Select audio clip
  - Adjust volume slider in properties panel
  - Playback volume changes accordingly
  - Verify volume level indicator

- [ ] **Audio Mute/Unmute**
  - Toggle mute button on audio track
  - Audio stops playing when muted
  - Visual indicator shows muted state

- [ ] **Audio Library Feature**
  - Open Audio Library panel (if available)
  - Browse available audio tracks
  - Search/filter audio
  - Preview audio before adding
  - Add audio from library to timeline

---

## 7. Text & Titles

### Test Cases:

- [ ] **Add Text Clip**
  - Click "Add Text" or similar button
  - Text clip appears on timeline
  - Default text shows in preview ("Your Text Here")
  - Text clip is editable

- [ ] **Edit Text Content**
  - Select text clip
  - Properties panel shows text editor
  - Type new text content
  - Preview updates in real-time

- [ ] **Text Formatting**
  - Change font family
  - Available fonts load correctly
  - Preview shows font change immediately
  - Adjust font size (slider or input)
  - Change text color (color picker)
  - Apply bold/italic/underline (if available)

- [ ] **Text Positioning**
  - Drag text in preview panel
  - Text moves to new position
  - Position coordinates update
  - Use alignment buttons (left, center, right)

- [ ] **Text Effects**
  - Open Text Effects panel
  - Browse available effects
  - Preview effects before applying
  - Apply effect to text clip
  - Effect renders correctly in preview
  - Test multiple effects: fade, glow, shadow, outline, etc.

- [ ] **Text Templates**
  - Open Text Templates panel
  - Browse template categories
  - Preview template animation
  - Apply template to timeline
  - Template appears with default text
  - Customize template text
  - Animation plays correctly

- [ ] **Text Animation**
  - Apply entrance animation
  - Apply exit animation
  - Adjust animation duration
  - Preview animations during playback
  - Test different animation types (fade, slide, scale, zoom)
  - Test different easing functions (linear, ease-in, ease-out, ease-in-out)
  - Verify animations work in exported video

### Detailed Text Animation Testing:

- [ ] **Entrance Animations - Basic**
  - Add text clip to timeline
  - Select text clip → Properties Panel → Animation tab
  - Apply "Fade In" entrance animation (default 0.5s)
  - Play from clip start
  - **Expected**: Text fades in from transparent to opaque over 0.5 seconds
  - Apply "Slide Up" entrance animation
  - **Expected**: Text slides up from below and fades in simultaneously
  - Apply "Slide Down" entrance animation
  - **Expected**: Text slides down from above and fades in
  - Apply "Slide Left" entrance animation
  - **Expected**: Text slides in from right side
  - Apply "Slide Right" entrance animation
  - **Expected**: Text slides in from left side

- [ ] **Entrance Animations - Advanced**
  - Apply "Scale" entrance animation
  - **Expected**: Text grows from 50% to 100% size while fading in
  - Apply "Zoom In" entrance animation
  - **Expected**: Text appears and zooms inward (1.0 to 1.5 scale)
  - Apply "Zoom Out" entrance animation
  - **Expected**: Text shrinks outward while fading in

- [ ] **Exit Animations - Basic**
  - Set clip duration to 5 seconds
  - Apply "Fade Out" exit animation (default 0.5s)
  - Seek to 4.5 seconds and play
  - **Expected**: Text fades out during last 0.5 seconds
  - Apply "Slide Up" exit animation
  - **Expected**: Text slides up and fades out
  - Apply "Slide Down" exit animation
  - **Expected**: Text slides down and fades out

- [ ] **Combined Entrance + Exit**
  - Set entrance: "Slide Up"
  - Set exit: "Slide Down"
  - Play entire clip duration
  - **Expected**: Text slides up at start, stays visible, slides down at end
  - Try different combinations:
    - Entrance: "Fade In" + Exit: "Zoom Out"
    - Entrance: "Scale" + Exit: "Fade Out"
    - Entrance: "Zoom In" + Exit: "Scale"

- [ ] **Duration Adjustment**
  - Apply "Fade In" entrance animation
  - Change duration from 0.5s to 1.0s
  - Play clip
  - **Expected**: Fade in takes 1 full second
  - Change duration to 0.2s
  - **Expected**: Very quick fade in
  - Try to set duration > clip.duration/2
  - **Expected**: Duration is clamped to maximum allowed (clip.duration/2)

- [ ] **Easing Functions**
  - Apply "Scale" entrance animation
  - Set easing to "Linear"
  - Play clip
  - **Expected**: Constant speed scaling
  - Set easing to "Ease In"
  - **Expected**: Starts slow, accelerates
  - Set easing to "Ease Out"
  - **Expected**: Starts fast, decelerates smoothly
  - Set easing to "Ease In-Out"
  - **Expected**: Slow start and end, fast middle

- [ ] **Animation with Transforms**
  - Add text clip with entrance animation
  - Move text position in preview (Transform Overlay)
  - Play clip
  - **Expected**: Animation applies relative to new position
  - Rotate text 45 degrees
  - Play clip
  - **Expected**: Rotated text still animates correctly
  - Scale text to 150%
  - Play clip
  - **Expected**: Larger text animates proportionally

- [ ] **Animation with Text Effects**
  - Apply text effect (e.g., "Neon Crimson")
  - Add entrance animation "Fade In"
  - Play clip
  - **Expected**: Text effect fades in with animation
  - Try with stroke effects
  - Try with shadow effects
  - Try with background panel effects
  - **Expected**: All effects animate together

- [ ] **Multiple Text Clips with Different Animations**
  - Add 3 text clips to timeline
  - Clip 1: Entrance "Fade In", Exit "Fade Out"
  - Clip 2: Entrance "Slide Up", Exit "Slide Down"
  - Clip 3: Entrance "Zoom In", Exit "Zoom Out"
  - Play entire sequence
  - **Expected**: Each clip animates independently and correctly

- [ ] **Animation State Persistence**
  - Add text clip with animations
  - Save project
  - Close and reopen project
  - Select text clip → Animation tab
  - **Expected**: Animation settings are preserved
  - Play clip
  - **Expected**: Animations play correctly after reload

- [ ] **Export with Animations**
  - Create timeline with multiple text clips with different animations
  - Export to MP4 (1080p, H.264)
  - Export completes successfully
  - Open exported video in media player
  - **Expected**: All text animations render correctly in exported video
  - Text fades in/out at correct times
  - Slide animations are smooth
  - Scale/zoom animations are smooth

- [ ] **Animation Edge Cases**
  - Create very short text clip (0.5 seconds)
  - Try to apply 0.5s entrance and 0.5s exit
  - **Expected**: Durations are clamped to prevent overlap
  - Create very long text clip (60 seconds)
  - Apply animations with various durations
  - **Expected**: Animations work correctly on long clips
  - Apply "None" entrance and exit
  - **Expected**: Text appears/disappears instantly (no animation)

- [ ] **Animation Performance**
  - Add 10 text clips with different animations to timeline
  - Play entire sequence
  - **Expected**: Smooth playback, no frame drops
  - Monitor CPU usage
  - **Expected**: No significant performance degradation
  - Export project with 10 animated text clips
  - **Expected**: Export completes without errors

- [ ] **Animation UI Responsiveness**
  - Select text clip
  - Open Animation tab
  - Change animation type
  - **Expected**: Preview updates immediately
  - Adjust duration slider
  - **Expected**: Real-time update
  - Change easing
  - **Expected**: No lag or UI freezing

---

## 8. Stickers & Graphics

### Test Cases:

- [ ] **Stickers Library**
  - Open Stickers panel
  - Browse available stickers
  - Categories/tags display correctly
  - Search for specific stickers

- [ ] **Add Sticker to Timeline**
  - Drag sticker from library to timeline
  - Sticker appears on dedicated track
  - Sticker renders in preview

- [ ] **Sticker Positioning & Size**
  - Drag sticker in preview to reposition
  - Resize sticker using corner handles
  - Maintain aspect ratio when resizing
  - Rotate sticker (if available)

- [ ] **Sticker Timing**
  - Adjust sticker start/end time on timeline
  - Sticker appears/disappears at correct times
  - Trim sticker duration

---

## 9. Subtitles & Captions

### Test Cases:

- [ ] **Import Subtitle File**
  - Import SRT subtitle file
  - Subtitles parse correctly
  - Subtitle clips appear on timeline
  - Subtitle track is created

- [ ] **Manual Subtitle Creation**
  - Add subtitle clip manually
  - Set start and end time
  - Type subtitle text
  - Subtitle displays at correct time

- [ ] **Subtitle Styling**
  - Change subtitle font
  - Adjust font size
  - Change text color
  - Add background/outline
  - Change subtitle position

- [ ] **Subtitle Timing Adjustment**
  - Trim subtitle clips on timeline
  - Adjust timing to match audio
  - Verify sync with spoken words

---

## 10. Video Effects (NEW - API Integration)

### Prerequisites:

- Ensure `.env` file contains `VITE_CLYPRA_API_KEY`
- API endpoint should be accessible: https://clypra-worker-api.abdulkabirmusa.com
- Internet connection required for fetching effects

### Test Cases:

#### 10.1 Video Effects Panel Access

- [ ] **Open Video Effects Panel**
  - Select a video clip on timeline
  - Video effects panel should be accessible (check UI for effects button/tab)
  - Panel opens without errors
  - Shows three tabs: Effects, Overlays, Transitions

- [ ] **Effects Panel UI**
  - Panel displays with consistent design (matches Text/Stickers tabs)
  - Three tabs visible at top: Effects, Overlays, Transitions
  - Selection hint shows: "Select a clip to apply effects"
  - When clip selected, hint shows selected clip count

#### 10.2 Effects Tab Testing

- [ ] **Effects Categories**
  - Category pills display at top: All, Essentials, Color, Light, Stylize, Distort, Blur, Time
  - Categories scroll horizontally with fade gradients
  - Click different categories to filter effects
  - "All" category shows all effects

- [ ] **Effects Grid Display**
  - Effects display in 3-column grid layout
  - Each effect card shows:
    - Thumbnail (or placeholder emoji if no thumbnail)
    - Effect name on hover
    - Premium badge (sparkle icon) for premium effects
    - Strength/intensity indicator (if applicable)
  - Hover effects work (border highlight, name overlay)

- [ ] **Effects Search**
  - Search bar at top of effects list
  - Type effect name (e.g., "blur")
  - Results filter in real-time
  - Clear search shows all effects again

- [ ] **Effects Loading States**
  - When first opening effects panel, loading indicator shows
  - "Loading effects..." message displays
  - After load, effects appear in grid
  - No loading on subsequent category switches (cached)

- [ ] **Apply Effect to Clip**
  - Select video clip on timeline
  - Click on effect card in grid
  - Effect applies to selected clip
  - Preview updates showing effect applied
  - Properties panel shows effect settings (if available)

- [ ] **Effect Categories - Detailed Testing**
  - **Essentials**: Test blur, sharpen, vignette effects
  - **Color**: Test color filters (warm, cool, vibrant)
  - **Light**: Test glow, light leak effects
  - **Stylize**: Test film grain, chromatic aberration
  - **Distort**: Test lens warp, pixelate effects
  - **Vintage**: Test sepia, retro, aged filters
  - **Modern**: Test crisp, vivid, cool filters
  - **Cinematic**: Test bleach, moody, teal filters
  - **B&W**: Test classic black & white filters

- [ ] **Premium Effects**
  - Premium effects show sparkle badge
  - Click premium effect
  - Shows upgrade prompt or applies (depending on subscription)
  - Free effects work without restrictions

#### 10.3 Overlays Tab Testing

- [ ] **Overlay Categories**
  - Category pills: All, Particles, Light Leaks, Bokeh, Film, Weather, Abstract
  - Categories scroll horizontally
  - Click categories to filter overlays

- [ ] **Overlay Grid Display**
  - Overlays in 3-column grid
  - Each overlay card shows:
    - Thumbnail preview
    - Duration badge (e.g., "2.5s")
    - File size badge (e.g., "3.2MB")
    - Premium badge for paid overlays
    - Play icon on hover
  - Hover shows preview animation (if available)

- [ ] **Overlay Search**
  - Search bar filters overlays
  - Search by name or tags
  - Results update instantly

- [ ] **Apply Overlay to Clip**
  - Select video clip
  - Click overlay card
  - Overlay downloads (if not cached)
  - Loading indicator during download
  - Overlay applies as layer on video
  - Preview shows overlay blended with video

- [ ] **Overlay Properties**
  - After applying overlay, properties show:
    - Opacity/blend mode controls
    - Position controls
    - Scale controls
    - Timing adjustment (start/end time)
  - Adjust properties and verify preview updates

- [ ] **Multiple Overlays**
  - Apply multiple overlays to same clip
  - Overlays stack correctly
  - Each overlay independently controllable
  - Remove individual overlays

#### 10.4 Transitions Tab Testing

- [ ] **Transition Categories**
  - Category pills: All, Fade, Slide, Wipe, Zoom, Dissolve, Creative
  - Categories filter transitions correctly

- [ ] **Transition Grid Display**
  - Transitions in 3-column grid
  - Each card shows:
    - Thumbnail or icon (fade 🌅, slide ↔️, zoom 🔍, etc.)
    - Transition name
    - Duration badge (e.g., "0.5s")
    - Premium badge
    - Easing type (if applicable)
  - Gradient background for transition cards

- [ ] **Transition Search**
  - Search filters transitions by name
  - Search by category tags

- [ ] **Apply Transition Between Clips**
  - Place two video clips adjacent on timeline
  - Select gap/junction between clips (or select both clips)
  - Click transition card
  - Transition applies between clips
  - Preview shows smooth transition effect

- [ ] **Transition Duration**
  - Adjust transition duration
  - Drag transition edges on timeline to adjust
  - Or use duration input in properties
  - Preview updates with new duration

- [ ] **Transition Types Testing**
  - **Fade**: Cross-fade between clips
  - **Slide**: Slide transitions (up, down, left, right)
  - **Wipe**: Wipe transitions
  - **Zoom**: Zoom in/out transitions
  - **Dissolve**: Dissolve effects
  - **Creative**: Special creative transitions
  - All transitions render smoothly

- [ ] **Transition Easing**
  - Properties show easing options (if available)
  - Linear, ease-in, ease-out, ease-in-out
  - Change easing and verify smooth motion

#### 10.5 Effect API Integration Testing

- [ ] **API Connection**
  - Open browser DevTools console
  - Open effects panel
  - Check Network tab for API requests
  - Verify requests to: `https://clypra-worker-api.abdulkabirmusa.com`
  - API key included in request headers: `X-API-Key`
  - Requests return 200 status code

- [ ] **API Authentication**
  - Effects load successfully with valid API key
  - Check console for authentication errors
  - If API key missing/invalid, appropriate error shows

- [ ] **API Caching**
  - First load fetches from API
  - Subsequent loads use cache (check Network tab)
  - Cache improves performance
  - No redundant API calls

- [ ] **API Error Handling**
  - Disconnect internet
  - Try to load effects
  - Error message displays: "Failed to load effects"
  - Reconnect internet
  - Retry loading effects
  - Effects load successfully

- [ ] **Rate Limiting**
  - API has rate limit: 100 requests/minute
  - Normal usage doesn't hit limit
  - If limit hit, error message shows with retry time

#### 10.6 Effect Persistence & Export

- [ ] **Effect Persistence in Project**
  - Apply effects to clips
  - Save project
  - Close and reopen project
  - Effects are preserved
  - Effects settings retained

- [ ] **Effect Export**
  - Create timeline with various effects applied
  - Export to MP4
  - Export completes successfully
  - Open exported video
  - Effects render correctly in exported file
  - Quality matches preview

- [ ] **Multiple Effects Export**
  - Clip with effect + overlay + transition
  - Export video
  - All effects render correctly
  - No visual glitches
  - Proper blending and compositing

#### 10.7 Performance Testing

- [ ] **Effect Application Performance**
  - Apply effect to clip
  - Effect applies instantly (< 100ms)
  - No UI freezing
  - Preview updates smoothly

- [ ] **Multiple Effects Performance**
  - Apply 5+ effects to single clip
  - Playback remains smooth
  - No frame drops
  - Scrubbing responsive

- [ ] **Effect Rendering Performance**
  - Add 10 clips with various effects
  - Play timeline
  - Monitor CPU/GPU usage
  - Playback smooth at target frame rate
  - Export doesn't crash or freeze

#### 10.8 Effect Edge Cases

- [ ] **No Clip Selected**
  - Open effects panel with no clip selected
  - Shows message: "Select a clip to apply effects"
  - Clicking effects does nothing (graceful handling)

- [ ] **Invalid Clip Type**
  - Select audio clip
  - Try to apply video effect
  - Appropriate error or disabled state

- [ ] **Missing Thumbnail**
  - Effects without thumbnails show placeholder emoji
  - Still clickable and functional

- [ ] **Long Effect Names**
  - Effect names truncate properly
  - Full name visible on hover
  - No layout breaking

- [ ] **Empty Categories**
  - If category has no effects
  - Shows "No effects found" message
  - No crashes or blank screens

#### 10.9 Effect Removal & Reset

- [ ] **Remove Effect from Clip**
  - Apply effect to clip
  - Find "Remove Effect" or "Reset" button
  - Click to remove
  - Clip returns to original state
  - Preview updates

- [ ] **Undo Effect Application**
  - Apply effect
  - Press Cmd/Ctrl+Z
  - Effect unapplied
  - Can redo with Cmd/Ctrl+Shift+Z

---

## 11. Transform & Effects

### Test Cases:

- [ ] **Clip Transform Controls**
  - Select video/image clip
  - Transform panel shows in properties
  - Adjust position (X, Y coordinates)
  - Adjust scale (width, height)
  - Maintain aspect ratio toggle
  - Rotate clip (angle input or dial)

- [ ] **Visual Transform in Preview**
  - Drag clip in preview to reposition
  - Preview shows bounding box with handles
  - Corner handles resize clip
  - Rotation handle rotates clip
  - Transform values update in properties

- [ ] **Crop & Fit**
  - Crop clip to specific dimensions
  - Fit to frame options
  - Fill, Fit, Stretch modes
  - Preview shows crop boundaries

---

## 12. Export & Rendering

### Test Cases:

- [ ] **Export Dialog**
  - Click "Export" button
  - Export dialog opens
  - Shows export settings panel
  - Displays estimated file size/duration

- [ ] **Export Presets**
  - Browse available presets (YouTube, Instagram, Twitter, etc.)
  - Select preset
  - Settings auto-populate
  - Custom preset option available

- [ ] **Export Settings**
  - Choose output format (MP4, MOV, WebM)
  - Select resolution (720p, 1080p, 4K)
  - Adjust frame rate (24, 30, 60 fps)
  - Set video codec (H.264, H.265)
  - Set audio codec (AAC, MP3)
  - Adjust bitrate/quality

- [ ] **Export Destination**
  - Click "Choose destination"
  - File picker opens
  - Select output folder and filename
  - Path displays in dialog

- [ ] **Export Process**
  - Click "Start Export"
  - Progress bar appears
  - Percentage and ETA display
  - Can cancel export mid-process
  - Completion notification shows
  - Exported file exists at destination

- [ ] **Export Quality Check**
  - Open exported video in media player
  - Verify all clips are present
  - Check audio sync
  - Verify text/effects render correctly
  - Check resolution and quality

- [ ] **Export Frame (Screenshot)**
  - Position playhead at desired frame
  - Click "Export Frame" or similar
  - Choose image format (PNG, JPG)
  - Frame exports successfully
  - Image matches preview

---

## 13. Project Management

### Test Cases:

- [ ] **Save Project**
  - Click "Save" or Cmd/Ctrl+S
  - File picker opens (first save)
  - Choose filename and location
  - `.clypra` project file is created
  - Subsequent saves are automatic

- [ ] **Auto-Save**
  - Make changes to project
  - Wait for auto-save interval
  - Project saves automatically
  - Visual indicator shows save status

- [ ] **Open Project**
  - Close current project
  - Open saved `.clypra` file
  - All media files load correctly
  - Timeline structure restored
  - All clips and effects preserved
  - Playhead position restored

- [ ] **Project Properties**
  - View project settings
  - Project name, resolution, frame rate
  - Creation/modification date
  - Project duration

- [ ] **Recent Projects**
  - Return to launch screen
  - Recent projects list displays
  - Click recent project to open
  - Invalid/moved projects handled gracefully

---

## 14. Undo/Redo System

### Test Cases:

- [ ] **Undo Operations**
  - Make change (add clip, move clip, etc.)
  - Press Cmd/Ctrl+Z
  - Change reverts
  - Previous state restored
  - Test undo for all operation types

- [ ] **Redo Operations**
  - Undo an operation
  - Press Cmd/Ctrl+Shift+Z or Cmd/Ctrl+Y
  - Change re-applies
  - State moves forward

- [ ] **Undo History Depth**
  - Perform 100+ operations
  - Verify undo works for all tracked operations
  - History limit respected (100 levels)

- [ ] **Undo Different Operation Types**
  - Add/delete clips
  - Move clips
  - Trim clips
  - Text edits
  - Transform changes
  - Volume adjustments
  - All should be undoable

---

## 15. Settings & Preferences

### Test Cases:

- [ ] **Application Settings**
  - Open Settings panel
  - All settings categories visible
  - Settings persist after restart

- [ ] **Theme Settings**
  - Toggle dark/light mode
  - UI updates immediately
  - Theme preference saves

- [ ] **Playback Settings**
  - Auto-scroll timeline during playback toggle
  - Preview quality settings
  - Audio buffer settings (if available)

- [ ] **Export Default Settings**
  - Set default export format
  - Set default resolution
  - Set default codec
  - Defaults apply to new exports

- [ ] **Keyboard Shortcut Customization**
  - View keyboard shortcuts list
  - Customize shortcuts (if available)
  - Test modified shortcuts work

---

## 16. Performance & Stability

### Test Cases:

- [ ] **Large Project Handling**
  - Add 50+ clips to timeline
  - Application remains responsive
  - Playback is smooth
  - No crashes or freezes

- [ ] **Long Duration Videos**
  - Import video longer than 1 hour
  - Timeline handles long duration
  - Scrubbing works throughout
  - Export completes successfully

- [ ] **Multiple Tracks**
  - Create 10+ video and audio tracks
  - Add clips to all tracks
  - Playback mixes all tracks correctly
  - Export renders all layers

- [ ] **Memory Management**
  - Work on project for extended period
  - Monitor system memory usage
  - No memory leaks occur
  - Application doesn't slow down over time

- [ ] **Error Handling**
  - Import corrupted file
  - Application shows error message
  - Application doesn't crash
  - Can continue working

---

## 17. Keyboard Shortcuts

### Test Cases:

- [ ] **Space** - Play/Pause
- [ ] **Cmd/Ctrl+Z** - Undo
- [ ] **Cmd/Ctrl+Shift+Z** - Redo
- [ ] **Cmd/Ctrl+S** - Save project
- [ ] **Cmd/Ctrl+O** - Open project
- [ ] **Delete/Backspace** - Delete selected clip
- [ ] **Cmd/Ctrl+C** - Copy clip
- [ ] **Cmd/Ctrl+V** - Paste clip
- [ ] **Cmd/Ctrl+X** - Cut clip
- [ ] **Cmd/Ctrl+Scroll** - Zoom timeline
- [ ] **Arrow Keys** - Navigate timeline frame by frame
- [ ] **Home/End** - Jump to start/end of timeline

---

## 18. UI/UX Features

### Test Cases:

- [ ] **Responsive Layout**
  - Resize application window
  - Panels adjust proportionally
  - No UI elements cut off
  - Minimum window size enforced

- [ ] **Panel Resizing**
  - Drag panel dividers to resize
  - Panels resize smoothly
  - Minimum/maximum sizes respected

- [ ] **Tooltips**
  - Hover over buttons and controls
  - Tooltips appear with descriptions
  - Tooltips are helpful and accurate

- [ ] **Loading Indicators**
  - Import large file
  - Loading spinner/progress shows
  - User knows operation is in progress

- [ ] **Error Messages**
  - Trigger error (invalid file, etc.)
  - Clear error message displays
  - Provides guidance on resolution

- [ ] **Drag & Drop Feedback**
  - Drag clip from media library
  - Drop zone highlights
  - Invalid drop zones show prohibition cursor

---

## 19. Cross-Platform Features

### Test Cases (if testing on multiple platforms):

- [ ] **macOS Specific**
  - Menu bar integration
  - Native file dialogs
  - Trackpad gestures work
  - Cmd key shortcuts function

- [ ] **Windows Specific**
  - Native window controls
  - File dialogs work correctly
  - Ctrl key shortcuts function
  - System tray integration (if available)

- [ ] **Linux Specific**
  - Window manager compatibility
  - File dialogs work correctly
  - Ctrl key shortcuts function

---

## 20. Filmstrip & Navigation

### Test Cases:

- [ ] **Filmstrip Preview**
  - Timeline shows thumbnail filmstrip
  - Thumbnails generate for video clips
  - Thumbnails update when clip is trimmed
  - Image clips show static thumbnail
  - Filmstrip helps visual navigation

- [ ] **Thumbnail Quality**
  - Thumbnails are clear and recognizable
  - Generation doesn't freeze UI
  - Cached for performance

---

## 21. Advanced Features Testing

### Test Cases:

- [ ] **Favorites System**
  - Mark media items as favorites
  - Filter to show only favorites
  - Favorites persist in project

- [ ] **Preset Management**
  - Create custom export preset
  - Save preset with name
  - Load preset in future exports
  - Delete custom preset

- [ ] **Cache Management**
  - Check cache size in settings
  - Clear cache functionality
  - Cache rebuilds as needed
  - Performance improves with cache

- [ ] **GPU Acceleration**
  - Enable GPU acceleration (if available)
  - Rendering/playback performance improves
  - No visual artifacts
  - Fallback to CPU if GPU unavailable

---

## Bug Report Template

When you find issues during testing, document them as follows:

```
**Issue Title:** [Brief description]

**Steps to Reproduce:**
1. Step one
2. Step two
3. Step three

**Expected Behavior:**
What should happen

**Actual Behavior:**
What actually happened

**Environment:**
- OS: macOS/Windows/Linux
- Version: [App version]
- FFmpeg Version: [version]

**Screenshots/Videos:**
[Attach if applicable]

**Console Errors:**
[Check DevTools console for errors]
```

---

## Testing Checklist Summary

Create a testing session document and check off each section:

- [ ] Launch Screen & Project Setup (2 tests)
- [ ] Media Import & Management (6 tests)
- [ ] Timeline Operations (8 tests)
- [ ] Timeline Navigation & Zoom (4 tests)
- [ ] Video Playback & Preview (5 tests)
- [ ] Audio Features (5 tests)
- [ ] Text & Titles (8 tests + detailed animation testing)
- [ ] Stickers & Graphics (4 tests)
- [ ] Subtitles & Captions (4 tests)
- [ ] Video Effects (NEW - 9 subsections, 70+ tests)
  - Effects Panel Access
  - Effects Tab Testing
  - Overlays Tab Testing
  - Transitions Tab Testing
  - API Integration Testing
  - Effect Persistence & Export
  - Performance Testing
  - Edge Cases
  - Effect Removal & Reset
- [ ] Transform & Effects (3 tests)
- [ ] Export & Rendering (8 tests)
- [ ] Project Management (6 tests)
- [ ] Undo/Redo System (4 tests)
- [ ] Settings & Preferences (5 tests)
- [ ] Performance & Stability (5 tests)
- [ ] Keyboard Shortcuts (12 tests)
- [ ] UI/UX Features (6 tests)
- [ ] Cross-Platform Features (3 tests)
- [ ] Filmstrip & Navigation (2 tests)
- [ ] Advanced Features (4 tests)

**Total Test Cases: ~175+** (including comprehensive video effects testing)

---

## Tips for Effective Manual Testing

1. **Test in Order**: Follow sections sequentially for logical flow
2. **Take Notes**: Document bugs immediately when found
3. **Test Edge Cases**: Try unusual combinations and extreme values
4. **Check Console**: Keep DevTools open to catch JavaScript errors
5. **Test Multiple File Types**: Use various codecs and formats
6. **Performance Monitor**: Watch Activity Monitor/Task Manager
7. **Fresh Start**: Test with clean project and clean cache
8. **Real-World Scenarios**: Create actual video projects, not just tests

---

## Next Steps After Testing

1. Document all bugs found
2. Prioritize issues by severity
3. Create GitHub issues for bugs
4. Verify fixes with regression testing
5. Update documentation with any UX discoveries
6. Celebrate completed testing! 🎉
