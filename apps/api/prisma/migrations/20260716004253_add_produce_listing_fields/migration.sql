-- CreateEnum
CREATE TYPE "GrowingMethod" AS ENUM ('ORGANIC', 'CONVENTIONAL');

-- AlterEnum
ALTER TYPE "InventoryCategory" ADD VALUE 'GRAIN';

-- AlterTable
ALTER TABLE "InventoryItem" ADD COLUMN     "askingPriceAmount" DECIMAL(14,2),
ADD COLUMN     "askingPriceCurrency" TEXT DEFAULT 'NGN',
ADD COLUMN     "bulkDiscountAvailable" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "growingMethod" "GrowingMethod",
ADD COLUMN     "harvestDate" TIMESTAMP(3),
ADD COLUMN     "minSellingPriceAmount" DECIMAL(14,2),
ADD COLUMN     "minSellingPriceCurrency" TEXT DEFAULT 'NGN',
ADD COLUMN     "negotiable" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "plantingDate" TIMESTAMP(3),
ADD COLUMN     "variety" TEXT;
