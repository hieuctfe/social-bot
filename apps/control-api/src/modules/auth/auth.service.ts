import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';

export interface JwtPayload {
  sub: string;
  email: string;
  organizationId: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * TODO: Implement full auth (OAuth2, magic link, etc.)
   * For now this is a minimal placeholder for local dev.
   */
  async signIn(email: string): Promise<{ accessToken: string }> {
    // Find or create a member for dev purposes
    // IMPORTANT: Replace with real auth before production
    const member = await this.prisma.member.findFirst({
      where: { email },
    });

    if (!member) {
      throw new UnauthorizedException('Member not found');
    }

    const payload: JwtPayload = {
      sub: member.id,
      email: member.email,
      organizationId: member.organizationId,
    };

    return { accessToken: this.jwtService.sign(payload) };
  }

  async validatePayload(payload: JwtPayload) {
    const member = await this.prisma.member.findFirst({
      where: { id: payload.sub },
    });
    if (!member) throw new UnauthorizedException();
    return member;
  }
}
