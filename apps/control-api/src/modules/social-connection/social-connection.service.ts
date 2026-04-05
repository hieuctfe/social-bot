import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PostizService } from '../postiz/postiz.service';
import { CreateSocialConnectionDto } from './dto/create-social-connection.dto';
import { SocialProvider } from '@social-bot/domain';

/** Map Postiz integration identifiers → our SocialProvider enum. */
const POSTIZ_TO_PROVIDER: Record<string, SocialProvider> = {
  facebook:  SocialProvider.FACEBOOK,
  instagram: SocialProvider.INSTAGRAM,
  tiktok:    SocialProvider.TIKTOK,
  twitter:   SocialProvider.TWITTER,
  linkedin:  SocialProvider.LINKEDIN,
  youtube:   SocialProvider.YOUTUBE,
};

@Injectable()
export class SocialConnectionService {
  private readonly logger = new Logger(SocialConnectionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly postizService: PostizService,
  ) {}

  async create(workspaceId: string, dto: CreateSocialConnectionDto) {
    return this.prisma.socialConnection.create({
      data: { ...dto, workspaceId },
    });
  }

  async findAll(workspaceId: string) {
    return this.prisma.socialConnection.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const conn = await this.prisma.socialConnection.findUnique({ where: { id } });
    if (!conn) throw new NotFoundException(`SocialConnection ${id} not found`);
    return conn;
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.socialConnection.delete({ where: { id } });
  }

  /**
   * Pull all integrations from Postiz and upsert them as SocialConnections.
   * Returns a summary of what was created/updated/unchanged.
   */
  async syncFromPostiz(workspaceId: string): Promise<{
    created: number;
    updated: number;
    total: number;
    connections: unknown[];
  }> {
    const integrations = await this.postizService.listIntegrations();
    this.logger.log(`Syncing ${integrations.length} Postiz integration(s) for workspace ${workspaceId}`);

    let created = 0;
    let updated = 0;

    for (const integration of integrations) {
      const provider = POSTIZ_TO_PROVIDER[integration.identifier.toLowerCase()];
      if (!provider) {
        this.logger.warn(`Unknown Postiz identifier "${integration.identifier}" — skipping`);
        continue;
      }

      const existing = await this.prisma.socialConnection.findFirst({
        where: { workspaceId, postizIntegrationId: integration.id },
      });

      if (existing) {
        await this.prisma.socialConnection.update({
          where: { id: existing.id },
          data: {
            displayName: integration.name,
            status: integration.disabled ? 'INACTIVE' : 'ACTIVE',
            avatarUrl: integration.picture || null,
            lastSyncAt: new Date(),
          },
        });
        updated++;
      } else {
        await this.prisma.socialConnection.create({
          data: {
            workspaceId,
            provider,
            postizIntegrationId: integration.id,
            displayName: integration.name,
            status: integration.disabled ? 'INACTIVE' : 'ACTIVE',
            avatarUrl: integration.picture || null,
            lastSyncAt: new Date(),
          },
        });
        created++;
      }
    }

    const connections = await this.findAll(workspaceId);
    return { created, updated, total: connections.length, connections };
  }
}
