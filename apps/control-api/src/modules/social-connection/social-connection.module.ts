import { Module } from '@nestjs/common';
import { SocialConnectionController } from './social-connection.controller';
import { SocialConnectionService } from './social-connection.service';
import { PostizModule } from '../postiz/postiz.module';

@Module({
  imports: [PostizModule],
  controllers: [SocialConnectionController],
  providers: [SocialConnectionService],
  exports: [SocialConnectionService],
})
export class SocialConnectionModule {}
