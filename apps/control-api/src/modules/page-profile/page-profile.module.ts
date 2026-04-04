import { Module } from '@nestjs/common';
import { PageProfileController } from './page-profile.controller';
import { PageProfileService } from './page-profile.service';

@Module({
  controllers: [PageProfileController],
  providers: [PageProfileService],
  exports: [PageProfileService],
})
export class PageProfileModule {}
