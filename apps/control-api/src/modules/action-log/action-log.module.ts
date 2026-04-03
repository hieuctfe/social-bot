import { Module } from '@nestjs/common';
import { ActionLogService } from './action-log.service';
import { ActionLogController } from './action-log.controller';

@Module({
  controllers: [ActionLogController],
  providers: [ActionLogService],
  exports: [ActionLogService],
})
export class ActionLogModule {}
