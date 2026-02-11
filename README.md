# ClawVid

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
      - Creates workflow.json
      - Runs: clawvid generate --workflow workflow.json
                    |
                    v
    ClawVid Pipeline
      1. Generate images via fal.ai (flux/dev, flux-pro)
      2. Generate video clips via fal.ai (kling-video, minimax)
      3. Generate TTS narration via fal.ai (f5-tts)
      4. Process audio (silence trim, normalize, mix music)
      5. Generate subtitles (Whisper transcription -> SRT/VTT)
      6. Render compositions (Remotion: 16:9 + 9:16)
      7. Post-process (FFmpeg: encode, thumbnails)
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
| `fal` | Model IDs for image, video, and audio generation |
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

The agent generates a workflow JSON file that describes every scene, prompt, model, timing, and effect. See [SKILL.md](SKILL.md) for the complete schema reference.

Minimal example:

```json
{
  "name": "Quick Horror",
  "template": "horror",
  "duration_target_seconds": 30,
  "scenes": [
    {
      "id": "scene_1",
      "type": "image",
      "timing": { "start": 0, "duration": 15 },
      "narration": "The door opened by itself.",
      "image_generation": {
        "model": "fal-ai/flux/dev",
        "input": {
          "prompt": "Dark hallway, door slightly ajar, light from behind, horror atmosphere",
          "image_size": "portrait_16_9"
        }
      },
      "effects": ["vignette", "kenburns_slow_zoom", "grain"]
    }
  ],
  "audio": {
    "tts": { "model": "fal-ai/f5-tts", "speed": 0.9 }
  }
}
```

Full example: [workflows/horror-story-example.json](workflows/horror-story-example.json)

## Project Structure

```
clawvid/
  SKILL.md                       # Agent instructions (the brain)
  config.json                    # All tuneable settings
  preferences.json               # Per-user defaults (gitignored)
  .env                           # FAL_KEY (gitignored)
  workflows/                     # Example workflow JSONs
    horror-story-example.json

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
      workflow-runner.ts          #   Execute workflow steps against fal.ai
      scene-planner.ts           #   Validate scene plans
      asset-manager.ts           #   Track assets per run

    fal/                         # fal.ai API layer
      client.ts                  #   Shared client (auth, queue, retry)
      image.ts                   #   Image generation
      video.ts                   #   Image-to-video generation
      audio.ts                   #   TTS and transcription
      cost.ts                    #   Cost tracking per run
      queue.ts                   #   Concurrency control (p-queue)
      types.ts                   #   Shared types

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
      mixer.ts                   #   Concatenate narration, mix with music
      normalize.ts               #   LUFS normalization (-14 target)
      silence.ts                 #   Trim silence from TTS output

    subtitles/                   # Subtitle generation
      generator.ts               #   Build SRT/VTT from word timings
      word-timing.ts             #   Extract word-level timing from Whisper

    post/                        # FFmpeg post-production
      ffmpeg.ts                  #   fluent-ffmpeg wrapper
      encoder.ts                 #   Platform-specific encoding profiles
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
      scene.ts                   #   Scene schema
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
| AI Generation | fal.ai (flux, kling-video, f5-tts, whisper) |
| Video Composition | Remotion (React-based) |
| Post-Production | FFmpeg via fluent-ffmpeg |
| Image Processing | Sharp |
| Schema Validation | Zod |
| Concurrency | p-queue + p-retry |
| Logging | Pino (structured JSON) |
| Testing | Vitest |

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
