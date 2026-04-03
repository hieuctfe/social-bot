import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateSocialConnectionDto } from './dto/create-social-connection.dto';

@Injectable()
export class SocialConnectionService {
  constructor(private readonly prisma: PrismaService) {}

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
}
