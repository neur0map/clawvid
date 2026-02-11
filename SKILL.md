# ShortGen

Generate short-form videos (YouTube Shorts, TikTok, Reels) from text prompts.

## When to Use

Use this skill when the user wants to:
- Create a video from a Reddit post or story
- Make a scary/horror story video
- Generate motivational quote videos
- Create quiz or trivia videos
- Turn text content into video format

## Capabilities

- Generate videos from Reddit posts (r/nosleep, r/AITA, r/AskReddit)
- Create motivational quote videos with stock footage
- Make quiz/trivia videos with reveal animations
- Horror/scary story videos with VHS effects, glitch, grain
- AI-generated images for scenes (via Replicate Flux)
- High-quality TTS narration (via ElevenLabs)
- Auto-generated subtitles

## Commands

### Generate Video

```bash
shortgen generate [options]
```

**Options:**

| Flag | Description | Default |
|------|-------------|---------|
| `--template <name>` | Template: horror, motivation, quiz, reddit | reddit |
| `--source <type>` | Source: reddit, text, url | reddit |
| `--subreddit <name>` | Subreddit to fetch from | nosleep |
| `--text <content>` | Direct text input (when source=text) | - |
| `--voice <id>` | ElevenLabs voice ID | default |
| `--duration <sec>` | Target duration in seconds | 60 |
| `--output <path>` | Output file path | ./output/video.mp4 |
| `--preview` | Render preview frames only, no full video | false |

### List Templates

```bash
shortgen templates
```

Shows available templates with descriptions.

### Preview Frame

```bash
shortgen preview --template horror --frame 30
```

Renders a single frame for visual verification before committing to full render.

## Examples

### Horror Story from Reddit

```bash
shortgen generate --template horror --source reddit --subreddit nosleep
```

Fetches a story from r/nosleep, generates creepy AI images, adds horror effects.

### Custom Horror Story

```bash
shortgen generate --template horror --source text --text "The door to the basement was never supposed to open on its own. But every night at 3am, I hear it creak..."
```

### Motivational Quote Video

```bash
shortgen generate --template motivation --source text --text "The only way to do great work is to love what you do. - Steve Jobs"
```

Creates a clean video with the quote over stock footage.

### Quiz Video

```bash
shortgen generate --template quiz --source text --text "What is the largest planet in our solar system? A) Mars B) Jupiter C) Saturn D) Neptune | Answer: B"
```

### Preview Before Render

```bash
shortgen generate --template horror --source reddit --preview
```

Generates script, images, audio but only renders 3 preview frames. Use this to verify the video will look good before full render.

## Templates

### horror
- **Style:** Dark, creepy, unsettling
- **Effects:** Vignette, film grain, flicker, VHS distortion
- **Audio:** Ambient horror, creepy TTS voice
- **Motion:** Slow Ken Burns on images
- **Text:** Typewriter reveal

### motivation
- **Style:** Clean, uplifting, professional
- **Effects:** Subtle fade transitions
- **Audio:** Inspiring background music, warm TTS voice
- **Motion:** Smooth Ken Burns
- **Text:** Bold centered typography

### quiz
- **Style:** Engaging, game-show feel
- **Effects:** Timer countdown, reveal animation
- **Audio:** Tense waiting music, reveal sound effect
- **Motion:** Snap transitions
- **Text:** Large question text, multiple choice options

### reddit
- **Style:** Reddit post overlay on satisfying background
- **Effects:** Post card animation
- **Audio:** TTS reading the post
- **Motion:** Static or looping background
- **Text:** Reddit-style formatting

## Workflow

1. **Content**: Fetch or receive text content
2. **Script**: GPT breaks content into scenes with image prompts
3. **Images**: Replicate Flux generates images for each scene
4. **Audio**: ElevenLabs generates narration
5. **Preview**: (Optional) Render key frames for verification
6. **Render**: Remotion composites final video
7. **Output**: MP4 file ready for upload

## Verification

Before full render, always offer to preview:

```bash
shortgen generate --template horror --preview
# Creates: preview/frame_0.png, preview/frame_middle.png, preview/frame_end.png
```

Show these frames to the user. If they approve, render full video. If not, adjust and regenerate.

## Configuration

Requires API keys in environment or `.shortgen.json`:

```
OPENAI_API_KEY=sk-...
ELEVENLABS_API_KEY=...
REPLICATE_API_TOKEN=...
```

## Output

- Videos saved to `./output/` 
- Format: MP4, 1080x1920 (9:16 vertical)
- Frame rate: 30fps
- Duration: Based on content (typically 30-90 seconds)

## Error Handling

- If image generation fails, retry with simplified prompt
- If TTS fails, fall back to OpenAI TTS
- If render fails, check Remotion logs in `./output/render.log`

## Tips

- Horror works best with 3-5 scenes, each 10-15 seconds
- Motivation works best with single powerful quote
- Quiz needs clear question, 4 options, and answer
- Always preview before full render to save time
