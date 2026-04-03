import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ActionLogService } from './action-log.service';

@ApiTags('Action Log')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('workspaces/:wsId/action-logs')
export class ActionLogController {
  constructor(private readonly actionLogService: ActionLogService) {}

  @Get()
  @ApiQuery({ name: 'limit', required: false, type: Number })
  findAll(@Param('wsId') wsId: string, @Query('limit') limit?: string) {
    return this.actionLogService.findAll(wsId, limit ? parseInt(limit) : 50);
  }
}
