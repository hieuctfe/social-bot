import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ContentDraftService } from './content-draft.service';
import { CreateContentDraftDto } from './dto/create-content-draft.dto';

@ApiTags('Content Drafts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('workspaces/:wsId/content-drafts')
export class ContentDraftController {
  constructor(private readonly contentDraftService: ContentDraftService) {}

  @Post()
  @ApiOperation({ summary: 'Create content draft' })
  create(
    @Param('wsId') wsId: string,
    @Body() dto: CreateContentDraftDto,
    @Request() req: { user: { id: string } },
  ) {
    return this.contentDraftService.create(wsId, req.user.id, dto);
  }

  @Get()
  findAll(@Param('wsId') wsId: string) {
    return this.contentDraftService.findAll(wsId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.contentDraftService.findOne(id);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: Partial<CreateContentDraftDto>) {
    return this.contentDraftService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.contentDraftService.remove(id);
  }

  @Post(':id/submit-for-approval')
  @ApiOperation({ summary: 'Submit draft for approval' })
  submitForApproval(@Param('id') id: string, @Request() req: { user: { id: string } }) {
    return this.contentDraftService.submitForApproval(id, req.user.id);
  }

  @Post(':id/schedule')
  @ApiOperation({
    summary: 'Schedule approved draft to Postiz',
    description: 'Schedules an APPROVED content draft to the configured social platforms via Postiz. Creates PublishTarget records and sends to Postiz API.'
  })
  schedule(@Param('id') id: string, @Request() req: { user: { id: string } }) {
    return this.contentDraftService.schedule(id, req.user.id);
  }

  @Post(':id/quick-schedule')
  @ApiOperation({
    summary: 'Quick schedule (skips approval) - FOR TESTING ONLY',
    description: 'Auto-approves and schedules a draft in one step. Bypasses approval flow. USE ONLY FOR TESTING.'
  })
  async quickSchedule(@Param('id') id: string, @Request() req: { user: { id: string } }) {
    return this.contentDraftService.quickSchedule(id, req.user.id);
  }
}
