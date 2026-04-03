import { Controller, Get, Post, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { MemberService } from './member.service';
import { InviteMemberDto } from './dto/invite-member.dto';

@ApiTags('Members')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('organizations/:orgId/members')
export class MemberController {
  constructor(private readonly memberService: MemberService) {}

  @Post('invite')
  invite(@Param('orgId') orgId: string, @Body() dto: InviteMemberDto) {
    return this.memberService.invite(orgId, dto);
  }

  @Get()
  findAll(@Param('orgId') orgId: string) {
    return this.memberService.findAll(orgId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.memberService.findOne(id);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.memberService.remove(id);
  }
}
