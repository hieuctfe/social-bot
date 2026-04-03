import { Controller, Get, Post, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ApprovalService } from './approval.service';
import { ReviewApprovalDto } from './dto/review-approval.dto';

@ApiTags('Approvals')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('workspaces/:wsId/approvals')
export class ApprovalController {
  constructor(private readonly approvalService: ApprovalService) {}

  @Get('pending')
  @ApiOperation({ summary: 'List pending approvals' })
  findPending(@Param('wsId') wsId: string) {
    return this.approvalService.findPending(wsId);
  }

  @Post(':id/review')
  @ApiOperation({ summary: 'Approve or reject a content draft' })
  review(
    @Param('id') id: string,
    @Body() dto: ReviewApprovalDto,
    @Request() req: { user: { id: string } },
  ) {
    return this.approvalService.review(id, req.user.id, dto);
  }
}
