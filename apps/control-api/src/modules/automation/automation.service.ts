import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SyncPageProfilesDto, SheetStrategy } from './dto/sync-page-profiles.dto';

@Injectable()
export class AutomationService {
  private readonly logger = new Logger(AutomationService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAll(workspaceId: string) {
    return this.prisma.automationRun.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Sync PageProfiles from Google Sheets row data.
   * Upserts by postiz_integration_id within the workspace.
   */
  async syncPageProfiles(dto: SyncPageProfilesDto): Promise<{
    created: number;
    updated: number;
    deactivated: number;
    errors: string[];
  }> {
    const { rows, workspaceId } = dto;
    let created = 0;
    let updated = 0;
    let deactivated = 0;
    const errors: string[] = [];

    for (const row of rows) {
      try {
        const existingByIntegration = await this.prisma.pageProfile.findFirst({
          where: { workspaceId, socialConnectionIds: { has: row.postiz_integration_id } },
        });

        const socialConnection = await this.prisma.socialConnection.findFirst({
          where: { workspaceId, postizIntegrationId: row.postiz_integration_id },
        });
        const socialConnectionIds = socialConnection ? [socialConnection.id] : [];

        const topics = row.topics
          ? row.topics.split(',').map((t) => t.trim()).filter(Boolean)
          : [];
        const times = row.posting_times
          ? row.posting_times.split(',').map((t) => t.trim()).filter(Boolean)
          : ['09:00', '18:00'];

        const contentStrategy =
          row.strategy === SheetStrategy.REPOST
            ? {
                type: 'repost',
                sourceConnectionId: row.repost_source_connection_id || null,
                repostDelayMinutes: row.repost_delay_minutes ?? 30,
                appendText: row.append_text || '',
              }
            : {
                type: 'ai-generated',
                style: row.brand_voice || 'professional',
                topics,
              };

        const schedule = {
          frequency: times.length,
          times,
          timezone: row.timezone || 'Asia/Ho_Chi_Minh',
        };

        const aiConfig = {
          generationModel: 'claude-sonnet-4-6',
          qaEnabled: true,
          minQualityScore: 70,
          maxRetries: 2,
        };

        const status = row.active ? 'ACTIVE' : 'PAUSED';

        if (existingByIntegration) {
          await this.prisma.pageProfile.update({
            where: { id: existingByIntegration.id },
            data: {
              name: row.page_name,
              niche: row.niche || existingByIntegration.niche,
              contentStrategy,
              socialConnectionIds,
              schedule,
              aiConfig,
              status,
            },
          });
          updated++;
        } else {
          await this.prisma.pageProfile.create({
            data: {
              workspaceId,
              name: row.page_name,
              niche: row.niche || 'general',
              contentStrategy,
              socialConnectionIds,
              schedule,
              aiConfig,
              status,
              stats: { totalPosts: 0, avgQualityScore: 0, failedGenerations: 0 },
            },
          });
          created++;
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        errors.push(`Row "${row.page_name}" (${row.postiz_integration_id}): ${message}`);
        this.logger.error('Failed to sync row', { name: row.page_name, error: message });
      }
    }

    // Pause profiles no longer active in the sheet
    const activeIds = rows.filter((r) => r.active).map((r) => r.postiz_integration_id);
    if (activeIds.length > 0) {
      const allActive = await this.prisma.pageProfile.findMany({
        where: { workspaceId, status: 'ACTIVE' },
      });
      for (const profile of allActive) {
        const stillActive = profile.socialConnectionIds.some((id) => activeIds.includes(id));
        if (!stillActive) {
          await this.prisma.pageProfile.update({
            where: { id: profile.id },
            data: { status: 'PAUSED' },
          });
          deactivated++;
        }
      }
    }

    return { created, updated, deactivated, errors };
  }
}
