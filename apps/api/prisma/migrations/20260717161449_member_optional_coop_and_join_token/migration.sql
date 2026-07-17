/*
  Warnings:

  - A unique constraint covering the columns `[joinToken]` on the table `Cooperative` will be added. If there are existing duplicate values, this will fail.
  - The required column `joinToken` was added to the `Cooperative` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.

*/
-- CreateEnum
CREATE TYPE "CooperativeStatus" AS ENUM ('ESTABLISHED', 'RECRUITING');

-- DropForeignKey
ALTER TABLE "Member" DROP CONSTRAINT "Member_cooperativeId_fkey";

-- AlterTable
ALTER TABLE "Cooperative" ADD COLUMN     "joinToken" TEXT,
ADD COLUMN     "status" "CooperativeStatus" NOT NULL DEFAULT 'RECRUITING';

-- Backfill existing rows with a random unique token before enforcing NOT NULL
UPDATE "Cooperative" SET "joinToken" = substr(md5(random()::text || id), 1, 20) WHERE "joinToken" IS NULL;

ALTER TABLE "Cooperative" ALTER COLUMN "joinToken" SET NOT NULL;

-- AlterTable
ALTER TABLE "Member" ALTER COLUMN "cooperativeId" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Cooperative_joinToken_key" ON "Cooperative"("joinToken");

-- AddForeignKey
ALTER TABLE "Member" ADD CONSTRAINT "Member_cooperativeId_fkey" FOREIGN KEY ("cooperativeId") REFERENCES "Cooperative"("id") ON DELETE SET NULL ON UPDATE CASCADE;
