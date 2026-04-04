import { PartialType } from '@nestjs/swagger';
import { CreatePageProfileDto } from './create-page-profile.dto';
import { IsEnum, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdatePageProfileDto extends PartialType(CreatePageProfileDto) {
  @ApiPropertyOptional({ enum: ['active', 'paused', 'archived'] })
  @IsOptional()
  @IsEnum(['active', 'paused', 'archived'])
  status?: 'active' | 'paused' | 'archived';
}
