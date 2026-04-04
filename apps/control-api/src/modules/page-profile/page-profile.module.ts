import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { PageProfileController } from './page-profile.controller';
import { PageProfileService } from './page-profile.service';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'content-generation',
    }),
  ],
  controllers: [PageProfileController],
  providers: [PageProfileService],
  exports: [PageProfileService],
})
export class PageProfileModule {}
