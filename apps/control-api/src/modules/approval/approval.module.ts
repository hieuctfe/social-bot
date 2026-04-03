import { Module } from '@nestjs/common';
import { ApprovalController } from './approval.controller';
import { ApprovalService } from './approval.service';
import { ActionLogModule } from '../action-log/action-log.module';

@Module({
  imports: [ActionLogModule],
  controllers: [ApprovalController],
  providers: [ApprovalService],
})
export class ApprovalModule {}
