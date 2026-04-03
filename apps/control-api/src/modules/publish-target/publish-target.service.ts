import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PostizService } from '../postiz/postiz.service';
import { ActionLogService } from '../action-log/action-log.service';
import { SchedulePublishDto } from './dto/schedule-publish.dto';
import { ContentDraftStatus } from '@social-bot/domain';

@Injectable()
export class PublishTargetService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly postiz: PostizService,
    private readonly actionLog: ActionLogService,
  ) {}

  async schedule(contentDraftId: string, actorId: string, dto: SchedulePublishDto) {
    const draft = await this.prisma.contentDraft.findUnique({ where: { id: contentDraftId } });
    if (!draft) throw new NotFoundException(`ContentDraft ${contentDraftId} not found`);

    const connection = await this.prisma.socialConnection.findUnique({
      where: { id: dto.socialConnectionId },
    });
    if (!connection) throw new NotFoundException(`SocialConnection ${dto.socialConnectionId} not found`);

    // Create pending publish target
    const target = await this.prisma.publishTarget.create({
      data: {
        contentDraftId,
        socialConnectionId: dto.socialConnectionId,
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : null,
        status: ContentDraftStatus.SCHEDULED,
      },
    });

    // Delegate to Postiz — this is the ONLY path for actual publishing
    const postizResult = await this.postiz.schedulePost({
      integrationIds: [connection.postizIntegrationId],
      content: draft.body,
      scheduledAt: dto.scheduledAt ?? new Date().toISOString(),
    });

    // Update with Postiz post ID
    const updated = await this.prisma.publishTarget.update({
      where: { id: target.id },
      data: { postizPostId: postizResult.id, status: ContentDraftStatus.SCHEDULED },
    });

    await this.actionLog.log({
      workspaceId: draft.workspaceId,
      actorId,
      action: 'publish_target.scheduled',
      resourceType: 'PublishTarget',
      resourceId: updated.id,
      payload: { postizPostId: postizResult.id },
    });

    return updated;
  }

  async findAll(contentDraftId: string) {
    return this.prisma.publishTarget.findMany({
      where: { contentDraftId },
      include: { socialConnection: true },
    });
  }

  async findOne(id: string) {
    const target = await this.prisma.publishTarget.findUnique({
      where: { id },
      include: { socialConnection: true },
    });
    if (!target) throw new NotFoundException(`PublishTarget ${id} not found`);
    return target;
  }
}
