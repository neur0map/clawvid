# ClawVid Roadmap to Production-Ready

Status: **End-to-end pipeline working. 30s production video generated successfully. 82 tests passing.**

### Recent Changes (2026-02-12)

- Replaced fal.ai workflow platform with direct API orchestration for scene consistency
- Switched video generation from kandinsky5-pro to **Kling 2.6 Pro** (1076x1924 output)
- Fixed Remotion rendering — hard-links assets into bundle `public/` directory
- Fixed video looping — `<Loop>` + `<OffthreadVideo>` for seamless playback
- Added fade transitions between scenes (15-frame crossfade)
- Added word-level subtitles via Whisper `chunk_level: "word"`
- Fixed encoder bitrate bug (`.outputOptions()` instead of `.videoBitrate()`)
- Updated cost estimates to match real fal.ai pricing
- Created production horror workflow (6 frames, 30s, Kling 2.6)
- Successfully generated full production video: 1080x1920, 30s, H.264+AAC, $4.40 total

### Previous Changes (2026-02-11)

- Replaced all fal.ai models: kling-image/v3, kandinsky5-pro, qwen-3-tts
- Added sound effect generation (beatoven/sound-effect-generation)
- Added music generation (beatoven/music-generation)
- Added image/video analysis (got-ocr/v2, video-understanding)
- Implemented audio-visual sync via FFmpeg adelay
- Added 5-phase workflow runner (images, videos, TTS, SFX, music)
- Rewrote audio mixer for multi-track mixing (narration + music + positioned SFX)

---

## Phase 1: fal.ai API Integration ~~(Critical)~~ COMPLETE

All fal.ai models validated with real API calls.

### 1.1 Validate fal.ai response shapes

- [x] Run a single `fal-ai/kling-image/v3/text-to-image` image generation call
- [x] Capture the actual response JSON — confirmed `{ images: [{ url, width, height }] }`
- [x] Run `fal-ai/kling-video/v2.6/pro/image-to-video` (replaced kandinsky5-pro)
- [x] Confirm response matches `{ video: { url } }`
- [x] Run a single `fal-ai/qwen-3-tts/voice-design/1.7b` TTS call
- [x] Confirm response matches `{ audio: { url, duration } }`
- [x] Run a single `beatoven/sound-effect-generation` call
- [x] Confirm response matches `{ audio: { url }, metadata: { duration } }`
- [x] Run a single `beatoven/music-generation` call
- [x] Confirm response matches `{ audio: { url }, metadata: { duration } }`
- [x] Run a single `fal-ai/whisper` transcription call
- [x] Fix `transcribe()` — added `chunk_level: 'word'` for word-level timing

### 1.2 Validate file downloads

- [x] Confirm `downloadFile()` in `fal/client.ts` works with fal.ai CDN URLs
- [x] fal.ai URLs do not require auth headers, no expiration observed
- [x] Downloaded files are valid (images/videos/audio verified)

### 1.3 Validate `fal.subscribe()` behavior

- [x] Confirmed `fal.subscribe()` is the correct method — handles polling internally
- [x] Returns result directly on completion
- [x] Error handling works for invalid inputs (tested via retries)

---

## Phase 2: Pipeline Data Flow ~~(Critical)~~ COMPLETE

Full pipeline exercised with real API calls across multiple generation runs.

### 2.1 Workflow execution -> asset files

- [x] Verify `workflow-runner.ts` correctly iterates scenes (5 phases)
- [x] Images saved to `output/{run}/assets/` with correct names (e.g., `frame_1.png`)
- [x] Videos saved alongside source images (e.g., `frame_1.mp4`)
- [x] Sound effects saved as `sfx-{sceneId}-{index}.wav`
- [x] Generated music saved as `music-generated.wav`
- [x] Cache hit/miss behavior verified — `--skip-cache` regenerates all

### 2.2 Audio processing chain

- [x] TTS generates one audio file per narrated scene
- [x] `silence.ts` — `silenceremove` filter works with fluent-ffmpeg
- [x] `normalize.ts` — `loudnorm` single-pass works correctly (-14 LUFS)
- [x] `mixer.ts` concatenation — concat filter produces valid audio
- [x] `mixer.ts` music mixing — background music plays throughout
- [x] `mixer.ts` SFX positioning — `adelay` places SFX at correct timestamps
- [x] Multi-track mix verified: narration + music + 6 positioned SFX via `amix`
- [x] Final mixed audio file path correctly passed to render stage

### 2.3 Subtitle generation

- [x] Whisper transcription returns word-level timing (`chunk_level: 'word'`)
- [x] Word-level timing extraction verified (15 segments for 6-scene production)
- [x] SRT/VTT output format correct
- [x] Subtitle segments converted seconds->frames, passed to Remotion render props

### 2.4 Scene-to-frame conversion

- [x] `timing.start` (seconds) correctly converts to `startFrame` (at 30fps)
- [x] `timing.duration` (seconds) correctly converts to `durationFrames`
- [x] Total frames matches `duration_target_seconds * fps` (900 frames = 30s at 30fps)

---

## Phase 3: Remotion Rendering ~~(Critical)~~ COMPLETE

Remotion rendering fully operational. Key fix: hard-link assets into bundle `public/` directory.

### 3.1 Bundler

- [x] `@remotion/bundler` bundles `src/render/root.tsx` successfully
- [x] No webpack override needed for ESM
- [x] React 19 + Remotion 4 compatible
- [x] Bundle resolves all imports (templates, effects, components)

### 3.2 Composition registration

- [x] `root.tsx` registers both compositions (LandscapeVideo, PortraitVideo)
- [x] `selectComposition()` finds compositions by ID
- [x] `CompositionProps` correctly passed as `inputProps`

### 3.3 Scene rendering

- [x] `scene-renderer.tsx` with real image files — `<Img>` loads hard-linked local files
- [x] `scene-renderer.tsx` with real video files — `<OffthreadVideo>` + `<Loop>` for seamless playback
- [x] Ken Burns interpolation produces smooth zoom/pan
- [x] Effect stack renders (vignette, grain, glitch, chromatic aberration, flicker)
- [x] Template color grading applies via CSS filter

### 3.4 Composition output

- [x] `renderMedia()` produces valid .mp4
- [x] Audio track included in render
- [x] Subtitle overlay renders at correct timing (center-positioned)
- [x] Portrait (1080x1920) verified — 30s production video
- [ ] Landscape (1920x1080) — not yet tested with real assets
- [x] Render time: ~62s for 30s 1080x1920 video (900 frames)

### 3.5 Fallback renderer

- [x] FFmpeg fallback works when Remotion fails
- [x] Fallback uses `-stream_loop -1 -t <duration>` for video looping

---

## Phase 4: FFmpeg Post-Production — COMPLETE

### 4.1 Encoding

- [x] `encoder.ts` platform-specific encoding profiles work
- [ ] YouTube output (h264, 8M bitrate, 1920x1080, AAC 192k) — not yet tested
- [x] TikTok output (h264, 6M bitrate, 1080x1920, AAC 128k) — verified
- [ ] Instagram output — not yet tested (same specs as TikTok)

### 4.2 Thumbnails

- [x] `thumbnail.ts` frame extraction at timestamp works
- [x] Output is a valid JPEG image

### 4.3 fluent-ffmpeg compatibility

- [x] All filter chains work (silence trimming, normalization, mixing, encoding)
- [x] Fixed `.videoBitrate('6M')` bug — replaced with `.outputOptions(['-b:v', profile.bitrate])`

---

## Phase 5: End-to-End Test — COMPLETE

Multiple successful end-to-end runs completed.

### Completed test runs

1. **2-scene motivation test** (consistency + Kling 2.6): 16s, 1080x1920, $0.90
2. **6-scene horror production** (full pipeline): 30s, 1080x1920, $4.40

### Validation checklist

- [x] All scene images generated and saved
- [x] Video clips generated for video-type scenes (Kling 2.6 Pro, 1076x1924)
- [x] TTS narration generated for scenes with text (horror whisper voice)
- [x] Sound effects generated and positioned at correct timestamps
- [x] Generated music plays as background throughout
- [x] Audio normalized and mixed (narration + music + SFX)
- [x] SFX audible at expected second marks in final audio
- [x] Subtitles generated with word timing (15 segments)
- [x] Platform videos render and play correctly
- [x] All videos have audio track (AAC 48kHz)
- [x] Template color grading visible
- [x] Effects (vignette, grain, glitch, chromatic aberration, flicker) applied
- [x] Total cost summary generated per model

---

## Phase 6: Re-render and Caching — PARTIALLY COMPLETE

### 6.1 Cache behavior

- [x] Run the same workflow again — cached scenes are skipped
- [ ] Change one scene's prompt — verify only that scene regenerates
- [x] Run with `--skip-cache` — all scenes regenerate

### 6.2 Re-render from existing assets

- [x] Re-render uses existing assets (no fal.ai calls)
- [x] Output videos are correct
- [x] Single platform tested: `--platform tiktok`
- [ ] Test `--all-platforms`

---

## Phase 7: Edge Cases and Hardening — NOT STARTED

- [ ] Workflow with no narration (all scenes `narration: null`)
- [ ] Workflow with no music (no `audio.music` section)
- [ ] Workflow with no sound effects (no `sound_effects` arrays)
- [ ] Workflow with no video scenes (all `type: "image"`)
- [ ] Workflow with only 1 scene
- [ ] Workflow with no effects
- [ ] Workflow with no subtitles (`subtitles.enabled: false`)
- [ ] Workflow with text overlays on multiple scenes
- [ ] Workflow with `music.generate: false` and `music.file` path
- [ ] Invalid workflow JSON — verify clean error message
- [ ] Missing FAL_KEY — verify clean error message
- [ ] fal.ai rate limit hit — verify retry works
- [ ] fal.ai generation failure — verify error handling
- [ ] FFmpeg not installed — verify clean error message
- [ ] Output directory already exists — verify no overwrites

---

## Phase 8: Polish — PARTIALLY COMPLETE

- [x] Progress reporting — ora spinners show phase progress (images, TTS, SFX, music, render)
- [x] Cost tracking — per-model cost estimates match real fal.ai pricing
- [x] Logging — pino structured logs useful for debugging
- [ ] Error messages — some failures could be more descriptive
- [ ] Complete remaining `.todo()` test stubs with real integration tests
- [ ] Consider replacing deprecated `fluent-ffmpeg` if issues found

---

## Phase 9: Prompt Quality and Workflow Generation Rules — NOT STARTED

The quality of generated videos depends heavily on the prompts in the workflow JSON. This phase focuses on improving the rules and guidelines that govern how the OpenClaw agent (or users) write workflow JSONs, image prompts, and video prompts.

### 9.1 Image prompt rules

- [ ] Define prompt structure guidelines (subject, style, composition, lighting, color palette)
- [ ] Document which keywords produce best results per model (nano-banana-pro vs kling-image)
- [ ] Create negative prompt library for common artifacts (blur, distortion, extra limbs, etc.)
- [ ] Define aspect ratio rules per platform (9:16 for TikTok/Reels, 16:9 for YouTube)
- [ ] Document consistency prompt patterns (reference prompt structure for nano-banana-pro/edit)
- [ ] Test prompt length limits per model and document optimal ranges

### 9.2 Video prompt rules

- [ ] Define video prompt guidelines (camera motion, subject action, atmosphere, pacing)
- [ ] Document Kling 2.6 Pro prompt best practices (what it responds to vs ignores)
- [ ] Create motion vocabulary reference (dolly, pan, tilt, zoom, tracking shot, etc.)
- [ ] Define negative prompt patterns for video (what to avoid for clean generation)
- [ ] Document duration constraints per model and how they affect quality
- [ ] Test prompt-to-motion correlation and document reliable camera movements

### 9.3 Workflow JSON generation rules

- [ ] Define scene pacing rules (min/max duration per scene, transition timing)
- [ ] Create template-specific prompt guidelines (horror vs motivation vs quiz)
- [ ] Define narration-to-timing alignment rules (TTS duration vs scene duration)
- [ ] Document sound effect placement best practices (timing_offset, duration, volume)
- [ ] Define music prompt patterns per genre/mood
- [ ] Create a workflow validation checklist (pre-generation sanity checks)
- [ ] Document the relationship between frame count, video duration, and total cost

### 9.4 SKILL.md improvements

- [ ] Update SKILL.md with refined prompt engineering guidelines
- [ ] Add example prompts with before/after quality comparisons
- [ ] Add cost-aware generation rules (when to use consistency vs not)
- [ ] Add platform-specific content rules (TikTok hook timing, YouTube intro, etc.)

---

## Cost Reference (Real fal.ai Pricing)

| Model | Price | Unit |
|-------|-------|------|
| nano-banana-pro | $0.15 | per image |
| nano-banana-pro/edit | $0.15 | per image |
| kling-image/v3 | $0.028 | per image |
| kling-video/v2.6/pro | $0.35 | per 5s clip |
| kandinsky5-pro (video) | $0.04-$0.12 | per second |
| qwen-3-tts | $0.09 | per 1K chars |
| beatoven/sfx | $0.10 | per request |
| beatoven/music | $0.10 | per request |
| whisper | $0.001 | per compute sec |

### Production cost examples

| Scenario | Cost |
|----------|------|
| 2-scene test (no consistency) | ~$0.44 |
| 2-scene test (with consistency) | ~$0.90 |
| 6-scene production (with consistency + Kling 2.6) | ~$4.40 |

---

## Summary

| Phase | Status | Notes |
|-------|--------|-------|
| 1. fal.ai API | **COMPLETE** | All 7 models validated |
| 2. Pipeline flow | **COMPLETE** | Full 5-phase pipeline working |
| 3. Remotion | **COMPLETE** | Hard-link fix, Loop+OffthreadVideo, transitions |
| 4. FFmpeg | **COMPLETE** | Encoding, thumbnails, audio processing |
| 5. End-to-end | **COMPLETE** | 30s production video generated |
| 6. Cache/re-render | **PARTIAL** | Basic caching + re-render work |
| 7. Edge cases | NOT STARTED | Need hardening pass |
| 8. Polish | **PARTIAL** | Progress + cost tracking done |
| 9. Prompt quality | NOT STARTED | Image/video prompt rules, workflow generation guidelines |
