import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AutomationService } from './automation.service';

@ApiTags('Automations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('workspaces/:wsId/automations')
export class AutomationController {
  constructor(private readonly automationService: AutomationService) {}

  @Get()
  findAll(@Param('wsId') wsId: string) {
    return this.automationService.findAll(wsId);
  }
}
