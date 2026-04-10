-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "bio" TEXT,
    "githubId" TEXT,
    "githubLogin" TEXT,
    "avatarUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Workflow" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "latestVersion" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "installCount" INTEGER NOT NULL DEFAULT 0,
    "favoriteCount" INTEGER NOT NULL DEFAULT 0,
    "license" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "authorId" TEXT NOT NULL,

    CONSTRAINT "Workflow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkflowVersion" (
    "id" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3) NOT NULL,
    "changelog" TEXT NOT NULL,
    "manifestJson" JSONB,
    "workflowJson" JSONB,
    "readmeMarkdown" TEXT,
    "publishedById" TEXT,
    "workflowId" TEXT NOT NULL,

    CONSTRAINT "WorkflowVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkflowStep" (
    "id" TEXT NOT NULL,
    "stepKey" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "instruction" TEXT NOT NULL,
    "tool" TEXT,
    "workflowId" TEXT NOT NULL,

    CONSTRAINT "WorkflowStep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkflowTag" (
    "id" TEXT NOT NULL,
    "tag" TEXT NOT NULL,
    "workflowId" TEXT NOT NULL,

    CONSTRAINT "WorkflowTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkflowKeyword" (
    "id" TEXT NOT NULL,
    "keyword" TEXT NOT NULL,
    "workflowId" TEXT NOT NULL,

    CONSTRAINT "WorkflowKeyword_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkflowRuntime" (
    "id" TEXT NOT NULL,
    "runtime" TEXT NOT NULL,
    "workflowId" TEXT NOT NULL,

    CONSTRAINT "WorkflowRuntime_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkflowRequiredTool" (
    "id" TEXT NOT NULL,
    "tool" TEXT NOT NULL,
    "workflowId" TEXT NOT NULL,

    CONSTRAINT "WorkflowRequiredTool_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkflowInstall" (
    "id" TEXT NOT NULL,
    "runtimeFamily" TEXT,
    "installSource" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "workflowId" TEXT NOT NULL,
    "workflowVersionId" TEXT NOT NULL,

    CONSTRAINT "WorkflowInstall_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorType" TEXT NOT NULL,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RateLimitBucket" (
    "id" TEXT NOT NULL,
    "bucketKey" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "actorKey" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 1,
    "resetAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RateLimitBucket_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "User_githubId_key" ON "User"("githubId");

-- CreateIndex
CREATE UNIQUE INDEX "User_githubLogin_key" ON "User"("githubLogin");

-- CreateIndex
CREATE UNIQUE INDEX "Workflow_slug_key" ON "Workflow"("slug");

-- CreateIndex
CREATE INDEX "Workflow_authorId_idx" ON "Workflow"("authorId");

-- CreateIndex
CREATE INDEX "WorkflowVersion_workflowId_idx" ON "WorkflowVersion"("workflowId");

-- CreateIndex
CREATE INDEX "WorkflowVersion_publishedById_idx" ON "WorkflowVersion"("publishedById");

-- CreateIndex
CREATE UNIQUE INDEX "WorkflowVersion_workflowId_version_key" ON "WorkflowVersion"("workflowId", "version");

-- CreateIndex
CREATE INDEX "WorkflowStep_workflowId_idx" ON "WorkflowStep"("workflowId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkflowStep_workflowId_position_key" ON "WorkflowStep"("workflowId", "position");

-- CreateIndex
CREATE INDEX "WorkflowTag_tag_idx" ON "WorkflowTag"("tag");

-- CreateIndex
CREATE UNIQUE INDEX "WorkflowTag_workflowId_tag_key" ON "WorkflowTag"("workflowId", "tag");

-- CreateIndex
CREATE INDEX "WorkflowKeyword_keyword_idx" ON "WorkflowKeyword"("keyword");

-- CreateIndex
CREATE UNIQUE INDEX "WorkflowKeyword_workflowId_keyword_key" ON "WorkflowKeyword"("workflowId", "keyword");

-- CreateIndex
CREATE INDEX "WorkflowRuntime_runtime_idx" ON "WorkflowRuntime"("runtime");

-- CreateIndex
CREATE UNIQUE INDEX "WorkflowRuntime_workflowId_runtime_key" ON "WorkflowRuntime"("workflowId", "runtime");

-- CreateIndex
CREATE INDEX "WorkflowRequiredTool_tool_idx" ON "WorkflowRequiredTool"("tool");

-- CreateIndex
CREATE UNIQUE INDEX "WorkflowRequiredTool_workflowId_tool_key" ON "WorkflowRequiredTool"("workflowId", "tool");

-- CreateIndex
CREATE INDEX "WorkflowInstall_workflowId_idx" ON "WorkflowInstall"("workflowId");

-- CreateIndex
CREATE INDEX "WorkflowInstall_workflowVersionId_idx" ON "WorkflowInstall"("workflowVersionId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_actorType_actorId_idx" ON "AuditLog"("actorType", "actorId");

-- CreateIndex
CREATE INDEX "AuditLog_targetType_targetId_idx" ON "AuditLog"("targetType", "targetId");

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "RateLimitBucket_bucketKey_key" ON "RateLimitBucket"("bucketKey");

-- CreateIndex
CREATE INDEX "RateLimitBucket_scope_actorKey_idx" ON "RateLimitBucket"("scope", "actorKey");

-- CreateIndex
CREATE INDEX "RateLimitBucket_resetAt_idx" ON "RateLimitBucket"("resetAt");

-- AddForeignKey
ALTER TABLE "Workflow" ADD CONSTRAINT "Workflow_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowVersion" ADD CONSTRAINT "WorkflowVersion_publishedById_fkey" FOREIGN KEY ("publishedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowVersion" ADD CONSTRAINT "WorkflowVersion_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "Workflow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowStep" ADD CONSTRAINT "WorkflowStep_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "Workflow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowTag" ADD CONSTRAINT "WorkflowTag_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "Workflow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowKeyword" ADD CONSTRAINT "WorkflowKeyword_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "Workflow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowRuntime" ADD CONSTRAINT "WorkflowRuntime_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "Workflow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowRequiredTool" ADD CONSTRAINT "WorkflowRequiredTool_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "Workflow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowInstall" ADD CONSTRAINT "WorkflowInstall_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "Workflow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowInstall" ADD CONSTRAINT "WorkflowInstall_workflowVersionId_fkey" FOREIGN KEY ("workflowVersionId") REFERENCES "WorkflowVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
