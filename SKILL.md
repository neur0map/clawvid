# ClawVid

Generate short-form videos (YouTube Shorts, TikTok, Reels) from text prompts.

You are the orchestrator. You plan scenes, write prompts, generate a workflow JSON, and call `clawvid generate` to execute the full pipeline.

---

## How It Works

1. You create a **workflow JSON** file describing every scene, prompt, model, timing, and effect.
2. You call `clawvid generate --workflow workflow.json` to execute it.
3. ClawVid handles all fal.ai API calls, audio processing, Remotion rendering, and FFmpeg post-production.
4. Output: finished videos in `output/{date}-{slug}/` for each platform.

You control everything through the workflow JSON and `config.json`. No code changes needed.

---

## Initial Setup (First-Time Users)

When a user first invokes ClawVid or has no `preferences.json`, run this setup flow.

### Step 1: Platform Selection

```
Which platforms do you create for? (can pick multiple)
1. YouTube Shorts (16:9, up to 60s)
2. TikTok (9:16, up to 60s)
3. Instagram Reels (9:16, up to 90s)
4. All of the above
```

### Step 2: Default Template

```
What type of content do you mainly create?
1. horror — Scary stories, creepypasta, true crime
2. motivation — Quotes, success stories, self-improvement
3. quiz — Trivia, "did you know", interactive questions
4. reddit — Reddit post readings, AITA, confessions
5. custom — I'll define my own style each time
```

### Step 3: Quality Mode

```
How should I balance quality vs cost?
1. max_quality — Premium models, 3 video clips, 50 inference steps
2. balanced — Default models, 2 video clips, 28 inference steps
3. budget — Default models, 1 video clip, 20 inference steps
```

### Step 4: Visual Style

```
What visual style fits your brand?
1. Photorealistic
2. Cinematic
3. Illustrated
4. Anime/Manga
5. Minimal/Clean
6. Mixed (choose per video)
```

### Step 5: Voice Preferences

```
Voice Style:
1. Use my own voice (provide recordings)
2. AI voice — male, deep
3. AI voice — female, warm
4. No narration (music/text only)

Pacing: 0.8 (slow) to 1.2 (fast), default 1.0
```

### Save Preferences

After setup, save to `preferences.json` (gitignored):

```json
{
  "platforms": ["youtube_shorts", "tiktok"],
  "template": "horror",
  "quality_mode": "balanced",
  "voice": {
    "style": "ai_male_deep",
    "pacing": 0.9
  },
  "visual_style": "cinematic",
  "created_at": "2026-02-11",
  "updated_at": "2026-02-11"
}
```

Or run: `clawvid setup` (interactive) / `clawvid setup --reset` (start over).

---

## Per-Video Creation Flow

### Phase 1: Understand the Request

Ask targeted questions based on how specific the user is:

**Vague request:**
```
User: "Make a horror video"

You: "Got it — horror video. A few questions:
1. What's the story/topic?
2. Do you have a script, or should I write one?
3. Any specific scenes you're imagining?"
```

**Specific request:**
```
User: "Make a horror video about a guy who finds a VHS tape in his attic"

You: "Perfect premise. Let me confirm:
1. POV: First-person narrator or third-person?
2. Tone: Slow-burn dread or jump scares?
3. Ending: Resolved, cliffhanger, or ambiguous?"
```

### Phase 2: Confirm Format

```
"Your defaults are 9:16, 60 seconds, horror template. Want to keep these or adjust?
- Keep defaults
- Change duration (30s / 90s)
- Different template
- Different visual style"
```

### Phase 3: Template-Specific Questions

**Horror:**
- Scene intensity: subtle / moderate / intense
- Era/aesthetic: modern / retro-VHS / gothic / industrial
- Does the narrator survive?

**Motivation:**
- Quote source: famous quotes / user-provided / AI-generated
- Visual subjects: nature / urban / people / abstract
- Call to action at end?

**Quiz:**
- Number of questions: 3, 5, or custom
- Difficulty and reveal style

**Reddit:**
- Subreddit style: nosleep / AITA / TIFU / confession
- Include username/votes display?

### Phase 4: Build the Plan

Present a scene breakdown before generating:

```
"Here's my plan for 'The VHS Tape' (60s, horror):

SCENES (6 total):
1. [0-5s]   VIDEO — Dark attic, flashlight beam sweeping (hook)
2. [5-15s]  IMAGE — Hand reaching for VHS tape (ken burns zoom)
3. [15-25s] IMAGE — TV static, tape loading (flicker + grain)
4. [25-35s] VIDEO — Footage plays: figure in darkness (climax)
5. [35-50s] IMAGE — Writing on the wall (ken burns pan)
6. [50-60s] VIDEO — Figure is now closer (closing)

AUDIO: AI deep male voice, ambient horror drone, 0.9x pacing
EFFECTS: vignette + grain on all scenes, glitch on scene 4

Estimated: 3 images (flux/dev) + 3 video clips (kling-video) + 1 TTS track

Ready to proceed?"
```

### Phase 5: Generate the Workflow JSON

After approval, create the workflow JSON file and run it.

---

## Workflow JSON Format

This is the exact schema ClawVid expects. Every field must match.

### Complete Example

```json
{
  "name": "Haunted Library Horror Video",
  "template": "horror",
  "duration_target_seconds": 60,

  "scenes": [
    {
      "id": "scene_1",
      "description": "Opening — Exterior of old library at night",
      "type": "video",
      "timing": { "start": 0, "duration": 5 },
      "narration": null,

      "image_generation": {
        "model": "fal-ai/flux-pro/v1.1",
        "input": {
          "prompt": "Ancient gothic library exterior at night, full moon behind clouds, dead trees, iron gate, horror atmosphere, cinematic lighting, 8k, photorealistic",
          "negative_prompt": "bright, daytime, people, modern, cartoon",
          "image_size": "portrait_16_9",
          "guidance_scale": 7.5
        }
      },

      "video_generation": {
        "model": "fal-ai/kling-video/v1.5/pro/image-to-video",
        "input": {
          "prompt": "Slow cinematic push toward library entrance, clouds moving past moon, leaves blowing",
          "duration": "5",
          "aspect_ratio": "9:16"
        }
      },

      "effects": ["vignette", "grain"]
    },
    {
      "id": "scene_2",
      "description": "Interior — Empty reading room",
      "type": "image",
      "timing": { "start": 5, "duration": 12 },
      "narration": "The Blackwood Library had been abandoned for thirty years.",

      "image_generation": {
        "model": "fal-ai/flux/dev",
        "input": {
          "prompt": "Abandoned library interior, dust particles in moonlight beams, overturned chairs, cobwebs, single flickering lamp, horror atmosphere, extremely dark, cinematic",
          "negative_prompt": "bright, clean, modern, people",
          "image_size": "portrait_16_9",
          "guidance_scale": 7.5
        }
      },

      "effects": ["kenburns_slow_zoom", "flicker", "grain"]
    },
    {
      "id": "scene_7",
      "description": "End card",
      "type": "image",
      "timing": { "start": 55, "duration": 5 },
      "narration": null,

      "image_generation": {
        "model": "fal-ai/flux/dev",
        "input": {
          "prompt": "Pure black background with subtle fog, horror movie end screen",
          "image_size": "portrait_16_9"
        }
      },

      "text_overlay": {
        "text": "To be continued...",
        "style": "horror_typewriter",
        "position": "center"
      },

      "effects": ["grain"]
    }
  ],

  "audio": {
    "tts": {
      "model": "fal-ai/f5-tts",
      "voice_reference": "creepy_whisper_male.wav",
      "speed": 0.9
    },
    "music": {
      "file": "ambient_horror_drone.mp3",
      "volume": 0.25,
      "fade_in": 2,
      "fade_out": 3
    }
  },

  "subtitles": {
    "enabled": true,
    "style": {
      "font": "Impact",
      "color": "#ffffff",
      "stroke_color": "#000000",
      "stroke_width": 2,
      "position": "bottom",
      "animation": "word_by_word"
    }
  },

  "output": {
    "filename": "haunted_library.mp4",
    "resolution": "1080x1920",
    "fps": 30,
    "format": "mp4"
  }
}
```

### Scene Schema Reference

Every scene requires:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | Unique scene ID (e.g. "scene_1") |
| `description` | string | No | Human-readable description |
| `type` | "image" \| "video" | Yes | Whether this scene has video motion |
| `timing.start` | number >= 0 | Yes | Start time in seconds |
| `timing.duration` | number > 0 | Yes | Duration in seconds |
| `narration` | string \| null | No | Text for TTS narration (null = silent) |
| `image_generation` | object | Yes | Always required (generates base image) |
| `image_generation.model` | string | Yes | fal.ai model ID |
| `image_generation.input.prompt` | string | Yes | Detailed image prompt |
| `image_generation.input.negative_prompt` | string | No | What to avoid |
| `image_generation.input.image_size` | string | No | e.g. "portrait_16_9" |
| `image_generation.input.guidance_scale` | number | No | Prompt adherence (default ~7.5) |
| `image_generation.input.num_inference_steps` | number | No | Quality steps |
| `image_generation.input.seed` | number | No | For reproducibility |
| `video_generation` | object \| null | No | Only for type: "video" scenes |
| `video_generation.model` | string | Yes | fal.ai video model ID |
| `video_generation.input.prompt` | string | Yes | Motion description |
| `video_generation.input.duration` | string | No | e.g. "5" (seconds) |
| `video_generation.input.aspect_ratio` | string | No | e.g. "9:16" |
| `text_overlay` | object | No | Text displayed on screen |
| `text_overlay.text` | string | Yes | The text content |
| `text_overlay.position` | "top" \| "center" \| "bottom" | No | Where to display |
| `effects` | string[] | No | Effect names applied to this scene |

### Audio Config

```json
{
  "audio": {
    "tts": {
      "model": "fal-ai/f5-tts",
      "voice_reference": "voice_sample.wav",
      "speed": 0.9
    },
    "music": {
      "file": "music.mp3",
      "url": "https://...",
      "volume": 0.25,
      "fade_in": 2,
      "fade_out": 3
    }
  }
}
```

- `tts.model` is required.
- `music` is optional. Provide either `file` (local) or `url` (remote).

### Subtitles Config

```json
{
  "subtitles": {
    "enabled": true,
    "style": {
      "font": "Impact",
      "color": "#ffffff",
      "stroke_color": "#000000",
      "stroke_width": 2,
      "position": "bottom",
      "animation": "word_by_word",
      "font_size": 42
    }
  }
}
```

---

## Available Effects

Effects are applied per-scene via the `effects` array. Names are fuzzy-matched (underscores, hyphens, case don't matter). Intensity suffixes are supported.

| Effect | Variants | Description |
|--------|----------|-------------|
| `vignette` | `vignette_subtle`, `vignette_heavy` | Dark edges, draws focus to center |
| `grain` | `grain_subtle`, `grain_heavy` | Film grain noise (SVG feTurbulence) |
| `ken_burns` | `kenburns_slow_zoom`, `kenburns_slow_pan`, `kenburns_zoom_out` | Zoom/pan motion on still images |
| `flicker` | `flicker_subtle` | Light flickering effect |
| `glitch` | `glitch_subtle`, `glitch_heavy` | RGB channel splitting, horizontal displacement |
| `chromatic_aberration` | `chromatic_aberration_subtle` | Color fringing on edges |

The template also applies its own `defaultEffects` to every scene. Per-scene effects stack on top.

---

## Templates

Templates are style presets that apply color grading, overlays, and default effects. The workflow `template` field selects one.

### horror
- **Color grading:** `saturate(0.6) brightness(0.85) contrast(1.15)`
- **Overlay:** Cold blue-black (#0a0a1a) at 15% opacity
- **Default effects:** vignette, grain
- **Prompt keywords:** horror atmosphere, dark, ominous, cinematic shadows, extremely dark
- **Negative prompts:** bright, cheerful, colorful, cartoon
- **Voice:** Deep, slow (pacing 0.9)

### motivation
- **Color grading:** `saturate(1.1) brightness(1.05) sepia(0.12) contrast(1.05)`
- **Overlay:** Warm gold (#2a1f00) at 8% opacity
- **Default effects:** (none)
- **Prompt keywords:** inspirational, warm lighting, golden hour, cinematic, professional
- **Negative prompts:** dark, scary, cluttered
- **Voice:** Warm, confident (pacing 1.0)

### quiz
- **Color grading:** `saturate(1.25) brightness(1.08) contrast(1.1)`
- **Overlay:** Deep blue (#001133) at 6% opacity
- **Default effects:** (none)
- **Prompt keywords:** clean background, vibrant, engaging, game-show
- **Voice:** Energetic, clear (pacing 1.1)

### reddit
- **Color grading:** `saturate(0.9) brightness(0.95)`
- **Overlay:** Dark neutral (#1a1a1a) at 8% opacity
- **Default effects:** (none)
- **Prompt keywords:** Reddit post card, background, clean
- **Voice:** Casual, conversational (pacing 1.0)

---

## Model Selection Guide

All models are configured in `config.json` under the `fal` section. Use full fal.ai model IDs in workflow JSON.

### Image Models

| Model | When to Use | Speed |
|-------|-------------|-------|
| `fal-ai/flux/dev` | Fast iteration, most scenes | Fast |
| `fal-ai/flux-pro/v1.1` | Final quality, hero shots, opening | Medium |
| `fal-ai/grok-imagine` | Stylized, artistic, aesthetic | Medium |

### Video Models (Image-to-Video)

| Model | When to Use | Duration |
|-------|-------------|----------|
| `fal-ai/kling-video/v1.5/pro/image-to-video` | High quality motion | 5-10s |
| `fal-ai/minimax-video/image-to-video` | Fast, good balance | 5s |
| `fal-ai/luma-dream-machine` | Cinematic, film-like | 5s |

### Audio Models

| Model | Purpose |
|-------|---------|
| `fal-ai/f5-tts` | Voice cloning / TTS narration |
| `fal-ai/whisper` | Transcription for subtitle timing |

---

## Scene Planning Rules

For a 60-second video:
- **5-8 scenes** total
- **2-3 video clips** (opening hook, climax, closing) — rest as images with Ken Burns
- Each scene **5-15 seconds**
- Front-load video clips — the opening matters most
- Use `type: "image"` with Ken Burns effects for narration-heavy scenes
- Use `type: "video"` for dramatic moments that need motion

### When to Use Each Type

| Type | When | Model |
|------|------|-------|
| `video` | Opening hook, dramatic climax, closing | kling-video, minimax-video, luma |
| `image` | Narration scenes, transitions, descriptions | flux/dev, flux-pro |
| `image` + Ken Burns | Subtle motion without video cost | flux/dev + `kenburns_slow_zoom` effect |

---

## CLI Commands

```bash
# Generate video from workflow JSON (full pipeline)
clawvid generate --workflow workflow.json
clawvid generate --workflow workflow.json --quality max_quality
clawvid generate --workflow workflow.json --template horror --skip-cache

# Re-render from a previous run's assets
clawvid render --run output/2026-02-11-haunted-library/
clawvid render --run output/2026-02-11-haunted-library/ --all-platforms
clawvid render --run output/2026-02-11-haunted-library/ --platform tiktok

# Preview workflow in Remotion
clawvid preview --workflow workflow.json
clawvid preview --workflow workflow.json --platform youtube

# Launch Remotion studio for visual editing
clawvid studio

# Configure preferences
clawvid setup
clawvid setup --reset
```

### Pipeline Flow (what `generate` does)

```
1. Load config.json + preferences.json
2. Validate workflow JSON against schema
3. Create output directory: output/{date}-{slug}/
4. Generate assets:
   - Images via fal.ai (with caching by content hash)
   - Videos via fal.ai (image-to-video)
   - TTS narration via fal.ai
5. Process audio:
   - Trim silence from TTS
   - Normalize to -14 LUFS
   - Concatenate narration segments
   - Mix with background music
6. Generate subtitles:
   - Transcribe with Whisper for word timing
   - Write SRT/VTT files
7. Render compositions:
   - Landscape (16:9) for YouTube
   - Portrait (9:16) for TikTok/Reels
8. Post-process:
   - Platform-specific encoding (bitrate, codec)
   - Generate thumbnails
9. Output cost summary
```

---

## Configuration Files

### config.json (checked into git)

Central settings file. Change models, templates, quality presets, or platform specs here.

Key sections:
- `fal.image` / `fal.video` / `fal.audio` — model ID aliases (default, premium, fast, cinematic)
- `defaults` — aspect ratio, resolution, fps, duration, max video clips
- `templates` — per-template model preferences, effects, voice style, pacing
- `quality` — three presets (max_quality, balanced, budget) with model/steps/clip counts
- `platforms` — YouTube, TikTok, Instagram Reels specs (resolution, codec, bitrate)
- `output` — directory, format, naming pattern

### preferences.json (gitignored, per-user)

Created by `clawvid setup`. Stores user's default platforms, template, quality mode, voice, and visual style. Merged with config.json at runtime.

---

## Quality Checks

After each generation step, verify:

### Images
- Matches scene description and mood
- Correct atmosphere for template
- No artifacts or weird elements
- Consistent style with other scenes

### Videos
- Smooth motion, no flickering
- Subject stays coherent throughout
- Matches the source image

### Audio
- Clear pronunciation
- Correct pacing matches `speed` setting
- No artifacts or clipping

If any check fails, regenerate with an improved prompt. Common fixes:

**Image too bright for horror:**
```
Original: "abandoned hospital corridor, flickering lights"
Improved: "extremely dark abandoned hospital corridor, single flickering light source, deep shadows, horror movie lighting, underexposed, noir atmosphere"
```

**Video motion too fast:**
```
Original: "camera zooms into corridor"
Improved: "very slow cinematic dolly forward into corridor, subtle movement, creeping pace"
```

---

## Conversation Flow

### Full Flow

```
1. CHECK PREFERENCES — Load preferences.json or run setup
2. GATHER REQUIREMENTS — Topic, format, template-specific questions
3. BUILD PLAN — Present scene breakdown for approval
4. GET APPROVAL — Wait for explicit "go" or adjustments
5. GENERATE WORKFLOW — Create the workflow JSON
6. EXECUTE — Run clawvid generate --workflow <file>
7. REVIEW — Check outputs, regenerate if needed
8. DELIVER — Provide output path, show cost summary
```

### Quick Create (Experienced Users)

```
User: "Horror video, 60s, haunted Polaroid camera. VHS style, slow burn,
       cliffhanger ending. Deep male voice. Go with your best judgment."

You: [Skip most questions, present plan, ask for quick approval]
"Here's my plan: [condensed breakdown]. Sound good?"
```

### Always Explain Decisions

```
"Scene 3 needs video because it's the climax"
"Using flux-pro for the opening since it's the hook"
"Regenerating scene 2 — the lighting was too bright for horror"
"Keeping this as image + Ken Burns to stay within budget"
```

---

## Tips

- Front-load video clips (opening matters most for hooks)
- Keep total video clips to 2-3 per 60s (cost management)
- Use Ken Burns on images for subtle motion without video cost
- All effects are name-matched: `vignette`, `vignette_heavy`, `vignette-heavy` all work
- Templates apply their own default effects — per-scene effects stack on top
- The cache skips regenerating scenes whose prompts haven't changed
- Use `--skip-cache` to force full regeneration
- Use `--all-platforms` on render to output YouTube + TikTok + Reels in one pass
