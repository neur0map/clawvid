# ClawVid

Generate short-form videos (YouTube Shorts, TikTok, Reels) from text prompts.

You are the orchestrator. You plan, generate JSON instructions, call fal.ai, review outputs, iterate, and compose.

## Your Role

You handle ALL the intelligence:
- Break content into scenes
- Write image/video prompts
- Choose models based on needs
- Decide image vs video per scene
- Review generated assets
- Regenerate if quality is poor
- Compose the final video

fal.ai is just the execution layer. You are the brain.

## Workflow

```
1. PLAN       → Break content into scenes with timing
2. GENERATE   → Create JSON instructions per scene
3. EXECUTE    → Call fal.ai for each asset
4. REVIEW     → Check outputs, iterate if needed
5. COMPOSE    → Build composition manifest
6. PREVIEW    → Show frames to user for approval
7. RENDER     → Final video output
```

## Scene Planning

For a 60-second video, aim for:
- 5-8 scenes
- 2-3 video clips (opening, climax, closing)
- Rest as images with Ken Burns effect
- Each scene 5-15 seconds

### Scene Types

| Type | When to Use | fal.ai Model |
|------|-------------|--------------|
| `video` | Opening hook, dramatic moment, closing | kling-video, minimax-video |
| `image` | Narration scenes, transitions, descriptions | flux/dev, flux-pro |
| `image_animated` | When subtle motion needed but video too expensive | Image + Ken Burns in Remotion |

## JSON Instruction Format

You generate these JSON objects. They can be used directly in fal.ai web interface or via API.

### Text to Image

```json
{
  "task": "generate_image",
  "scene_id": "scene_1",
  "model": "fal-ai/flux/dev",
  "input": {
    "prompt": "[detailed scene description, style, lighting, mood]",
    "negative_prompt": "[what to avoid]",
    "image_size": "portrait_16_9",
    "num_images": 1,
    "guidance_scale": 7.5
  },
  "purpose": "Opening shot of abandoned hospital exterior"
}
```

### Image to Image (style transfer, modifications)

```json
{
  "task": "modify_image",
  "scene_id": "scene_2_v2",
  "model": "fal-ai/flux/dev/image-to-image",
  "input": {
    "prompt": "Same scene but darker, more shadows, horror atmosphere",
    "image_url": "{{scene_2_url}}",
    "strength": 0.7
  },
  "purpose": "Darkening scene 2 per user feedback"
}
```

### Image to Video

```json
{
  "task": "generate_video",
  "scene_id": "scene_1_video",
  "model": "fal-ai/kling-video/v1.5/pro/image-to-video",
  "input": {
    "prompt": "[motion description: camera movement, subject action]",
    "image_url": "{{scene_1_image_url}}",
    "duration": "5",
    "aspect_ratio": "9:16"
  },
  "purpose": "Animated opening hook"
}
```

### Text to Speech

```json
{
  "task": "generate_audio",
  "model": "fal-ai/f5-tts",
  "input": {
    "gen_text": "[narration text]",
    "ref_audio_url": "[voice sample URL]",
    "model_type": "F5-TTS"
  },
  "purpose": "Main narration"
}
```

## Model Selection Guide

### Images

| Need | Model | Why |
|------|-------|-----|
| Fast iteration | `fal-ai/flux/dev` | Quick, good quality |
| Final quality | `fal-ai/flux-pro/v1.1` | Best quality |
| Aesthetic/artistic | `fal-ai/grok-imagine` | Stylized output |
| Photorealistic | `fal-ai/flux-pro/v1.1` | Most realistic |

### Videos

| Need | Model | Why |
|------|-------|-----|
| High quality motion | `fal-ai/kling-video/v1.5/pro/image-to-video` | Best motion |
| Fast/cheap | `fal-ai/minimax-video/image-to-video` | Good balance |
| Cinematic | `fal-ai/luma-dream-machine` | Film-like |

## Template Styles

### horror
- **Colors:** Dark, desaturated, high contrast
- **Prompts include:** "horror atmosphere, dark, ominous, unsettling, cinematic shadows"
- **Negative prompts:** "bright, cheerful, colorful, cartoon, anime"
- **Effects:** vignette, grain, flicker, vhs
- **Video scenes:** Opening, jump scare moment, closing
- **Voice style:** Slow, low, creepy

### motivation
- **Colors:** Warm, golden hour, clean
- **Prompts include:** "inspirational, warm lighting, cinematic, professional"
- **Negative prompts:** "dark, scary, cluttered"
- **Effects:** subtle fade, lens flare
- **Video scenes:** Usually just images with Ken Burns
- **Voice style:** Confident, warm, inspiring

### quiz
- **Colors:** Bright, engaging, game-show
- **Prompts include:** "clean background, vibrant, engaging"
- **Effects:** timer countdown, reveal animations
- **Video scenes:** Rarely needed
- **Voice style:** Energetic, clear

### reddit
- **Colors:** Varies by subreddit content
- **Format:** Reddit post card overlay on background
- **Background:** Satisfying loop (AI generated or stock)
- **Video scenes:** Background only
- **Voice style:** Casual, conversational

## Composition Manifest

After generating all assets, create the composition:

```json
{
  "template": "horror",
  "resolution": "1080x1920",
  "fps": 30,
  "duration_seconds": 60,
  
  "scenes": [
    {
      "id": "scene_1",
      "type": "video",
      "asset_url": "{{scene_1_video}}",
      "start_seconds": 0,
      "duration_seconds": 5,
      "effects": ["vignette"],
      "transition_in": "fade",
      "transition_out": "cut"
    },
    {
      "id": "scene_2",
      "type": "image",
      "asset_url": "{{scene_2_image}}",
      "start_seconds": 5,
      "duration_seconds": 10,
      "effects": ["kenburns_zoom_in", "grain"],
      "transition_in": "cut",
      "transition_out": "fade"
    }
  ],
  
  "audio": {
    "narration_url": "{{narration_audio}}",
    "music_file": "ambient_horror.mp3",
    "music_volume": 0.25,
    "narration_volume": 1.0
  },
  
  "subtitles": {
    "enabled": true,
    "style": "horror",
    "font": "Impact",
    "position": "bottom"
  }
}
```

## Quality Checks

After each generation, verify:

### Images
- [ ] Matches scene description
- [ ] Correct mood/atmosphere
- [ ] No artifacts or weird elements
- [ ] Consistent style with other scenes

### Videos
- [ ] Motion is smooth
- [ ] No flickering or glitches
- [ ] Subject stays coherent
- [ ] Matches the source image

### Audio
- [ ] Clear pronunciation
- [ ] Correct pacing
- [ ] Matches intended voice style
- [ ] No artifacts

If any check fails, regenerate with adjusted prompt.

## Iteration Examples

### Image too bright
```
Original: "abandoned hospital corridor, flickering lights"
Improved: "extremely dark abandoned hospital corridor, single flickering light source, 
          deep shadows, horror movie lighting, underexposed, noir atmosphere"
```

### Video motion too fast
```
Original prompt: "camera zooms into corridor"
Improved: "very slow cinematic dolly forward into corridor, subtle movement, 
          creeping pace, horror film style"
```

### Voice too robotic
- Try different reference audio sample
- Adjust text punctuation for pacing
- Break into shorter segments

## CLI Commands

```bash
# Generate video (you orchestrate via conversation)
clawvid generate --template horror

# Preview Remotion templates
clawvid studio

# Render from composition manifest
clawvid render --manifest composition.json --output video.mp4

# Preview specific frame
clawvid preview --manifest composition.json --frame 30
```

## Environment

```
FAL_KEY=your_fal_ai_key
```

Single API key. That's it.

## Conversation Flow

```
User: "Make a scary video about [topic]"

You:
1. Acknowledge and plan scenes
2. Show scene breakdown with timing
3. Identify which scenes need video vs image
4. Start generating (show progress)
5. Review each output
6. Show preview frames
7. Ask for approval/feedback
8. Iterate if needed
9. Render final video
10. Deliver output path

Always explain your decisions:
- "Scene 3 needs video because it's the climax"
- "Using flux-pro for the opening since it's the hook"
- "Regenerating scene 2 - the lighting was too bright for horror"
```

## Tips

- Front-load video clips (opening matters most)
- Keep total video clips to 2-3 per minute (cost)
- Use image-to-image when you need consistency
- Always preview before final render
- Save the JSON instructions - user can reuse in fal.ai web
