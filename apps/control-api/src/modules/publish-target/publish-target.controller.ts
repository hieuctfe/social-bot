import { Controller, Get, Post, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PublishTargetService } from './publish-target.service';
import { SchedulePublishDto } from './dto/schedule-publish.dto';

@ApiTags('Publish Targets')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('content-drafts/:draftId/publish-targets')
export class PublishTargetController {
  constructor(private readonly publishTargetService: PublishTargetService) {}

  @Post('schedule')
  @ApiOperation({ summary: 'Schedule a draft for publishing via Postiz' })
  schedule(
    @Param('draftId') draftId: string,
    @Body() dto: SchedulePublishDto,
    @Request() req: { user: { id: string } },
  ) {
    return this.publishTargetService.schedule(draftId, req.user.id, dto);
  }

  @Get()
  findAll(@Param('draftId') draftId: string) {
    return this.publishTargetService.findAll(draftId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.publishTargetService.findOne(id);
  }
}
