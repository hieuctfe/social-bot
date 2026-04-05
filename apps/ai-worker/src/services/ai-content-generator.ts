import Anthropic from '@anthropic-ai/sdk';
import { defaultLogger } from '@social-bot/observability';

const logger = defaultLogger.child({ service: 'ai-content-generator' });

interface PageProfile {
  id: string;
  name: string;
  niche: string;
  description?: string;
  contentStrategy: {
    type: string;
    style?: string;
    topics?: string[];
    qaFeedback?: string; // Injected on retry with QA failure reason
  };
  aiConfig: {
    generationModel?: string;
    qaEnabled?: boolean;
  };
}

export interface GenerateContentResult {
  body: string;
  hashtags: string[];
}

/**
 * Generate AI content for a PageProfile using Claude API
 */
export async function generateAIContent(
  pageProfile: PageProfile,
): Promise<GenerateContentResult> {
  const { contentStrategy, aiConfig, niche, description } = pageProfile;

  logger.info('Generating AI content', {
    pageProfileId: pageProfile.id,
    niche,
    style: contentStrategy.style,
  });

  // Build prompt
  const style = contentStrategy.style || 'informative';
  const topics = contentStrategy.topics?.join(', ') || 'general topics';
  const profileDesc = description || `a ${niche} focused page`;

  const qaFeedback = contentStrategy.qaFeedback || '';
  const retrySection = qaFeedback
    ? `\nIMPORTANT — This is a retry. Previous attempt failed QA with these issues:\n${qaFeedback}\nFix all listed issues in your new version.\n`
    : '';

  const prompt = `You are a ${style} content creator for a ${niche} niche social media page.

Page description: ${profileDesc}
Topics to focus on: ${topics}
${retrySection}
Generate a social media post that:
1. Is engaging and matches the ${style} style
2. Is 150-300 words (concise and punchy)
3. Includes a strong hook in the first sentence
4. Is relevant to the ${niche} audience
5. Ends with a call-to-action or question to drive engagement

Return ONLY a valid JSON object with this exact structure (no markdown, no code blocks):
{
  "body": "the post content here",
  "hashtags": ["hashtag1", "hashtag2", "hashtag3"]
}`;

  try {
    // Initialize Anthropic client
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey || apiKey === 'placeholder') {
      logger.warn('ANTHROPIC_API_KEY not configured, using mock response');
      return generateMockContent(pageProfile);
    }

    const anthropic = new Anthropic({ apiKey });

    // Call Claude API
    const response = await anthropic.messages.create({
      model: aiConfig.generationModel || 'claude-sonnet-4-6',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    // Parse response
    const content = response.content[0];
    if (!content || content.type !== 'text') {
      throw new Error('Unexpected response type from Claude');
    }

    // Extract JSON from response (handle potential markdown code blocks)
    let jsonText = content.text.trim();
    
    // Remove markdown code blocks if present
    if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/```json?\n?/g, '').replace(/```$/g, '').trim();
    }

    const result = JSON.parse(jsonText);

    logger.info('AI content generated successfully', {
      pageProfileId: pageProfile.id,
      bodyLength: result.body?.length,
      hashtagCount: result.hashtags?.length,
    });

    return {
      body: result.body,
      hashtags: result.hashtags || [],
    };
  } catch (error) {
    logger.error('Failed to generate AI content', {
      pageProfileId: pageProfile.id,
      error: error instanceof Error ? error.message : String(error),
    });

    // Fallback to mock content on error
    logger.warn('Using mock content as fallback');
    return generateMockContent(pageProfile);
  }
}

/**
 * Generate mock content for testing/fallback
 */
function generateMockContent(pageProfile: PageProfile): GenerateContentResult {
  const { niche, name, contentStrategy } = pageProfile;
  const style = contentStrategy.style || 'informative';

  const mockBodies = {
    tech: `🚀 The future of technology is here! 

Did you know that AI is revolutionizing how we work and live? From smart homes to autonomous vehicles, innovation is happening at lightning speed.

The key is to stay curious and keep learning. What tech trend excites you the most?

Drop a comment below! 👇`,
    food: `🍜 Craving something delicious?

Today's special: A mouthwatering recipe that'll make your taste buds dance! Fresh ingredients, simple steps, and incredible flavor.

Cooking doesn't have to be complicated - just follow your passion and let the flavors guide you.

What's your favorite dish? Let me know! 😋`,
    fitness: `💪 Transform Your Body, Transform Your Life!

Consistency beats perfection every single time. Whether you're just starting or you're a seasoned athlete, remember: every workout counts.

Your future self will thank you for the work you put in today.

What's your fitness goal for this month? Share below! 🏋️`,
    fashion: `✨ Style is a way to say who you are without speaking

This season's trends are all about bold choices and classic elegance. Mix and match, experiment, and most importantly - wear what makes YOU feel confident.

Fashion is art, and you're the canvas.

What's your signature style? 👗👔`,
  };

  const defaultBody = `📢 Great things are happening in the world of ${niche}!

Stay tuned for amazing content, tips, and inspiration. We're here to bring you the best ${niche} has to offer.

Join our community and be part of something special!

What would you like to see more of? Comment below! 🔥`;

  const body = mockBodies[niche.toLowerCase() as keyof typeof mockBodies] || defaultBody;

  const hashtags = [
    niche.toLowerCase().replace(/\s+/g, ''),
    `${niche.toLowerCase()}lovers`,
    `${niche.toLowerCase()}community`,
    style.toLowerCase(),
    'socialmedia',
  ];

  return { body, hashtags };
}
