import { IsString, IsOptional, Matches, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateWorkspaceDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  name!: string;

  @ApiProperty()
  @IsString()
  @Matches(/^[a-z0-9-]+$/)
  slug!: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;
}
