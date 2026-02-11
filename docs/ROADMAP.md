# ClawVid Roadmap to Production-Ready

Status: **Compiles + unit tests pass (42/42). Models updated. Sound/music/analysis added. Not end-to-end tested.**

### Recent Changes (2026-02-11)

- Replaced all fal.ai models: kling-image/v3, kandinsky5-pro, qwen-3-tts
- Added sound effect generation (beatoven/sound-effect-generation)
- Added music generation (beatoven/music-generation)
- Added image/video analysis (got-ocr/v2, video-understanding)
- Implemented audio-visual sync via FFmpeg adelay
- Added 5-phase workflow runner (images, videos, TTS, SFX, music)
- Rewrote audio mixer for multi-track mixing (narration + music + positioned SFX)
- 42 tests passing, 0 failures

---

## Phase 1: fal.ai API Integration (Critical)

The client layer (`src/fal/`) calls fal.ai but has never received a real response. Every model has its own response shape.

### 1.1 Validate fal.ai response shapes

- [ ] Run a single `fal-ai/kling-image/v3/text-to-image` image generation call
- [ ] Capture the actual response JSON and compare to what `fal/image.ts` expects (`{ images: [{ url, width, height }] }`)
- [ ] Run a single `fal-ai/kandinsky5-pro/image-to-video` call
- [ ] Confirm response matches `{ video: { url } }`
- [ ] Run a single `fal-ai/qwen-3-tts/voice-design/1.7b` TTS call
- [ ] Confirm response matches `{ audio: { url, duration } }`
- [ ] Run a single `beatoven/sound-effect-generation` call
- [ ] Confirm response matches `{ audio: { url }, metadata: { duration } }`
- [ ] Run a single `beatoven/music-generation` call
- [ ] Confirm response matches `{ audio: { url }, metadata: { duration } }`
- [ ] Run a single `fal-ai/whisper` transcription call
- [ ] Fix `transcribe()` to extract word-level timing from the real response

### 1.2 Validate file downloads

- [ ] Confirm `downloadFile()` in `fal/client.ts` works with fal.ai CDN URLs
- [ ] Check if fal.ai URLs require auth headers or expire
- [ ] Test that downloaded files are valid (not HTML error pages)

### 1.3 Validate `fal.subscribe()` behavior

- [ ] Confirm `fal.subscribe()` is the correct method (vs `fal.run()`, `fal.queue.submit()`)
- [ ] Check if it returns a result directly or needs polling
- [ ] Verify error handling for rate limits, model not found, invalid input

**Test command:**
```bash
# Use the minimal 2-scene test workflow to isolate fal.ai calls
clawvid generate --workflow workflows/test-minimal.json
```

---

## Phase 2: Pipeline Data Flow (Critical)

The pipeline chains multiple stages. Data handoff between stages hasn't been exercised.

### 2.1 Workflow execution -> asset files

- [ ] Verify `workflow-runner.ts` correctly iterates scenes (5 phases)
- [ ] Confirm images are saved to `output/{run}/assets/` with correct names
- [ ] Confirm videos are saved alongside their source images
- [ ] Verify sound effects are saved as `sfx-{sceneId}-{index}.wav`
- [ ] Verify generated music is saved as `music-generated.wav`
- [ ] Verify cache hash calculation and hit/miss behavior on second run

### 2.2 Audio processing chain

- [ ] Verify TTS generates one audio file per narrated scene
- [ ] Test `silence.ts` — does `silenceremove` filter syntax work with fluent-ffmpeg?
- [ ] Test `normalize.ts` — does `loudnorm` two-pass work correctly?
- [ ] Test `mixer.ts` concatenation — does the concat filter produce valid audio?
- [ ] Test `mixer.ts` music mixing — does background music loop and fade correctly?
- [ ] Test `mixer.ts` SFX positioning — does `adelay` place SFX at correct timestamps?
- [ ] Test multi-track mix: narration + music + N positioned SFX via `amix`
- [ ] Verify the final mixed audio file path is passed to the render stage

### 2.3 Subtitle generation

- [ ] Verify Whisper transcription returns word-level timing
- [ ] Test `word-timing.ts` extraction from real Whisper output
- [ ] Test `generator.ts` SRT/VTT output format
- [ ] Verify subtitle file paths are passed to the render stage

### 2.4 Scene-to-frame conversion

- [ ] Verify `timing.start` (seconds) correctly converts to `startFrame` (at 30fps)
- [ ] Verify `timing.duration` (seconds) correctly converts to `durationFrames`
- [ ] Check that total frames matches `duration_target_seconds * fps`

---

## Phase 3: Remotion Rendering (Critical)

Remotion programmatic rendering is complex. Multiple things can break.

### 3.1 Bundler

- [ ] Verify `@remotion/bundler` can bundle `src/render/root.tsx`
- [ ] Check if bundler needs a webpack override for ESM compatibility
- [ ] Verify React/Remotion version compatibility (React 19 + Remotion 4)
- [ ] Test that the bundle resolves all imports (templates, effects, components)

### 3.2 Composition registration

- [ ] Verify `root.tsx` registers both compositions (LandscapeVideo, PortraitVideo)
- [ ] Verify `selectComposition()` can find compositions by ID
- [ ] Test that `CompositionProps` are correctly passed as `inputProps`

### 3.3 Scene rendering

- [ ] Test `scene-renderer.tsx` with a real image file (does `<Img>` load local files?)
- [ ] Test `scene-renderer.tsx` with a real video file (does `<Video>` play local files?)
- [ ] Verify Ken Burns interpolation produces smooth zoom/pan
- [ ] Verify effect stack renders (vignette, grain, glitch composited correctly)
- [ ] Verify template color grading applies via CSS filter

### 3.4 Composition output

- [ ] Test `renderMedia()` produces a valid .mp4
- [ ] Verify audio track is included in the render
- [ ] Verify subtitle overlay renders at correct timing
- [ ] Test both landscape (1920x1080) and portrait (1080x1920) outputs
- [ ] Measure render time for a 60-second video

### 3.5 Fallback renderer

- [ ] If Remotion bundling fails, verify FFmpeg fallback in `renderer.ts` works
- [ ] Test fallback produces valid concatenated video from image segments

---

## Phase 4: FFmpeg Post-Production

### 4.1 Encoding

- [ ] Test `encoder.ts` platform-specific encoding profiles
- [ ] Verify YouTube output (h264, 8M bitrate, 1920x1080, AAC 192k)
- [ ] Verify TikTok output (h264, 6M bitrate, 1080x1920, AAC 128k)
- [ ] Verify Instagram output matches TikTok specs

### 4.2 Thumbnails

- [ ] Test `thumbnail.ts` frame extraction at specific timestamp
- [ ] Verify output is a valid image file

### 4.3 fluent-ffmpeg compatibility

- [ ] `fluent-ffmpeg@2.1.3` is deprecated — test all filter chains work
- [ ] If issues arise, consider replacing with direct `spawn('ffmpeg', [...])` calls

---

## Phase 5: End-to-End Test

Run the full pipeline with the test workflow first, then the full example.

```bash
# Set up
cp .env.example .env
# Add real FAL_KEY

# Minimal test (2 scenes, ~10s, 1 SFX, generated music)
clawvid generate --workflow workflows/test-minimal.json

# Full test (7 scenes, 60s, 4 SFX, generated music)
clawvid generate --workflow workflows/horror-story-example.json

# Expected output structure:
# output/2026-XX-XX-minimal-test-2-scenes/
#   assets/
#     scene_1.png
#     scene_2.png
#     narration-scene_1.mp3
#     narration-scene_2.mp3
#     sfx-scene_1-0.wav
#     music-generated.wav
#     audio-mixed.mp3
#   tiktok/
#     final.mp4
#     thumbnail.jpg
#     subtitles.srt
#   cost.json
#   workflow.json
```

### Validation checklist

- [ ] All scene images generated and saved
- [ ] Video clips generated for video-type scenes
- [ ] TTS narration generated for scenes with text
- [ ] Sound effects generated and positioned at correct timestamps
- [ ] Generated music plays as background throughout
- [ ] Audio normalized and mixed (narration + music + SFX)
- [ ] SFX audible at expected second marks in final audio
- [ ] Subtitles generated with word timing
- [ ] Platform videos render and play correctly
- [ ] All videos have audio track
- [ ] Template color grading visible
- [ ] Effects (vignette, grain, glitch) visible
- [ ] Total cost summary generated

---

## Phase 6: Re-render and Caching

### 6.1 Cache behavior

- [ ] Run the same workflow again — verify cached scenes are skipped
- [ ] Change one scene's prompt — verify only that scene regenerates
- [ ] Run with `--skip-cache` — verify all scenes regenerate

### 6.2 Re-render from existing assets

```bash
clawvid render --run output/2026-XX-XX-minimal-test-2-scenes/ --all-platforms
```

- [ ] Verify re-render uses existing assets (no fal.ai calls)
- [ ] Verify output videos are correct
- [ ] Test single platform: `--platform tiktok`

---

## Phase 7: Edge Cases and Hardening

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

## Phase 8: Polish

- [ ] Progress reporting — verify ora spinners and progress bars show useful info
- [ ] Cost tracking — verify per-model cost estimates are reasonable
- [ ] Logging — verify pino structured logs are useful for debugging
- [ ] Error messages — all failures should say what went wrong and how to fix it
- [ ] Complete remaining `.todo()` test stubs with real integration tests
- [ ] Consider replacing deprecated `fluent-ffmpeg` if issues found

---

## Estimated Fix Rounds

Based on typical integration testing:

| Phase | Expected Issues | Effort |
|-------|----------------|--------|
| 1. fal.ai API | Response shape mismatches, URL handling | 1-2 rounds |
| 2. Pipeline flow | Data handoff bugs, path issues, SFX timing | 1-2 rounds |
| 3. Remotion | Bundler config, React compat, prop wiring | 2-3 rounds |
| 4. FFmpeg | Filter syntax, encoding flags, adelay | 1 round |
| 5. End-to-end | Combination of above | 1-2 rounds |
| 6. Cache/re-render | Minor path issues | 1 round |
| 7. Edge cases | Null handling, missing fields | 1 round |
| 8. Polish | UX improvements | 1 round |

**Total: ~3-5 focused sessions to production-ready.**
