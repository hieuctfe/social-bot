import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';

@Injectable()
export class WorkspaceService {
  constructor(private readonly prisma: PrismaService) {}

  async create(organizationId: string, dto: CreateWorkspaceDto) {
    const existing = await this.prisma.workspace.findUnique({
      where: { organizationId_slug: { organizationId, slug: dto.slug } },
    });
    if (existing) throw new ConflictException(`Workspace slug '${dto.slug}' already exists`);
    return this.prisma.workspace.create({ data: { ...dto, organizationId } });
  }

  async findAll(organizationId: string) {
    return this.prisma.workspace.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const ws = await this.prisma.workspace.findUnique({ where: { id } });
    if (!ws) throw new NotFoundException(`Workspace ${id} not found`);
    return ws;
  }

  async update(id: string, dto: Partial<CreateWorkspaceDto>) {
    await this.findOne(id);
    return this.prisma.workspace.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.workspace.delete({ where: { id } });
  }
}
