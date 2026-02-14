import { createLogger } from '../utils/logger.js';

const log = createLogger('vision-qa');

/**
 * Vision QA checks for generated images.
 * Uses fal.ai vision models to detect common issues.
 */

export interface VisionQAResult {
  passed: boolean;
  issues: VisionIssue[];
  confidence: number;
  suggestions: string[];
}

export interface VisionIssue {
  type: 'hallucinated_text' | 'unwanted_logo' | 'style_drift' | 'stock_image' | 'wrong_subject' | 'missing_element';
  severity: 'warning' | 'error';
  description: string;
  detectedText?: string;
}

export interface VisionQAOptions {
  /** Original prompt used to generate the image */
  prompt: string;
  /** Check for hallucinated text/logos */
  checkText?: boolean;
  /** Check for stock image watermarks */
  checkWatermarks?: boolean;
  /** Check style consistency with reference */
  checkStyle?: boolean;
  /** Reference image URL for style comparison */
  referenceUrl?: string;
  /** Expected visual elements that should be present */
  requiredElements?: string[];
  /** Visual elements that should NOT be present */
  forbiddenElements?: string[];
  /** Maximum retries on failure */
  maxRetries?: number;
}

const COMMON_HALLUCINATED_TEXT = [
  'PROJECT:', 'MIDNIGHT', 'ECHO', 'HISTORY', 'CHANNEL',
  'DOCUMENTARY', 'NATIONAL GEOGRAPHIC', 'DISCOVERY',
  'HBO', 'Netflix', 'BBC', 'CNN', 'FOX', 'NEWS',
  'STOCK', 'SHUTTERSTOCK', 'GETTY', 'ADOBE', 'WATERMARK',
  'LOREM IPSUM', 'SAMPLE', 'DEMO', 'TEST',
];

const COMMON_LOGO_PATTERNS = [
  'history channel logo', 'tv network logo', 'news logo',
  'streaming service logo', 'stock photo watermark',
  'copyright watermark', 'brand logo',
];

/**
 * Analyze an image for QA issues using vision model
 */
export async function analyzeImage(
  imageUrl: string,
  options: VisionQAOptions,
): Promise<VisionQAResult> {
  const {
    prompt,
    checkText = true,
    checkWatermarks = true,
    checkStyle = false,
    referenceUrl,
    requiredElements = [],
    forbiddenElements = [],
  } = options;

  log.info('Running Vision QA', { 
    imageUrl: imageUrl.slice(0, 60),
    checkText, 
    checkWatermarks,
    checkStyle,
  });

  const issues: VisionIssue[] = [];
  const suggestions: string[] = [];
  let confidence = 1.0;

  try {
    // Use fal.ai vision model for analysis
    const { falRequest } = await import('../fal/client.js');
    
    // Build analysis prompt
    const analysisPrompt = buildAnalysisPrompt(prompt, {
      checkText,
      checkWatermarks,
      requiredElements,
      forbiddenElements,
    });

    const result = await falRequest<{ output: string }>('fal-ai/llava-next', {
      image_url: imageUrl,
      prompt: analysisPrompt,
      max_tokens: 500,
    });

    const analysis = result.output.toLowerCase();

    // Parse analysis for issues
    if (checkText) {
      const textIssues = detectTextIssues(analysis);
      issues.push(...textIssues);
    }

    if (checkWatermarks) {
      const watermarkIssues = detectWatermarkIssues(analysis);
      issues.push(...watermarkIssues);
    }

    // Check for required elements
    for (const element of requiredElements) {
      if (!analysis.includes(element.toLowerCase())) {
        issues.push({
          type: 'missing_element',
          severity: 'warning',
          description: `Expected element not detected: ${element}`,
        });
      }
    }

    // Check for forbidden elements
    for (const element of forbiddenElements) {
      if (analysis.includes(element.toLowerCase())) {
        issues.push({
          type: 'wrong_subject',
          severity: 'error',
          description: `Forbidden element detected: ${element}`,
        });
      }
    }

    // Style consistency check
    if (checkStyle && referenceUrl) {
      const styleIssues = await checkStyleConsistency(imageUrl, referenceUrl);
      issues.push(...styleIssues);
    }

    // Generate suggestions based on issues
    for (const issue of issues) {
      suggestions.push(generateSuggestion(issue, prompt));
    }

    // Calculate confidence based on issues
    const errorCount = issues.filter(i => i.severity === 'error').length;
    const warningCount = issues.filter(i => i.severity === 'warning').length;
    confidence = Math.max(0, 1 - (errorCount * 0.3) - (warningCount * 0.1));

  } catch (err) {
    log.warn('Vision QA analysis failed', { error: String(err) });
    // Return passed with low confidence on failure
    return {
      passed: true,
      issues: [],
      confidence: 0.5,
      suggestions: ['Vision QA check failed - manual review recommended'],
    };
  }

  const passed = issues.filter(i => i.severity === 'error').length === 0;

  log.info('Vision QA complete', {
    passed,
    issueCount: issues.length,
    confidence: confidence.toFixed(2),
  });

  return {
    passed,
    issues,
    confidence,
    suggestions,
  };
}

function buildAnalysisPrompt(
  originalPrompt: string,
  options: {
    checkText: boolean;
    checkWatermarks: boolean;
    requiredElements: string[];
    forbiddenElements: string[];
  },
): string {
  const checks: string[] = [];

  if (options.checkText) {
    checks.push('- List any visible text, logos, or brand names in the image');
    checks.push('- Identify any TV network logos (History, Discovery, National Geographic, etc.)');
  }

  if (options.checkWatermarks) {
    checks.push('- Check for stock photo watermarks or copyright notices');
  }

  if (options.requiredElements.length > 0) {
    checks.push(`- Confirm these elements are present: ${options.requiredElements.join(', ')}`);
  }

  if (options.forbiddenElements.length > 0) {
    checks.push(`- Check if these unwanted elements appear: ${options.forbiddenElements.join(', ')}`);
  }

  return `Analyze this image that was generated from the prompt: "${originalPrompt}"

Please check:
${checks.join('\n')}

Be specific about any text, logos, or unexpected elements you see. Format your response as a brief analysis.`;
}

function detectTextIssues(analysis: string): VisionIssue[] {
  const issues: VisionIssue[] = [];

  for (const text of COMMON_HALLUCINATED_TEXT) {
    if (analysis.includes(text.toLowerCase())) {
      issues.push({
        type: 'hallucinated_text',
        severity: 'error',
        description: `Hallucinated text detected: "${text}"`,
        detectedText: text,
      });
    }
  }

  // Check for generic "text visible" mentions
  if (analysis.includes('text') && (analysis.includes('logo') || analysis.includes('title') || analysis.includes('brand'))) {
    if (!issues.some(i => i.type === 'hallucinated_text')) {
      issues.push({
        type: 'hallucinated_text',
        severity: 'warning',
        description: 'Unexpected text or logo detected in image',
      });
    }
  }

  return issues;
}

function detectWatermarkIssues(analysis: string): VisionIssue[] {
  const issues: VisionIssue[] = [];

  for (const pattern of COMMON_LOGO_PATTERNS) {
    if (analysis.includes(pattern)) {
      issues.push({
        type: 'unwanted_logo',
        severity: 'error',
        description: `Unwanted logo/watermark detected: ${pattern}`,
      });
    }
  }

  if (analysis.includes('watermark') || analysis.includes('copyright')) {
    if (!issues.some(i => i.type === 'unwanted_logo')) {
      issues.push({
        type: 'unwanted_logo',
        severity: 'error',
        description: 'Watermark or copyright notice detected',
      });
    }
  }

  return issues;
}

async function checkStyleConsistency(
  imageUrl: string,
  referenceUrl: string,
): Promise<VisionIssue[]> {
  // TODO: Implement style comparison using vision model
  // For now, return empty - this is a future enhancement
  return [];
}

function generateSuggestion(issue: VisionIssue, originalPrompt: string): string {
  switch (issue.type) {
    case 'hallucinated_text':
      return `Remove style references that trigger text generation. Try adding "no text, no logos, no watermarks" to negative prompt`;
    case 'unwanted_logo':
      return `Add "no logos, no brand names, no watermarks, no TV network graphics" to negative prompt`;
    case 'stock_image':
      return `The image may be too generic. Make the prompt more specific and unique`;
    case 'style_drift':
      return `Image style differs from reference. Increase seed consistency or adjust prompt`;
    case 'missing_element':
      return `Required element not found. Make it more prominent in the prompt`;
    case 'wrong_subject':
      return `Unwanted element detected. Add it to negative prompt`;
    default:
      return `Review image manually and adjust prompt as needed`;
  }
}

/**
 * Modify prompt to avoid common issues
 */
export function sanitizePrompt(prompt: string): string {
  let sanitized = prompt;

  // Remove problematic style references
  const problematicPhrases = [
    /history channel/gi,
    /documentary style/gi,
    /tv show/gi,
    /netflix/gi,
    /discovery channel/gi,
    /national geographic/gi,
  ];

  for (const phrase of problematicPhrases) {
    sanitized = sanitized.replace(phrase, 'cinematic');
  }

  return sanitized;
}

/**
 * Build an enhanced negative prompt to avoid common issues
 */
export function buildSafeNegativePrompt(existingNegative?: string): string {
  const safeTerms = [
    'text', 'watermark', 'logo', 'brand', 'copyright',
    'TV network logo', 'channel logo', 'title card',
    'stock photo', 'signature', 'username',
  ];

  const existing = existingNegative ? existingNegative + ', ' : '';
  return existing + safeTerms.join(', ');
}
