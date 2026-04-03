import { IsString, IsOptional, IsEnum, IsArray, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SocialProvider } from '@social-bot/domain';

export class CreateContentDraftDto {
  @ApiProperty()
  @IsString()
  title!: string;

  @ApiProperty()
  @IsString()
  body!: string;

  @ApiPropertyOptional({ enum: SocialProvider, isArray: true })
  @IsArray()
  @IsEnum(SocialProvider, { each: true })
  @IsOptional()
  platformTargets?: SocialProvider[];

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  scheduledAt?: string;
}
