# ClawVid

AI-powered short-form video generation skill for OpenClaw.

Generate YouTube Shorts, TikToks, and Reels from text prompts. Fully automated pipeline: script, images, video clips, audio, and composition.

## Overview

ClawVid is an OpenClaw skill that turns prompts into finished short-form videos. It combines AI content generation with programmatic video editing - all through a unified API.

```
"Make a scary story video about a haunted library"
                    ↓
        ┌─────────────────────┐
        │       ClawVid       │
        │                     │
        │  Script → Images →  │
        │  Video → Audio →    │
        │  Composition        │
        │                     │
        └─────────────────────┘
                    ↓
           finished_video.mp4
```

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        OpenClaw Agent                           │
│                                                                 │
│  User: "make a reddit story video from r/nosleep"               │
│                         ↓                                       │
│  Agent reads SKILL.md → understands capabilities                │
│                         ↓                                       │
│  Agent calls: clawvid generate --template horror --source ...   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                       ClawVid Pipeline                          │
│                                                                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐        │
│  │ Content  │→ │  Image   │→ │  Video   │→ │  Audio   │        │
│  │  Source  │  │   Gen    │  │   Gen    │  │   Gen    │        │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘        │
│       ↓             ↓             ↓             ↓               │
│   - Reddit      ┌────────────────────────────────┐             │
│   - RSS         │          fal.ai API            │             │
│   - Manual      │  - Flux 2 (images)             │             │
│                 │  - Kling 3.0 (image→video)     │             │
│                 │  - Grok Imagine (images)       │             │
│                 │  - Whisper (transcription)     │             │
│                 │  - F5-TTS (voice synthesis)    │             │
│                 └────────────────────────────────┘             │
│                              ↓                                  │
│                    ┌──────────────────┐                        │
│                    │     Remotion     │                        │
│                    │   Composition    │                        │
│                    └──────────────────┘                        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                              ↓
                    Output: video.mp4
```

## Why fal.ai?

Single API for everything:
- **Images:** Flux 2, Grok Imagine, Nano Banana Pro
- **Video:** Kling 3.0, Veo 3.1, LTX-2
- **Audio:** F5-TTS, Whisper
- **One API key**, one billing, one SDK

No juggling Replicate + ElevenLabs + separate services.

## Language

**TypeScript**

Why:
- OpenClaw runs on Node.js - native integration
- Remotion is TypeScript/React - no language boundary
- Type safety for complex video configs
- fal.ai has official TypeScript SDK

## Tech Stack

| Component | Tool | Purpose |
|-----------|------|---------|
| **Runtime** | Node.js 20+ | Execution environment |
| **AI Platform** | fal.ai | Unified API for all AI generation |
| **Video Rendering** | Remotion | Programmatic video composition |
| **Script Generation** | OpenAI GPT-4 | Content writing, scene breakdowns |
| **CLI Framework** | Commander.js | Command-line interface |

### fal.ai Models Used

| Task | Model | Why |
|------|-------|-----|
| **Image Generation** | `fal-ai/flux/dev` | Fast, high quality |
| **Image to Video** | `fal-ai/kling-video/v1.5/pro/image-to-video` | Smooth motion |
| **Text to Speech** | `fal-ai/f5-tts` | Natural voices |
| **Transcription** | `fal-ai/whisper` | For subtitle sync |

## Directory Structure

```
clawvid/
├── SKILL.md                    # OpenClaw skill definition
├── package.json
├── tsconfig.json
│
├── src/
│   ├── index.ts                # CLI entry point
│   ├── pipeline.ts             # Main orchestration
│   │
│   ├── sources/                # Content fetching
│   │   ├── reddit.ts           # r/nosleep, r/AITA, etc.
│   │   ├── rss.ts              # News feeds
│   │   └── manual.ts           # Direct text input
│   │
│   ├── fal/                    # fal.ai integrations
│   │   ├── client.ts           # fal.ai SDK wrapper
│   │   ├── images.ts           # Image generation
│   │   ├── video.ts            # Image-to-video
│   │   └── audio.ts            # TTS and transcription
│   │
│   ├── render/                 # Video composition
│   │   ├── remotion.ts         # Remotion wrapper
│   │   └── preview.ts          # Frame preview for verification
│   │
│   └── utils/
│       ├── config.ts           # API keys, settings
│       └── logger.ts           # Progress logging
│
├── remotion/                   # Remotion project
│   ├── remotion.config.ts
│   ├── src/
│   │   ├── Root.tsx
│   │   ├── Video.tsx
│   │   │
│   │   └── templates/          # Video templates
│   │       ├── horror/         # Scary story template
│   │       │   ├── index.tsx
│   │       │   ├── Scene.tsx
│   │       │   └── styles.ts
│   │       │
│   │       ├── motivation/     # Quote template
│   │       ├── quiz/           # Trivia template
│   │       └── reddit/         # Reddit post overlay
│   │
│   └── public/
│       ├── fonts/
│       └── music/
│
├── templates/                  # Template configs (non-code)
│   ├── horror.json
│   ├── motivation.json
│   └── quiz.json
│
└── output/                     # Generated videos
```

## SKILL.md

The SKILL.md file tells OpenClaw how to use ClawVid. See [SKILL.md](./SKILL.md) for the full specification.

## Pipeline Flow

```
1. CONTENT
   └── Fetch from Reddit / RSS / direct text input

2. SCRIPT (OpenAI)
   └── Break content into scenes
   └── Generate image prompts for each scene
   └── Determine timing and pacing

3. IMAGES (fal.ai - Flux 2)
   └── Generate AI images for each scene
   └── Style-matched to template (horror, motivation, etc.)

4. VIDEO CLIPS (fal.ai - Kling 3.0) [Optional]
   └── Convert key images to short video clips
   └── Add subtle motion (Ken Burns alternative)

5. AUDIO (fal.ai - F5-TTS)
   └── Generate voice narration
   └── Match voice style to template

6. COMPOSITION (Remotion)
   └── Combine images/clips + audio
   └── Apply effects (glitch, grain, vignette)
   └── Add subtitles
   └── Render final video

7. OUTPUT
   └── video.mp4 (1080x1920, 9:16)
```

## Templates

Each template defines:
- Visual style (colors, effects, transitions)
- Audio style (music, voice settings)
- Content structure (scenes, timing)
- Remotion components
- fal.ai model preferences

### Horror Template

```typescript
// remotion/src/templates/horror/index.tsx
export const HorrorTemplate: React.FC<HorrorProps> = ({ scenes, audio }) => {
  return (
    <AbsoluteFill style={{ backgroundColor: '#0a0a0a' }}>
      <Audio src={audio} />
      
      {scenes.map((scene, i) => (
        <Sequence from={scene.startFrame} durationInFrames={scene.duration}>
          <HorrorScene 
            image={scene.image}
            video={scene.video} // Optional Kling-generated clip
            text={scene.text}
            effects={['vignette', 'grain', 'flicker']}
          />
        </Sequence>
      ))}
      
      <Subtitles words={subtitles} style="horror" />
    </AbsoluteFill>
  );
};
```

### Effects Available

| Effect | Description |
|--------|-------------|
| `vignette` | Dark edges |
| `grain` | Film grain overlay |
| `flicker` | Random brightness flicker |
| `glitch` | RGB split + distortion |
| `vhs` | VHS tracking lines |
| `shake` | Camera shake |
| `kenburns` | Slow pan/zoom on stills |
| `chromatic` | Chromatic aberration |

## API Requirements

| Service | Required | Free Tier |
|---------|----------|-----------|
| fal.ai | Yes | $10 free credits |
| OpenAI | Yes (scripts only) | $5 credit |

That's it. Two API keys.

## Installation

```bash
# Clone
git clone https://github.com/neur0map/clawvid
cd clawvid

# Install dependencies
npm install

# Install Remotion dependencies
cd remotion && npm install && cd ..

# Configure
cp .env.example .env
# Edit .env with your API keys

# Link CLI
npm link
```

## Usage with OpenClaw

Once installed as a skill, OpenClaw can:

1. **Understand the skill** via SKILL.md
2. **Generate videos** by running CLI commands
3. **Preview frames** to verify before full render
4. **Iterate** based on your feedback

Example conversation:

```
You: Make me a scary video about an abandoned hospital

Agent: I'll create a horror video. Let me:
1. Generate a script about an abandoned hospital
2. Create AI images for each scene (Flux 2)
3. Generate creepy narration (F5-TTS)
4. Render with horror effects

[runs: clawvid generate --template horror --source text --text "..."]

Here are preview frames:
[shows frame_0.png, frame_30.png, frame_60.png]

Does this look good? I can adjust the pacing or regenerate images.

You: The second image is too bright, make it darker

Agent: [regenerates image, re-renders]

Done. Video saved to output/video.mp4
```

## CLI Reference

```bash
# Generate a video
clawvid generate --template horror --source reddit --subreddit nosleep

# List available templates
clawvid templates

# Preview frames before full render
clawvid preview --template horror --frame 30

# Show help
clawvid --help
```

## Development

```bash
# Run in dev mode
npm run dev

# Preview Remotion templates
cd remotion && npm run studio

# Build
npm run build

# Test
npm test
```

## Roadmap

- [ ] Core pipeline (script → images → audio → video)
- [ ] fal.ai SDK integration
- [ ] Horror template
- [ ] Motivation template
- [ ] Reddit source integration
- [ ] Preview system
- [ ] Image-to-video with Kling (optional enhancement)
- [ ] Quiz template
- [ ] Background music library
- [ ] Auto-upload to YouTube/TikTok

## License

MIT
