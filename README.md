<p align="center">
  <img src="logo.png" alt="ClawVid Logo" width="200">
</p>

# ClawVid

> **Status: Beta** — End-to-end pipeline working. TTS-driven timing (narration drives scene duration), voice consistency (voice cloning across scenes), subtitle sync, aspect-ratio-safe encoding, Kling 2.6 video, Remotion rendering, word-level subtitles, and multi-track audio. 97 tests passing. Edge cases and hardening still in progress.

AI-powered short-form video generation CLI for [OpenClaw](https://github.com/neur0map/openclaw).

Generate YouTube Shorts, TikToks, and Instagram Reels from text prompts. The OpenClaw agent orchestrates the entire pipeline — planning scenes, writing prompts, and generating a workflow JSON that ClawVid executes end-to-end.

## How It Works

```
User: "Make a horror video about a haunted library"
                    |
                    v
    OpenClaw Agent (reads SKILL.md)
      - Asks clarifying questions
      - Plans scenes with timing
      - Writes image/video prompts
      - Plans sound effects + music
      - Creates workflow.json
      - Runs: clawvid generate --workflow workflow.json
                    |
                    v
    ClawVid Pipeline (TTS-first, 6 phases)
      Phase 1. Generate TTS narration (qwen-3-tts, voice cloning for consistency)
      Phase 2. Compute timing (scene durations derived from actual TTS length)
      Phase 3. Generate images via fal.ai (kling-image/v3 or nano-banana-pro)
      Phase 4. Generate video clips via fal.ai (Kling 2.6 Pro)
      Phase 5. Generate sound effects via fal.ai (beatoven)
      Phase 6. Generate background music via fal.ai (beatoven)
      + Position narration at scene starts (adelay, not sequential concat)
      + Process audio (trim, normalize, multi-track mix)
      + Generate subtitles (Whisper word-level, offset by scene start)
      + Render compositions (Remotion: 16:9 + 9:16 with effects)
      + Post-process (FFmpeg: encode with aspect-ratio-safe scaling, thumbnails)
                    |
                    v
    output/2026-02-11-haunted-library/
      youtube/   haunted-library.mp4 (1920x1080)
      tiktok/    haunted-library.mp4 (1080x1920)
      instagram/ haunted-library.mp4 (1080x1920)
```

All AI generation flows through **fal.ai** — one API, one key.

## Prerequisites

- **Node.js** >= 18
- **FFmpeg** installed and on PATH (`brew install ffmpeg` on macOS)
- **fal.ai API key** ([get one here](https://fal.ai/dashboard/keys))

## Installation

```bash
git clone https://github.com/neur0map/clawvid
cd clawvid
npm install
cp .env.example .env
# Edit .env and add your FAL_KEY
```

### Link as global CLI (optional)

```bash
npm run build
npm link
# Now "clawvid" is available globally
```

### Development mode

```bash
npm run dev -- generate --workflow workflow.json
```

## Configuration

### Environment

```
FAL_KEY=your_fal_ai_key_here
```

That's the only required environment variable.

### config.json

Central settings file checked into git. Controls:

| Section | What it configures |
|---------|-------------------|
| `fal.image` | Image generation model (kling-image/v3, nano-banana-pro) |
| `fal.video` | Video generation model (Kling 2.6 Pro) |
| `fal.audio` | TTS (qwen-3-tts), transcription (whisper), sound effects (beatoven), music (beatoven) |
| `fal.analysis` | Image/video analysis models for quality verification |
| `defaults` | Aspect ratio, resolution, FPS, duration, max video clips |
| `templates` | 4 built-in templates (horror, motivation, quiz, reddit) |
| `quality` | 3 presets (max_quality, balanced, budget) |
| `platforms` | YouTube, TikTok, Instagram Reels specs |
| `output` | Output directory, format, naming pattern |

### preferences.json

Per-user defaults created by `clawvid setup`. Gitignored. Stores platform selection, default template, quality mode, voice, and visual style.

## CLI Commands

```bash
# Full pipeline: generate assets + render video
clawvid generate --workflow <path>          # Required: workflow JSON
                 --template <name>          # Override template
                 --quality <mode>           # max_quality | balanced | budget
                 --skip-cache               # Regenerate all assets

# Re-render from existing assets
clawvid render --run <path>                 # Required: output run directory
               --platform <name>            # youtube | tiktok | instagram_reels
               --all-platforms              # Render all platforms

# Preview in Remotion
clawvid preview --workflow <path>           # Required: workflow JSON
                --platform <name>           # Preview as platform (default: tiktok)

# Remotion visual editor
clawvid studio

# User preferences
clawvid setup                               # Interactive setup
clawvid setup --reset                       # Reset to defaults
```

## Workflow JSON

The agent generates a workflow JSON file that describes every scene, prompt, model, timing, sound effects, and music. See [SKILL.md](SKILL.md) for the complete schema reference.

Minimal example:

```json
{
  "name": "Quick Horror",
  "template": "horror",
  "timing_mode": "tts_driven",
  "scene_padding_seconds": 0.5,
  "scenes": [
    {
      "id": "scene_1",
      "type": "video",
      "timing": {},
      "narration": "The door opened by itself.",
      "image_generation": {
        "model": "fal-ai/kling-image/v3/text-to-image",
        "input": {
          "prompt": "Dark hallway, door slightly ajar, light from behind, horror atmosphere",
          "aspect_ratio": "9:16"
        }
      },
      "video_generation": {
        "model": "fal-ai/kling-video/v2.6/pro/image-to-video",
        "input": {
          "prompt": "Slow push into dark hallway, door creaks open, light flickers",
          "duration": "5",
          "negative_prompt": "blur, low quality, bright"
        }
      },
      "sound_effects": [
        {
          "prompt": "Creaky door opening slowly",
          "timing_offset": 1,
          "duration": 3,
          "volume": 0.7
        }
      ],
      "effects": ["vignette", "kenburns_slow_zoom", "grain"]
    }
  ],
  "audio": {
    "tts": {
      "model": "fal-ai/qwen-3-tts/voice-design/1.7b",
      "voice_prompt": "A deep male voice with creepy undertones",
      "speed": 0.9
    },
    "music": {
      "generate": true,
      "prompt": "Dark ambient drone, horror atmosphere",
      "duration": 30,
      "volume": 0.2
    }
  }
}
```

### Scene consistency

For visually consistent characters/environments across scenes, add a `consistency` block:

```json
{
  "consistency": {
    "reference_prompt": "A dark animated shadow creature with glowing white eyes...",
    "seed": 666
  }
}
```

This generates a reference image first, then edits it for each scene using `nano-banana-pro/edit` with the same seed — ensuring visual consistency without the fal.ai workflow platform.

Full examples:
- [workflows/horror-story-example.json](workflows/horror-story-example.json) — standard workflow
- [workflows/production-horror-frames.json](workflows/production-horror-frames.json) — production 30s with consistency

## Project Structure

```
clawvid/
  SKILL.md                       # Agent instructions (the brain)
  config.json                    # All tuneable settings
  preferences.json               # Per-user defaults (gitignored)
  .env                           # FAL_KEY (gitignored)
  workflows/                     # Example workflow JSONs
    horror-story-example.json    # Standard horror (7 scenes, 60s)
    production-horror-frames.json # Production horror (6 frames, 30s, consistency)
    test-motivation-consistency.json # Test with scene consistency
    test-workflow-consistency.json   # Minimal consistency test
    test-minimal.json            # Minimal 2-scene test workflow

  src/
    index.ts                     # CLI entry point
    cli/                         # Command definitions
      program.ts                 #   Commander setup (5 commands)
      generate.ts                #   clawvid generate
      render.ts                  #   clawvid render
      preview.ts                 #   clawvid preview
      studio.ts                  #   clawvid studio
      setup.ts                   #   clawvid setup

    core/                        # Pipeline orchestration
      pipeline.ts                #   Main pipeline (generate/render/preview/studio/setup)
      workflow-runner.ts          #   TTS-first workflow execution (6 phases + computeTiming)
      scene-planner.ts           #   Validate scene plans
      asset-manager.ts           #   Track assets per run

    fal/                         # fal.ai API layer
      client.ts                  #   Shared client (auth, queue, retry)
      image.ts                   #   Image generation (kling-image/v3)
      video.ts                   #   Image-to-video (Kling 2.6 Pro, kandinsky5-pro)
      audio.ts                   #   TTS (qwen-3-tts) and transcription (whisper)
      sound.ts                   #   Sound effect generation (beatoven)
      music.ts                   #   Music generation (beatoven)
      workflow.ts                #   Scene consistency (reference + edit orchestration)
      analysis.ts                #   Image/video analysis (got-ocr, video-understanding)
      cost.ts                    #   Cost tracking per run
      queue.ts                   #   Concurrency control (p-queue)
      types.ts                   #   Shared response types

    render/                      # Remotion video composition
      root.tsx                   #   Remotion entry point
      renderer.ts                #   Programmatic render (bundle + render)
      compositions/
        landscape.tsx            #   16:9 YouTube composition
        portrait.tsx             #   9:16 social media composition
        scene-renderer.tsx       #   Shared scene render logic
        types.ts                 #   SceneProps, TemplateStyle, CompositionProps
      templates/
        horror.tsx               #   TemplateStyle: dark desaturated + vignette/grain
        motivation.tsx           #   TemplateStyle: warm golden + sepia
        quiz.tsx                 #   TemplateStyle: bright vibrant
        reddit.tsx               #   TemplateStyle: neutral muted
        index.ts                 #   Template resolver by name
      effects/
        vignette.tsx             #   Radial gradient darkening
        grain.tsx                #   SVG feTurbulence film grain
        ken-burns.tsx            #   Zoom/pan on still images
        flicker.tsx              #   Light oscillation
        glitch.tsx               #   RGB split + horizontal displacement
        chromatic-aberration.tsx  #   Color fringing
      layouts/
        landscape-frame.tsx      #   5% action-safe padding
        portrait-frame.tsx       #   Platform-aware safe zones (TikTok/Reels UI)
      components/
        scene-image.tsx          #   Image rendering
        scene-video.tsx          #   Video rendering
        subtitle.tsx             #   Subtitle overlay
        transition.tsx           #   Scene transitions

    audio/                       # Audio processing
      mixer.ts                   #   positionNarration (adelay) + multi-track mix (narration + music + SFX)
      normalize.ts               #   LUFS normalization (-14 target)
      silence.ts                 #   Trim silence from TTS output

    subtitles/                   # Subtitle generation
      generator.ts               #   Build SRT/VTT from word timings
      word-timing.ts             #   Extract word-level timing from Whisper

    post/                        # FFmpeg post-production
      ffmpeg.ts                  #   fluent-ffmpeg wrapper
      encoder.ts                 #   Platform-specific encoding (aspect-ratio-safe scale+pad)
      thumbnail.ts               #   Frame extraction for thumbnails

    validation/                  # Asset validation
      image.ts                   #   Dimensions, format, integrity (sharp)
      video.ts                   #   Duration, resolution, codec (ffprobe)
      audio.ts                   #   Duration, sample rate, silence detection
      consistency.ts             #   Color/brightness drift across scenes

    cache/                       # Content-hash caching
      store.ts                   #   JSON file-based cache
      hash.ts                    #   SHA256 hashing (order-independent)

    platforms/                   # Platform specs
      types.ts                   #   PlatformId, PlatformSpec
      youtube.ts                 #   16:9, 1920x1080, 8M bitrate
      tiktok.ts                  #   9:16, 1080x1920, 6M bitrate
      instagram.ts               #   9:16, 1080x1920, 6M bitrate
      profiles.ts                #   Encoding profile resolver

    schemas/                     # Zod validation schemas
      workflow.ts                #   Workflow JSON schema
      scene.ts                   #   Scene schema (+ sound effects)
      config.ts                  #   config.json schema
      preferences.ts             #   preferences.json schema

    config/                      # Config loading
      loader.ts                  #   Merge config.json + preferences.json
      defaults.ts                #   Hardcoded fallback values

    utils/                       # Utilities
      logger.ts                  #   Pino structured logging
      files.ts                   #   JSON read/write helpers
      slug.ts                    #   String slugification
      progress.ts                #   ora spinners + cli-progress bars
      cost.ts                    #   Cost formatting

  tests/                         # Vitest test suite
    schemas/                     #   Schema validation tests
    cache/                       #   Cache store + hash tests
    cli/                         #   CLI command registration tests
    core/                        #   Pipeline tests (stubs)
    fal/                         #   fal.ai client tests (stubs)
    validation/                  #   Validation tests (stubs)
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| CLI | Commander.js |
| AI Generation | fal.ai (see model reference below) |
| Video Composition | Remotion (React-based) |
| Post-Production | FFmpeg via fluent-ffmpeg |
| Audio Sync | FFmpeg adelay for narration positioning + SFX placement |
| Image Processing | Sharp |
| Schema Validation | Zod |
| Concurrency | p-queue + p-retry |
| Logging | Pino (structured JSON) |
| Testing | Vitest |

### Model Reference

All AI generation uses fal.ai endpoints. Use full endpoint paths in workflow JSON.

| Capability | Short Name | Full fal.ai Endpoint | Price |
|-----------|------------|---------------------|-------|
| Image Generation | kling-image/v3 | `fal-ai/kling-image/v3/text-to-image` | $0.028/img |
| Reference Image | nano-banana-pro | `fal-ai/nano-banana-pro` | $0.15/img |
| Scene Edit (consistency) | nano-banana-pro/edit | `fal-ai/nano-banana-pro/edit` | $0.15/img |
| Image-to-Video | Kling 2.6 Pro | `fal-ai/kling-video/v2.6/pro/image-to-video` | $0.35/5s |
| Image-to-Video (fast) | kandinsky5-pro | `fal-ai/kandinsky5-pro/image-to-video` | $0.04-0.12/s |
| Text-to-Speech | qwen-3-tts | `fal-ai/qwen-3-tts/voice-design/1.7b` | $0.09/1K chars |
| Sound Effects | beatoven SFX | `beatoven/sound-effect-generation` | $0.10/req |
| Music Generation | beatoven Music | `beatoven/music-generation` | $0.10/req |
| Transcription | whisper | `fal-ai/whisper` | $0.001/comp sec |
| Image Analysis | got-ocr | `fal-ai/got-ocr/v2` | — |
| Video Analysis | video-understanding | `fal-ai/video-understanding` | — |

## Scripts

```bash
npm run build     # Compile TypeScript to dist/
npm run dev       # Run with tsx (no build needed)
npm start         # Run compiled version
npm run studio    # Launch Remotion studio
npm run preview   # Remotion preview
npm test          # Run test suite
```

## License

MIT
