-- AlterTable
ALTER TABLE "Member" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "panicPasswordHash" TEXT,
ADD COLUMN     "transactionPinHash" TEXT;
