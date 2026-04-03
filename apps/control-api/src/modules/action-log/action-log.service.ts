import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

interface LogEntry {
  organizationId?: string;
  workspaceId?: string;
  actorId?: string;
  action: string;
  resourceType?: string;
  resourceId?: string;
  payload?: Record<string, unknown>;
  outcome?: 'SUCCESS' | 'FAILURE' | 'PENDING';
  level?: 'INFO' | 'WARN' | 'ERROR';
}

@Injectable()
export class ActionLogService {
  constructor(private readonly prisma: PrismaService) {}

  async log(entry: LogEntry) {
    return this.prisma.actionLog.create({
      data: {
        organizationId: entry.organizationId,
        workspaceId: entry.workspaceId,
        actorId: entry.actorId,
        level: entry.level ?? 'INFO',
        action: entry.action,
        resourceType: entry.resourceType,
        resourceId: entry.resourceId,
        payload: (entry.payload ?? {}) as Prisma.InputJsonValue,
        outcome: entry.outcome ?? 'SUCCESS',
      },
    });
  }

  async findAll(workspaceId: string, limit = 50) {
    return this.prisma.actionLog.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}
