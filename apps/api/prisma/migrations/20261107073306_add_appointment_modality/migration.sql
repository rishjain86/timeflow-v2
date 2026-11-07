-- CreateEnum
CREATE TYPE "AppointmentModality" AS ENUM ('IN_PERSON', 'TELEHEALTH');

-- AlterTable
ALTER TABLE "appointments" ADD COLUMN     "modality" "AppointmentModality" NOT NULL DEFAULT 'IN_PERSON';
