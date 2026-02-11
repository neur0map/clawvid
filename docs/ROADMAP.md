# ClawVid Roadmap to Production-Ready

Status: **Compiles + unit tests pass. Not end-to-end tested.**

---

## Phase 1: fal.ai API Integration (Critical)

The client layer (`src/fal/`) calls fal.ai but has never received a real response. Every model has its own response shape.

### 1.1 Validate fal.ai response shapes

- [ ] Run a single `fal-ai/flux/dev` image generation call
- [ ] Capture the actual response JSON and compare to what `fal/image.ts` expects
- [ ] Fix `generateImage()` to extract the image URL from the real response
- [ ] Run a single `fal-ai/kling-video/v1.5/pro/image-to-video` call
- [ ] Fix `generateVideo()` to extract the video URL from the real response
- [ ] Run a single `fal-ai/f5-tts` TTS call
- [ ] Fix `generateSpeech()` to extract the audio URL from the real response
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
# Create a minimal 1-scene workflow to isolate fal.ai calls
clawvid generate --workflow tests/fixtures/single-scene.json
```

---

## Phase 2: Pipeline Data Flow (Critical)

The pipeline chains 9 stages. Data handoff between stages hasn't been exercised.

### 2.1 Workflow execution -> asset files

- [ ] Verify `workflow-runner.ts` correctly iterates scenes
- [ ] Confirm images are saved to `output/{run}/assets/` with correct names
- [ ] Confirm videos are saved alongside their source images
- [ ] Verify cache hash calculation and hit/miss behavior on second run

### 2.2 Audio processing chain

- [ ] Verify TTS generates one audio file per narrated scene
- [ ] Test `silence.ts` — does `silenceremove` filter syntax work with fluent-ffmpeg?
- [ ] Test `normalize.ts` — does `loudnorm` two-pass work correctly?
- [ ] Test `mixer.ts` concatenation — does the concat filter produce valid audio?
- [ ] Test `mixer.ts` music mixing — does background music loop and fade correctly?
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

Run the full pipeline with the example workflow.

```bash
# Set up
cp .env.example .env
# Add real FAL_KEY

# Run full pipeline
clawvid generate --workflow workflows/horror-story-example.json

# Expected output structure:
# output/2026-XX-XX-haunted-library-horror-video/
#   assets/
#     scene_1.png
#     scene_1.mp4
#     scene_2.png
#     ...
#   youtube/
#     haunted-library-horror-video.mp4
#   tiktok/
#     haunted-library-horror-video.mp4
#   instagram/
#     haunted-library-horror-video.mp4
#   subtitles/
#     narration.srt
#     narration.vtt
#   cost-summary.json
```

### Validation checklist

- [ ] All 7 scene images generated and saved
- [ ] 3 video clips generated (scenes 1, 4, 6)
- [ ] TTS narration generated for scenes with text
- [ ] Audio normalized and mixed with music
- [ ] Subtitles generated with word timing
- [ ] YouTube 16:9 video renders and plays correctly
- [ ] TikTok 9:16 video renders and plays correctly
- [ ] Instagram 9:16 video renders and plays correctly
- [ ] All videos have audio track
- [ ] Subtitles appear at correct times
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
clawvid render --run output/2026-XX-XX-haunted-library/ --all-platforms
```

- [ ] Verify re-render uses existing assets (no fal.ai calls)
- [ ] Verify output videos are correct
- [ ] Test single platform: `--platform tiktok`

---

## Phase 7: Edge Cases and Hardening

- [ ] Workflow with no narration (all scenes `narration: null`)
- [ ] Workflow with no music (no `audio.music` section)
- [ ] Workflow with no video scenes (all `type: "image"`)
- [ ] Workflow with only 1 scene
- [ ] Workflow with no effects
- [ ] Workflow with no subtitles (`subtitles.enabled: false`)
- [ ] Workflow with text overlays on multiple scenes
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
- [ ] Clean up 9 remaining `.todo()` test stubs with real integration tests
- [ ] Consider replacing deprecated `fluent-ffmpeg` if issues found

---

## Estimated Fix Rounds

Based on typical integration testing:

| Phase | Expected Issues | Effort |
|-------|----------------|--------|
| 1. fal.ai API | Response shape mismatches, URL handling | 1-2 rounds |
| 2. Pipeline flow | Data handoff bugs, path issues | 1-2 rounds |
| 3. Remotion | Bundler config, React compat, prop wiring | 2-3 rounds |
| 4. FFmpeg | Filter syntax, encoding flags | 1 round |
| 5. End-to-end | Combination of above | 1-2 rounds |
| 6. Cache/re-render | Minor path issues | 1 round |
| 7. Edge cases | Null handling, missing fields | 1 round |
| 8. Polish | UX improvements | 1 round |

**Total: ~3-5 focused sessions to production-ready.**
