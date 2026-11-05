-- AlterTable
ALTER TABLE "budget_requests" ADD COLUMN     "rejectionReason" TEXT;

-- AlterTable
ALTER TABLE "budget_revision_histories" ADD COLUMN     "newInternalCost" DECIMAL(18,4) NOT NULL DEFAULT 0,
ADD COLUMN     "previousInternalCost" DECIMAL(18,4) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "avatarUrl" TEXT;

-- AddForeignKey
ALTER TABLE "budget_requests" ADD CONSTRAINT "budget_requests_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "tasks"("id") ON DELETE SET NULL ON UPDATE CASCADE;
