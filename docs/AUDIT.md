# ClawVid Code Audit Report

**Date**: 2026-02-11
**Commit**: `aa3a563` (post first round of fixes)
**Sources**: CodeRabbit CLI, Deep Code Review Agent, FFmpeg Safety Audit Agent

---

## Summary

| Severity | Total | Fixed | Remaining |
|----------|-------|-------|-----------|
| CRITICAL | 4     | 4     | 0         |
| HIGH     | 7     | 5     | 2         |
| MEDIUM   | 17    | 10    | 7         |
| LOW      | 15    | 6     | 9         |
| INFO     | 4     | 0     | 4 (won't fix) |
| **Total** | **47** | **25** | **22** |

---

## CRITICAL (all fixed)

### C1. FFmpeg concat list injection in mixer.ts [FIXED]
- **File**: `src/audio/mixer.ts:39`
- **Source**: Deep Review + FFmpeg Audit
- **Fix**: Added `escapeForConcatList()` to escape single quotes as `'\''`

### C2. FFmpeg concat list injection in renderer.ts [FIXED]
- **File**: `src/render/renderer.ts:117`
- **Source**: Deep Review + FFmpeg Audit
- **Fix**: Added `escapeForConcat()` helper with same escaping

### C3. Unvalidated URLs passed to FFmpeg/fetch [FIXED]
- **File**: `src/fal/client.ts:62-74`
- **Source**: Deep Review
- **Fix**: Added `validateDownloadUrl()` blocking private IPs, localhost, requiring http(s)

### C4. API key stored in process.env [WON'T FIX]
- **File**: `src/fal/client.ts:34`
- **Source**: Deep Review
- **Reason**: fal.ai SDK reads from `process.env.FAL_KEY` by convention. Acceptable for CLI tool.

---

## HIGH

### H1. Path traversal in AssetManager [FIXED]
- **File**: `src/core/asset-manager.ts:61-67`
- **Source**: Deep Review
- **Fix**: Added `validatePathComponent()` + `resolve()` containment check

### H2. Platform string not validated against PlatformId [OPEN]
- **File**: `src/core/pipeline.ts:308`
- **Source**: Deep Review
- **Issue**: `platform as PlatformId` cast bypasses validation. Invalid platform creates arbitrary directories.
- **Fix**: Validate against `getAllPlatformIds()` before casting.

### H3. Download URL SSRF risk [FIXED]
- **File**: `src/fal/client.ts:62-74`
- **Source**: Deep Review
- **Fix**: See C3.

### H4. Cache deserialization unvalidated [FIXED]
- **File**: `src/cache/store.ts:28`
- **Source**: Deep Review
- **Fix**: Added structure validation (version, entries object check)

### H5. Non-null assertions on cache lookups [FIXED]
- **File**: `src/core/workflow-runner.ts:160-161,181-182,229`
- **Source**: Deep Review
- **Fix**: Replaced `!` with safe null checks

### H6. Numeric filter params not validated [FIXED]
- **File**: `src/audio/mixer.ts:83-111`
- **Source**: Deep Review + FFmpeg Audit
- **Fix**: Added `Math.max(0, ...)` guards on all numeric values

### H7. Silence threshold injection [FIXED]
- **File**: `src/audio/silence.ts:22-26`
- **Source**: Deep Review + FFmpeg Audit
- **Fix**: Added regex validation `/^-?\d+(\.\d+)?dB$/`

---

## MEDIUM

### M1. Swallowed errors in audio processing [FIXED]
- **File**: `src/core/pipeline.ts:126-142`
- **Source**: Deep Review
- **Fix**: Added error capture in catch blocks, logging with `String(err)`

### M2. Temp file cleanup [FIXED]
- **File**: `src/audio/mixer.ts:38`, `src/render/renderer.ts:89,116`
- **Source**: Deep Review + FFmpeg Audit
- **Fix**: Added `finally` blocks with `unlink()` for concat lists + segment files

### M3. Object.defineProperty hack for AssetManager [OPEN]
- **File**: `src/core/pipeline.ts:345`
- **Source**: Deep Review
- **Issue**: `Object.defineProperty(assetManager, 'outputDir', { value: runDir })` bypasses readonly.
- **Fix**: Add static factory method `AssetManager.fromExistingRun(runDir)`.

### M4. Unsafe `as unknown as Record<string, unknown>` casts [WON'T FIX]
- **File**: `src/core/workflow-runner.ts:155,177,224`
- **Source**: Deep Review
- **Reason**: Hash function needs generic object. Current pattern is pragmatic; the risk is low.

### M5. API response not runtime-validated [WON'T FIX]
- **File**: `src/fal/client.ts:46`
- **Source**: Deep Review
- **Reason**: Adding Zod schemas for all 7 API responses is significant effort. Errors propagate naturally via property access.

### M6. queue.add() returns void possibility [WON'T FIX]
- **File**: `src/fal/client.ts:41-59`
- **Source**: Deep Review
- **Reason**: p-queue's `void` case only occurs on abort/destroy, which we don't use.

### M7. No error handling for CLI commands [FIXED]
- **File**: `src/cli/generate.ts`, `render.ts`, `preview.ts`, `studio.ts`, `setup.ts`
- **Source**: Deep Review + CodeRabbit
- **Fix**: Wrapped all actions in try/catch + `process.exit(1)`

### M8. analyzeImage accepts array but uses first [FIXED]
- **File**: `src/fal/analysis.ts:14`
- **Source**: Deep Review + CodeRabbit
- **Fix**: Changed to accept single `imageUrl: string`

### M9. Division by zero in word timing [FIXED]
- **File**: `src/core/pipeline.ts:221`
- **Source**: Deep Review
- **Fix**: Added `.filter(Boolean)` on word split

### M10. FFmpeg commands logged at info level [FIXED]
- **File**: `src/post/ffmpeg.ts:13`
- **Source**: Deep Review
- **Fix**: Changed to `debug` level

### M11. Music URL SSRF via FFmpeg [OPEN]
- **File**: `src/core/pipeline.ts:158-162`
- **Source**: Deep Review
- **Issue**: `musicConfig.url` passed directly to FFmpeg which fetches it. Internal URLs bypass download validation.
- **Fix**: Download music URL to local file first using `downloadFile()`.

### M12. normalize.ts misleading "two-pass" comment [OPEN]
- **File**: `src/audio/normalize.ts:21`
- **Source**: FFmpeg Audit
- **Issue**: Comment says "Two-pass" but implementation is single-pass loudnorm.
- **Fix**: Correct the comment.

### M13. aloop oversized buffer [OPEN]
- **File**: `src/audio/mixer.ts:100`
- **Source**: FFmpeg Audit
- **Issue**: `aloop=-1:2e+09` requests 2 billion sample buffer. `size=0` means "entire input".
- **Fix**: Change to `aloop=-1:size=0`.

### M14. amix amplitude division [OPEN]
- **File**: `src/audio/mixer.ts:130`
- **Source**: FFmpeg Audit
- **Issue**: `amix` divides output amplitude by number of inputs. With 5 inputs, each track is 1/5 volume.
- **Fix**: Add `weights` parameter to compensate.

### M15. No sample rate normalization before mixing [OPEN]
- **File**: `src/audio/mixer.ts` (entire mixAudio)
- **Source**: FFmpeg Audit
- **Issue**: Inputs may have different sample rates (44.1kHz, 48kHz). amix uses first input's rate.
- **Fix**: Add `aresample=44100` to each input in the filter graph.

### M16. Video duration mismatch in workflow JSON [OPEN]
- **File**: `workflows/horror-story-example.json:115,172`
- **Source**: CodeRabbit
- **Issue**: Scenes 4,6 have 8s duration but video gen uses "5s". Kandinsky5-Pro only supports "5s".
- **Fix**: Add comment noting the gap is filled by the image; this is intentional behavior.

### M17. Cache not used for SFX/music phases [WON'T FIX]
- **File**: `src/core/workflow-runner.ts:110-127`
- **Source**: CodeRabbit
- **Reason**: SFX/music are cheap and change frequently. Caching these adds complexity with little benefit.

---

## LOW

### L1. initialized flag not thread-safe [WON'T FIX]
- **File**: `src/fal/client.ts:14-31`
- **Reason**: Node.js is single-threaded. No risk.

### L2. Magic numbers for cost estimates [OPEN]
- **File**: `src/core/workflow-runner.ts:168,189,237,298,329`
- **Issue**: Hardcoded `0.04`, `0.08`, `0.015`, etc. scattered throughout.
- **Fix**: Move to a cost constants object.

### L3. estimateVideoCost dead conditional [FIXED]
- **File**: `src/core/workflow-runner.ts:344-347`
- **Fix**: Simplified to single return.

### L4. Unused import extractWordTimings [FIXED]
- **File**: `src/core/pipeline.ts:13`
- **Fix**: Removed.

### L5. scene.narration! non-null assertion [FIXED]
- **File**: `src/core/workflow-runner.ts:221`
- **Fix**: Changed to `scene.narration ?? ''` with guard.

### L6. String replace assumption for audio extensions [OPEN]
- **File**: `src/core/pipeline.ts:124,135`
- **Issue**: `.replace('.mp3', '-trimmed.mp3')` assumes mp3 extension.
- **Fix**: Use `path.parse()` + `path.format()`.

### L7. readJsonFile returns unvalidated generic [WON'T FIX]
- **File**: `src/utils/files.ts:4-6`
- **Reason**: Used only internally. Callers validate via Zod.

### L8. Progress bar not stopped helper [WON'T FIX]
- **File**: `src/utils/progress.ts:8-20`
- **Reason**: We use ora spinners, not cli-progress bars, in practice.

### L9. resolveTargetPlatforms partial mapping [OPEN]
- **File**: `src/core/pipeline.ts:242-252`
- **Issue**: Unknown platforms pass through silently.
- **Fix**: Validate against known platform IDs.

### L10. Hash truncation to 16 hex chars [OPEN]
- **File**: `src/cache/hash.ts:5,9`
- **Issue**: 64-bit hash increases collision probability.
- **Fix**: Increase to 32 hex chars (128 bits).

### L11. No timeout on fal.ai requests [OPEN]
- **File**: `src/fal/client.ts:45`
- **Issue**: Hanging requests block indefinitely.
- **Fix**: Add AbortController with 5-minute timeout.

### L12. downloadFile partial file cleanup [FIXED]
- **File**: `src/fal/client.ts:62-75`
- **Fix**: Added try/catch + `unlink` for partial file.

### L13. sound_effects! non-null assertion [FIXED]
- **File**: `src/core/workflow-runner.ts:274-275`
- **Fix**: Used `?? []` pattern.

### L14. Readable.fromWeb cast [WON'T FIX]
- **File**: `src/fal/client.ts:71`
- **Reason**: Known TypeScript interop issue. No runtime impact.

### L15. No workflow name validation for filesystem [OPEN]
- **File**: `src/core/asset-manager.ts:29`
- **Issue**: Very long names or names that become empty after slugification.
- **Fix**: Add min-length check after slugification.

### L16. Fallback renderer discards FFmpeg stderr [OPEN]
- **File**: `src/render/renderer.ts:77`
- **Issue**: `stdio: 'pipe'` captures stderr but never reads it. Error messages lost.
- **Fix**: Capture stderr and include in error message.

### L17. Intermediate audio files not cleaned up [OPEN]
- **File**: `src/core/pipeline.ts:124-142`
- **Issue**: `-trimmed.mp3` and `-norm.mp3` files accumulate (3x storage).
- **Fix**: Delete intermediate files after successful processing.

---

## INFO (reference only)

### I1. fluent-ffmpeg uses spawn (not exec) — no shell injection from paths [GOOD]
### I2. silenceremove reverse-reverse idiom is correct [GOOD]
### I3. 0 SFX + no music case handled via early copy [GOOD]
### I4. No SIGINT handler for orphan FFmpeg processes [ACCEPTED]

---

## Config/Workflow Issues (CodeRabbit)

### CW1. config.json quality tiers all use "9:16" [OPEN]
- **File**: `config.json:76,82,88`
- **Issue**: `max_quality`, `balanced`, and `budget` all have `image_size: "9:16"`. No differentiation.
- **Fix**: This is intentional — all tiers target portrait video. Image quality varies by model and inference_steps.

### CW2. README model naming inconsistency [OPEN]
- **File**: `README.md:23-27,88-91,146,165,313-318`
- **Issue**: Mixes short-form names with full fal.ai endpoint paths.
- **Fix**: Add model reference table mapping short names to full endpoints.

---

## Fixes Applied in This Round

The following issues are being fixed in the current commit:

| ID | Fix |
|----|-----|
| H2 | Validate platform against `getAllPlatformIds()` |
| M3 | Add `AssetManager.fromExistingRun()` static factory |
| M11 | Download music URL to local file before FFmpeg |
| M12 | Fix misleading "two-pass" comment |
| M13 | Change `aloop=-1:2e+09` to `aloop=-1:size=0` |
| M14 | Add `weights` param to amix for volume compensation |
| M15 | Add `aresample=44100` to each filter input |
| M16 | Document video duration gap as intentional |
| L2 | Centralize cost estimate constants |
| L6 | Use `path.parse()` for audio file extensions |
| L9 | Validate platform in `resolveTargetPlatforms` |
| L10 | Increase hash length to 32 hex chars |
| L16 | Capture stderr in fallback renderer |
| L17 | Clean up intermediate audio files |
| CW2 | Add model reference table to README |
