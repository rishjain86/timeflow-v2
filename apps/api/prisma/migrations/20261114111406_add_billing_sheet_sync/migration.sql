-- AlterTable
ALTER TABLE "users" ADD COLUMN     "mfaEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "mfaLastStep" INTEGER,
ADD COLUMN     "mfaRecoveryCodes" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "mfaSecret" TEXT;

-- CreateTable
CREATE TABLE "time_entry_changes" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "timeEntryId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "fromValue" TEXT,
    "toValue" TEXT,
    "actorUserId" TEXT,
    "actorName" TEXT,
    "patientName" TEXT,
    "planName" TEXT,
    "taskName" TEXT,
    "staffName" TEXT,
    "entryDate" TIMESTAMP(3),
    "hours" DECIMAL(10,2),
    "monthKey" VARCHAR(7) NOT NULL,
    "before" JSONB,
    "after" JSONB,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "time_entry_changes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing_sheet_dirty" (
    "organizationId" TEXT NOT NULL,
    "monthKey" VARCHAR(7) NOT NULL,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "billing_sheet_dirty_pkey" PRIMARY KEY ("organizationId","monthKey")
);

-- CreateTable
CREATE TABLE "billing_sheet_manual" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "monthKey" VARCHAR(7) NOT NULL,
    "projectId" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "prevPayHours" DECIMAL(10,2),
    "invoiceNumber" TEXT,
    "invoiceAmount" DECIMAL(18,2),
    "notes" TEXT,
    "pendingPush" BOOLEAN NOT NULL DEFAULT false,
    "updatedById" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "billing_sheet_manual_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing_sheet_connections" (
    "organizationId" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'google',
    "spreadsheetId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "lastSyncAt" TIMESTAMP(3),
    "lastError" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "billing_sheet_connections_pkey" PRIMARY KEY ("organizationId")
);

-- CreateIndex
CREATE INDEX "time_entry_changes_organizationId_monthKey_occurredAt_idx" ON "time_entry_changes"("organizationId", "monthKey", "occurredAt");

-- CreateIndex
CREATE INDEX "time_entry_changes_timeEntryId_idx" ON "time_entry_changes"("timeEntryId");

-- CreateIndex
CREATE UNIQUE INDEX "billing_sheet_manual_organizationId_monthKey_projectId_task_key" ON "billing_sheet_manual"("organizationId", "monthKey", "projectId", "taskId");

-- AddForeignKey
ALTER TABLE "time_entry_changes" ADD CONSTRAINT "time_entry_changes_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_sheet_manual" ADD CONSTRAINT "billing_sheet_manual_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_sheet_connections" ADD CONSTRAINT "billing_sheet_connections_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
