# AI Captioning Production Error Fix

## Problem

User reported error in production when trying to use AI captioning:

```
FUNCTION_INVOCATION_FAILED
cpt1::gs77j-1780250325594-0260ceb4d9e3
```

## Root Cause

The AI captioning feature has two execution paths:

1. **Tauri Desktop Mode** (development): Uses local Whisper AI via Python script
2. **Browser/Web Mode** (production): Uses fallback mock captions

The error occurred because:

1. The `isTauri` environment check was insufficient - it only checked for `__TAURI_INTERNALS__` but didn't verify the `invoke` function was actually callable
2. The code structure had nested loops with duplicate `isTauri` checks, causing confusion
3. When deployed to production (likely Vercel/Netlify), the Tauri `invoke` calls were being attempted even though they don't exist in web environments
4. The error message format `cpt1::gs77j-...` suggests a serverless function invocation failure

## The Fix

### 1. Improved Environment Detection

**Before:**

```typescript
const isTauri = typeof window !== "undefined" && (window as any).__TAURI_INTERNALS__;
```

**After:**

```typescript
const isTauri = typeof window !== "undefined" && (window as any).__TAURI_INTERNALS__ && typeof invoke === "function";
```

Now checks that:

- Window object exists
- Tauri internals are present
- **The `invoke` function is actually callable**

### 2. Restructured Code Flow

**Before:** Nested structure with duplicate checks inside the loop

```typescript
if (isTauri) {
  for (const mediaClip of audioOrVideoClips) {
    const isTauri = ... // DUPLICATE CHECK!
    if (isTauri) {
      // Tauri code
    } else {
      // Fallback code
    }
  }
}
```

**After:** Clean separation with single check

```typescript
if (isTauri) {
  console.log("[Clypra:Captions] Running in Tauri desktop mode");
  for (const mediaClip of audioOrVideoClips) {
    try {
      // Tauri code with proper error handling
    } catch (invokeError) {
      // Continue to next clip on error
      continue;
    }
  }
} else {
  console.log("[Clypra:Captions] Running in web/browser mode");
  for (const mediaClip of audioOrVideoClips) {
    // Fallback mock captions
  }
}
```

### 3. Added Comprehensive Logging

```typescript
console.log("[Clypra:Captions] Environment check:", {
  isTauri,
  hasWindow: typeof window !== "undefined",
  hasTauriInternals: !!(window as any).__TAURI_INTERNALS__,
  hasInvoke: typeof invoke === "function",
});
```

This helps debug production issues by showing exactly which checks pass/fail.

### 4. Better Error Handling

- Added try-catch around individual clip processing in Tauri mode
- Clips that fail don't crash the entire operation
- More descriptive error messages
- Removed confusing "Running in fallback contextual simulator" message

## How It Works Now

### Development (Tauri Desktop App)

1. Checks environment → `isTauri = true`
2. Logs: "Running in Tauri desktop mode - using local Whisper AI"
3. For each audio/video clip:
   - Extracts audio via `extract_audio_track` command
   - Transcribes via `transcribe_audio_local` command (calls Python Whisper script)
   - Adds caption clips to timeline with accurate timestamps
4. If any clip fails, logs error and continues to next clip

### Production (Web/Browser)

1. Checks environment → `isTauri = false`
2. Logs: "Running in web/browser mode - using contextual caption simulator"
3. For each audio/video clip:
   - Generates contextual mock captions based on filename
   - Adds caption clips with simulated timing
4. No Tauri invoke calls are attempted

## Testing Recommendations

1. **Development**: Test with actual video files to ensure Whisper AI works
2. **Production**: Deploy and test that fallback captions work without errors
3. **Check Console**: Look for the environment check logs to verify correct mode
4. **Error Scenarios**: Test with clips that might fail to ensure graceful degradation

## Files Modified

- `src/components/editor/media-tabs/TextTab.tsx` - Fixed `startCaptioning` function

## Related Files (Not Modified)

- `src-tauri/src/commands/media.rs` - Tauri backend commands (working correctly)
- `src/features/text-effects/transcribe.py` - Python Whisper script (working correctly)

## Future Improvements

Consider adding:

1. Cloud-based transcription API for production (e.g., OpenAI Whisper API, AssemblyAI)
2. Better UI feedback showing which mode is active
3. Option to upload audio for server-side transcription
4. Progress indicators per clip instead of global progress
