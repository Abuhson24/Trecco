/*
  Warnings:

  - A unique constraint covering the columns `[bvn]` on the table `Member` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[xpressCustomerId]` on the table `PersonalAccount` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Member" ADD COLUMN     "bvn" TEXT;

-- AlterTable
ALTER TABLE "PersonalAccount" ADD COLUMN     "xpressCustomerId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Member_bvn_key" ON "Member"("bvn");

-- CreateIndex
CREATE UNIQUE INDEX "PersonalAccount_xpressCustomerId_key" ON "PersonalAccount"("xpressCustomerId");
