# ClawVid

Generate short-form videos (YouTube Shorts, TikTok, Reels) from text prompts.

You are the orchestrator. You plan scenes, write prompts, generate a workflow JSON, and call `clawvid generate` to execute the full pipeline.

---

## 🚨 MANDATORY: READ THIS SKILL EVERY TIME

**Before creating ANY video workflow, you MUST read this entire SKILL.md file.**

This skill contains critical rules about:
- Workflow JSON structure and required fields
- Transition system for smooth scene changes
- When to use video vs image scenes
- Model-specific parameters and limitations
- Common mistakes to avoid

**Do not rely on memory. Read this file fresh each time.**

---

## ⚠️ CRITICAL: Workflow Rules

### Scene Type Rules

| Scene Type | When to Use | Motion Source |
|------------|-------------|---------------|
| `type: "image"` | Narration-heavy, descriptions, establishing shots | Ken Burns effects only |
| `type: "video"` | Action moments, reveals, dramatic beats | AI video generation |
| `type: "static"` | Real photos, maps, documents to SHOW as-is | None (displayed as-is) |
| `type: "talking_head"` | AI presenter, character speaking | VEED Fabric lip-sync |

**Key insight:** Each `type: "video"` scene generates an **independent 4-8s clip**. Without transitions, these clips are **hard-cut together**, causing jarring jumps.

### 🆕 Talking Head Videos (VEED Fabric 1.0)

Use `type: "talking_head"` to create **AI presenter videos** with lip-synced speech:

```json
{
  "id": "intro",
  "type": "talking_head",
  "image_generation": {
    "model": "fal-ai/nano-banana-pro",
    "input": {
      "prompt": "Friendly female news anchor, professional attire, neutral background, looking at camera",
      "aspect_ratio": "9:16"
    }
  },
  "talking_head": {
    "model": "veed/fabric-1.0/text",
    "input": {
      "text": "Welcome to today's deep dive into one of history's greatest mysteries...",
      "resolution": "720p",
      "voice_description": "Confident female voice, American accent, news anchor style"
    }
  },
  "timing": {}
}
```

**How it works:**
1. Image model generates the presenter/character face
2. VEED Fabric creates lip-synced video from the face + speech text
3. Video includes generated audio (no separate TTS needed)

**Talking head fields:**
- `text`: The speech to lip-sync (required)
- `resolution`: `720p` or `480p` (default: 720p)
- `voice_description`: Voice styling (e.g., "British accent", "Deep male voice")

**When to use talking head:**
- AI news anchor / presenter explaining topics
- Character introductions or commentary
- Educational content with a host
- Any "person speaking to camera" format

**Cost:** ~$0.50 per talking head clip

**⚠️ Important:** Talking head scenes generate their own audio. Don't add separate narration in workflow — the `talking_head.input.text` IS the narration.

### 🆕 Static Images (Reference Photos, Maps, Documents)

Use `type: "static"` when you want to **display an existing image** without AI generation:

```json
{
  "id": "scene_3",
  "type": "static",
  "static_image": {
    "url": "https://example.com/historical-map.jpg",
    "fit": "contain",
    "background": "#000000"
  },
  "narration": "This map from 1706 shows...",
  "timing": { "duration": 10 },
  "effects": ["kenburns_slow_zoom"]
}
```

**When to use static images:**
- Historical photographs or maps (Library of Congress, archives)
- Reference images the user provides
- Screenshots or documents
- Any real-world image that should NOT be AI-regenerated

**Static image fields:**
- `url`: URL or local path to the image
- `fit`: `contain` (letterbox), `cover` (crop), or `fill` (stretch)
- `background`: Background color for letterboxing (default: black)

**⚠️ Static images are SHOWN, not used for image-to-video generation.**

### 🔴 TRANSITION RULES (CRITICAL FOR SMOOTH VIDEO)

**Problem:** Video models generate isolated clips. Concatenating them creates jarring cuts with no motion continuity.

**Solution:** Use the `transition` field to generate **interpolated videos** between scenes.

#### How Transitions Work

When a scene has a `transition` object:
1. ClawVid takes the **previous scene's image** as the start frame
2. ClawVid takes the **current scene's image** as the end frame
3. The video model generates a **smooth morph/transition** between them
4. Result: Seamless flow like ComfyUI/professional editing

#### Transition Schema

```json
{
  "id": "scene_2",
  "transition": {
    "model": "fal-ai/vidu/q3/image-to-video",
    "duration": "4",
    "prompt": "Smooth camera transition, continuous motion",
    "style": "3d_animation"  // optional, for PixVerse
  },
  "type": "image",
  ...
}
```

**Supported models for transitions:**
- `fal-ai/vidu/q3/image-to-video` — Best quality, smooth morphing ($0.50-1.50)
- `fal-ai/pixverse/image-to-video` — Good quality, supports style ($0.45)

#### When to Use Transitions

| Scenario | Use Transition? | Notes |
|----------|-----------------|-------|
| Cooking show (fixed camera) | ✅ YES on every scene | Creates continuous "footage" feel |
| Horror (jump cuts intentional) | ⚠️ SELECTIVE | Use on atmosphere scenes, skip for jump scares |
| Talking head / tutorial | ✅ YES | Smooth presenter movements |
| Fast-paced montage | ❌ NO | Hard cuts are stylistically appropriate |
| Scene with dramatic reveal | ❌ NO | Hard cut adds impact |

#### Example: Cooking Show with Transitions

```json
{
  "scenes": [
    {
      "id": "scene_1",
      "type": "video",
      "narration": "Welcome to the show!",
      "image_generation": { ... },
      "video_generation": { ... }
    },
    {
      "id": "scene_2",
      "transition": {
        "model": "fal-ai/vidu/q3/image-to-video",
        "duration": "4",
        "prompt": "Smooth transition, chef continues cooking, camera stays fixed"
      },
      "type": "image",
      "narration": "First, gather your ingredients...",
      "image_generation": { ... }
    },
    {
      "id": "scene_3",
      "transition": {
        "model": "fal-ai/vidu/q3/image-to-video",
        "duration": "4",
        "prompt": "Smooth transition, chef mixing bowl, continuous motion"
      },
      "type": "video",
      "narration": "Mix until smooth...",
      "image_generation": { ... },
      "video_generation": { ... }
    }
  ]
}
```

**Note:** The first scene cannot have a transition (no previous scene to transition FROM).

### Video Scene Best Practices

When using `type: "video"`:

1. **Keep motion minimal** — Use `"movement_amplitude": "small"` for stability
2. **Static camera prompts** — Add "camera stays completely fixed and static, only subject moves"
3. **NOT realistic** — Add "NOT realistic" to animated content prompts to maintain style
4. **Match the image** — Video prompt should describe motion OF the image, not new content

```json
{
  "video_generation": {
    "model": "fal-ai/vidu/image-to-video",
    "input": {
      "prompt": "Chef whisks batter while camera stays completely fixed and static, only chef and whisk move, NOT realistic",
      "duration": "4",
      "movement_amplitude": "small"
    }
  }
}
```

### Image Consistency Rules

For consistent characters/settings across scenes:

1. **Use reference image** — Set `consistency.reference_prompt` and `consistency.seed`
2. **Use edit model** — `fal-ai/nano-banana-pro/edit` maintains reference style
3. **Same seed** — All scene images use the same seed for consistency
4. **Detailed base prompt** — Include character description in every scene prompt

```json
{
  "consistency": {
    "reference_prompt": "Cartoon French chef character, white hat, blue apron, kitchen background, Pixar style",
    "seed": 55555555,
    "model": "fal-ai/nano-banana-pro"
  }
}
```

### Fixed Camera Style (Cooking Shows, Tutorials)

For content that should feel like "one continuous shot":

1. **Same camera angle in ALL prompts** — "Fixed camera, medium wide angle, straight-on at chest height"
2. **NO Ken Burns effects** — Remove all `effects: ["kenburns_*"]`
3. **Transitions on EVERY scene** (except first) — Creates continuous footage feel
4. **Consistent framing description** — Same composition text in every image prompt

Example image prompt for fixed camera:
```
"Fixed camera cooking show shot, medium wide angle view, cute cartoon chef behind kitchen counter, same TV studio kitchen set, bright even studio lighting, static straight-on camera angle at chest height, [SCENE SPECIFIC ACTION], Pixar Disney 3D animation style"
```

---

## ⚠️ CRITICAL: Execution Rules

### Time Expectations

**Before starting any generation, tell the user:**

> "Video generation takes **20-25 minutes** for a typical 6-scene video. This includes:
> - TTS narration (~1-2 min)
> - Image generation (~3-5 min)
> - Video clip generation (~8-12 min)
> - Transition generation (~3-5 min if using transitions)
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

| Quality | Video Clips | Transitions | Estimated Cost |
|---------|-------------|-------------|----------------|
| budget | 1 clip | 0 | $1-2 |
| balanced | 2-3 clips | 0 | $3-5 |
| balanced + transitions | 2-3 clips | 4-6 | $6-10 |
| max_quality | 3+ clips (Vidu) | 5-7 | $12-20 |

Premium video models (Kling 2.6 Pro, Vidu Q3) and transitions cost more but produce much smoother results.

---

## How It Works

1. You create a **workflow JSON** file describing every scene, prompt, model, timing, transitions, sound effects, and music.
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

### Phase 2: Confirm Format & Style

```
"Your defaults are 9:16, 60 seconds, horror template. Want to keep these or adjust?
- Keep defaults
- Change duration (30s / 90s)
- Different template
- Different visual style"
```

**For content requiring smooth motion (cooking shows, tutorials, presentations):**
```
"This type of content works best with:
- Fixed camera angle (same framing every scene)
- Transitions between scenes (smooth interpolation)
- Minimal video motion (prevents jarring clips)

This adds ~$4-6 for transitions but looks much more professional. Enable transitions?"
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

**Cooking Show / Tutorial:**
- Fixed camera or dynamic angles?
- One host or multiple characters?
- Transitions enabled? (RECOMMENDED)
- Voice style: professional, friendly, enthusiastic?

### Phase 4: Build the Plan

Present a scene breakdown before generating:

```
"Here's my plan for 'Chef Pierre's Kitchen' (60s, cooking show):

SCENES (7 total):
1. [0-10s]  VIDEO — Chef intro, arms wide (NO transition - first scene)
2. [10-25s] IMAGE — Ingredient reveal (TRANSITION from scene 1)
3. [25-35s] VIDEO — Mixing batter (TRANSITION from scene 2)
4. [35-46s] IMAGE — Secret tip moment (TRANSITION from scene 3)
5. [46-56s] VIDEO — Pan swirl technique (TRANSITION from scene 4)
6. [56-65s] VIDEO — The flip! (TRANSITION from scene 5)
7. [65-78s] VIDEO — Final presentation (TRANSITION from scene 6)

TRANSITIONS: 6 (smooth interpolation between all scenes)
CAMERA: Fixed, medium-wide, straight-on

SOUND EFFECTS:
- Scene 1: Applause (0s offset, 4s duration)
- Scene 3: Whisking sounds (0s offset, 5s duration)
- Scene 5: Sizzling pan (1s offset, 4s duration)
- Scene 7: Applause + outro fanfare (3s offset, 4s duration)

AUDIO: French-accented male host voice, upbeat cooking show music
EFFECTS: None (fixed camera style)

Estimated: 7 images + 5 video clips + 6 transitions + 7 TTS + 4 SFX + 1 music track
Time: ~25-30 minutes
Cost: ~$10-14 (using Vidu Q3 for transitions)

Ready to proceed?"
```

### Phase 5: Generate the Workflow JSON

After approval, create the workflow JSON file and run it.

**Remember:** Tell the user it will take 20-30 minutes before starting!

---

## Complete Workflow JSON Schema

### Required Top-Level Fields

```json
{
  "name": "Video Title",
  "template": "quiz",
  "timing_mode": "tts_driven",
  "scene_padding_seconds": 0.3,

  "consistency": {
    "reference_prompt": "Character/setting description for consistency",
    "seed": 12345678,
    "model": "fal-ai/nano-banana-pro"
  },

  "scenes": [ ... ],

  "audio": {
    "tts": { ... },
    "music": { ... }
  },

  "subtitles": {
    "enabled": true,
    "style": { ... }
  },

  "output": {
    "filename": "output_name.mp4",
    "resolution": "1080x1920",
    "fps": 30,
    "format": "mp4"
  }
}
```

### Scene Schema

```json
{
  "id": "scene_1",
  "description": "Human-readable description",
  "type": "video",  // or "image"
  "timing": {},

  "transition": {  // OPTIONAL - only on scenes 2+
    "model": "fal-ai/vidu/q3/image-to-video",
    "duration": "4",
    "prompt": "Smooth transition description"
  },

  "narration": "What the voice says for this scene",

  "image_generation": {
    "model": "fal-ai/nano-banana-pro/edit",
    "input": {
      "prompt": "Detailed visual description",
      "negative_prompt": "Things to avoid",
      "aspect_ratio": "9:16",
      "seed": 12345678
    }
  },

  "video_generation": {  // Only for type: "video"
    "model": "fal-ai/vidu/image-to-video",
    "input": {
      "prompt": "Motion description, camera stays fixed, only subject moves",
      "duration": "4",
      "movement_amplitude": "small"
    }
  },

  "sound_effects": [
    {
      "prompt": "Sound description",
      "timing_offset": 0,
      "duration": 4,
      "volume": 0.6
    }
  ],

  "effects": []  // Ken Burns, vignette, grain, etc.
}
```

---

## Production Workflow Example

For high-quality horror videos with visual consistency, use this structure:

```json
{
  "name": "The Watchers - Horror Production",
  "template": "horror",
  "timing_mode": "tts_driven",
  "scene_padding_seconds": 0.5,
  "min_scene_duration_seconds": 5,

  "consistency": {
    "reference_prompt": "Full-body character design of a dark animated horror entity...",
    "seed": 666,
    "resolution": "2K"
  },

  "scenes": [
    {
      "id": "frame_1",
      "description": "Exterior - Abandoned mansion at night, establishing shot",
      "type": "video",
      "timing": {},
      "narration": "They say the mansion on Ashwood Lane has been empty for forty years...",

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
      "voice_prompt": "A low raspy whispering male voice, speaking slowly with dread...",
      "language": "en",
      "speed": 0.85
    },
    "music": {
      "generate": true,
      "prompt": "Dark ambient horror soundtrack, deep pulsing sub-bass drones in D minor...",
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
      "stroke_width": 5,
      "position": "center",
      "animation": "word_by_word",
      "font_size": 72
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
| `fal-ai/vidu/image-to-video` | 4s | $0.20 | Good | Basic Vidu |
| `fal-ai/vidu/q3/image-to-video` | 1-16s | $0.50-1.50 | Best | Smoothest motion, transitions |

**⚠️ Duration format matters:**
- kandinsky5-pro requires: `"duration": "5s"` (with "s" suffix)
- Kling/Vidu use: `"duration": "5"` or `"duration": "8"` (number as string)

### Talking Head Models (Lip-Sync)

| Model | Resolution | Cost | Notes |
|-------|------------|------|-------|
| `veed/fabric-1.0/text` | 720p, 480p | ~$0.50 | Best lip-sync, generates audio |

**Use for:** AI presenters, news anchors, character dialogue, any "person speaking" content.

### Transition Models

| Model | Cost | Quality | Notes |
|-------|------|---------|-------|
| `fal-ai/vidu/q3/image-to-video` | $0.50-1.50 | Best | Smooth morphing between keyframes |
| `fal-ai/pixverse/image-to-video` | $0.45 | Good | Supports style parameter |

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
- **Add transitions** for smooth continuous footage (cooking shows, tutorials, presentations)
- Add **sound effects** to 3-4 key scenes for immersion

### Decision Tree: Video vs Image vs Transition

```
Is this the first scene?
├── YES → type: "video" (strong hook), NO transition
└── NO → Does this scene need motion?
    ├── YES → type: "video"
    │   └── Should it flow smoothly from previous scene?
    │       ├── YES → ADD transition
    │       └── NO (jump cut is intentional) → NO transition
    └── NO → type: "image"
        └── Should it flow smoothly from previous scene?
            ├── YES → ADD transition
            └── NO → NO transition, use Ken Burns for subtle motion
```

### Content Type Recommendations

| Content Type | Video Scenes | Transitions | Effects |
|--------------|--------------|-------------|---------|
| Horror | 3-4 | Selective | vignette, grain, flicker |
| Cooking Show | 4-5 | ALL (except first) | None (clean look) |
| Tutorial | 3-4 | ALL (except first) | None or minimal |
| Motivation | 2-3 | Optional | kenburns on images |
| Quiz/Trivia | 2-3 | None | Clean, vibrant |
| Fast montage | 3-5 | None (hard cuts) | Template-dependent |

---

## CLI Commands

```bash
# Generate video from workflow JSON (full pipeline)
clawvid generate --workflow workflow.json
clawvid generate --workflow workflow.json --quality max_quality
clawvid generate --workflow workflow.json --template horror --skip-cache

# PHASED GENERATION - Generate in stages with review
clawvid generate --workflow workflow.json --phase images      # Images only, pause for review
clawvid generate --workflow workflow.json --phase videos      # Videos only (uses existing images)
clawvid generate --workflow workflow.json --phase audio       # Audio only
clawvid generate --workflow workflow.json --phase render      # Render only

# VISION QA - Check images for issues before continuing
clawvid generate --workflow workflow.json --qa                # Enable QA checks
clawvid generate --workflow workflow.json --qa-auto-fix       # Auto-regenerate failed images

# SELECTIVE REGENERATION - Fix specific scenes
clawvid generate --workflow workflow.json --regenerate scene_5,scene_6
clawvid generate --workflow workflow.json --use-existing-images --regenerate scene_3

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
Phase 5 (3-5 min): Generate transitions (if any scenes have transition field)
Phase 6 (1-2 min): Generate sound effects (beatoven)
Phase 7 (1-2 min): Generate background music (beatoven)
Phase 8 (2-3 min): Transcribe narration with Whisper (for word-level subtitles)
Phase 9 (1-2 min): Mix audio (narration + music + SFX)
Phase 10 (2-3 min): Render with Remotion + FFmpeg post-processing

Total: ~20-30 minutes for a 6-scene video with transitions
```

---

## Available Effects

Effects are applied per-scene via the `effects` array. Names are fuzzy-matched.

| Effect | Variants | Description |
|--------|----------|-------------|
| `vignette` | `vignette_subtle`, `vignette_heavy` | Dark edges |
| `grain` | `grain_subtle`, `grain_heavy` | Film grain noise |
| `ken_burns` | `kenburns_slow_zoom`, `kenburns_slow_pan`, `kenburns_zoom_out` | Zoom/pan on images |
| `flicker` | `flicker_subtle` | Light flickering |
| `glitch` | `glitch_subtle`, `glitch_heavy` | RGB splitting |
| `chromatic_aberration` | `chromatic_aberration_subtle` | Color fringing |

**Note:** For fixed-camera content (cooking shows), do NOT use Ken Burns effects.

---

## Templates

Templates apply color grading, overlays, and default effects.

### horror
- **Color grading:** `saturate(0.6) brightness(0.85) contrast(1.15)`
- **Default effects:** vignette, grain
- **Voice:** Deep, slow (pacing 0.85)

### motivation
- **Color grading:** `saturate(1.1) brightness(1.05) sepia(0.12)`
- **Default effects:** (none)
- **Voice:** Warm, confident (pacing 1.0)

### quiz
- **Color grading:** `saturate(1.25) brightness(1.08) contrast(1.1)`
- **Default effects:** (none)
- **Voice:** Energetic, clear (pacing 1.1)

### reddit
- **Color grading:** `saturate(0.9) brightness(0.95)`
- **Default effects:** (none)
- **Voice:** Casual, conversational (pacing 1.0)

---

## 🔍 Vision QA: Detecting Image Issues

ClawVid includes Vision QA to automatically detect common issues in AI-generated images.

### What Vision QA Checks For

| Issue Type | Severity | Example |
|------------|----------|---------|
| `hallucinated_text` | Error | "PROJECT: MIDNIGHT ECHO" appearing in image |
| `unwanted_logo` | Error | History Channel logo, stock watermarks |
| `stock_image` | Warning | Generic stock photo look |
| `style_drift` | Warning | Image style differs from reference |
| `missing_element` | Warning | Requested subject not visible |

### Common Hallucinations to Watch For

Image models often hallucinate text/logos when prompted with certain terms:

**Trigger words that cause issues:**
- "History Channel style" → Adds History logo
- "documentary" → Adds fake title cards
- "professional" → Adds stock watermarks
- "news" → Adds news tickers/logos
- "Netflix/HBO style" → Adds streaming logos

**Safe alternatives:**
- "cinematic" instead of "History Channel style"
- "film grain, moody lighting" instead of "documentary"
- "high quality, detailed" instead of "professional"

### Using Vision QA

```bash
# Check images after generation
clawvid generate --workflow x.json --qa

# Auto-fix by regenerating with sanitized prompts
clawvid generate --workflow x.json --qa-auto-fix
```

### Preventing Issues in Prompts

Always include in `negative_prompt`:
```
"negative_prompt": "text, watermark, logo, brand, copyright, title card, news ticker, TV graphics, stock photo"
```

### Phased Generation for Manual Review

For critical projects, generate images first and review:

```bash
# Step 1: Generate images only
clawvid generate --workflow x.json --phase images

# Step 2: Review images in output folder
# Step 3: Fix problematic scenes
clawvid generate --workflow x.json --regenerate scene_5,scene_6

# Step 4: Continue with videos
clawvid generate --workflow x.json --phase videos --use-existing-images
```

### Skip QA for Specific Scenes

Add `skip_qa: true` to scenes that should bypass checking:

```json
{
  "id": "scene_3",
  "type": "static",
  "skip_qa": true,
  "static_image": { "url": "..." }
}
```

---

## Common Mistakes to Avoid

### ❌ Mistake: No transitions on continuous content
```json
// WRONG - cooking show with hard cuts
{ "id": "scene_2", "type": "video", ... }
{ "id": "scene_3", "type": "video", ... }
```
```json
// CORRECT - smooth flow
{ "id": "scene_2", "transition": { "model": "fal-ai/vidu/q3/image-to-video", "duration": "4", "prompt": "..." }, "type": "video", ... }
```

### ❌ Mistake: Transition on first scene
```json
// WRONG - no previous scene to transition from
{ "id": "scene_1", "transition": { ... }, ... }
```
```json
// CORRECT - first scene has no transition
{ "id": "scene_1", "type": "video", ... }
```

### ❌ Mistake: Video prompt doesn't match image
```json
// WRONG - video describes new content
"image_prompt": "Chef standing at counter"
"video_prompt": "Chef running through kitchen"
```
```json
// CORRECT - video describes motion OF the image
"image_prompt": "Chef standing at counter"
"video_prompt": "Chef gestures while standing at counter, camera fixed"
```

### ❌ Mistake: Ken Burns on fixed-camera content
```json
// WRONG - breaks the "fixed camera" illusion
"effects": ["kenburns_slow_zoom"]
```
```json
// CORRECT - no camera movement effects
"effects": []
```

### ❌ Mistake: Prompts that trigger hallucinated text/logos
```json
// WRONG - triggers History Channel branding
"prompt": "Dark cinematic documentary style, History Channel conspiracy aesthetic..."
```
```json
// CORRECT - same style without brand references
"prompt": "Dark cinematic film style, moody lighting, dramatic shadows, blue and orange color grading, film grain texture...",
"negative_prompt": "text, watermark, logo, brand, title card, TV graphics"
```

### ❌ Mistake: Inconsistent camera descriptions
```json
// WRONG - different angles break continuity
"scene_1 prompt": "...wide angle shot..."
"scene_2 prompt": "...close-up shot..."
"scene_3 prompt": "...overhead view..."
```
```json
// CORRECT - same angle throughout
"All prompts": "Fixed camera cooking show shot, medium wide angle view, straight-on at chest height, ..."
```

---

## Conversation Flow

### Full Flow

```
1. READ THIS SKILL — Every time, fresh
2. CHECK PREFERENCES — Load preferences.json or run setup
3. GATHER REQUIREMENTS — Topic, format, style questions
4. DECIDE ON TRANSITIONS — For continuous content, recommend transitions
5. BUILD PLAN — Present scene breakdown with transition plan
6. GET APPROVAL — Wait for explicit "go"
7. WARN ABOUT TIME — "This will take 20-30 minutes. Ready?"
8. GENERATE WORKFLOW — Create the workflow JSON (following ALL rules above)
9. EXECUTE — Run clawvid generate --workflow <file> (NO TIMEOUT!)
10. MONITOR — Poll process and report progress
11. REVIEW — Check outputs
12. DELIVER — Compress, send video to chat, show cost summary
```

### Delivery Checklist

When generation completes:
1. **Compress video** for chat delivery (ffmpeg H.264, CRF 26-28, ~15-20MB target)
2. **Send video to user** via `message` tool with filePath
3. **Show cost summary** and output location
4. **Ask for feedback** — any scenes to regenerate?

```bash
# Compress for chat delivery
ffmpeg -y -i output/.../tiktok/final.mp4 \
  -c:v libx264 -preset fast -crf 28 \
  -c:a aac -b:a 128k \
  output/.../tiktok/playable.mp4

# Send to user
message action=send filePath=/path/to/playable.mp4 caption="🎬 Your video is ready!"
```

---

## Quality Checks

After each generation step, verify:

### Images
- Matches scene description and mood
- Consistent style with other scenes (same character, same setting)
- Correct camera angle if using fixed-camera style

### Videos
- Smooth motion, no flickering
- Subject stays coherent throughout
- Camera movement matches prompt (or stays fixed if specified)

### Transitions
- Smooth morph between scenes
- No jarring jumps in character position
- Consistent lighting/style throughout

### Audio
- Clear pronunciation
- Correct pacing
- Music doesn't overpower narration

---

## Tips

- **Always read this SKILL.md before creating a workflow**
- Front-load video clips (opening matters most)
- Use transitions for professional, continuous content
- Add `"movement_amplitude": "small"` for stable video clips
- Include "camera stays fixed" in video prompts for cooking/tutorial content
- Add "NOT realistic" to animated content video prompts
- Use same seed across all scene images for character consistency
- **Never timeout the generate process** — let it complete naturally
- Compress output before sending to chat (telegram limit ~50MB)
