-- CreateEnum
CREATE TYPE "PageProfileStatus" AS ENUM ('ACTIVE', 'PAUSED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ContentStrategyType" AS ENUM ('REPOST', 'NEWS', 'AI_GENERATED', 'MIXED');

-- CreateEnum
CREATE TYPE "ContentStyle" AS ENUM ('PROFESSIONAL', 'FUNNY', 'EDUCATIONAL', 'VIRAL');

-- CreateTable
CREATE TABLE "page_profiles" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "niche" TEXT NOT NULL,
    "description" TEXT,
    "contentStrategy" JSONB NOT NULL,
    "socialConnectionIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "schedule" JSONB NOT NULL,
    "aiConfig" JSONB NOT NULL,
    "status" "PageProfileStatus" NOT NULL DEFAULT 'ACTIVE',
    "lastPostAt" TIMESTAMP(3),
    "stats" JSONB NOT NULL DEFAULT '{"totalPosts": 0, "avgQualityScore": 0, "failedGenerations": 0}',

    CONSTRAINT "page_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_archives" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "pageProfileId" TEXT NOT NULL,
    "contentDraftId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "hashtags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "mediaUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "generatedBy" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "generationModel" TEXT,
    "qaScore" DOUBLE PRECISION NOT NULL,
    "qaAttempts" INTEGER NOT NULL DEFAULT 1,
    "qaAgentResults" JSONB,
    "publishedAt" TIMESTAMP(3),
    "platforms" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "performance" JSONB,

    CONSTRAINT "content_archives_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "content_archives_contentDraftId_key" ON "content_archives"("contentDraftId");

-- CreateIndex
CREATE INDEX "content_archives_pageProfileId_createdAt_idx" ON "content_archives"("pageProfileId", "createdAt");

-- AddForeignKey
ALTER TABLE "page_profiles" ADD CONSTRAINT "page_profiles_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_archives" ADD CONSTRAINT "content_archives_pageProfileId_fkey" FOREIGN KEY ("pageProfileId") REFERENCES "page_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_archives" ADD CONSTRAINT "content_archives_contentDraftId_fkey" FOREIGN KEY ("contentDraftId") REFERENCES "content_drafts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
