import { Module } from '@nestjs/common';
import { AIPolicyController } from './ai-policy.controller';
import { AIPolicyService } from './ai-policy.service';

@Module({
  controllers: [AIPolicyController],
  providers: [AIPolicyService],
})
export class AIPolicyModule {}
