import { Module } from '@nestjs/common';
import { PublishTargetController } from './publish-target.controller';
import { PublishTargetService } from './publish-target.service';
import { PostizModule } from '../postiz/postiz.module';
import { ActionLogModule } from '../action-log/action-log.module';

@Module({
  imports: [PostizModule, ActionLogModule],
  controllers: [PublishTargetController],
  providers: [PublishTargetService],
  exports: [PublishTargetService],
})
export class PublishTargetModule {}
