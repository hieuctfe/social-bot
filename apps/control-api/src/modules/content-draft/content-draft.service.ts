import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ActionLogService } from '../action-log/action-log.service';
import { PostizService } from '../postiz/postiz.service';
import { CreateContentDraftDto } from './dto/create-content-draft.dto';
import { ContentDraftStatus } from '@social-bot/domain';

@Injectable()
export class ContentDraftService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly actionLog: ActionLogService,
    private readonly postiz: PostizService,
  ) {}

  async create(workspaceId: string, createdById: string, dto: CreateContentDraftDto) {
    const draft = await this.prisma.contentDraft.create({
      data: { ...dto, workspaceId, createdById, status: ContentDraftStatus.DRAFT },
    });
    await this.actionLog.log({
      workspaceId,
      actorId: createdById,
      action: 'content_draft.created',
      resourceType: 'ContentDraft',
      resourceId: draft.id,
    });
    return draft;
  }

  async findAll(workspaceId: string) {
    return this.prisma.contentDraft.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const draft = await this.prisma.contentDraft.findUnique({
      where: { id },
      include: { publishTargets: true, approvalRequests: true },
    });
    if (!draft) throw new NotFoundException(`ContentDraft ${id} not found`);
    return draft;
  }

  async update(id: string, dto: Partial<CreateContentDraftDto>) {
    await this.findOne(id);
    return this.prisma.contentDraft.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.contentDraft.delete({ where: { id } });
  }

  async submitForApproval(id: string, requestedById: string) {
    const draft = await this.findOne(id);
    const updated = await this.prisma.contentDraft.update({
      where: { id },
      data: { status: ContentDraftStatus.PENDING_APPROVAL },
    });
    await this.prisma.approvalRequest.create({
      data: { contentDraftId: draft.id, requestedById, status: 'PENDING' },
    });
    await this.actionLog.log({
      workspaceId: draft.workspaceId,
      actorId: requestedById,
      action: 'content_draft.submitted_for_approval',
      resourceType: 'ContentDraft',
      resourceId: id,
    });
    return updated;
  }

  async schedule(id: string, actorId: string) {
    const draft = await this.findOne(id);

    // Verify draft is APPROVED
    if (draft.status !== ContentDraftStatus.APPROVED) {
      throw new BadRequestException(`Cannot schedule draft with status ${draft.status}. Draft must be APPROVED first.`);
    }

    // Get social connections for the targeted platforms
    const connections = await this.prisma.socialConnection.findMany({
      where: {
        workspaceId: draft.workspaceId,
        provider: { in: draft.platformTargets },
        status: 'ACTIVE',
      },
    });

    if (connections.length === 0) {
      throw new BadRequestException(
        `No active social connections found for platforms: ${draft.platformTargets.join(', ')}`,
      );
    }

    // Prepare scheduledAt (use provided date or schedule for "now")
    const scheduledAt = draft.scheduledAt ? draft.scheduledAt.toISOString() : new Date().toISOString();

    // Call Postiz to schedule the post
    const postizIntegrationIds = connections.map((c) => c.postizIntegrationId);

    const postizPost = await this.postiz.schedulePost({
      integrationIds: postizIntegrationIds,
      content: draft.body,
      scheduledAt,
    });

    // Create PublishTarget records for each connection
    await Promise.all(
      connections.map((connection) =>
        this.prisma.publishTarget.create({
          data: {
            contentDraftId: draft.id,
            socialConnectionId: connection.id,
            postizPostId: postizPost.id,
            status: ContentDraftStatus.SCHEDULED,
            scheduledAt: new Date(scheduledAt),
          },
        }),
      ),
    );

    // Update draft status
    const updated = await this.prisma.contentDraft.update({
      where: { id },
      data: {
        status: ContentDraftStatus.SCHEDULED,
        scheduledAt: new Date(scheduledAt),
      },
    });

    // Log action
    await this.actionLog.log({
      workspaceId: draft.workspaceId,
      actorId,
      action: 'content_draft.scheduled',
      resourceType: 'ContentDraft',
      resourceId: id,
      payload: {
        postizPostId: postizPost.id,
        platforms: draft.platformTargets,
        scheduledAt,
      },
    });

    return updated;
  }

  async quickSchedule(id: string, actorId: string) {
    const draft = await this.findOne(id);

    // Auto-approve the draft
    await this.prisma.contentDraft.update({
      where: { id },
      data: { status: ContentDraftStatus.APPROVED },
    });

    // Then schedule it
    return this.schedule(id, actorId);
  }
}
