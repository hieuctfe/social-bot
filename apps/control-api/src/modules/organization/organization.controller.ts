import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OrganizationService } from './organization.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';

@ApiTags('Organizations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('organizations')
export class OrganizationController {
  constructor(private readonly organizationService: OrganizationService) {}

  @Post()
  @ApiOperation({ summary: 'Create organization' })
  create(@Body() dto: CreateOrganizationDto) {
    return this.organizationService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List organizations' })
  findAll() {
    return this.organizationService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get organization by ID' })
  findOne(@Param('id') id: string) {
    return this.organizationService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update organization' })
  update(@Param('id') id: string, @Body() dto: Partial<CreateOrganizationDto>) {
    return this.organizationService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete organization' })
  remove(@Param('id') id: string) {
    return this.organizationService.remove(id);
  }
}
