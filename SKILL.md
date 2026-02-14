# ClawVid

Generate short-form videos (YouTube Shorts, TikTok, Reels) from text prompts.

You are the orchestrator. You plan scenes, write prompts, generate a workflow JSON, and call `clawvid generate` to execute the full pipeline.

---

## ⚠️ CRITICAL: Execution Rules

### Time Expectations

**Before starting any generation, tell the user:**

> "Video generation takes **20-25 minutes** for a typical 6-scene video. This includes:
> - TTS narration (~1-2 min)
> - Image generation (~3-5 min)
> - Video clip generation (~8-12 min for 3 clips)
> - Sound effects + music (~2-3 min)
> - Transcription for subtitles (~2-3 min)
> - Audio mixing + Remotion render (~3-5 min)
> 
> I'll keep you updated on progress. Ready to start?"

### Process Management Rules

**DO NOT set timeouts on clawvid commands.** The pipeline runs many sequential API calls and will complete on its own.

When running `clawvid generate`:
1. Start the process **without a timeout** (or use a very long one like 3600s)
2. Use `process poll` to check status periodically
3. Report progress to the user as phases complete
4. Let the process finish naturally — do not kill it
5. If the user wants to cancel, ask for explicit confirmation first

**Example execution:**
```bash
# CORRECT - no timeout, let it run
clawvid generate --workflow workflow.json

# WRONG - timeout will kill the process mid-generation
# timeout 600 clawvid generate --workflow workflow.json
```

### Cost Expectations

| Quality | Video Clips | Estimated Cost |
|---------|-------------|----------------|
| budget | 1 clip | $1-2 |
| balanced | 2-3 clips | $3-5 |
| max_quality | 3+ clips (Kling/Vidu) | $8-15 |

Premium video models (Kling 2.6 Pro, Vidu) cost significantly more but produce better motion.

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
1. max_quality — Premium models (Vidu/Kling), best motion, $8-15 per video
2. balanced — Default models, 2-3 video clips, $3-5 per video
3. budget — Fewer clips, faster generation, $1-2 per video
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

### Step 6: AI Model Selection

Ask the user which models to use for each generation type, or let them choose custom per-video:

```
Which AI models would you like to use? (or choose "custom" to pick per-video)

📷 IMAGE GENERATION:
1. fal-ai/kling-image/v3/text-to-image — Fast, good quality ($0.03)
2. fal-ai/nano-banana-pro — Best for consistency/reference ($0.15)
3. custom — Choose per video

🎬 VIDEO GENERATION:
1. fal-ai/kandinsky5-pro/image-to-video — Budget, 5s clips ($0.04-0.12)
2. fal-ai/kling-video/v2.6/pro/image-to-video — Better motion, 5s ($0.35)
3. fal-ai/vidu/q3/image-to-video — Best quality, 8s clips ($1.50+)
4. custom — Choose per video

🎵 MUSIC GENERATION:
1. beatoven/music-generation — AI-generated background music ($0.10)
2. none — I'll provide my own music files
3. custom — Choose per video

🔊 SOUND EFFECTS:
1. beatoven/sound-effect-generation — AI-generated SFX ($0.10 each)
2. none — No sound effects
3. custom — Choose per video

🗣️ TTS (Text-to-Speech):
1. fal-ai/qwen-3-tts/voice-design/1.7b — AI voice design ($0.09/1K chars)
2. none — I'll provide my own voice recordings
3. custom — Choose per video

📝 SUBTITLES:
1. enabled — Word-by-word animated subtitles (uses Whisper for timing)
2. disabled — No subtitles
3. custom — Choose per video
```

### Save Preferences

After setup, save to `preferences.json` (gitignored):

```json
{
  "platforms": ["tiktok"],
  "template": "horror",
  "quality_mode": "max_quality",
  "voice": {
    "style": "ai_male_deep",
    "pacing": 0.85
  },
  "visual_style": "anime",
  "models": {
    "image": "fal-ai/kling-image/v3/text-to-image",
    "video": "fal-ai/vidu/q3/image-to-video",
    "music": "beatoven/music-generation",
    "sound_effects": "beatoven/sound-effect-generation",
    "tts": "fal-ai/qwen-3-tts/voice-design/1.7b",
    "subtitles": "enabled"
  },
  "created_at": "2026-02-13",
  "updated_at": "2026-02-13"
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

### Phase 1.5: Research & Reference Gathering

**CRITICAL: Before building the workflow, gather accurate information and reference images.**

#### When to Research (use `web_search` + `web_fetch`):

| Scenario | Action |
|----------|--------|
| Vague topic without details | Research to find interesting angles/facts |
| "Did you know" / quiz / trivia | Verify facts, find accurate stats |
| How-to / recipe / tutorial | Search for accurate steps and details |
| Historical / scientific claims | Fact-check before including in narration |
| Trending topics | Search for latest info and context |
| User provides no source | Research authoritative sources |

**Example research flow:**
```
User: "Make a video about how to boil the perfect egg"

You: [uses web_search for "perfect boiled egg timing methods"]
     [uses web_fetch on top cooking sites]

"Did some research! Here's what I found:
- Soft boil: 6-7 min
- Medium: 9-10 min  
- Hard boil: 12-13 min
- Pro tip: Ice bath immediately after

Want me to use these timings in the video?"
```

#### Reference Image Gathering:

When visual consistency matters or the user needs specific imagery:

1. **Search for reference images** related to the topic/style
2. **Send options to user chat** — always show what you found
3. **Get explicit confirmation** before using any image
4. **Download approved images** and use as `reference_image` in workflow

```
User: "Make a video about ancient Tartarian architecture"

You: [searches for reference images]
     [sends 3-4 options to chat]

"Found some reference images for the Tartarian aesthetic:
[image 1] - Ornate domed building
[image 2] - Victorian exhibition hall
[image 3] - Old sepia photograph style

Which style should I use as the reference for consistent visuals?
Or should I generate without a reference?"
```

#### Media Sharing Rules:

**ALWAYS send to user chat:**
- ✅ All reference images gathered from web (before using)
- ✅ Research summaries with sources
- ✅ Generated sample images (if doing test generations)
- ✅ **Final rendered video** — send via message tool when complete

**Use the `message` tool to send media:**
```
message action=send filePath=/path/to/video.mp4 caption="Here's your video!"
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
1. [0-8s]   VIDEO — Dark attic, flashlight beam sweeping (hook)
2. [8-16s]  VIDEO — Hand reaching for VHS tape (dramatic moment)
3. [16-24s] IMAGE — TV static, tape loading (flicker + grain)
4. [24-36s] VIDEO — Footage plays: figure in darkness (climax)
5. [36-48s] IMAGE — Writing on the wall (ken burns pan)
6. [48-60s] VIDEO — Figure is now closer (closing)

SOUND EFFECTS:
- Scene 1: Wind howling (0s offset, 8s duration)
- Scene 4: Door slam at climax (3s offset, 2s duration)
- Scene 6: Heavy impact (5s offset, 3s duration)

AUDIO: AI deep male voice (0.85x pacing), generated horror drone music
EFFECTS: vignette_heavy + grain on all scenes, glitch on scene 4

Estimated: 6 images + 4 video clips + 6 TTS + 4 SFX + 1 music track
Time: ~20-25 minutes
Cost: ~$8-12 (using Vidu for video)

Ready to proceed?"
```

### Phase 5: Generate the Workflow JSON

After approval, create the workflow JSON file and run it.

**Remember:** Tell the user it will take 20-25 minutes before starting!

---

## Production Workflow Example

For high-quality horror videos with visual consistency, use this structure (from `workflows/production-horror-frames.json`):

```json
{
  "name": "The Watchers - Horror Production",
  "template": "horror",
  "timing_mode": "tts_driven",
  "scene_padding_seconds": 0.5,
  "min_scene_duration_seconds": 5,

  "consistency": {
    "reference_prompt": "Full-body character design of a dark animated horror entity: a tall gaunt shadow creature standing at 8 feet tall with elongated skeletal limbs...",
    "seed": 666,
    "resolution": "2K"
  },

  "scenes": [
    {
      "id": "frame_1",
      "description": "Exterior - Abandoned mansion at night, establishing shot",
      "type": "video",
      "timing": {},
      "narration": "They say the mansion on Ashwood Lane has been empty for forty years. But every night, the lights flicker on.",

      "image_generation": {
        "model": "fal-ai/nano-banana-pro/edit",
        "input": {
          "prompt": "Wide establishing shot looking up at a massive three-story Victorian Gothic mansion at night...",
          "aspect_ratio": "9:16"
        }
      },

      "video_generation": {
        "model": "fal-ai/vidu/q3/image-to-video",
        "input": {
          "prompt": "Slow steady dolly push toward the mansion entrance from the gate...",
          "duration": "8",
          "resolution": "720p"
        }
      },

      "sound_effects": [
        {
          "prompt": "Howling wind gusting through dead tree branches at night...",
          "timing_offset": 0,
          "duration": 8,
          "volume": 0.6
        }
      ],

      "effects": ["vignette_heavy", "grain", "flicker_subtle"]
    }
  ],

  "audio": {
    "tts": {
      "model": "fal-ai/qwen-3-tts/voice-design/1.7b",
      "voice_prompt": "A low raspy whispering male voice, speaking slowly with dread and tension, pausing between phrases, as if afraid to speak too loudly, horror narrator",
      "language": "en",
      "speed": 0.85
    },
    "music": {
      "generate": true,
      "prompt": "Dark ambient horror soundtrack, deep pulsing sub-bass drones in D minor, dissonant tremolo strings building slowly...",
      "duration": 60,
      "volume": 0.15,
      "fade_in": 3,
      "fade_out": 4
    }
  },

  "subtitles": {
    "enabled": true,
    "style": {
      "font": "Impact",
      "color": "#ffffff",
      "stroke_color": "#000000",
      "stroke_width": 3,
      "position": "center"
    }
  },

  "output": {
    "filename": "the_watchers_horror.mp4",
    "fps": 30,
    "format": "mp4",
    "platforms": ["tiktok"]
  }
}
```

### Key Production Features

1. **Scene consistency** — Use `consistency.reference_prompt` + `seed` to maintain character/setting appearance across scenes
2. **Premium video model** — `fal-ai/vidu/q3/image-to-video` produces smoother, longer clips (8s) with better motion
3. **Image editing model** — `fal-ai/nano-banana-pro/edit` for scene variations from reference
4. **TTS-driven timing** — Let narration length determine scene duration (`timing_mode: "tts_driven"`)
5. **Detailed prompts** — Long, specific prompts with camera angles, lighting, and atmosphere

---

## Model Selection Guide

All models are configured in `config.json` under the `fal` section. Use full fal.ai model IDs in workflow JSON.

### Image Models

| Model | When to Use | Cost | Notes |
|-------|-------------|------|-------|
| `fal-ai/kling-image/v3/text-to-image` | Standard scenes | $0.03 | Uses `aspect_ratio` (e.g. "9:16") |
| `fal-ai/nano-banana-pro` | Reference images | $0.15 | For consistency base |
| `fal-ai/nano-banana-pro/edit` | Consistent scenes | $0.15 | Edit from reference |

### Video Models (Image-to-Video)

| Model | Duration | Cost | Quality | Notes |
|-------|----------|------|---------|-------|
| `fal-ai/kandinsky5-pro/image-to-video` | 5s | $0.04-0.12 | Good | **Use `duration: "5s"`** (with "s" suffix!) |
| `fal-ai/kling-video/v2.6/pro/image-to-video` | 5s | $0.35 | Better | Premium motion |
| `fal-ai/vidu/q3/image-to-video` | 8s | $1.50+ | Best | Smoothest motion, longest clips |

**⚠️ Duration format matters:**
- kandinsky5-pro requires: `"duration": "5s"` (with "s" suffix)
- Kling/Vidu use: `"duration": "5"` or `"duration": "8"` (number as string)

### Audio Models

| Model | Purpose | Cost |
|-------|---------|------|
| `fal-ai/qwen-3-tts/voice-design/1.7b` | Voice-designed TTS narration | $0.09/1K chars |
| `fal-ai/whisper` | Transcription for subtitle timing | $0.001/sec |
| `beatoven/sound-effect-generation` | AI sound effect generation (1-35s) | $0.10/req |
| `beatoven/music-generation` | AI background music generation (5-150s) | $0.10/req |

---

## Scene Planning Rules

For a 60-second video:
- **5-8 scenes** total
- **3-6 video clips** for max_quality, 2-3 for balanced
- Each scene **5-15 seconds**
- Front-load video clips — the opening matters most
- Use `type: "image"` with Ken Burns effects for narration-heavy scenes
- Use `type: "video"` for dramatic moments that need motion
- Add **sound effects** to 3-4 key scenes for immersion (impacts, ambient, transitions)

### When to Use Each Type

| Type | When | Model |
|------|------|-------|
| `video` | Opening hook, dramatic climax, closing | vidu or kling |
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
Phase 1 (1-2 min): Load config, validate workflow, create output directory
Phase 2 (2-4 min): Generate TTS narration for all scenes
Phase 3 (3-5 min): Generate images (kling-image or nano-banana-pro)
Phase 4 (8-12 min): Generate video clips (slowest phase)
Phase 5 (1-2 min): Generate sound effects (beatoven)
Phase 6 (1-2 min): Generate background music (beatoven)
Phase 7 (2-3 min): Transcribe narration with Whisper (for word-level subtitles)
Phase 8 (1-2 min): Mix audio (narration + music + SFX)
Phase 9 (2-3 min): Render with Remotion + FFmpeg post-processing

Total: ~20-25 minutes for a 6-scene video
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
- **Voice:** Deep, slow (pacing 0.85)

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

## Prompt Engineering Best Practices

### Be Specific — Avoid Ambiguity

AI models are trained on global data. Generic terms get interpreted differently:

| ❌ Ambiguous | ✅ Specific |
|--------------|-------------|
| "football" | "American football, NFL football, oval leather football" |
| "football stadium" | "NFL stadium, American football field with goalposts" |
| "chips" | "potato chips" (US) or "french fries" (UK) — be explicit |
| "car" | "2024 BMW sedan, luxury sports car" |

### Negative Prompt Strategy

Use negative prompts to exclude unwanted elements:

```json
{
  "image_generation": {
    "model": "fal-ai/kling-image/v3/text-to-image",
    "input": {
      "prompt": "American NFL football on grass field, leather texture, red and white laces, stadium lights in background",
      "negative_prompt": "soccer ball, round ball, black and white hexagons, european football",
      "aspect_ratio": "9:16"
    }
  }
}
```

### For Video Prompts (Vidu doesn't support negative_prompt)

Since Vidu image-to-video doesn't support `negative_prompt`, bake exclusions into the positive prompt:

```json
{
  "video_generation": {
    "model": "fal-ai/vidu/image-to-video",
    "input": {
      "prompt": "American NFL football spinning slowly, NOT soccer ball, leather texture, stadium lighting, dramatic slow motion",
      "duration": "4"
    }
  }
}
```

### Template-Specific Prompt Additions

Add template keywords to every prompt for consistency:

| Template | Add to Prompts |
|----------|---------------|
| horror | "extremely dark, deep shadows, horror atmosphere, ominous, cinematic noir" |
| motivation | "warm golden lighting, inspirational, clean composition" |
| quiz | "vibrant, clean background, game show aesthetic, bold colors" |
| reddit | "minimal background, focus on text, clean UI" |

---

## Subtitle Styling Guidelines

Default subtitle settings are often too small for mobile. Recommended sizes:

| Resolution | Font Size | Stroke Width |
|------------|-----------|--------------|
| 1080x1920 (9:16) | **72-80px** | 4-5 |
| 1920x1080 (16:9) | 48-56px | 3 |
| 1080x1080 (1:1) | 64-72px | 4 |

### Recommended Style for Mobile (9:16)

```json
{
  "subtitles": {
    "enabled": true,
    "style": {
      "font": "Impact",
      "color": "#ffffff",
      "stroke_color": "#000000",
      "stroke_width": 5,
      "position": "center",
      "animation": "word_by_word",
      "font_size": 76,
      "background_color": "#00000080"
    }
  }
}
```

### Tips for Readability

1. **Use high-contrast colors** — white text with black stroke, or black text with white stroke
2. **Center position** is more visible than bottom (doesn't get covered by platform UI)
3. **Word-by-word animation** keeps viewers engaged
4. **Add background_color** with transparency (e.g., `#00000080`) for busy visuals

---

## Vidu Model Guide

Vidu offers multiple model tiers. Choose based on quality needs:

### Available Endpoints

| Endpoint | Use Case | Duration | Cost | Notes |
|----------|----------|----------|------|-------|
| `/image-to-video` | Basic | 4s | $0.20 | No aspect_ratio (uses image AR) |
| `/q3/image-to-video` | Best quality | 1-16s | $0.50-1.50 | Has `resolution` param |
| `/q2/image-to-video/pro` | High quality | 2-8s | $0.40+ | Has `resolution`, `movement_amplitude` |
| `/q2/image-to-video/turbo` | Fast | 2-8s | $0.30+ | Faster generation |

### Vidu-Specific Parameters

```json
{
  "video_generation": {
    "model": "fal-ai/vidu/q3/image-to-video",
    "input": {
      "prompt": "Slow dramatic zoom into stadium",
      "duration": "8",
      "resolution": "1080p",
      "movement_amplitude": "small"
    }
  }
}
```

- **duration**: Integer as string, 1-16 seconds for Q3
- **resolution**: "360p", "540p", "720p", "1080p" (Q3 only)
- **movement_amplitude**: "auto", "small", "medium", "large" (all Vidu models)
- **audio**: Set to `false` to use ClawVid's own audio (default)

### Important: Aspect Ratio

The `/image-to-video` endpoint **does not accept aspect_ratio** — it uses the input image's aspect ratio.

**To get 9:16 portrait video:**
1. Generate your image with `aspect_ratio: "9:16"` 
2. The video will inherit that aspect ratio

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
5. WARN ABOUT TIME — "This will take 20-25 minutes. Ready?"
6. GENERATE WORKFLOW — Create the workflow JSON
7. EXECUTE — Run clawvid generate --workflow <file> (NO TIMEOUT!)
8. MONITOR — Poll process and report progress to user
9. REVIEW — Check outputs, regenerate if needed
10. DELIVER — **Send final video to user chat**, provide output path, show cost summary
```

### Delivery Checklist

When generation completes:
1. **Compress video** for chat delivery (ffmpeg H.264, CRF 26, ~15-20MB target)
2. **Send video to user** via `message` tool with filePath
3. **Show cost summary** and output location
4. **Ask for feedback** — any scenes to regenerate?

```bash
# Compress for chat delivery
ffmpeg -i output/.../tiktok/final.mp4 \
  -c:v libx264 -preset medium -crf 26 -profile:v high \
  -c:a aac -b:a 128k -movflags +faststart \
  output/.../tiktok/playable.mp4

# Send to user
message action=send filePath=/path/to/playable.mp4 caption="🎬 Your video is ready!"
```

### Quick Create (Experienced Users)

```
User: "Horror video, 60s, haunted Polaroid camera. VHS style, slow burn,
       cliffhanger ending. Deep male voice. Go with your best judgment."

You: [Skip most questions, present plan, ask for quick approval]
"Here's my plan: [condensed breakdown]. 
This will take ~20-25 minutes. Sound good?"
```

### Always Explain Decisions

```
"Scene 3 needs video because it's the climax"
"Using Vidu for video — smoother 8s clips, better for horror"
"Adding door slam SFX at 30s to sync with the shadow reveal"
"Generating dark ambient music to maintain tension throughout"
"Regenerating scene 2 — the lighting was too bright for horror"
"Keeping this as image + Ken Burns to stay within budget"
```

---

## Tips

- Front-load video clips (opening matters most for hooks)
- Use Vidu/Kling for max_quality, kandinsky5-pro for budget
- Use Ken Burns on images for subtle motion without video cost
- Add 3-4 sound effects per 60s video for immersion (don't overdo it)
- Use `generate: true` for music when you don't have a pre-made track
- All effects are name-matched: `vignette`, `vignette_heavy`, `vignette-heavy` all work
- Templates apply their own default effects — per-scene effects stack on top
- The cache skips regenerating scenes whose prompts haven't changed
- Use `--skip-cache` to force full regeneration
- Use `--all-platforms` on render to output YouTube + TikTok + Reels in one pass
- **Never timeout the generate process** — let it complete naturally
