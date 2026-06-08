# Era2 Backlog

## Native Audio Waveform Generation via FFmpeg

**Priority**: Medium  
**Status**: Planned for Era2

### Problem

Currently, audio waveform visualization relies on the Web Audio API's `decodeAudioData`, which has limited codec support in Tauri's WebView. Formats like OGG Vorbis fail to decode, resulting in a flat-line fallback pattern instead of real waveform data.

### Current Stopgap Solution

- Flat line pattern (0.15 height) displayed for unsupported formats
- "No waveform" label to communicate unavailability honestly
- Console logging to diagnose path resolution issues

### Proper Solution for Era2

Implement native audio waveform extraction using the existing FFmpeg/Rust infrastructure:

1. **Rust Command**: Create `extract_audio_waveform(path: String, samples: u32) -> Result<Vec<f32>, String>`
   - Use `ffmpeg-next` to decode audio (any codec)
   - Extract PCM samples from decoded audio buffer
   - Calculate RMS values for `samples` number of blocks
   - Return normalized waveform data

2. **Frontend Integration**:
   - Call Rust command instead of Web Audio API
   - Cache waveform data in mediaAsset on import (like posterFrame)
   - Eliminates runtime decode failures
   - Supports all FFmpeg-compatible audio formats

3. **Benefits**:
   - Consistent with existing filmstrip extraction pattern
   - No codec limitations (FFmpeg supports everything)
   - Faster (pre-computed on import, not on-demand)
   - More reliable (native decode, no WebView dependencies)

### Implementation Notes

- Reuse similar pattern to `extract_poster_frame` in `src-tauri/src/commands/media.rs`
- Store waveform data as `Vec<f32>` in MediaAsset type
- Consider storing as base64-encoded binary for compact storage in project files

### Related Files

- `src/components/editor/media-tabs/MediaCardWaveform.tsx` (current Web Audio implementation)
- `src-tauri/src/commands/media.rs` (where new command should live)
- `src/hooks/useMediaImport.ts` (call waveform extraction during import)
- `src/types/index.ts` (add waveform field to MediaAsset type)
