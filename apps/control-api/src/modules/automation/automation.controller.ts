import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AutomationService } from './automation.service';
import { ContentAutomationService } from './content-automation.service';
import { SyncPageProfilesDto } from './dto/sync-page-profiles.dto';

@ApiTags('Automations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('workspaces/:wsId/automations')
export class AutomationController {
  constructor(
    private readonly automationService: AutomationService,
    private readonly contentAutomationService: ContentAutomationService,
  ) {}

  @Get()
  findAll(@Param('wsId') wsId: string) {
    return this.automationService.findAll(wsId);
  }

  @Post('sync-page-profiles')
  @ApiOperation({
    summary: 'Sync PageProfiles from Google Sheets',
    description:
      'Called by n8n every 5 minutes. Upserts PageProfiles based on the Google Sheets "Pages" tab.',
  })
  syncPageProfiles(@Body() dto: SyncPageProfilesDto) {
    return this.automationService.syncPageProfiles(dto);
  }

  @Post('page-profiles/:profileId/generate')
  @ApiOperation({
    summary: 'Manually trigger content generation for a PageProfile',
    description: 'Generates content immediately, runs QA, and creates an APPROVED ContentDraft ready for scheduling.',
  })
  triggerGeneration(
    @Param('wsId') wsId: string,
    @Param('profileId') profileId: string,
  ) {
    return this.contentAutomationService.triggerForProfile(wsId, profileId);
  }
}
