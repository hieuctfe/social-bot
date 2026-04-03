import { IsString, IsOptional, Matches, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateOrganizationDto {
  @ApiProperty({ example: 'Acme Corp' })
  @IsString()
  @MinLength(1)
  name!: string;

  @ApiProperty({ example: 'acme-corp' })
  @IsString()
  @Matches(/^[a-z0-9-]+$/, { message: 'Slug must be lowercase alphanumeric with hyphens' })
  slug!: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  logoUrl?: string;
}
