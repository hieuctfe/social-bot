import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bull';
import { PrismaModule } from './prisma/prisma.module';
import { HealthModule } from './modules/health/health.module';
import { AuthModule } from './modules/auth/auth.module';
import { OrganizationModule } from './modules/organization/organization.module';
import { WorkspaceModule } from './modules/workspace/workspace.module';
import { MemberModule } from './modules/member/member.module';
import { SocialConnectionModule } from './modules/social-connection/social-connection.module';
import { AssetModule } from './modules/asset/asset.module';
import { ContentDraftModule } from './modules/content-draft/content-draft.module';
import { PublishTargetModule } from './modules/publish-target/publish-target.module';
import { ApprovalModule } from './modules/approval/approval.module';
import { ActionLogModule } from './modules/action-log/action-log.module';
import { AutomationModule } from './modules/automation/automation.module';
import { AIPolicyModule } from './modules/ai-policy/ai-policy.module';
import { StorageModule } from './modules/storage/storage.module';
import { PostizModule } from './modules/postiz/postiz.module';
import { WebhookModule } from './modules/webhook/webhook.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    BullModule.forRoot({
      redis: {
        host: new URL(process.env['REDIS_URL'] ?? 'redis://redis:6379').hostname,
        port: parseInt(new URL(process.env['REDIS_URL'] ?? 'redis://redis:6379').port || '6379'),
      },
    }),
    PrismaModule,
    HealthModule,
    AuthModule,
    OrganizationModule,
    WorkspaceModule,
    MemberModule,
    SocialConnectionModule,
    AssetModule,
    ContentDraftModule,
    PublishTargetModule,
    ApprovalModule,
    ActionLogModule,
    AutomationModule,
    AIPolicyModule,
    StorageModule,
    PostizModule,
    WebhookModule,
  ],
})
export class AppModule {}
