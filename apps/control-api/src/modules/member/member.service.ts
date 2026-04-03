import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { InviteMemberDto } from './dto/invite-member.dto';

@Injectable()
export class MemberService {
  constructor(private readonly prisma: PrismaService) {}

  async invite(organizationId: string, dto: InviteMemberDto) {
    return this.prisma.member.upsert({
      where: { organizationId_userId: { organizationId, userId: dto.email } },
      create: {
        organizationId,
        userId: dto.email,
        email: dto.email,
        displayName: dto.displayName ?? dto.email,
      },
      update: { displayName: dto.displayName ?? dto.email },
    });
  }

  async findAll(organizationId: string) {
    return this.prisma.member.findMany({
      where: { organizationId },
      include: { roleBindings: true },
    });
  }

  async findOne(id: string) {
    const member = await this.prisma.member.findUnique({
      where: { id },
      include: { roleBindings: true },
    });
    if (!member) throw new NotFoundException(`Member ${id} not found`);
    return member;
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.member.delete({ where: { id } });
  }
}
