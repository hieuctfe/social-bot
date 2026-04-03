import { IsEnum, IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ApprovalStatus } from '@social-bot/domain';

export class ReviewApprovalDto {
  @ApiProperty({ enum: ['APPROVED', 'REJECTED'] })
  @IsEnum(['APPROVED', 'REJECTED'])
  status!: 'APPROVED' | 'REJECTED';

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  notes?: string;
}
