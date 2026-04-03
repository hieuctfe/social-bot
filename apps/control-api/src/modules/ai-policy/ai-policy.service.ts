import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateAIPolicyDto } from './dto/create-ai-policy.dto';

@Injectable()
export class AIPolicyService {
  constructor(private readonly prisma: PrismaService) {}

  async create(workspaceId: string, dto: CreateAIPolicyDto) {
    return this.prisma.aIPolicy.create({ data: { ...dto, workspaceId } });
  }

  async findAll(workspaceId: string) {
    return this.prisma.aIPolicy.findMany({ where: { workspaceId } });
  }

  async findOne(id: string) {
    const policy = await this.prisma.aIPolicy.findUnique({ where: { id } });
    if (!policy) throw new NotFoundException(`AIPolicy ${id} not found`);
    return policy;
  }

  async update(id: string, dto: Partial<CreateAIPolicyDto>) {
    await this.findOne(id);
    return this.prisma.aIPolicy.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.aIPolicy.delete({ where: { id } });
  }
}
