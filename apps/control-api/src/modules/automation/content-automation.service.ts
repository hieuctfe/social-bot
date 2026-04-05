import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import Anthropic from '@anthropic-ai/sdk';
import { PrismaService } from '../../prisma/prisma.service';
import { ActionLogService } from '../action-log/action-log.service';

/**
 * ContentAutomationService — the core automation engine.
 *
 * Runs every 5 minutes. For every active PageProfile that is due for new content:
 *   1. Generate content via Anthropic API (or repost from source)
 *   2. Run QA (AI + rule-based checks)
 *   3. Create ContentDraft with status APPROVED (or FAILED after max retries)
 *
 * ContentSchedulerService (page-profile module) picks up APPROVED drafts
 * every 2 minutes and schedules them to Postiz.
 */
@Injectable()
export class ContentAutomationService {
  private readonly logger = new Logger(ContentAutomationService.name);
  private running = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly actionLogService: ActionLogService,
  ) {}

  @Cron('*/5 * * * *')
  async runAutomationCycle(): Promise<void> {
    if (this.running) {
      this.logger.warn('Previous automation cycle still running — skipping');
      return;
    }

    this.running = true;
    try {
      const dueProfiles = await this.findDueProfiles();
      if (dueProfiles.length === 0) return;

      this.logger.log(`Automation cycle: ${dueProfiles.length} profile(s) due`);

      // Process in parallel (max 3 concurrent to avoid API rate limits)
      const chunks = chunk(dueProfiles, 3);
      for (const batch of chunks) {
        await Promise.all(batch.map((p) => this.processProfile(p).catch((err) => {
          this.logger.error(`Failed to process profile ${p.id}`, { error: String(err) });
        })));
      }
    } finally {
      this.running = false;
    }
  }

  // ─── Manual trigger (called from API endpoint) ──────────────────────────────

  async triggerForProfile(workspaceId: string, pageProfileId: string): Promise<{
    draftId: string;
    status: string;
    pageProfileId: string;
  }> {
    const profile = await this.prisma.pageProfile.findFirst({
      where: { id: pageProfileId, workspaceId },
    });

    if (!profile) {
      throw new Error(`PageProfile ${pageProfileId} not found in workspace ${workspaceId}`);
    }

    return this.processProfile(profile);
  }

  // ─── Core pipeline ───────────────────────────────────────────────────────────

  private async processProfile(profile: any): Promise<{ draftId: string; status: string; pageProfileId: string }> {
    const contentStrategy = (profile.contentStrategy as any) ?? {};
    const aiConfig = (profile.aiConfig as any) ?? {};
    const strategyType: string = contentStrategy.type ?? 'ai-generated';

    this.logger.log(`Processing profile: ${profile.name} (${strategyType})`);

    if (strategyType === 'repost') {
      return this.handleRepost(profile, contentStrategy);
    }

    return this.handleAIGenerated(profile, contentStrategy, aiConfig);
  }

  // ─── AI-Generated strategy ───────────────────────────────────────────────────

  private async handleAIGenerated(profile: any, contentStrategy: any, aiConfig: any): Promise<{ draftId: string; status: string; pageProfileId: string }> {
    const qaEnabled: boolean = aiConfig.qaEnabled ?? true;
    const maxRetries: number = aiConfig.maxRetries ?? 2;

    const recentBodies = await this.getRecentPostBodies(profile.id);

    let body = '';
    let hashtags: string[] = [];
    let approved = false;
    let qaAttempts = 0;
    let qaResults: any = null;
    let qaFeedback = '';

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      qaAttempts = attempt + 1;

      const generated = await this.generateContent(profile, contentStrategy, qaFeedback);
      body = generated.body;
      hashtags = generated.hashtags;

      if (!qaEnabled) {
        approved = true;
        break;
      }

      const qa = await this.runQA(body, hashtags, profile.niche, contentStrategy.style ?? 'professional', recentBodies);
      qaResults = qa.results;

      if (qa.pass) {
        approved = true;
        break;
      }

      qaFeedback = qa.feedback;
      this.logger.warn(`QA failed on attempt ${attempt + 1}/${maxRetries + 1} for ${profile.name}`, { feedback: qa.feedback });
    }

    const title = `${profile.name} — ${today()}`;

    const draft = await this.prisma.contentDraft.create({
      data: {
        workspaceId: profile.workspaceId,
        createdById: 'system',
        title,
        body,
        status: approved ? 'APPROVED' : 'FAILED',
        platformTargets: [],
        metadata: {
          pageProfileId: profile.id,
          hashtags,
          generatedBy: 'ai-original',
          generationModel: aiConfig.generationModel ?? 'claude-haiku-4-5-20251001',
          strategyType: 'ai-generated',
          qaEnabled,
          qaAttempts,
          qaResults: qaResults ?? null,
        },
      },
    });

    if (!approved) {
      this.logger.error(`QA exhausted for ${profile.name}`, { draftId: draft.id, qaAttempts });
      await this.sendQAFailureAlert(profile, draft.id, qaAttempts, qaResults);
      await this.bumpFailedStats(profile);
    } else {
      await this.bumpSuccessStats(profile);
    }

    await this.actionLogService.log({
      workspaceId: profile.workspaceId,
      actorId: 'system',
      action: approved ? 'CONTENT_GENERATED' : 'CONTENT_GENERATION_FAILED',
      resourceType: 'ContentDraft',
      resourceId: draft.id,
      payload: { pageProfileId: profile.id, qaAttempts, approved },
      outcome: approved ? 'SUCCESS' : 'FAILURE',
      level: approved ? 'INFO' : 'ERROR',
    });

    return { draftId: draft.id, status: draft.status, pageProfileId: profile.id };
  }

  // ─── Repost strategy ─────────────────────────────────────────────────────────

  private async handleRepost(profile: any, contentStrategy: any): Promise<{ draftId: string; status: string; pageProfileId: string }> {
    const sourceConnectionId: string | undefined = contentStrategy.sourceConnectionId;
    const appendText: string = contentStrategy.appendText ?? '';

    if (!sourceConnectionId) {
      throw new Error(`Profile ${profile.id}: REPOST strategy missing sourceConnectionId`);
    }

    // Find the latest published content from the source connection that we haven't reposted yet
    const sourceArchive = await this.prisma.contentArchive.findFirst({
      where: {
        contentDraft: {
          workspaceId: profile.workspaceId,
          status: 'PUBLISHED',
          publishTargets: { some: { socialConnectionId: sourceConnectionId } },
        },
        NOT: { pageProfileId: profile.id },
      },
      orderBy: { createdAt: 'desc' },
      include: { contentDraft: true },
    });

    if (!sourceArchive) {
      this.logger.log(`No new source content to repost for ${profile.name}`);
      return { draftId: '', status: 'SKIPPED', pageProfileId: profile.id };
    }

    // Idempotency: check if already reposted
    const alreadyReposted = await this.prisma.contentArchive.findFirst({
      where: { pageProfileId: profile.id, sourceUrl: sourceArchive.contentDraft.id },
    });

    if (alreadyReposted) {
      this.logger.log(`Already reposted ${sourceArchive.id} for ${profile.name}`);
      return { draftId: alreadyReposted.contentDraftId, status: 'ALREADY_REPOSTED', pageProfileId: profile.id };
    }

    const repostBody = appendText ? `${sourceArchive.body}\n\n${appendText}` : sourceArchive.body;
    const title = `Repost — ${profile.name} — ${today()}`;

    const draft = await this.prisma.contentDraft.create({
      data: {
        workspaceId: profile.workspaceId,
        createdById: 'system',
        title,
        body: repostBody,
        status: 'APPROVED',
        platformTargets: [],
        metadata: {
          pageProfileId: profile.id,
          hashtags: sourceArchive.hashtags,
          generatedBy: 'repost',
          strategyType: 'repost',
          sourceUrl: sourceArchive.contentDraft.id,
          qaEnabled: false,
        },
      },
    });

    await this.bumpSuccessStats(profile);

    await this.actionLogService.log({
      workspaceId: profile.workspaceId,
      actorId: 'system',
      action: 'CONTENT_GENERATED',
      resourceType: 'ContentDraft',
      resourceId: draft.id,
      payload: { pageProfileId: profile.id, strategyType: 'repost', sourceArchiveId: sourceArchive.id },
      outcome: 'SUCCESS',
      level: 'INFO',
    });

    return { draftId: draft.id, status: draft.status, pageProfileId: profile.id };
  }

  // ─── Content generation (Anthropic) ─────────────────────────────────────────

  private async generateContent(
    profile: any,
    contentStrategy: any,
    qaFeedback: string,
  ): Promise<{ body: string; hashtags: string[] }> {
    const apiKey = process.env['ANTHROPIC_API_KEY'];
    const niche: string = profile.niche;
    const style: string = contentStrategy.style ?? 'professional';
    const topics: string = (contentStrategy.topics as string[] | undefined)?.join(', ') ?? 'general topics';
    const profileDesc: string = profile.description ?? `a ${niche} focused page`;

    const retryNote = qaFeedback
      ? `\nPrevious attempt failed QA. Fix these issues:\n${qaFeedback}\n`
      : '';

    const prompt = `You are a ${style} content creator for a ${niche} social media page.

Page: ${profileDesc}
Topics: ${topics}
${retryNote}
Write an engaging social media post that:
- Is 150-280 characters (short, punchy, platform-safe)
- Starts with a strong hook
- Fits the ${style} tone
- Ends with a question or call-to-action

Return ONLY valid JSON (no markdown):
{"body":"the post text","hashtags":["tag1","tag2","tag3"]}`;

    if (!apiKey || apiKey === 'placeholder') {
      return this.mockContent(profile);
    }

    try {
      const anthropic = new Anthropic({ apiKey });
      const response = await anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 512,
        messages: [{ role: 'user', content: prompt }],
      });

      const text = response.content[0];
      if (!text || text.type !== 'text') throw new Error('No text in response');

      let json = text.text.trim();
      if (json.startsWith('```')) {
        json = json.replace(/```json?\n?/g, '').replace(/```$/g, '').trim();
      }

      const result = JSON.parse(json);
      return { body: result.body ?? '', hashtags: result.hashtags ?? [] };
    } catch (err) {
      this.logger.error('Content generation failed, using mock', { error: String(err) });
      return this.mockContent(profile);
    }
  }

  // ─── QA check ────────────────────────────────────────────────────────────────

  private async runQA(
    body: string,
    hashtags: string[],
    niche: string,
    style: string,
    recentBodies: string[],
  ): Promise<{ pass: boolean; feedback: string; results: any }> {
    // Rule-based checks (no API cost)
    const violations: string[] = [];
    if (body.length < 30) violations.push(`Too short (${body.length} chars)`);
    if (body.length > 2200) violations.push(`Too long (${body.length} chars)`);
    if (!body.trim()) violations.push('Empty content');
    const totalTags = hashtags.length + (body.match(/#\w+/g) ?? []).length;
    if (totalTags > 30) violations.push(`Too many hashtags (${totalTags})`);

    // Originality (Jaccard similarity)
    let maxSim = 0;
    if (recentBodies.length > 0) {
      const words = new Set(body.toLowerCase().split(/\s+/).filter((w) => w.length > 3));
      for (const recent of recentBodies) {
        const rWords = new Set(recent.toLowerCase().split(/\s+/).filter((w) => w.length > 3));
        const inter = new Set([...words].filter((w) => rWords.has(w)));
        const union = new Set([...words, ...rWords]);
        if (union.size > 0) maxSim = Math.max(maxSim, inter.size / union.size);
      }
    }
    if (maxSim >= 0.8) violations.push(`Too similar to recent post (${(maxSim * 100).toFixed(0)}% match)`);

    // AI quality + brand voice check
    let aiPass = true;
    let aiReason = '';
    const apiKey = process.env['ANTHROPIC_API_KEY'];
    if (apiKey && apiKey !== 'placeholder') {
      try {
        const anthropic = new Anthropic({ apiKey });
        const response = await anthropic.messages.create({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 256,
          messages: [{
            role: 'user',
            content: `Rate this ${niche} social post for a ${style} brand (1-10). Only pass if both quality AND brand voice score >= 7.
Post: "${body}"
Return ONLY: {"quality":8,"brandVoice":7,"pass":true,"reason":"..."}`,
          }],
        });

        const text = response.content[0];
        if (text?.type === 'text') {
          let json = text.text.trim();
          if (json.startsWith('```')) json = json.replace(/```json?\n?/g, '').replace(/```$/g, '').trim();
          const qa = JSON.parse(json);
          aiPass = Boolean(qa.pass);
          aiReason = qa.reason ?? '';
          if (!aiPass) violations.push(`AI quality check: ${aiReason}`);
        }
      } catch {
        // AI QA unavailable — don't block
      }
    }

    const pass = violations.length === 0;
    const feedback = violations.map((v) => `- ${v}`).join('\n');

    return {
      pass,
      feedback,
      results: {
        compliance: { pass: violations.filter(v => !v.startsWith('AI') && !v.includes('similar')).length === 0, violations },
        originality: { pass: maxSim < 0.8, similarity: maxSim },
        aiCheck: { pass: aiPass, reason: aiReason },
      },
    };
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  private async findDueProfiles(): Promise<any[]> {
    const now = new Date();
    const activeProfiles = await this.prisma.pageProfile.findMany({
      where: { status: 'ACTIVE' },
    });

    return activeProfiles.filter((p) => this.isDue(p, now));
  }

  private isDue(profile: any, now: Date): boolean {
    const schedule = (profile.schedule as any) ?? {};
    const times: string[] = schedule.times ?? [];

    if (times.length === 0) return false;

    const h = now.getHours();
    const m = now.getMinutes();

    // Check if current time is within 5 minutes of a scheduled slot
    const timeMatch = times.some((t: string) => {
      const [hh, mm] = t.split(':').map(Number);
      const diff = Math.abs(h * 60 + m - ((hh ?? 0) * 60 + (mm ?? 0)));
      return diff <= 5;
    });

    if (!timeMatch) return false;

    // Prevent duplicate runs: skip if we already generated content in the last 30 min
    if (profile.lastPostAt) {
      const minsSinceLastPost = (now.getTime() - profile.lastPostAt.getTime()) / 60000;
      if (minsSinceLastPost < 30) return false;
    }

    return true;
  }

  private async getRecentPostBodies(pageProfileId: string): Promise<string[]> {
    const archives = await this.prisma.contentArchive.findMany({
      where: { pageProfileId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { body: true },
    });
    return archives.map((a) => a.body);
  }

  private mockContent(profile: any): { body: string; hashtags: string[] } {
    return {
      body: `Exciting things are happening in ${profile.niche}! Stay tuned for more updates and join our growing community. What topic would you like us to cover next? 💬`,
      hashtags: [profile.niche.toLowerCase().replace(/\s+/g, ''), 'community', 'trending'],
    };
  }

  private async bumpSuccessStats(profile: any): Promise<void> {
    const stats = (profile.stats as any) ?? {};
    await this.prisma.pageProfile.update({
      where: { id: profile.id },
      data: {
        lastPostAt: new Date(),
        stats: { ...stats, totalPosts: (stats.totalPosts ?? 0) + 1 },
      },
    });
  }

  private async bumpFailedStats(profile: any): Promise<void> {
    const stats = (profile.stats as any) ?? {};
    await this.prisma.pageProfile.update({
      where: { id: profile.id },
      data: {
        stats: { ...stats, failedGenerations: (stats.failedGenerations ?? 0) + 1 },
      },
    });
  }

  private async sendQAFailureAlert(profile: any, draftId: string, attempts: number, qaResults: any): Promise<void> {
    const webhookUrl = process.env['N8N_QA_FAILURE_WEBHOOK_URL'];
    if (!webhookUrl) return;

    fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pageProfileId: profile.id, pageProfileName: profile.name, draftId, qaAttempts: attempts, qaResults }),
    }).catch((err) => this.logger.warn('QA failure webhook failed', { error: String(err) }));
  }
}

function today(): string {
  return new Date().toISOString().split('T')[0]!;
}

function chunk<T>(arr: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i += size) result.push(arr.slice(i, i + size));
  return result;
}
