import {
  IsString,
  IsOptional,
  IsObject,
  IsArray,
  IsEnum,
  IsInt,
  IsBoolean,
  Min,
  Max,
  MinLength,
  ValidateNested,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class ContentStrategyDto {
  @ApiProperty({ enum: ['repost', 'news', 'ai-generated', 'mixed'] })
  @IsEnum(['repost', 'news', 'ai-generated', 'mixed'])
  type!: 'repost' | 'news' | 'ai-generated' | 'mixed';

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  sources?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  keywords?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  topics?: string[];

  @ApiProperty({ enum: ['professional', 'funny', 'educational', 'viral'] })
  @IsEnum(['professional', 'funny', 'educational', 'viral'])
  style!: 'professional' | 'funny' | 'educational' | 'viral';
}

class ScheduleDto {
  @ApiProperty({ minimum: 1, maximum: 10 })
  @IsInt()
  @Min(1)
  @Max(10)
  frequency!: number;

  @ApiProperty({ type: [String], example: ['09:00', '18:00'] })
  @IsArray()
  @IsString({ each: true })
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, { each: true })
  times!: string[];

  @ApiProperty({ example: 'Asia/Saigon' })
  @IsString()
  timezone!: string;
}

class AIConfigDto {
  @ApiProperty({ example: 'gpt-4o-mini' })
  @IsString()
  generationModel!: string;

  @ApiProperty()
  @IsBoolean()
  qaEnabled!: boolean;

  @ApiProperty({ minimum: 0, maximum: 100 })
  @IsInt()
  @Min(0)
  @Max(100)
  minQualityScore!: number;

  @ApiProperty({ minimum: 1, maximum: 5 })
  @IsInt()
  @Min(1)
  @Max(5)
  maxRetries!: number;
}

export class CreatePageProfileDto {
  @ApiProperty({ example: 'Tech News Daily' })
  @IsString()
  @MinLength(1)
  name!: string;

  @ApiProperty({ example: 'tech' })
  @IsString()
  @MinLength(1)
  niche!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ type: ContentStrategyDto })
  @IsObject()
  @ValidateNested()
  @Type(() => ContentStrategyDto)
  contentStrategy!: ContentStrategyDto;

  @ApiProperty({ type: [String], example: [] })
  @IsArray()
  @IsString({ each: true })
  socialConnectionIds!: string[];

  @ApiProperty({ type: ScheduleDto })
  @IsObject()
  @ValidateNested()
  @Type(() => ScheduleDto)
  schedule!: ScheduleDto;

  @ApiProperty({ type: AIConfigDto })
  @IsObject()
  @ValidateNested()
  @Type(() => AIConfigDto)
  aiConfig!: AIConfigDto;
}
