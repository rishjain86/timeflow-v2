/*
  Warnings:

  - You are about to drop the column `userId` on the `clients` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "appointments" DROP CONSTRAINT "appointments_clientId_fkey";

-- DropForeignKey
ALTER TABLE "clients" DROP CONSTRAINT "clients_userId_fkey";

-- DropIndex
DROP INDEX "clients_userId_key";

-- AlterTable
ALTER TABLE "appointments" ADD COLUMN     "projectId" TEXT,
ALTER COLUMN "clientId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "clients" DROP COLUMN "userId";

-- AlterTable
ALTER TABLE "projects" ADD COLUMN     "patientName" TEXT,
ADD COLUMN     "patientUserId" TEXT;

-- CreateIndex
CREATE INDEX "appointments_projectId_idx" ON "appointments"("projectId");

-- CreateIndex
CREATE INDEX "projects_patientUserId_idx" ON "projects"("patientUserId");

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_patientUserId_fkey" FOREIGN KEY ("patientUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;
