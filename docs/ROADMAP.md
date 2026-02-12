# ClawVid Roadmap to Production-Ready

Status: **End-to-end pipeline working. TTS-driven timing, voice consistency, subtitle sync, 2K images, advanced prompts. Multi-model video support (Vidu Q3, PixVerse transitions, Kling). 103 tests passing. Phases 10-15 define the full autonomous agent vision.**

### Recent Changes (2026-02-12, session 3)

#### Multi-Model Video Support
- Added **Vidu Q3** (`fal-ai/vidu/q3/image-to-video`) — best for animated/stylized content, 1-16s native clips, 720p/1080p, native audio
- Added **PixVerse v5.6** (`fal-ai/pixverse/v5.6/transition`) — scene-to-scene transitions via first/last frame interpolation, anime style preset
- Kept **Kling 2.6 Pro** for photorealistic content
- `generateVideo()` now auto-routes parameters per model (Kling: `start_image_url`/`cfg_scale`, Vidu: `image_url`/`seed`/`audio`, PixVerse: `first_image_url`/`style`/`aspect_ratio`)
- New `generateTransition()` function — interpolates between two scene images for smooth transitions
- Added `transition` field to scene schema (model, duration, prompt, style)
- Per-model cost tracking (Vidu $0.77/5s@720p, PixVerse $0.45/5s@720p, Kling $0.35/5s)
- Workflow switched from Kling to Vidu Q3 for horror content (animated/cel-shaded style)
- Added 4 PixVerse transitions between scenes (exterior→interior, hall→corridor, corridor→chase, chase→finale)
- 103 tests passing (6 new: Vidu params, PixVerse params, Kling params, negative_prompt filtering, PixVerse transition, Vidu transition)

#### Video Model Investigation

| Model | Best For | Duration | Resolution | Price/5s | Audio | Transition |
|-------|----------|----------|------------|----------|-------|------------|
| Kling 2.6 Pro | Real faces, photorealistic | 5/10s | 1080p | $0.35 | No | No |
| Vidu Q3 | Animated, stylized, anime | 1-16s | 720p-1080p | $0.77 | Native | end_image_url |
| PixVerse v5.6 | Scene transitions | 5/8/10s | 720p-1080p | $0.45 | Optional | first+end frame |
| Kling O3 edit | Video refinement, style fix | 5/10s | 1080p | ~$0.50+ | No | Reference imgs |
| Veo 3/3.1 | General quality, realism | 4-8s | 720p-4K | $0.50-3.75 | Native | No |

**Decision:** Vidu Q3 for animated content (the horror workflow uses cel-shaded anime style), PixVerse for transitions, Kling for photorealistic use cases. Kling O3 edit reserved for Phase 9 video refinement pipeline.

### Previous Changes (2026-02-12, session 2)

#### TTS-Driven Timing Pipeline
- Rearchitected pipeline order: TTS runs **first**, scene durations derived from actual narration length
- **Before:** All scenes hardcoded to 5s, narration totals ~46s, video only 30s — audio truncated
- **After:** Scene durations = TTS duration + 0.5s padding, video matches narration perfectly
- New `computeTiming()` function computes scene starts/durations from TTS output
- Two timing modes: `tts_driven` (default) and `fixed` (backward-compatible)
- Configurable `scene_padding_seconds` (default 0.5) and `min_scene_duration_seconds` (default 3)

#### Voice Consistency
- Scene 1 generates voice from `voice_prompt`, captures audio URL
- Scenes 2-N inject `voice_reference: scene1AudioUrl` for voice cloning via qwen-3-tts
- All narration segments now use the same voice automatically

#### Subtitle Sync Fix
- Whisper timestamps now offset by `computedStart` (scene start time), not cumulative concat offset
- Subtitles align to actual video timeline instead of the concatenated audio timeline

#### Audio Positioning
- New `positionNarration()` in mixer.ts — places each segment at its computed start via `adelay`
- Replaces sequential `concatenateNarration()` — segments no longer pile up at the start

#### Video Orientation Bug Fix
- **Fallback renderer:** Added target resolution scaling (`scale=W:H:force_original_aspect_ratio=decrease,pad=...`)
- **Encoder:** Replaced `.size()` with aspect-ratio-preserving `scale+pad` filter, fixed fluent-ffmpeg chain ordering
- Source assets (768x1376 images, 1076x1924 video clips) now correctly scale to target (1080x1920 or 1920x1080)

#### Schema Changes
- `duration_target_seconds` now optional (not needed in TTS-driven mode)
- `timing.start` and `timing.duration` now optional per scene
- Added `timing_mode`, `scene_padding_seconds`, `min_scene_duration_seconds` to workflow schema

### Previous Changes (2026-02-12, session 1)

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
- [x] TTS-first pipeline: narration generated before scene timing is computed
- [x] Voice consistency: scene 1 voice cloned for all subsequent scenes via `voice_reference`
- [x] `silence.ts` — `silenceremove` filter works with fluent-ffmpeg
- [x] `normalize.ts` — `loudnorm` single-pass works correctly (-14 LUFS)
- [x] `mixer.ts` `positionNarration()` — positions segments at computed scene starts via `adelay`
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
- [x] Computed timing (`computedTimings`) used for frame conversion in TTS-driven mode
- [x] `renderAllPlatforms()` uses `computedTimings` for `startFrame` and `durationFrames`

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
- [x] Fallback now scales to target resolution (`scale+pad` with `force_original_aspect_ratio=decrease`)
- [x] Target resolution derived from `compositionId` (LandscapeVideo=1920x1080, PortraitVideo=1080x1920)

---

## Phase 4: FFmpeg Post-Production — COMPLETE

### 4.1 Encoding

- [x] `encoder.ts` platform-specific encoding profiles work
- [x] Fixed aspect-ratio-preserving scaling (`scale+pad` filter replaces `.size()`)
- [x] Fixed fluent-ffmpeg chain ordering (`.output()` after `.videoFilter()`)
- [ ] YouTube output (h264, 8M bitrate, 1920x1080, AAC 192k) — not yet tested
- [x] TikTok output (h264, 6M bitrate, 1080x1920, AAC 128k) — verified
- [ ] Instagram output — not yet tested (same specs as TikTok)

### 4.2 Thumbnails

- [x] `thumbnail.ts` frame extraction at timestamp works
- [x] Output is a valid JPEG image

### 4.3 fluent-ffmpeg compatibility

- [x] All filter chains work (silence trimming, normalization, mixing, encoding)
- [x] Fixed `.videoBitrate('6M')` bug — replaced with `.outputOptions(['-b:v', profile.bitrate])`
- [x] Fixed `.size()` distortion bug — replaced with `scale+pad` videoFilter
- [x] Fixed chain ordering — `.output()` must come after filter setup

---

## Phase 5: End-to-End Test — COMPLETE

Multiple successful end-to-end runs completed.

### Completed test runs

1. **2-scene motivation test** (consistency + Kling 2.6): 16s, 1080x1920, $0.90
2. **6-scene horror production** (full pipeline): 30s, 1080x1920, $4.40

### Known issue found and fixed

- **Timing mismatch:** 6-scene horror had ~46s of narration crammed into 30s video. Root cause: hardcoded 5s scene durations vs 6-9s TTS narration. Fixed with TTS-driven timing pipeline.
- **Video orientation bug:** Fallback renderer + encoder produced distorted 9:16 content in 16:9 frame. Fixed with aspect-ratio-preserving scale+pad filters.

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

## Phase 9: Prompt Quality and Workflow Generation Rules — PARTIALLY COMPLETE

The quality of generated videos depends heavily on the prompts in the workflow JSON. This phase focuses on improving the rules and guidelines that govern how the OpenClaw agent (or users) write workflow JSONs, image prompts, and video prompts.

**Completed:** 4-component prompt structure (shot/subject/motion/style), depth layering (foreground/mid/background), named lighting sources, camera/lens references, texture terms, micro-motion directives for video. Added `cfg_scale` support for Kling 2.6 Pro, `resolution: "2K"` for nano-banana-pro consistency. Production horror workflow fully rewritten with advanced prompts — 51s video at $4.40. **Multi-model video support:** Vidu Q3 for animated content, PixVerse v5.6 for scene transitions, Kling 2.6 Pro for photorealistic. Scene transition interpolation via `generateTransition()`. Video model investigation complete with pricing/capability matrix.

### 9.1 Image prompt rules

- [ ] Define prompt structure guidelines (subject, style, composition, lighting, color palette)
- [ ] Document which keywords produce best results per model (nano-banana-pro vs kling-image)
- [ ] Create negative prompt library for common artifacts (blur, distortion, extra limbs, etc.)
- [ ] Define aspect ratio rules per platform (9:16 for TikTok/Reels, 16:9 for YouTube)
- [ ] Document consistency prompt patterns (reference prompt structure for nano-banana-pro/edit)
- [ ] Test prompt length limits per model and document optimal ranges

### 9.2 Video prompt rules and model selection

- [x] Multi-model video support: Vidu Q3 (animated), PixVerse (transitions), Kling (photorealistic)
- [x] Video model investigation with pricing/capability comparison matrix
- [x] Scene transition generation via PixVerse first-frame/last-frame interpolation
- [x] Per-model parameter routing (cfg_scale, seed, style, audio, aspect_ratio)
- [ ] Define video prompt guidelines per model (Vidu Q3 vs Kling — different strengths)
- [ ] Create motion vocabulary reference (dolly, pan, tilt, zoom, tracking shot, etc.)
- [ ] Define negative prompt patterns for video (what to avoid for clean generation)
- [ ] Document duration constraints per model and how they affect quality
- [ ] Test prompt-to-motion correlation per model and document reliable camera movements
- [ ] Add Kling O3 video-to-video/edit for post-generation refinement pipeline
- [ ] Add Veo 3 support for high-quality photorealistic + audio content
- [ ] Smart model auto-selection based on content style (detect anime vs photorealistic from prompts)

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

## Phase 10: AI Research Agent — Web Search & Content Intelligence — NOT STARTED

The agent needs to autonomously research topics before generating videos. A user says "make a video about Wolverine" and the agent should research the character, find visual references, understand the lore, and write an original story — all without human intervention.

### 10.1 Web search integration

- [ ] Integrate Perplexity API (or similar) for deep topic research
- [ ] Agent queries: character backstory, visual descriptions, key scenes, relationships
- [ ] Structured research output: facts, descriptions, visual references, source URLs
- [ ] Research cache — avoid re-searching the same topic across runs
- [ ] Configurable search depth: quick (3-5 sources) vs deep (10-20 sources)
- [ ] Support multiple search providers: Perplexity, Tavily, Brave Search, SerpAPI

### 10.2 Image reference pipeline

- [ ] Download reference images from web search results
- [ ] Filter images by relevance, resolution, and quality (discard thumbnails, icons, watermarked)
- [ ] Use downloaded images as `image_urls` input to nano-banana-pro/edit for style transfer
- [ ] Image-to-image pipeline: reference → AI-reworked version (new style, new composition)
- [ ] Copyright-safe reworking: original reference as structural guide only, AI generates new art
- [ ] Store reference images in `output/{run}/references/` for audit trail
- [ ] Support local image paths as references (user-provided assets)

### 10.3 Automated script generation

- [ ] LLM generates full narration script from research (not just scene prompts)
- [ ] Story arc structure: hook (0-3s) → setup → escalation → climax → resolution/CTA
- [ ] Platform-aware script length: 15s ≈ 40 words, 30s ≈ 80 words, 60s ≈ 160 words
- [ ] Tone matching: horror, motivation, educational, comedy, explainer, storytelling
- [ ] Scene breakdown: LLM splits script into scenes with visual descriptions
- [ ] Auto-generate image prompts, video prompts, SFX prompts from script
- [ ] Complete workflow JSON generated from a single topic + style input

### 10.4 Copyright safety

- [ ] Never use downloaded images directly in final output
- [ ] All visual assets must pass through AI generation (reworked, not copied)
- [ ] Avoid trademarked logos, exact character designs, copyrighted text
- [ ] Style transfer only: capture mood/composition/color palette, not exact likeness
- [ ] Optional reverse image search check on generated outputs (Google Vision API or similar)
- [ ] Copyright risk scoring: flag high-risk prompts before generation
- [ ] Document guidelines for "inspired by" vs "copying" in SKILL.md

---

## Phase 11: Duration Presets & Dynamic Scene Planning — NOT STARTED

Videos must be tight for each platform. The agent should plan the right number of scenes, pacing, and content density for the target duration.

### 11.1 Duration presets

- [ ] Three built-in presets: **15s**, **30s**, **60s**
- [ ] Custom duration: any value between 10s and 180s
- [ ] CLI flag: `--duration 15` or `--duration 60` or `--duration custom:45`
- [ ] Duration drives scene count: 15s = 2-3 scenes, 30s = 4-6 scenes, 60s = 8-12 scenes
- [ ] Duration drives pacing: 15s = fast cuts (2-3s/scene), 60s = cinematic (5-8s/scene)

### 11.2 Smart scene planning

- [ ] Agent calculates optimal scene count from target duration and content type
- [ ] Hook scene mandatory for 15s and 30s (first 2-3s must grab attention)
- [ ] CTA scene mandatory for all durations (last scene: follow, like, subscribe)
- [ ] Scene duration distribution: not uniform — varied pacing for engagement
- [ ] Cost estimation before generation: show predicted cost for the planned workflow
- [ ] Budget mode: cap total cost, reduce scene count or model quality to fit

### 11.3 Platform-specific duration rules

- [ ] TikTok: optimal 15-30s, max 60s for storytelling, vertical 9:16
- [ ] YouTube Shorts: optimal 30-60s, max 60s, vertical 9:16
- [ ] Instagram Reels: optimal 15-30s, max 90s, vertical 9:16
- [ ] YouTube long-form: 3-10 min (future), horizontal 16:9
- [ ] Auto-select duration preset per platform if not specified

---

## Phase 12: Local Model Support — NOT STARTED

Remove dependency on cloud APIs for users who want to run locally. Support Stable Diffusion, local LLMs, local TTS, and local Whisper.

### 12.1 Local image generation

- [ ] Stable Diffusion WebUI API integration (AUTOMATIC1111 / Forge)
- [ ] ComfyUI API integration (see Phase 13)
- [ ] Local model config: endpoint URL, model name, sampling params
- [ ] Adapter layer: same `generateImage()` interface, swap backend via config
- [ ] Support ControlNet, IP-Adapter, LoRA when using local SD models
- [ ] Support img2img for reference-based generation (local equivalent of nano-banana-pro/edit)

### 12.2 Local video generation

- [ ] AnimateDiff / SVD via ComfyUI for local video generation
- [ ] CogVideoX local inference (if hardware supports)
- [ ] Fallback: Ken Burns animation from still images (current FFmpeg fallback, enhanced)
- [ ] Config toggle: `model_backend: "local" | "fal" | "auto"`

### 12.3 Local TTS

- [ ] Coqui TTS / XTTS integration for local voice synthesis
- [ ] Bark TTS for local generation with voice cloning
- [ ] OpenAI-compatible TTS API (for self-hosted endpoints)
- [ ] Voice consistency via local voice cloning (reference audio file)

### 12.4 Local LLM for script generation

- [ ] Ollama integration for local script/story generation
- [ ] OpenAI-compatible API for self-hosted LLMs (vLLM, text-generation-inference)
- [ ] Local Whisper for transcription (whisper.cpp or faster-whisper)
- [ ] Config: `llm_backend: "openai" | "anthropic" | "ollama" | "local"`

### 12.5 Hybrid mode

- [ ] Mix local and cloud: e.g., local images + cloud video + cloud TTS
- [ ] Per-step backend override in workflow JSON
- [ ] Cost tracking: $0 for local steps, cloud pricing for API steps
- [ ] Auto-fallback: try local first, fall back to cloud if local fails or is too slow

---

## Phase 13: ComfyUI & External Workflow Integration — NOT STARTED

Integrate with ComfyUI and other external tools for advanced generation pipelines that go beyond single API calls.

### 13.1 ComfyUI integration

- [ ] ComfyUI API client: submit workflows, poll for results, download outputs
- [ ] Workflow template library: pre-built ComfyUI workflows for common tasks
- [ ] Image generation workflow: SD/SDXL + ControlNet + IP-Adapter
- [ ] Video generation workflow: AnimateDiff + temporal ControlNet
- [ ] Inpainting workflow: edit specific regions of generated images
- [ ] Upscaling workflow: 4x upscale with face restoration
- [ ] Config: ComfyUI endpoint URL, workflow directory path

### 13.2 Workflow composition

- [ ] Chain multiple ComfyUI workflows: generate → refine → upscale → animate
- [ ] Pass outputs between workflows (image URL piping)
- [ ] Parallel workflow execution for independent scenes
- [ ] Timeout and retry handling for long ComfyUI generations

### 13.3 External tool adapters

- [ ] Generic HTTP adapter: POST image/video to any API, parse response
- [ ] RunPod serverless integration (run any model on demand)
- [ ] Replicate API integration (alternative to fal.ai)
- [ ] Plugin system: drop-in adapters for new tools without core code changes
- [ ] Adapter config in `config.json`: endpoint, auth, input/output mapping

---

## Phase 14: Auto-Publish & Distribution — NOT STARTED

Fully automated publishing to social media platforms. The agent generates the video and publishes it — zero human interaction.

### 14.1 Platform APIs

- [ ] TikTok Content Posting API integration (OAuth2 + video upload)
- [ ] YouTube Data API v3 integration (Shorts upload with metadata)
- [ ] Instagram Graph API integration (Reels publishing)
- [ ] Platform credential storage (encrypted, per-account)
- [ ] Multi-account support: publish same video to multiple accounts

### 14.2 Metadata generation

- [ ] Auto-generate video title from script/topic
- [ ] Auto-generate description with hashtags (platform-specific)
- [ ] Hashtag research: trending + niche hashtags per platform
- [ ] Auto-generate thumbnail selection (best frame from video)
- [ ] SEO-optimized titles and descriptions per platform
- [ ] Scheduling: publish at optimal time per platform (peak engagement hours)

### 14.3 Publishing workflow

- [ ] Pre-publish validation: check video meets platform specs (resolution, duration, codec, file size)
- [ ] Upload with retry and resume for large files
- [ ] Post-publish verification: confirm video is live, capture URL
- [ ] Publishing log: track all published videos with URLs, timestamps, performance
- [ ] Dry-run mode: generate everything but don't publish (review first)
- [ ] Approval queue: optional human review step before auto-publish

### 14.4 Analytics feedback loop

- [ ] Pull engagement metrics per published video (views, likes, shares, comments)
- [ ] Feed metrics back to agent for content optimization
- [ ] A/B testing: generate 2 versions, publish both, compare performance
- [ ] Content calendar: schedule generation + publishing across days/weeks

---

## Phase 15: Agent Orchestration & Full Automation — NOT STARTED

ClawVid becomes a fully autonomous video production system driven by AI agents. Not designed for manual human use — the AI agent is the primary operator.

### 15.1 Agent-first API

- [ ] Programmatic API: `clawvid.generate({ topic, style, duration, platform })` — one call, full pipeline
- [ ] MCP (Model Context Protocol) server: expose ClawVid as tools for Claude/other agents
- [ ] OpenAI function-calling compatible tool definitions
- [ ] Webhook callbacks: notify agent when generation/publishing completes
- [ ] Batch mode: queue multiple video generations, process in parallel

### 15.2 Autonomous pipeline (the "n8n workflow")

- [ ] Single input: topic string + style + duration + platform
- [ ] Agent orchestrator: research → script → workflow JSON → generate → render → publish
- [ ] No human intervention required at any step
- [ ] Error recovery: agent retries failed steps, adjusts prompts, works around failures
- [ ] Pipeline config: define which steps are automated vs require approval
- [ ] Pipeline events: emit events at each stage for monitoring/logging

### 15.3 Content factory mode

- [ ] Bulk generation: "Generate 10 horror videos about different urban legends"
- [ ] Topic list input: CSV/JSON of topics → batch process all
- [ ] Scheduling: generate N videos per day/week on autopilot
- [ ] Content diversification: avoid repetitive prompts/styles across batch
- [ ] Cost budgets: "Generate as many videos as possible within $50"
- [ ] Queue management: prioritize, pause, resume, cancel individual jobs

### 15.4 Multi-agent coordination

- [ ] Research agent: web search, reference gathering, fact-checking
- [ ] Script agent: story writing, scene planning, prompt engineering
- [ ] Production agent: workflow execution, quality validation, re-generation
- [ ] Publishing agent: upload, metadata, scheduling, analytics
- [ ] Orchestrator agent: coordinates all sub-agents, handles failures, optimizes flow
- [ ] Agent communication protocol: structured handoff between agents

### 15.5 Quality control loop

- [ ] AI review of generated images before video rendering (reject low-quality)
- [ ] AI review of final video before publishing (check for artifacts, sync issues)
- [ ] Automated A/B prompt testing: try 2-3 prompt variations, pick best result
- [ ] Human-in-the-loop option: send preview to Slack/Discord for approval before publish
- [ ] Quality metrics: track generation quality scores over time

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
| 2. Pipeline flow | **COMPLETE** | TTS-first pipeline, voice consistency, positioned narration |
| 3. Remotion | **COMPLETE** | Hard-link fix, Loop+OffthreadVideo, transitions, computed timing |
| 4. FFmpeg | **COMPLETE** | Encoding, thumbnails, audio processing, aspect-ratio-safe scaling |
| 5. End-to-end | **COMPLETE** | 51s production video generated, TTS-driven timing, 2K images |
| 6. Cache/re-render | **PARTIAL** | Basic caching + re-render work |
| 7. Edge cases | NOT STARTED | Need hardening pass |
| 8. Polish | **PARTIAL** | Progress + cost tracking done |
| 9. Prompt quality | **PARTIAL** | 4-component prompts, multi-model video (Vidu Q3/PixVerse/Kling), transitions |
| 10. AI Research Agent | NOT STARTED | Perplexity/web search, image references, auto script, copyright safety |
| 11. Duration Presets | NOT STARTED | 15s/30s/60s/custom, smart scene planning, platform rules |
| 12. Local Models | NOT STARTED | SD/ComfyUI images, local TTS, Ollama LLM, hybrid cloud+local |
| 13. ComfyUI Integration | NOT STARTED | External workflow tools, ControlNet, IP-Adapter, workflow chaining |
| 14. Auto-Publish | NOT STARTED | TikTok/YouTube/Instagram APIs, metadata gen, scheduling, analytics |
| 15. Agent Orchestration | NOT STARTED | Full automation, MCP server, content factory, multi-agent, quality loop |
