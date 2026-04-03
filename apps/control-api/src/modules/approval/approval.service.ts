import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ActionLogService } from '../action-log/action-log.service';
import { ReviewApprovalDto } from './dto/review-approval.dto';
import { ContentDraftStatus } from '@social-bot/domain';

@Injectable()
export class ApprovalService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly actionLog: ActionLogService,
  ) {}

  async findPending(workspaceId: string) {
    return this.prisma.approvalRequest.findMany({
      where: { status: 'PENDING', contentDraft: { workspaceId } },
      include: { contentDraft: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async review(id: string, reviewerId: string, dto: ReviewApprovalDto) {
    const request = await this.prisma.approvalRequest.findUnique({
      where: { id },
      include: { contentDraft: true },
    });
    if (!request) throw new NotFoundException(`ApprovalRequest ${id} not found`);

    const updated = await this.prisma.approvalRequest.update({
      where: { id },
      data: { status: dto.status, notes: dto.notes, reviewedById: reviewerId, reviewedAt: new Date() },
    });

    const newDraftStatus = dto.status === 'APPROVED'
      ? ContentDraftStatus.APPROVED
      : ContentDraftStatus.REJECTED;

    await this.prisma.contentDraft.update({
      where: { id: request.contentDraftId },
      data: { status: newDraftStatus },
    });

    await this.actionLog.log({
      workspaceId: request.contentDraft.workspaceId,
      actorId: reviewerId,
      action: `approval_request.${dto.status.toLowerCase()}`,
      resourceType: 'ApprovalRequest',
      resourceId: id,
    });

    return updated;
  }
}
