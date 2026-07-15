/*
  Warnings:

  - A unique constraint covering the columns `[contactEmail]` on the table `Offtaker` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `passwordHash` to the `Offtaker` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Offtaker" ADD COLUMN     "passwordHash" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Offtaker_contactEmail_key" ON "Offtaker"("contactEmail");
