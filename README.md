# ShortGen

AI-powered short-form video generation skill for OpenClaw.

Generate YouTube Shorts, TikToks, and Reels from text prompts. Fully automated pipeline: script, images, audio, and video composition.

## Overview

ShortGen is an OpenClaw skill that turns prompts into finished short-form videos. It combines AI content generation with programmatic video editing.

```
"Make a scary story video about a haunted library"
                    ↓
        ┌─────────────────────┐
        │      ShortGen       │
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
│  Agent calls: shortgen generate --template horror --source ...  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                      ShortGen Pipeline                          │
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
shortgen/
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

```markdown
# ShortGen

Generate short-form videos (YouTube Shorts, TikTok, Reels) from text prompts.

## Capabilities

- Generate videos from Reddit posts (r/nosleep, r/AITA, r/AskReddit)
- Create motivational quote videos
- Make quiz/trivia videos
- Horror/scary story videos with effects

## Commands

### Generate Video

\`\`\`bash
shortgen generate [options]
\`\`\`

Options:
- `--template <name>` - Template: horror, motivation, quiz, reddit (default: reddit)
- `--source <type>` - Source: reddit, text, url (default: reddit)
- `--subreddit <name>` - Subreddit to fetch from (default: nosleep)
- `--text <content>` - Direct text input (for source=text)
- `--voice <id>` - ElevenLabs voice ID
- `--duration <sec>` - Target duration in seconds (default: 60)
- `--output <path>` - Output path (default: ./output/video.mp4)
- `--preview` - Render preview frames only (no full video)

### List Templates

\`\`\`bash
shortgen templates
\`\`\`

### Preview Frame

\`\`\`bash
shortgen preview --template horror --frame 30
\`\`\`

Renders a single frame for verification before full render.

## Examples

### Horror Story from Reddit

\`\`\`bash
shortgen generate --template horror --source reddit --subreddit nosleep
\`\`\`

### Motivational Quote

\`\`\`bash
shortgen generate --template motivation --source text --text "The only way to do great work is to love what you do."
\`\`\`

### Quiz Video

\`\`\`bash
shortgen generate --template quiz --source text --text "What is the capital of France? A) London B) Paris C) Berlin D) Madrid"
\`\`\`

## Templates

### horror
- Dark color grading
- VHS/glitch effects
- Creepy ambient audio
- Slow Ken Burns on AI images
- Typewriter text reveal

### motivation
- Clean typography
- Stock footage background
- Uplifting music
- Fade transitions

### quiz
- Question → Timer → Reveal format
- Sound effects
- Bold text animations

### reddit
- Reddit post screenshot overlay
- Background gameplay/satisfying footage
- TTS reading the post

## Configuration

Create `.shortgen.json` in workspace or set environment variables:

\`\`\`json
{
  "openai_api_key": "sk-...",
  "elevenlabs_api_key": "...",
  "replicate_api_token": "...",
  "default_voice": "pNInz6obpgDQGcFmaJgB",
  "default_template": "horror"
}
\`\`\`

Or environment variables:
- `OPENAI_API_KEY`
- `ELEVENLABS_API_KEY`
- `REPLICATE_API_TOKEN`

## Output

Videos are saved to `./output/` by default:
- `video.mp4` - Final rendered video (1080x1920, 9:16)
- `preview/` - Preview frames if --preview used
- `assets/` - Generated images and audio (for debugging)

## Verification

Before full render, use `--preview` to check frames:

\`\`\`bash
shortgen generate --template horror --preview
# Outputs: preview/frame_0.png, preview/frame_30.png, preview/frame_60.png
\`\`\`

Review the frames, then render full video:

\`\`\`bash
shortgen generate --template horror
\`\`\`
```

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
git clone https://github.com/neur0map/shortgen
cd shortgen

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

[runs: shortgen generate --template horror --source text --text "..."]

Here are preview frames:
[shows frame_0.png, frame_30.png, frame_60.png]

Does this look good? I can adjust the pacing or regenerate images.

You: The second image is too bright, make it darker

Agent: [regenerates image, re-renders]

Done. Video saved to output/video.mp4
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
