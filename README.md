# ClawVid

AI-powered short-form video generation skill for OpenClaw.

Generate YouTube Shorts, TikToks, and Reels from text prompts. The OpenClaw agent orchestrates the entire pipeline using fal.ai.

## Overview

ClawVid is an OpenClaw skill where **the agent is the brain**. It:
- Breaks content into scenes
- Generates JSON instructions for each generation step
- Decides when to use images vs video clips
- Reviews outputs and iterates
- Composes the final video

All AI generation flows through **fal.ai** - one API, one key.

```
"Make a scary story video about a haunted library"
                    ↓
┌─────────────────────────────────────────────────────┐
│              OpenClaw Agent (Orchestrator)          │
│                                                     │
│  1. Parse content → scene breakdown                 │
│  2. Generate JSON instructions per scene            │
│  3. Decide: image vs video clip per scene           │
│  4. Call fal.ai for each asset                      │
│  5. Review outputs, regenerate if needed            │
│  6. Generate TTS narration                          │
│  7. Compose with Remotion                           │
│  8. Verify preview frames                           │
│  9. Render final video                              │
│                                                     │
└─────────────────────────────────────────────────────┘
                    ↓
           finished_video.mp4
```

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     OpenClaw Agent                              │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │                    SKILL.md                               │ │
│  │  - Task breakdown instructions                            │ │
│  │  - JSON schema for each step                              │ │
│  │  - Decision criteria (image vs video)                     │ │
│  │  - Quality checks and iteration rules                     │ │
│  └───────────────────────────────────────────────────────────┘ │
│                              ↓                                  │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │              Agent-Generated JSON Workflows               │ │
│  │                                                           │ │
│  │  scene_1.json → { model, prompt, style, negative... }     │ │
│  │  scene_2.json → { model, prompt, image_url, motion... }   │ │
│  │  audio.json   → { text, voice_style, speed... }           │ │
│  │  compose.json → { scenes, timing, effects, music... }     │ │
│  │                                                           │ │
│  └───────────────────────────────────────────────────────────┘ │
│                              ↓                                  │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                        fal.ai API                               │
│                                                                 │
│  Images:     flux/dev, grok-imagine, flux-pro                   │
│  Video:      kling-video, minimax-video, luma-dream-machine     │
│  Audio:      f5-tts, whisper                                    │
│  LLM:        meta-llama (for script if needed)                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    Remotion Composition                         │
│                                                                 │
│  - Templates (horror, motivation, quiz, reddit)                 │
│  - Effects (vignette, grain, glitch, vhs)                       │
│  - Subtitles                                                    │
│  - Final render                                                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Agent Responsibilities

The OpenClaw agent handles ALL logic:

| Task | Agent Does |
|------|-----------|
| **Script** | Breaks content into scenes with timing |
| **Image Prompts** | Writes detailed prompts per scene |
| **Model Selection** | Chooses flux vs grok-imagine based on style |
| **Image vs Video** | Decides which scenes need motion |
| **Quality Review** | Views generated assets, regenerates if bad |
| **Iteration** | Adjusts prompts based on results |
| **Composition** | Defines timing, transitions, effects |

## JSON Workflow Format

The agent generates JSON instructions that can also be used in fal.ai's web interface.

### Scene Image Generation

```json
{
  "model": "fal-ai/flux/dev",
  "input": {
    "prompt": "Dark abandoned hospital corridor, flickering lights, wheelchair in distance, horror atmosphere, cinematic lighting, 8k",
    "negative_prompt": "bright, cheerful, people, cartoon",
    "image_size": "portrait_16_9",
    "num_images": 1,
    "guidance_scale": 7.5,
    "seed": 42
  }
}
```

### Image to Video (for key scenes)

```json
{
  "model": "fal-ai/kling-video/v1.5/pro/image-to-video",
  "input": {
    "prompt": "Slow zoom into dark corridor, lights flicker ominously, dust particles float",
    "image_url": "{{scene_1_image_url}}",
    "duration": "5",
    "aspect_ratio": "9:16"
  }
}
```

### TTS Narration

```json
{
  "model": "fal-ai/f5-tts",
  "input": {
    "gen_text": "The hospital had been abandoned for thirty years. No one knew why the lights still flickered.",
    "ref_audio_url": "https://example.com/creepy-voice-sample.wav",
    "model_type": "F5-TTS"
  }
}
```

### Composition Manifest

```json
{
  "template": "horror",
  "duration_seconds": 60,
  "scenes": [
    {
      "id": "scene_1",
      "type": "video",
      "asset": "{{scene_1_video_url}}",
      "start": 0,
      "duration": 5,
      "effects": ["vignette", "grain"],
      "text": null
    },
    {
      "id": "scene_2", 
      "type": "image",
      "asset": "{{scene_2_image_url}}",
      "start": 5,
      "duration": 8,
      "effects": ["kenburns", "flicker"],
      "text": "The lights flickered..."
    }
  ],
  "audio": {
    "narration": "{{narration_url}}",
    "music": "ambient_horror_loop.mp3",
    "music_volume": 0.3
  },
  "subtitles": {
    "enabled": true,
    "style": "horror"
  }
}
```

## Decision Logic

The agent follows these rules:

### When to use VIDEO clips (Kling)
- Opening scene (hook)
- Climax/dramatic moment
- Closing scene
- Max 2-3 video clips per 60s video (cost/time)

### When to use IMAGES with Ken Burns
- Transitional scenes
- Descriptive narration
- Most of the video (70-80%)

### When to use Image-to-Image
- Need consistent style across scenes
- Want to modify an existing generation
- Creating variations

## Directory Structure

```
clawvid/
├── SKILL.md                    # Agent instructions
├── package.json
│
├── src/
│   ├── index.ts                # CLI entry
│   │
│   ├── fal/                    # fal.ai client
│   │   ├── client.ts           
│   │   ├── models.ts           # Model definitions
│   │   └── types.ts            
│   │
│   ├── render/                 
│   │   └── remotion.ts         
│   │
│   └── utils/
│       └── config.ts           
│
├── remotion/                   # Video templates
│   └── src/
│       └── templates/
│           ├── horror/
│           ├── motivation/
│           ├── quiz/
│           └── reddit/
│
├── workflows/                  # Example JSON workflows
│   ├── horror-story.json
│   ├── motivation-quote.json
│   └── reddit-post.json
│
└── output/
```

## fal.ai Models Reference

### Image Generation

| Model | Use Case | Speed |
|-------|----------|-------|
| `fal-ai/flux/dev` | General, fast | Fast |
| `fal-ai/flux-pro/v1.1` | High quality | Medium |
| `fal-ai/grok-imagine` | Aesthetic, stylized | Medium |

### Image to Video

| Model | Use Case | Duration |
|-------|----------|----------|
| `fal-ai/kling-video/v1.5/pro/image-to-video` | High quality motion | 5-10s |
| `fal-ai/minimax-video/image-to-video` | Fast, good quality | 5s |
| `fal-ai/luma-dream-machine` | Cinematic | 5s |

### Audio

| Model | Use Case |
|-------|----------|
| `fal-ai/f5-tts` | Voice cloning TTS |
| `fal-ai/whisper` | Transcription for subtitles |

## Configuration

Single API key:

```
FAL_KEY=...
```

## Installation

```bash
git clone https://github.com/neur0map/clawvid
cd clawvid
npm install
cp .env.example .env
# Add your FAL_KEY
npm link
```

## Usage

The agent orchestrates everything. Example flow:

```
You: Make a 60 second horror video about a haunted library

Agent: I'll create this video. Let me plan:

**Scene Breakdown:**
1. Opening (0-5s) - Exterior shot, old library at night [VIDEO]
2. Scene 2 (5-15s) - Empty reading room, dust particles [IMAGE]
3. Scene 3 (15-25s) - Close up of old book opening [IMAGE]
4. Scene 4 (25-35s) - Shadow moves between shelves [VIDEO]
5. Scene 5 (35-50s) - Protagonist discovers writing [IMAGE]
6. Closing (50-60s) - Reveal shot [VIDEO]

Generating assets...

[Generates scene_1.json, calls fal.ai]
[Reviews output - looks good]
[Generates scene_2.json, calls fal.ai]
[Reviews output - too bright, regenerating with darker prompt]
...

Preview frames ready. Here's frame 0, 30, and 55:
[Shows images]

Ready to render?

You: Scene 4 needs more shadow, it's not scary enough

Agent: Regenerating scene 4 with enhanced prompt:
"Dark library aisle, menacing shadow figure between bookshelves, 
only silhouette visible, horror movie lighting, extremely dark..."

[Regenerates, shows new preview]

Better?

You: Yes, render it

Agent: Rendering final video...
Done: output/haunted_library.mp4
```

## License

MIT
