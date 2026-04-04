import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePageProfileDto } from './dto/create-page-profile.dto';
import { UpdatePageProfileDto } from './dto/update-page-profile.dto';
import { PageProfile, PageProfileStatus } from '@prisma/client';

@Injectable()
export class PageProfileService {
  constructor(private prisma: PrismaService) {}

  async create(
    workspaceId: string,
    createDto: CreatePageProfileDto,
  ): Promise<PageProfile> {
    return this.prisma.pageProfile.create({
      data: {
        workspaceId,
        name: createDto.name,
        niche: createDto.niche,
        description: createDto.description,
        contentStrategy: createDto.contentStrategy as any,
        socialConnectionIds: createDto.socialConnectionIds,
        schedule: createDto.schedule as any,
        aiConfig: createDto.aiConfig as any,
        status: PageProfileStatus.ACTIVE,
        stats: {
          totalPosts: 0,
          avgQualityScore: 0,
          failedGenerations: 0,
        },
      },
    });
  }

  async findAll(
    workspaceId: string,
    filters?: { status?: string; niche?: string },
  ): Promise<{ data: PageProfile[]; total: number }> {
    const where: any = { workspaceId };

    if (filters?.status) {
      where.status = filters.status.toUpperCase();
    }

    if (filters?.niche) {
      where.niche = filters.niche;
    }

    const [data, total] = await Promise.all([
      this.prisma.pageProfile.findMany({ where, orderBy: { createdAt: 'desc' } }),
      this.prisma.pageProfile.count({ where }),
    ]);

    return { data, total };
  }

  async findOne(workspaceId: string, id: string): Promise<PageProfile> {
    const pageProfile = await this.prisma.pageProfile.findFirst({
      where: { id, workspaceId },
    });

    if (!pageProfile) {
      throw new NotFoundException(`PageProfile with ID ${id} not found`);
    }

    return pageProfile;
  }

  async update(
    workspaceId: string,
    id: string,
    updateDto: UpdatePageProfileDto,
  ): Promise<PageProfile> {
    // Verify exists
    await this.findOne(workspaceId, id);

    const data: any = {};

    if (updateDto.name !== undefined) data.name = updateDto.name;
    if (updateDto.niche !== undefined) data.niche = updateDto.niche;
    if (updateDto.description !== undefined) data.description = updateDto.description;
    if (updateDto.contentStrategy !== undefined)
      data.contentStrategy = updateDto.contentStrategy;
    if (updateDto.socialConnectionIds !== undefined)
      data.socialConnectionIds = updateDto.socialConnectionIds;
    if (updateDto.schedule !== undefined) data.schedule = updateDto.schedule;
    if (updateDto.aiConfig !== undefined) data.aiConfig = updateDto.aiConfig;
    if (updateDto.status !== undefined)
      data.status = updateDto.status.toUpperCase();

    return this.prisma.pageProfile.update({
      where: { id },
      data,
    });
  }

  async remove(workspaceId: string, id: string): Promise<void> {
    // Verify exists
    await this.findOne(workspaceId, id);

    await this.prisma.pageProfile.delete({
      where: { id },
    });
  }

  async findDueForContent(): Promise<PageProfile[]> {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTime = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`;

    // Find active profiles
    const activeProfiles = await this.prisma.pageProfile.findMany({
      where: { status: PageProfileStatus.ACTIVE },
    });

    // Filter profiles that match current time or are overdue
    const dueProfiles = activeProfiles.filter((profile) => {
      const schedule = profile.schedule as any;
      if (!schedule?.times || !Array.isArray(schedule.times)) return false;

      // Check if current time matches any scheduled time (±5 minutes)
      const isDue = schedule.times.some((time: string) => {
        const parts = time.split(':').map(Number);
        const hour = parts[0] ?? 0;
        const minute = parts[1] ?? 0;
        const diff = Math.abs(
          currentHour * 60 + currentMinute - (hour * 60 + minute),
        );
        return diff <= 5; // Within 5 minutes
      });

      if (isDue) return true;

      // Check if lastPostAt is null or old enough for next post
      if (!profile.lastPostAt) return true;

      const hoursSinceLastPost =
        (now.getTime() - profile.lastPostAt.getTime()) / (1000 * 60 * 60);
      const frequency = schedule.frequency || 1;
      const hoursPerPost = 24 / frequency;

      return hoursSinceLastPost >= hoursPerPost;
    });

    return dueProfiles;
  }
}
