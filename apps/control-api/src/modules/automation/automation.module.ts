import { Module } from '@nestjs/common';
import { AutomationController } from './automation.controller';
import { AutomationService } from './automation.service';
import { ContentAutomationService } from './content-automation.service';
import { ActionLogModule } from '../action-log/action-log.module';

@Module({
  imports: [ActionLogModule],
  controllers: [AutomationController],
  providers: [AutomationService, ContentAutomationService],
  exports: [ContentAutomationService],
})
export class AutomationModule {}
