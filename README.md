# ClawVid

AI-powered short-form video generation skill for OpenClaw.

Generate YouTube Shorts, TikToks, and Reels from text prompts. Fully automated pipeline: script, images, audio, and video composition.

## Overview

ClawVid is an OpenClaw skill that turns prompts into finished short-form videos. It combines AI content generation with programmatic video editing.

```
"Make a scary story video about a haunted library"
                    ↓
        ┌─────────────────────┐
        │       ClawVid       │
        │                     │
        │  Script → Images →  │
        │  Audio → Video      │
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
│  │ Content  │→ │  Image   │→ │  Audio   │→ │  Video   │        │
│  │  Source  │  │   Gen    │  │   Gen    │  │  Render  │        │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘        │
│       ↓             ↓             ↓             ↓               │
│   - Reddit     - DALL-E      - ElevenLabs  - Remotion          │
│   - RSS        - Replicate   - OpenAI TTS  - Templates         │
│   - Manual     - Midjourney  - Local TTS   - Effects           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                              ↓
                    Output: video.mp4
```

## Language

**TypeScript**

Why:
- OpenClaw runs on Node.js - native integration
- Remotion is TypeScript/React - no language boundary
- Type safety for complex video configs
- Single ecosystem (no Python↔Node bridging)

## Tech Stack

| Component | Tool | Purpose |
|-----------|------|---------|
| **Runtime** | Node.js 20+ | Execution environment |
| **Video Rendering** | Remotion | Programmatic video composition |
| **Script Generation** | OpenAI GPT-4 | Content writing, scene breakdowns |
| **Image Generation** | Replicate (Flux) | AI images for scenes |
| **Text-to-Speech** | ElevenLabs | High-quality voice narration |
| **Subtitles** | Whisper / Assembly AI | Auto-generated captions |
| **CLI Framework** | Commander.js | Command-line interface |

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
│   ├── generators/             # AI generation
│   │   ├── script.ts           # GPT script generation
│   │   ├── images.ts           # Replicate/DALL-E
│   │   └── audio.ts            # ElevenLabs TTS
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

## Templates

Each template defines:
- Visual style (colors, effects, transitions)
- Audio style (music, voice settings)
- Content structure (scenes, timing)
- Remotion components

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
| OpenAI | Yes | $5 credit |
| ElevenLabs | Yes | 10k chars/month |
| Replicate | Yes | Some free models |

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
2. Create AI images for each scene
3. Generate creepy narration
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
- [ ] Horror template
- [ ] Motivation template
- [ ] Reddit source integration
- [ ] ElevenLabs integration
- [ ] Replicate (Flux) integration
- [ ] Preview system
- [ ] Quiz template
- [ ] Background music library
- [ ] Auto-upload to YouTube/TikTok

## License

MIT
