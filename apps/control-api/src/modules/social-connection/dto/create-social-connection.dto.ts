import { IsString, IsEnum, IsOptional, IsUrl } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SocialProvider } from '@social-bot/domain';

export class CreateSocialConnectionDto {
  @ApiProperty({ enum: SocialProvider })
  @IsEnum(SocialProvider)
  provider!: SocialProvider;

  @ApiProperty({ description: 'Postiz integration ID' })
  @IsString()
  postizIntegrationId!: string;

  @ApiProperty()
  @IsString()
  displayName!: string;

  @ApiPropertyOptional()
  @IsUrl()
  @IsOptional()
  profileUrl?: string;

  @ApiPropertyOptional()
  @IsUrl()
  @IsOptional()
  avatarUrl?: string;
}
