# ClawVid

Generate short-form videos (YouTube Shorts, TikTok, Reels) from text prompts.

You are the orchestrator. You plan scenes, write prompts, generate a workflow JSON, and call `clawvid generate` to execute the full pipeline.

---

## How It Works

1. You create a **workflow JSON** file describing every scene, prompt, model, timing, sound effects, and music.
2. You call `clawvid generate --workflow workflow.json` to execute it.
3. ClawVid handles all fal.ai API calls, audio processing, sound effect generation, music generation, Remotion rendering, and FFmpeg post-production.
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
- Sound effects: ambient (wind, creaks) / impact (door slams, crashes) / both

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

SOUND EFFECTS:
- Scene 1: Wind howling (0s offset, 5s duration)
- Scene 4: Door slam at climax (3s offset, 2s duration)
- Scene 6: Heavy impact (5s offset, 3s duration)

AUDIO: AI deep male voice, generated horror drone music, 0.9x pacing
EFFECTS: vignette + grain on all scenes, glitch on scene 4

Estimated: 3 images + 3 video clips + 1 TTS + 3 SFX + 1 music track

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
        "model": "fal-ai/kling-image/v3/text-to-image",
        "input": {
          "prompt": "Ancient gothic library exterior at night, full moon behind clouds, dead trees, iron gate, horror atmosphere, cinematic lighting, 8k, photorealistic",
          "negative_prompt": "bright, daytime, people, modern, cartoon",
          "aspect_ratio": "9:16",
          "resolution": "2K"
        }
      },

      "video_generation": {
        "model": "fal-ai/kandinsky5-pro/image-to-video",
        "input": {
          "prompt": "Slow cinematic push toward library entrance, clouds moving past moon, leaves blowing",
          "duration": "5s",
          "resolution": "1024P"
        }
      },

      "sound_effects": [
        {
          "prompt": "Howling wind through dead trees, eerie atmosphere",
          "timing_offset": 0,
          "duration": 5,
          "volume": 0.6
        }
      ],

      "effects": ["vignette", "grain"]
    },
    {
      "id": "scene_2",
      "description": "Interior — Empty reading room",
      "type": "image",
      "timing": { "start": 5, "duration": 12 },
      "narration": "The Blackwood Library had been abandoned for thirty years.",

      "image_generation": {
        "model": "fal-ai/kling-image/v3/text-to-image",
        "input": {
          "prompt": "Abandoned library interior, dust particles in moonlight beams, overturned chairs, cobwebs, single flickering lamp, horror atmosphere, extremely dark, cinematic",
          "negative_prompt": "bright, clean, modern, people",
          "aspect_ratio": "9:16"
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
        "model": "fal-ai/kling-image/v3/text-to-image",
        "input": {
          "prompt": "Pure black background with subtle fog, horror movie end screen",
          "aspect_ratio": "9:16"
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
      "model": "fal-ai/qwen-3-tts/voice-design/1.7b",
      "voice_prompt": "A deep, slow, creepy male whispering voice for horror narration",
      "language": "en",
      "speed": 0.9
    },
    "music": {
      "generate": true,
      "prompt": "Dark ambient horror drone, low rumbling, cinematic dread",
      "duration": 60,
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
| `image_generation.input.aspect_ratio` | string | No | e.g. "9:16", "16:9" |
| `image_generation.input.resolution` | string | No | "1K" or "2K" |
| `image_generation.input.output_format` | "png" \| "jpeg" | No | Image format |
| `image_generation.input.seed` | number | No | For reproducibility |
| `video_generation` | object \| null | No | Only for type: "video" scenes |
| `video_generation.model` | string | Yes | fal.ai video model ID |
| `video_generation.input.prompt` | string | Yes | Motion description |
| `video_generation.input.duration` | string | No | e.g. "5s" |
| `video_generation.input.resolution` | string | No | "512P" or "1024P" |
| `video_generation.input.num_inference_steps` | number | No | Quality steps |
| `video_generation.input.acceleration` | boolean | No | Speed up generation |
| `sound_effects` | array | No | Sound effects for this scene |
| `sound_effects[].prompt` | string | Yes | Description of the sound |
| `sound_effects[].timing_offset` | number >= 0 | Yes | Seconds from scene start |
| `sound_effects[].duration` | number (1-35) | Yes | SFX duration in seconds |
| `sound_effects[].volume` | number (0-1) | No | Volume level (default 0.8) |
| `text_overlay` | object | No | Text displayed on screen |
| `text_overlay.text` | string | Yes | The text content |
| `text_overlay.position` | "top" \| "center" \| "bottom" | No | Where to display |
| `effects` | string[] | No | Effect names applied to this scene |

### Audio Config

```json
{
  "audio": {
    "tts": {
      "model": "fal-ai/qwen-3-tts/voice-design/1.7b",
      "voice_prompt": "A deep male voice, slow and mysterious",
      "language": "en",
      "speed": 0.9,
      "temperature": 0.7,
      "top_k": 50,
      "top_p": 0.9
    },
    "music": {
      "generate": true,
      "prompt": "Dark ambient horror drone, cinematic tension",
      "duration": 60,
      "volume": 0.25,
      "fade_in": 2,
      "fade_out": 3
    }
  }
}
```

- `tts.model` is required.
- `tts.voice_prompt` describes the voice characteristics (replaces voice_reference for AI voice design).
- `tts.voice_reference` can still be used for voice cloning with an audio URL.
- `music.generate: true` generates music via AI. Provide a `prompt` describing the mood.
- `music.file` / `music.url` can still be used for pre-made music (when `generate` is false or omitted).

### Sound Effects

Sound effects are per-scene and positioned with `timing_offset` relative to scene start:

```json
{
  "sound_effects": [
    {
      "prompt": "Heavy door slam echoing in empty library",
      "timing_offset": 3,
      "duration": 2,
      "volume": 0.9
    },
    {
      "prompt": "Creaky floorboard, slow footstep",
      "timing_offset": 6,
      "duration": 1,
      "volume": 0.5
    }
  ]
}
```

The pipeline generates each SFX via AI, then positions it at the exact timestamp using FFmpeg `adelay`. For scene starting at 27s with `timing_offset: 3`, the SFX plays at 30s absolute — synced to the visual.

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

| Model | When to Use | Notes |
|-------|-------------|-------|
| `fal-ai/kling-image/v3/text-to-image` | All scenes | Uses `aspect_ratio` (e.g. "9:16"), `resolution` ("1K"/"2K") |

### Video Models (Image-to-Video)

| Model | When to Use | Notes |
|-------|-------------|-------|
| `fal-ai/kandinsky5-pro/image-to-video` | All video scenes | Fixed 5s clips, `duration: "5s"`, `resolution` ("512P"/"1024P") |

### Audio Models

| Model | Purpose |
|-------|---------|
| `fal-ai/qwen-3-tts/voice-design/1.7b` | Voice-designed TTS narration |
| `fal-ai/whisper` | Transcription for subtitle timing |
| `beatoven/sound-effect-generation` | AI sound effect generation (1-35s) |
| `beatoven/music-generation` | AI background music generation (5-150s) |

### Analysis Models (Optional)

| Model | Purpose |
|-------|---------|
| `fal-ai/got-ocr/v2` | Image analysis / quality verification |
| `fal-ai/video-understanding` | Video analysis / quality verification |

---

## Scene Planning Rules

For a 60-second video:
- **5-8 scenes** total
- **2-3 video clips** (opening hook, climax, closing) — rest as images with Ken Burns
- Each scene **5-15 seconds**
- Front-load video clips — the opening matters most
- Use `type: "image"` with Ken Burns effects for narration-heavy scenes
- Use `type: "video"` for dramatic moments that need motion
- Add **sound effects** to 3-4 key scenes for immersion (impacts, ambient, transitions)

### When to Use Each Type

| Type | When | Model |
|------|------|-------|
| `video` | Opening hook, dramatic climax, closing | kandinsky5-pro |
| `image` | Narration scenes, transitions, descriptions | kling-image/v3 |
| `image` + Ken Burns | Subtle motion without video cost | kling-image/v3 + `kenburns_slow_zoom` effect |

### Sound Effect Guidelines

| Type | Example Prompts | Good For |
|------|----------------|----------|
| Ambient | "Wind howling through trees", "Rain on window" | Scene-setting, atmosphere |
| Impact | "Door slam", "Thunder crack", "Glass breaking" | Dramatic moments, jump scares |
| Transition | "Whoosh", "Deep bass drop" | Scene changes |
| Subtle | "Paper rustling", "Footsteps on wood floor" | Building tension |

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
4. Phase 1 — Generate scene assets:
   - Images via fal.ai (kling-image/v3, with caching by content hash)
   - Videos via fal.ai (kandinsky5-pro image-to-video)
5. Phase 2 — Generate narration:
   - TTS narration via fal.ai (qwen-3-tts)
6. Phase 3 — Transcribe for subtitles:
   - Whisper transcription for word timing
7. Phase 4 — Generate sound effects:
   - Per-scene SFX via beatoven/sound-effect-generation
   - Each SFX gets absolute timestamp (scene.start + timing_offset)
8. Phase 5 — Generate background music:
   - If music.generate is true, generate via beatoven/music-generation
9. Process audio:
   - Trim silence from TTS
   - Normalize to -14 LUFS
   - Concatenate narration segments
   - Mix narration + music (with fade) + positioned SFX (adelay)
10. Generate subtitles:
    - Write SRT/VTT files
11. Render compositions:
    - Landscape (16:9) for YouTube
    - Portrait (9:16) for TikTok/Reels
12. Post-process:
    - Platform-specific encoding (bitrate, codec)
    - Generate thumbnails
13. Output cost summary
```

---

## Configuration Files

### config.json (checked into git)

Central settings file. Change models, templates, quality presets, or platform specs here.

Key sections:
- `fal.image` / `fal.video` / `fal.audio` / `fal.analysis` — model ID aliases
- `fal.audio.sound_effects` — sound effect generation model
- `fal.audio.music_generation` — music generation model
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

### Sound Effects
- Matches the prompt description
- Duration is appropriate for the scene moment
- Volume level doesn't overpower narration

### Music
- Matches the mood/template
- Doesn't clash with narration
- Fades in/out smoothly

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
3. BUILD PLAN — Present scene breakdown with SFX plan for approval
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
"Using 2K resolution for the opening since it's the hook"
"Adding door slam SFX at 30s to sync with the shadow reveal"
"Generating dark ambient music to maintain tension throughout"
"Regenerating scene 2 — the lighting was too bright for horror"
"Keeping this as image + Ken Burns to stay within budget"
```

---

## Tips

- Front-load video clips (opening matters most for hooks)
- Keep total video clips to 2-3 per 60s (cost management)
- Use Ken Burns on images for subtle motion without video cost
- Add 3-4 sound effects per 60s video for immersion (don't overdo it)
- Use `generate: true` for music when you don't have a pre-made track
- All effects are name-matched: `vignette`, `vignette_heavy`, `vignette-heavy` all work
- Templates apply their own default effects — per-scene effects stack on top
- The cache skips regenerating scenes whose prompts haven't changed
- Use `--skip-cache` to force full regeneration
- Use `--all-platforms` on render to output YouTube + TikTok + Reels in one pass
