import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AutomationService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(workspaceId: string) {
    return this.prisma.automationRun.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
