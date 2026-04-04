import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { PageProfileService } from './page-profile.service';
import { CreatePageProfileDto } from './dto/create-page-profile.dto';
import { UpdatePageProfileDto } from './dto/update-page-profile.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('page-profiles')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class PageProfileController {
  constructor(private readonly pageProfileService: PageProfileService) {}

  @Post('workspaces/:workspaceId/page-profiles')
  @ApiOperation({ summary: 'Create a new PageProfile' })
  @ApiResponse({ status: 201, description: 'PageProfile created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  create(
    @Param('workspaceId') workspaceId: string,
    @Body() createPageProfileDto: CreatePageProfileDto,
  ) {
    return this.pageProfileService.create(workspaceId, createPageProfileDto);
  }

  @Get('workspaces/:workspaceId/page-profiles')
  @ApiOperation({ summary: 'List all PageProfiles in workspace' })
  @ApiResponse({ status: 200, description: 'List of PageProfiles' })
  findAll(
    @Param('workspaceId') workspaceId: string,
    @Query('status') status?: string,
    @Query('niche') niche?: string,
  ) {
    return this.pageProfileService.findAll(workspaceId, { status, niche });
  }

  @Get('workspaces/:workspaceId/page-profiles/:id')
  @ApiOperation({ summary: 'Get PageProfile by ID' })
  @ApiResponse({ status: 200, description: 'PageProfile found' })
  @ApiResponse({ status: 404, description: 'PageProfile not found' })
  findOne(
    @Param('workspaceId') workspaceId: string,
    @Param('id') id: string,
  ) {
    return this.pageProfileService.findOne(workspaceId, id);
  }

  @Patch('workspaces/:workspaceId/page-profiles/:id')
  @ApiOperation({ summary: 'Update PageProfile' })
  @ApiResponse({ status: 200, description: 'PageProfile updated successfully' })
  @ApiResponse({ status: 404, description: 'PageProfile not found' })
  update(
    @Param('workspaceId') workspaceId: string,
    @Param('id') id: string,
    @Body() updatePageProfileDto: UpdatePageProfileDto,
  ) {
    return this.pageProfileService.update(workspaceId, id, updatePageProfileDto);
  }

  @Delete('workspaces/:workspaceId/page-profiles/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete PageProfile' })
  @ApiResponse({ status: 204, description: 'PageProfile deleted successfully' })
  @ApiResponse({ status: 404, description: 'PageProfile not found' })
  remove(
    @Param('workspaceId') workspaceId: string,
    @Param('id') id: string,
  ) {
    return this.pageProfileService.remove(workspaceId, id);
  }

  @Get('page-profiles/due-for-content')
  @ApiOperation({ summary: 'Get PageProfiles due for content generation (for n8n)' })
  @ApiResponse({
    status: 200,
    description: 'List of PageProfiles that need content now',
  })
  findDueForContent() {
    return this.pageProfileService.findDueForContent();
  }

  @Post('workspaces/:workspaceId/page-profiles/:id/generate-content')
  @ApiOperation({ summary: 'Trigger content generation for a PageProfile' })
  @ApiResponse({ status: 200, description: 'Content generation job queued' })
  @ApiResponse({ status: 404, description: 'PageProfile not found' })
  async generateContent(
    @Param('workspaceId') workspaceId: string,
    @Param('id') id: string,
  ) {
    return this.pageProfileService.triggerContentGeneration(workspaceId, id);
  }
}
