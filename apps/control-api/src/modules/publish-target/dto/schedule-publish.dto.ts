import { IsString, IsOptional, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SchedulePublishDto {
  @ApiProperty({ description: 'SocialConnection ID in our system' })
  @IsString()
  socialConnectionId!: string;

  @ApiPropertyOptional({ description: 'ISO 8601 scheduled time. Defaults to now.' })
  @IsDateString()
  @IsOptional()
  scheduledAt?: string;
}
