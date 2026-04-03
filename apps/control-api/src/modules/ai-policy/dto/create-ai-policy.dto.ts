import { IsString, IsEnum, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AIPolicyAction } from '@social-bot/domain';

export class CreateAIPolicyDto {
  @ApiProperty()
  @IsString()
  name!: string;

  @ApiProperty({ enum: AIPolicyAction })
  @IsEnum(AIPolicyAction)
  action!: AIPolicyAction;

  @ApiProperty()
  @IsString()
  prompt!: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  model?: string;

  @ApiPropertyOptional({ default: true })
  @IsBoolean()
  @IsOptional()
  enabled?: boolean;
}
