import { Controller, Get, Post, Delete, Param, Body, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SocialConnectionService } from './social-connection.service';
import { CreateSocialConnectionDto } from './dto/create-social-connection.dto';

@ApiTags('Social Connections')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('workspaces/:wsId/social-connections')
export class SocialConnectionController {
  constructor(private readonly socialConnectionService: SocialConnectionService) {}

  @Post()
  create(@Param('wsId') wsId: string, @Body() dto: CreateSocialConnectionDto) {
    return this.socialConnectionService.create(wsId, dto);
  }

  @Get()
  findAll(@Param('wsId') wsId: string) {
    return this.socialConnectionService.findAll(wsId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.socialConnectionService.findOne(id);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.socialConnectionService.remove(id);
  }

  @Post('sync-from-postiz')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Sync social accounts from Postiz',
    description: 'Fetches all connected integrations from Postiz and upserts them as SocialConnections in this workspace.',
  })
  syncFromPostiz(@Param('wsId') wsId: string) {
    return this.socialConnectionService.syncFromPostiz(wsId);
  }
}
