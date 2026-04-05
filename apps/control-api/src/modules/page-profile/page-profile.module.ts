import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { PageProfileController } from './page-profile.controller';
import { PageProfileService } from './page-profile.service';
import { ContentSchedulerService } from './content-scheduler.service';
import { PostizModule } from '../postiz/postiz.module';
import { ActionLogModule } from '../action-log/action-log.module';

@Module({
  imports: [
    BullModule.registerQueue({ name: 'content-generation' }),
    PostizModule,
    ActionLogModule,
  ],
  controllers: [PageProfileController],
  providers: [PageProfileService, ContentSchedulerService],
  exports: [PageProfileService],
})
export class PageProfileModule {}
