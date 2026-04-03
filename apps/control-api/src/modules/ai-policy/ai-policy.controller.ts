import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AIPolicyService } from './ai-policy.service';
import { CreateAIPolicyDto } from './dto/create-ai-policy.dto';

@ApiTags('AI Policies')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('workspaces/:wsId/ai-policies')
export class AIPolicyController {
  constructor(private readonly aIPolicyService: AIPolicyService) {}

  @Post()
  create(@Param('wsId') wsId: string, @Body() dto: CreateAIPolicyDto) {
    return this.aIPolicyService.create(wsId, dto);
  }

  @Get()
  findAll(@Param('wsId') wsId: string) {
    return this.aIPolicyService.findAll(wsId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.aIPolicyService.findOne(id);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: Partial<CreateAIPolicyDto>) {
    return this.aIPolicyService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.aIPolicyService.remove(id);
  }
}
