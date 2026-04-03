import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';

@Injectable()
export class OrganizationService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateOrganizationDto) {
    const existing = await this.prisma.organization.findUnique({ where: { slug: dto.slug } });
    if (existing) throw new ConflictException(`Organization slug '${dto.slug}' already taken`);
    return this.prisma.organization.create({ data: dto });
  }

  async findAll() {
    return this.prisma.organization.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async findOne(id: string) {
    const org = await this.prisma.organization.findUnique({ where: { id } });
    if (!org) throw new NotFoundException(`Organization ${id} not found`);
    return org;
  }

  async update(id: string, dto: Partial<CreateOrganizationDto>) {
    await this.findOne(id);
    return this.prisma.organization.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.organization.delete({ where: { id } });
  }
}
