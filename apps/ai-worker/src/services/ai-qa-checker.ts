import Anthropic from '@anthropic-ai/sdk';
import { defaultLogger } from '@social-bot/observability';

const logger = defaultLogger.child({ service: 'ai-qa-checker' });

export interface QACheckResult {
  pass: boolean;
  score?: number;
  reason: string;
  violations?: string[];
}

export interface QAResult {
  overallPass: boolean;
  quality: QACheckResult;
  brandVoice: QACheckResult;
  compliance: QACheckResult;
  originality: QACheckResult;
  feedback: string; // Combined feedback for regeneration prompt
}

interface QAInput {
  body: string;
  hashtags: string[];
  niche: string;
  style: string;
  recentPostBodies?: string[]; // Last N posts for originality check
}

/**
 * Run multi-pass QA on generated content.
 *
 * 4 checks:
 *  1. Quality      — grammar, coherence, engagement (score ≥ 7)
 *  2. Brand voice  — matches the page style (score ≥ 7)
 *  3. Compliance   — length and hashtag count within platform limits
 *  4. Originality  — not a near-duplicate of recent posts (similarity < 0.8)
 */
export async function runQAChecks(input: QAInput): Promise<QAResult> {
  const { body, hashtags, niche, style, recentPostBodies = [] } = input;

  // Check 3 (compliance) is rule-based — no API call needed
  const complianceResult = checkCompliance(body, hashtags);

  // Check 4 (originality) is also rule-based
  const originalityResult = checkOriginality(body, recentPostBodies);

  // Checks 1 + 2 use Claude in a single call (cheaper than two calls)
  let qualityResult: QACheckResult;
  let brandVoiceResult: QACheckResult;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || apiKey === 'placeholder') {
    logger.warn('ANTHROPIC_API_KEY not set — using mock QA results');
    qualityResult = mockQualityCheck(body);
    brandVoiceResult = mockBrandVoiceCheck(body, style);
  } else {
    const aiResults = await runAIChecks(body, niche, style, apiKey);
    qualityResult = aiResults.quality;
    brandVoiceResult = aiResults.brandVoice;
  }

  const overallPass =
    qualityResult.pass &&
    brandVoiceResult.pass &&
    complianceResult.pass &&
    originalityResult.pass;

  // Build consolidated feedback for use in regeneration prompt
  const failedChecks: string[] = [];
  if (!qualityResult.pass) failedChecks.push(`Quality issue: ${qualityResult.reason}`);
  if (!brandVoiceResult.pass) failedChecks.push(`Brand voice issue: ${brandVoiceResult.reason}`);
  if (!complianceResult.pass)
    failedChecks.push(`Compliance violations: ${complianceResult.violations?.join(', ')}`);
  if (!originalityResult.pass) failedChecks.push(`Originality issue: ${originalityResult.reason}`);

  const feedback =
    failedChecks.length > 0
      ? `Previous attempt failed QA. Fix these issues:\n${failedChecks.map((f) => `- ${f}`).join('\n')}`
      : '';

  logger.info('QA checks completed', {
    overallPass,
    quality: qualityResult.pass,
    brandVoice: brandVoiceResult.pass,
    compliance: complianceResult.pass,
    originality: originalityResult.pass,
  });

  return {
    overallPass,
    quality: qualityResult,
    brandVoice: brandVoiceResult,
    compliance: complianceResult,
    originality: originalityResult,
    feedback,
  };
}

// ─── AI Checks (quality + brand voice in one call) ───────────────────────────

async function runAIChecks(
  body: string,
  niche: string,
  style: string,
  apiKey: string,
): Promise<{ quality: QACheckResult; brandVoice: QACheckResult }> {
  const anthropic = new Anthropic({ apiKey });

  const prompt = `You are a strict social media content QA reviewer.

Evaluate this ${niche} social media post for a page with "${style}" brand voice:

---
${body}
---

Return ONLY a valid JSON object (no markdown):
{
  "quality": {
    "score": <1-10 float>,
    "pass": <true if score >= 7>,
    "reason": "<one sentence explaining the score>"
  },
  "brandVoice": {
    "score": <1-10 float>,
    "pass": <true if score >= 7>,
    "reason": "<one sentence explaining how well it matches '${style}' style>"
  }
}`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001', // Use fast/cheap model for QA
      max_tokens: 512,
      messages: [{ role: 'user', content: prompt }],
    });

    const content = response.content[0];
    if (!content || content.type !== 'text') {
      throw new Error('Unexpected response type from Claude');
    }

    let jsonText = content.text.trim();
    if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/```json?\n?/g, '').replace(/```$/g, '').trim();
    }

    const result = JSON.parse(jsonText);
    return {
      quality: {
        pass: Boolean(result.quality?.pass),
        score: result.quality?.score,
        reason: result.quality?.reason || '',
      },
      brandVoice: {
        pass: Boolean(result.brandVoice?.pass),
        score: result.brandVoice?.score,
        reason: result.brandVoice?.reason || '',
      },
    };
  } catch (error) {
    logger.error('AI QA check failed, defaulting to pass', { error: String(error) });
    // On AI error, don't block content — pass with warning
    return {
      quality: { pass: true, score: 7, reason: 'AI check unavailable — auto-passed' },
      brandVoice: { pass: true, score: 7, reason: 'AI check unavailable — auto-passed' },
    };
  }
}

// ─── Rule-based checks ────────────────────────────────────────────────────────

function checkCompliance(body: string, hashtags: string[]): QACheckResult {
  const violations: string[] = [];

  // Length check: 50–500 chars is safe across FB/IG/Twitter
  if (body.length < 50) violations.push(`Too short (${body.length} chars, min 50)`);
  if (body.length > 2200) violations.push(`Too long (${body.length} chars, max 2200)`);

  // Hashtag count
  const totalHashtags = hashtags.length + (body.match(/#\w+/g) || []).length;
  if (totalHashtags > 30) violations.push(`Too many hashtags (${totalHashtags}, max 30)`);

  // No blank content
  if (!body.trim()) violations.push('Content is empty');

  return {
    pass: violations.length === 0,
    violations,
    reason: violations.length > 0 ? violations.join('; ') : 'All compliance checks passed',
  };
}

function checkOriginality(body: string, recentPostBodies: string[]): QACheckResult {
  if (recentPostBodies.length === 0) {
    return { pass: true, reason: 'No recent posts to compare against' };
  }

  // Simple word-overlap similarity (Jaccard index)
  const bodyWords = new Set(body.toLowerCase().split(/\s+/).filter((w) => w.length > 3));

  let maxSimilarity = 0;
  for (const recentBody of recentPostBodies) {
    const recentWords = new Set(
      recentBody.toLowerCase().split(/\s+/).filter((w) => w.length > 3),
    );
    const intersection = new Set([...bodyWords].filter((w) => recentWords.has(w)));
    const union = new Set([...bodyWords, ...recentWords]);
    const similarity = union.size > 0 ? intersection.size / union.size : 0;
    if (similarity > maxSimilarity) maxSimilarity = similarity;
  }

  const pass = maxSimilarity < 0.8;
  return {
    pass,
    score: 1 - maxSimilarity,
    reason: pass
      ? `Content is sufficiently original (similarity: ${(maxSimilarity * 100).toFixed(0)}%)`
      : `Too similar to a recent post (similarity: ${(maxSimilarity * 100).toFixed(0)}%)`,
  };
}

// ─── Mock fallbacks (when API key not set) ────────────────────────────────────

function mockQualityCheck(body: string): QACheckResult {
  const score = body.length > 100 ? 8.0 : 6.5;
  return {
    pass: score >= 7,
    score,
    reason: score >= 7 ? 'Mock: content meets quality threshold' : 'Mock: content too short',
  };
}

function mockBrandVoiceCheck(body: string, style: string): QACheckResult {
  return {
    pass: true,
    score: 7.5,
    reason: `Mock: brand voice check passed for style "${style}"`,
  };
}
