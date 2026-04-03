import { Module } from '@nestjs/common';
import { ContentDraftController } from './content-draft.controller';
import { ContentDraftService } from './content-draft.service';
import { ActionLogModule } from '../action-log/action-log.module';
import { PostizModule } from '../postiz/postiz.module';

@Module({
  imports: [ActionLogModule, PostizModule],
  controllers: [ContentDraftController],
  providers: [ContentDraftService],
  exports: [ContentDraftService],
})
export class ContentDraftModule {}
