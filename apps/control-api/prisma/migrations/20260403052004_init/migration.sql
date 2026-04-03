-- CreateEnum
CREATE TYPE "MemberRole" AS ENUM ('OWNER', 'ADMIN', 'EDITOR', 'VIEWER');

-- CreateEnum
CREATE TYPE "ContentDraftStatus" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'SCHEDULED', 'PUBLISHED', 'FAILED');

-- CreateEnum
CREATE TYPE "SocialProvider" AS ENUM ('INSTAGRAM', 'FACEBOOK', 'TIKTOK', 'TWITTER', 'LINKEDIN', 'YOUTUBE');

-- CreateEnum
CREATE TYPE "ApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "AssetType" AS ENUM ('IMAGE', 'VIDEO', 'DOCUMENT', 'OTHER');

-- CreateEnum
CREATE TYPE "ActionLogLevel" AS ENUM ('INFO', 'WARN', 'ERROR');

-- CreateEnum
CREATE TYPE "AutomationStatus" AS ENUM ('RUNNING', 'SUCCESS', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AIPolicyAction" AS ENUM ('GENERATE_CAPTION', 'SUGGEST_HASHTAGS', 'TRANSLATE', 'REVIEW_CONTENT', 'PLAN_ACTIONS');

-- CreateEnum
CREATE TYPE "ConnectionStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'ERROR');

-- CreateEnum
CREATE TYPE "ActionOutcome" AS ENUM ('SUCCESS', 'FAILURE', 'PENDING');

-- CreateTable
CREATE TABLE "organizations" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "logoUrl" TEXT,
    "settings" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workspaces" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "workspaces_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "members" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "avatarUrl" TEXT,

    CONSTRAINT "members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_bindings" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "memberId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "role" "MemberRole" NOT NULL,

    CONSTRAINT "role_bindings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "social_connections" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "provider" "SocialProvider" NOT NULL,
    "postizIntegrationId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "profileUrl" TEXT,
    "avatarUrl" TEXT,
    "status" "ConnectionStatus" NOT NULL DEFAULT 'ACTIVE',
    "lastSyncAt" TIMESTAMP(3),
    "metadata" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "social_connections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assets" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "assetType" "AssetType" NOT NULL,
    "storagePath" TEXT NOT NULL,
    "publicUrl" TEXT,
    "postizMediaId" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_drafts" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "status" "ContentDraftStatus" NOT NULL DEFAULT 'DRAFT',
    "platformTargets" "SocialProvider"[],
    "scheduledAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "metadata" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "content_drafts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "publish_targets" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "contentDraftId" TEXT NOT NULL,
    "socialConnectionId" TEXT NOT NULL,
    "postizPostId" TEXT,
    "status" "ContentDraftStatus" NOT NULL DEFAULT 'DRAFT',
    "scheduledAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "analyticsSnapshot" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "publish_targets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "approval_requests" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "contentDraftId" TEXT NOT NULL,
    "requestedById" TEXT NOT NULL,
    "reviewedById" TEXT,
    "status" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "reviewedAt" TIMESTAMP(3),

    CONSTRAINT "approval_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "action_logs" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "organizationId" TEXT,
    "workspaceId" TEXT,
    "actorId" TEXT,
    "level" "ActionLogLevel" NOT NULL,
    "action" TEXT NOT NULL,
    "resourceType" TEXT,
    "resourceId" TEXT,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "outcome" "ActionOutcome" NOT NULL,

    CONSTRAINT "action_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "automation_runs" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "triggeredBy" TEXT NOT NULL,
    "n8nExecutionId" TEXT,
    "workflowName" TEXT NOT NULL,
    "status" "AutomationStatus" NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "payload" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "automation_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_policies" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "action" "AIPolicyAction" NOT NULL,
    "prompt" TEXT NOT NULL,
    "model" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "config" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "ai_policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_MemberToWorkspace" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "organizations_name_key" ON "organizations"("name");

-- CreateIndex
CREATE UNIQUE INDEX "organizations_slug_key" ON "organizations"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "workspaces_organizationId_slug_key" ON "workspaces"("organizationId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "members_organizationId_userId_key" ON "members"("organizationId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "role_bindings_memberId_workspaceId_key" ON "role_bindings"("memberId", "workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "social_connections_postizIntegrationId_key" ON "social_connections"("postizIntegrationId");

-- CreateIndex
CREATE INDEX "action_logs_organizationId_createdAt_idx" ON "action_logs"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "action_logs_workspaceId_createdAt_idx" ON "action_logs"("workspaceId", "createdAt");

-- CreateIndex
CREATE INDEX "action_logs_action_idx" ON "action_logs"("action");

-- CreateIndex
CREATE UNIQUE INDEX "_MemberToWorkspace_AB_unique" ON "_MemberToWorkspace"("A", "B");

-- CreateIndex
CREATE INDEX "_MemberToWorkspace_B_index" ON "_MemberToWorkspace"("B");

-- AddForeignKey
ALTER TABLE "workspaces" ADD CONSTRAINT "workspaces_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "members" ADD CONSTRAINT "members_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_bindings" ADD CONSTRAINT "role_bindings_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_bindings" ADD CONSTRAINT "role_bindings_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social_connections" ADD CONSTRAINT "social_connections_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assets" ADD CONSTRAINT "assets_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_drafts" ADD CONSTRAINT "content_drafts_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "publish_targets" ADD CONSTRAINT "publish_targets_contentDraftId_fkey" FOREIGN KEY ("contentDraftId") REFERENCES "content_drafts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "publish_targets" ADD CONSTRAINT "publish_targets_socialConnectionId_fkey" FOREIGN KEY ("socialConnectionId") REFERENCES "social_connections"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_requests" ADD CONSTRAINT "approval_requests_contentDraftId_fkey" FOREIGN KEY ("contentDraftId") REFERENCES "content_drafts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "action_logs" ADD CONSTRAINT "action_logs_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "action_logs" ADD CONSTRAINT "action_logs_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "automation_runs" ADD CONSTRAINT "automation_runs_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_policies" ADD CONSTRAINT "ai_policies_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_MemberToWorkspace" ADD CONSTRAINT "_MemberToWorkspace_A_fkey" FOREIGN KEY ("A") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_MemberToWorkspace" ADD CONSTRAINT "_MemberToWorkspace_B_fkey" FOREIGN KEY ("B") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
