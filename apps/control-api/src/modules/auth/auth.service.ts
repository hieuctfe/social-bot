import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
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

  async signIn(email: string, password: string): Promise<{ accessToken: string }> {
    const member = await this.prisma.member.findFirst({ where: { email } });

    if (!member) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // If member has no password set yet, reject (require password to be set first via seed/admin)
    if (!member.passwordHash) {
      throw new UnauthorizedException('No password set for this account. Run pnpm db:seed to set the default password.');
    }

    const valid = await bcrypt.compare(password, member.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Invalid email or password');
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

  /** Used by admin to set/change a member's password. */
  static async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 10);
  }
}
