import { Module } from '@nestjs/common';
import { SocialConnectionController } from './social-connection.controller';
import { SocialConnectionService } from './social-connection.service';

@Module({
  controllers: [SocialConnectionController],
  providers: [SocialConnectionService],
  exports: [SocialConnectionService],
})
export class SocialConnectionModule {}
