# AI Image Generation Research
## Ultra-Realistic AI Images, UGC Content & Virtual Influencers

Collected: February 2026
Sources: X/Twitter community, @369labsx, AI image creators

---

## Quick Start

### Best Tools for Realistic AI Images

| Tool | Best For | Platform |
|------|----------|----------|
| **Nano Banana Pro** | Ultra-realistic portraits, UGC | Higgsfield, OpenArt |
| **Kling 3.0** | Video with character consistency | Higgsfield |
| **Midjourney** | Stylized images, artistic control | Discord |
| **Flux** | Photorealistic details | Various |

---

## Character Consistency (The #1 Challenge)

### The Reference Sheet Method (from @369labsx)

This is the most reliable method for maintaining character identity across multiple images.

**Step 1: Create a Reference Sheet**
- Generate or compile multiple views of your character
- Include: front, side profile, 3/4 view, expressions
- Save as a single image with all views

**Step 2: Use This Prompt Template**
```
Use the attached reference sheet as the absolute ground truth for the subject's facial features, skin texture, and body proportions. The output must be a 1:1 match of the character provided.

The subject is the woman from the reference image. She is wearing [OUTFIT DESCRIPTION]. 

[SCENE/ACTION DESCRIPTION]

[LIGHTING/ENVIRONMENT DETAILS]
```

**Key Points:**
- "absolute ground truth" = forces model to prioritize reference
- "1:1 match" = demands exact reproduction
- Always attach the reference sheet with your prompt

---

## Prompt Structures That Work

### JSON Format (Nano Banana Pro)

Best results come from detailed JSON-structured prompts:

```json
{
  "prompt": "Photorealistic 8K full-body portrait of beautiful young woman, early 20s, slim athletic build with elegant natural curves, smooth olive-toned skin with natural texture including subtle pores and slight imperfections for realism",
  "environment": "Modern bathroom with soft natural lighting from window, steam slightly visible",
  "pose": "Casual selfie angle, holding phone, slight smile, relaxed posture",
  "technical": "Shot on iPhone 15 Pro, natural lighting, slight motion blur on edges",
  "mood": "Authentic, relatable, morning routine vibe"
}
```

### Sectioned Format

```
## SUBJECT & ACTION
[CHARACTER] looking at camera while holding [PRODUCT].
Natural, relaxed expression with slight smile.

## ENVIRONMENT & CONTEXT
Scene takes place in a modern bathroom.
Soft morning light from frosted window.
Steam visible in background.

## TECHNICAL SPECS
Photorealistic, 8K resolution
Shot on smartphone (iPhone aesthetic)
Shallow depth of field
Natural skin texture with visible pores
```

---

## UGC Content Best Practices

### What Makes AI UGC Believable

**DO:**
- Casual environments (bathroom, bedroom, kitchen)
- Natural lighting (window light, ring light glow)
- Slight imperfections (not too polished)
- Relaxed, authentic poses
- Product held naturally (not perfectly centered)
- Expressions: mid-laugh, slight squint, genuine smile

**DON'T:**
- Studio-perfect lighting
- Stiff, posed positions
- Overly smooth skin (uncanny valley)
- Perfect symmetry
- Generic backgrounds

### UGC Product Selfie Template

```
Young woman in her [20s/30s], [ethnicity/skin tone], taking a casual selfie in [bathroom/bedroom]. 

She's holding [PRODUCT] near her face with a [slight smile/excited expression/mid-laugh].

Wearing [casual outfit - tank top, hoodie, etc].

Natural morning light from window, slight shadows.

Shot on iPhone, slight grain, authentic social media aesthetic.

Skin has natural texture - visible pores, slight under-eye circles, real human imperfections.
```

---

## Video Generation (Kling 3.0 + Higgsfield)

### Single Prompt Workflow

Kling 3.0 on Higgsfield enables:
- 15-second cinematic scenes
- Built-in audio
- Character consistency across shots
- No manual stitching required

**Workflow:**
1. Write detailed scene prompt
2. Include start and end frame references for character
3. Specify camera movements
4. One generation = full scene

**From @0xClo_ver:**
> "the jump from basic gen → cinematic multi-shot is crazy. Higgsfield basically replaced half my editing stack. attached video = one prompt workflow"

---

## Product Image Enhancement

### Supplier Image → Studio Quality (from @369labsx)

**Create a Custom GPT/Gem with these instructions:**

```
You are a professional product image extraction specialist. 

Your purpose is to extract products from supplier images and create a clean, reusable, high-quality asset.

Workflow:
1. User uploads: Supplier image + specifies which product to extract
2. You extract the product cleanly
3. Output: High-quality studio shot with clean background
```

**Use case:** Turn AliExpress-quality product photos into professional studio shots for your store/ads.

---

## Midjourney Style References

### Using --sref for Consistent Style

```
[Your prompt] --ar 3:4 --sref [style_reference_number]
```

**Example styles:**
- `--sref 2262119364` = Monochromatic biomechanical horror with hyper-fine textures

**How to find style refs:**
1. Generate an image you love
2. Note the seed/style number
3. Use --sref to apply that style to new prompts

---

## Key Learnings

1. **Detail matters** - Sparse prompts = generic results. More specific = better.

2. **Reference sheets are essential** - For any recurring character, create a multi-angle reference.

3. **2-3 reruns is normal** - Expect to regenerate for best results.

4. **Lock identity early** - Don't try to match after; bake in the face from the start.

5. **Platform matters** - Nano Banana Pro on Higgsfield/OpenArt best for realistic humans.

6. **JSON format wins** - For Nano Banana Pro, structured prompts outperform plain text.

7. **Imperfection = realism** - Add skin texture, slight imperfections, natural lighting for believability.

---

## Sources & Accounts to Follow

- **@369labsx** - AI content & marketing guides
- **@fullforcetrades** - Reference image workflows
- **@higgsfield_ai** - Platform for Kling 3.0
- **@openart_ai** - Nano Banana Pro access
- Community posts with #higgsfieldpartner hashtag

---

## File Structure

```
ai-image-research/
├── README.md (this file)
├── prompts-collection.json (structured data)
├── examples/
│   └── (example prompts by category)
└── templates/
    └── (copy-paste templates)
```
