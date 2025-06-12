-- AlterTable
ALTER TABLE "admins" ADD COLUMN     "description" TEXT;

-- AlterTable
ALTER TABLE "colleges" ADD COLUMN     "isSystemCollege" BOOLEAN NOT NULL DEFAULT false;
