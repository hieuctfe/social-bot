import { Module } from '@nestjs/common';
import { PostizService } from './postiz.service';
import { PostizController } from './postiz.controller';

@Module({
  controllers: [PostizController],
  providers: [PostizService],
  exports: [PostizService],
})
export class PostizModule {}
