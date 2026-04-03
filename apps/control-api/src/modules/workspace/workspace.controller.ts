import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { WorkspaceService } from './workspace.service';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';

@ApiTags('Workspaces')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('organizations/:orgId/workspaces')
export class WorkspaceController {
  constructor(private readonly workspaceService: WorkspaceService) {}

  @Post()
  create(@Param('orgId') orgId: string, @Body() dto: CreateWorkspaceDto) {
    return this.workspaceService.create(orgId, dto);
  }

  @Get()
  findAll(@Param('orgId') orgId: string) {
    return this.workspaceService.findAll(orgId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.workspaceService.findOne(id);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: Partial<CreateWorkspaceDto>) {
    return this.workspaceService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.workspaceService.remove(id);
  }
}
