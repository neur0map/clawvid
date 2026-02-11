# ClawVid

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
- Create motivational quote videos with AI-generated visuals
- Make quiz/trivia videos with reveal animations
- Horror/scary story videos with VHS effects, glitch, grain
- AI-generated images via fal.ai (Flux 2, Grok Imagine)
- AI-generated video clips via fal.ai (Kling 3.0)
- High-quality TTS narration via fal.ai (F5-TTS)
- Auto-generated subtitles via fal.ai (Whisper)

## AI Platform

All AI generation uses **fal.ai** - one API for everything:

| Task | Model |
|------|-------|
| Images | `fal-ai/flux/dev` or `fal-ai/grok-imagine` |
| Image→Video | `fal-ai/kling-video/v1.5/pro/image-to-video` |
| TTS | `fal-ai/f5-tts` |
| Transcription | `fal-ai/whisper` |

## Commands

### Generate Video

```bash
clawvid generate [options]
```

**Options:**

| Flag | Description | Default |
|------|-------------|---------|
| `--template <name>` | Template: horror, motivation, quiz, reddit | reddit |
| `--source <type>` | Source: reddit, text, url | reddit |
| `--subreddit <name>` | Subreddit to fetch from | nosleep |
| `--text <content>` | Direct text input (when source=text) | - |
| `--voice <style>` | Voice style: creepy, warm, neutral, energetic | neutral |
| `--duration <sec>` | Target duration in seconds | 60 |
| `--output <path>` | Output file path | ./output/video.mp4 |
| `--preview` | Render preview frames only, no full video | false |
| `--with-video-clips` | Use Kling to animate images (slower, higher quality) | false |

### List Templates

```bash
clawvid templates
```

Shows available templates with descriptions.

### Preview Frame

```bash
clawvid preview --template horror --frame 30
```

Renders a single frame for visual verification before committing to full render.

## Examples

### Horror Story from Reddit

```bash
clawvid generate --template horror --source reddit --subreddit nosleep
```

Fetches a story from r/nosleep, generates creepy AI images, adds horror effects.

### Custom Horror Story with Video Clips

```bash
clawvid generate --template horror --source text --with-video-clips --text "The door to the basement was never supposed to open on its own..."
```

Uses Kling 3.0 to animate images into short video clips for smoother motion.

### Motivational Quote Video

```bash
clawvid generate --template motivation --source text --voice warm --text "The only way to do great work is to love what you do. - Steve Jobs"
```

Creates a clean video with the quote over AI-generated visuals.

### Quiz Video

```bash
clawvid generate --template quiz --source text --text "What is the largest planet in our solar system? A) Mars B) Jupiter C) Saturn D) Neptune | Answer: B"
```

### Preview Before Render

```bash
clawvid generate --template horror --source reddit --preview
```

Generates script, images, audio but only renders 3 preview frames. Use this to verify the video will look good before full render.

## Templates

### horror
- **Style:** Dark, creepy, unsettling
- **Effects:** Vignette, film grain, flicker, VHS distortion
- **Audio:** Ambient horror, creepy TTS voice (F5-TTS)
- **Motion:** Slow Ken Burns or Kling video clips
- **Text:** Typewriter reveal
- **Image model:** Flux 2 with dark aesthetic prompts

### motivation
- **Style:** Clean, uplifting, professional
- **Effects:** Subtle fade transitions
- **Audio:** Inspiring background music, warm TTS voice
- **Motion:** Smooth Ken Burns
- **Text:** Bold centered typography
- **Image model:** Grok Imagine for aesthetic shots

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
- **Motion:** Static or looping AI-generated background
- **Text:** Reddit-style formatting

## Workflow

```
1. Content → Reddit API / RSS / Direct text
2. Script  → OpenAI GPT-4 (scene breakdown + image prompts)
3. Images  → fal.ai Flux 2 (one per scene)
4. Video   → fal.ai Kling 3.0 (optional, image→video)
5. Audio   → fal.ai F5-TTS (narration)
6. Render  → Remotion (composition + effects)
7. Output  → MP4 (1080x1920, 9:16)
```

## Verification

Before full render, always offer to preview:

```bash
clawvid generate --template horror --preview
# Creates: preview/frame_0.png, preview/frame_middle.png, preview/frame_end.png
```

Show these frames to the user. If they approve, render full video. If not, adjust and regenerate.

## Configuration

Requires API keys in environment or `.clawvid.json`:

```
FAL_KEY=...
OPENAI_API_KEY=sk-...
```

That's it. Two API keys for the entire pipeline.

## Output

- Videos saved to `./output/` 
- Format: MP4, 1080x1920 (9:16 vertical)
- Frame rate: 30fps
- Duration: Based on content (typically 30-90 seconds)

## Error Handling

- If image generation fails, retry with simplified prompt
- If TTS fails, retry with shorter text chunks
- If Kling video fails, fall back to Ken Burns on static images
- If render fails, check Remotion logs in `./output/render.log`

## Tips

- Horror works best with 3-5 scenes, each 10-15 seconds
- Use `--with-video-clips` for premium quality (costs more, slower)
- Motivation works best with single powerful quote
- Quiz needs clear question, 4 options, and answer
- Always preview before full render to save time and credits
