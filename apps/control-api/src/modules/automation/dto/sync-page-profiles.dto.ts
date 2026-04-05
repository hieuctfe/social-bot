import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum SheetStrategy {
  AI_GENERATED = 'AI_GENERATED',
  REPOST = 'REPOST',
}

export class PageProfileRowDto {
  @ApiPropertyOptional({ description: 'Existing PageProfile ID (blank on first sync)' })
  @IsOptional()
  @IsString()
  page_id?: string;

  @ApiProperty()
  @IsString()
  page_name!: string;

  @ApiProperty({ description: 'Postiz integration ID for this social account' })
  @IsString()
  postiz_integration_id!: string;

  @ApiProperty({ enum: SheetStrategy })
  @IsEnum(SheetStrategy)
  strategy!: SheetStrategy;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  niche?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  brand_voice?: string;

  @ApiPropertyOptional({ description: 'Comma-separated topic seeds' })
  @IsOptional()
  @IsString()
  topics?: string;

  @ApiPropertyOptional({ description: 'Comma-separated times e.g. "09:00,18:00"' })
  @IsOptional()
  @IsString()
  posting_times?: string;

  @ApiPropertyOptional({ default: 'Asia/Ho_Chi_Minh' })
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiPropertyOptional({ description: 'Source SocialConnection ID for REPOST strategy' })
  @IsOptional()
  @IsString()
  repost_source_connection_id?: string;

  @ApiPropertyOptional({ default: 30 })
  @IsOptional()
  @IsNumber()
  repost_delay_minutes?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  append_text?: string;

  @ApiProperty()
  @IsBoolean()
  active!: boolean;
}

export class SyncPageProfilesDto {
  @ApiProperty({ type: [PageProfileRowDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PageProfileRowDto)
  rows!: PageProfileRowDto[];

  @ApiProperty({ description: 'Workspace ID to sync into' })
  @IsString()
  workspaceId!: string;
}
