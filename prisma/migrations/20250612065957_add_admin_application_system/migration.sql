/*
  Warnings:

  - Added the required column `location` to the `colleges` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "CollegeStatus" AS ENUM ('ACTIVE', 'PENDING', 'REJECTED');

-- CreateEnum
CREATE TYPE "AdminApplicationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "UserRole" ADD VALUE 'SUPER_ADMIN';
ALTER TYPE "UserRole" ADD VALUE 'PENDING_ADMIN';

-- AlterTable
ALTER TABLE "colleges" ADD COLUMN     "allowedEmailDomain" TEXT,
ADD COLUMN     "location" TEXT NOT NULL,
ADD COLUMN     "status" "CollegeStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "website" TEXT;

-- CreateTable
CREATE TABLE "admin_applications" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "collegeId" INTEGER NOT NULL,
    "position" TEXT,
    "verificationDocumentUrl" TEXT,
    "status" "AdminApplicationStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedBy" INTEGER,
    "reviewedAt" TIMESTAMP(3),
    "reviewComments" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admin_applications_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "admin_applications" ADD CONSTRAINT "admin_applications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_applications" ADD CONSTRAINT "admin_applications_collegeId_fkey" FOREIGN KEY ("collegeId") REFERENCES "colleges"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_applications" ADD CONSTRAINT "admin_applications_reviewedBy_fkey" FOREIGN KEY ("reviewedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
