-- CreateEnum
CREATE TYPE "Role" AS ENUM ('MEMBER', 'COOP_ADMIN', 'TREMMA_SUPER_ADMIN');

-- CreateEnum
CREATE TYPE "Language" AS ENUM ('ENGLISH', 'HAUSA', 'YORUBA', 'IGBO', 'PIDGIN', 'KISWAHILI', 'FRENCH', 'PORTUGUESE', 'AMHARIC', 'ARABIC');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('FUNDING', 'MOVE_TO_SAVINGS', 'WITHDRAWAL', 'LOAN_DISBURSEMENT', 'LOAN_REPAYMENT', 'CARD_ISSUANCE_FEE');

-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "LoanStatus" AS ENUM ('SUBMITTED', 'COMMITTEE_VOTING', 'ADMIN_APPROVAL', 'APPROVED', 'REJECTED', 'DISBURSED', 'REPAYING', 'CLOSED');

-- CreateEnum
CREATE TYPE "RepaymentMethod" AS ENUM ('AUTOMATED', 'MANUAL');

-- CreateEnum
CREATE TYPE "RepaymentStatus" AS ENUM ('PENDING', 'CONFIRMED', 'REJECTED');

-- CreateEnum
CREATE TYPE "CardType" AS ENUM ('VIRTUAL', 'PHYSICAL');

-- CreateEnum
CREATE TYPE "CardRequestStatus" AS ENUM ('SUBMITTED', 'PENDING_APPROVAL', 'APPROVED', 'FEE_DEDUCTED', 'ISSUING', 'ISSUED', 'DISPATCHED', 'DELIVERED', 'REJECTED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "CardStatus" AS ENUM ('ACTIVE', 'BLOCKED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "InventoryCategory" AS ENUM ('SEEDS', 'FERTILIZER', 'EQUIPMENT', 'PRODUCE', 'OTHER');

-- CreateEnum
CREATE TYPE "InventoryStatus" AS ENUM ('IN_STOCK', 'LOW_STOCK', 'OUT_OF_STOCK');

-- CreateEnum
CREATE TYPE "DemandStatus" AS ENUM ('OPEN', 'MATCHED', 'CLOSED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "OfferStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED');

-- CreateTable
CREATE TABLE "Cooperative" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "focusArea" TEXT,
    "loanRatePolicy" DECIMAL(5,2) NOT NULL,
    "loanCapPercent" DECIMAL(5,2) NOT NULL DEFAULT 30.00,
    "committeeSize" INTEGER NOT NULL DEFAULT 5,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Cooperative_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Member" (
    "id" TEXT NOT NULL,
    "cooperativeId" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'MEMBER',
    "fullName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "preferredLanguage" "Language" NOT NULL DEFAULT 'ENGLISH',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Member_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PersonalAccount" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "providusAccountNumber" TEXT NOT NULL,
    "providusAccountRef" TEXT NOT NULL,
    "balance" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PersonalAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CooperativeAccount" (
    "id" TEXT NOT NULL,
    "cooperativeId" TEXT NOT NULL,
    "providusAccountNumber" TEXT NOT NULL,
    "balance" DECIMAL(14,2) NOT NULL DEFAULT 0,

    CONSTRAINT "CooperativeAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL,
    "type" "TransactionType" NOT NULL,
    "status" "TransactionStatus" NOT NULL DEFAULT 'PENDING',
    "amount" DECIMAL(14,2) NOT NULL,
    "reference" TEXT NOT NULL,
    "method" TEXT,
    "personalAccountId" TEXT,
    "cooperativeAccountId" TEXT,
    "loanId" TEXT,
    "cardRequestId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Loan" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "amountRequested" DECIMAL(14,2) NOT NULL,
    "amountApproved" DECIMAL(14,2),
    "amountRepaid" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "interestRate" DECIMAL(5,2) NOT NULL,
    "purpose" TEXT NOT NULL,
    "repaymentMonths" INTEGER NOT NULL,
    "status" "LoanStatus" NOT NULL DEFAULT 'SUBMITTED',
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "disbursedAt" TIMESTAMP(3),

    CONSTRAINT "Loan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoanVote" (
    "id" TEXT NOT NULL,
    "loanId" TEXT NOT NULL,
    "voterId" TEXT NOT NULL,
    "approve" BOOLEAN NOT NULL,
    "votedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoanVote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoanRepayment" (
    "id" TEXT NOT NULL,
    "loanId" TEXT NOT NULL,
    "method" "RepaymentMethod" NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "receiptUrl" TEXT,
    "reference" TEXT,
    "status" "RepaymentStatus" NOT NULL DEFAULT 'PENDING',
    "rejectionReason" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmedAt" TIMESTAMP(3),
    "confirmedBy" TEXT,

    CONSTRAINT "LoanRepayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CardRequest" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "cardType" "CardType" NOT NULL,
    "status" "CardRequestStatus" NOT NULL DEFAULT 'SUBMITTED',
    "deliveryFullName" TEXT,
    "deliveryPhone" TEXT,
    "addressLine1" TEXT,
    "addressLine2" TEXT,
    "city" TEXT,
    "state" TEXT,
    "country" TEXT,
    "feeAmount" DECIMAL(14,2),
    "feeTransactionId" TEXT,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "courier" TEXT,
    "trackingReference" TEXT,
    "dispatchedAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "xpressWalletCardId" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CardRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Card" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "cardRequestId" TEXT NOT NULL,
    "cardType" "CardType" NOT NULL,
    "xpressWalletCardId" TEXT NOT NULL,
    "maskedPan" TEXT NOT NULL,
    "expiryMonth" INTEGER NOT NULL,
    "expiryYear" INTEGER NOT NULL,
    "status" "CardStatus" NOT NULL DEFAULT 'ACTIVE',
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Card_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryItem" (
    "id" TEXT NOT NULL,
    "cooperativeId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "InventoryCategory" NOT NULL,
    "quantity" DECIMAL(12,2) NOT NULL,
    "unit" TEXT NOT NULL,
    "estimatedValue" DECIMAL(14,2),
    "status" "InventoryStatus" NOT NULL DEFAULT 'IN_STOCK',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InventoryItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Offtaker" (
    "id" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "contactEmail" TEXT NOT NULL,
    "contactPhone" TEXT NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Offtaker_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketplaceDemand" (
    "id" TEXT NOT NULL,
    "offtakerId" TEXT NOT NULL,
    "cooperativeId" TEXT,
    "productName" TEXT NOT NULL,
    "quantity" DECIMAL(12,2) NOT NULL,
    "unit" TEXT NOT NULL,
    "pricePerUnit" DECIMAL(14,2) NOT NULL,
    "deadline" TIMESTAMP(3),
    "status" "DemandStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MarketplaceDemand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketplaceOffer" (
    "id" TEXT NOT NULL,
    "demandId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "inventoryItemId" TEXT,
    "quantityOffered" DECIMAL(12,2) NOT NULL,
    "status" "OfferStatus" NOT NULL DEFAULT 'PENDING',
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MarketplaceOffer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Member_email_key" ON "Member"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Member_phone_key" ON "Member"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "PersonalAccount_memberId_key" ON "PersonalAccount"("memberId");

-- CreateIndex
CREATE UNIQUE INDEX "PersonalAccount_providusAccountNumber_key" ON "PersonalAccount"("providusAccountNumber");

-- CreateIndex
CREATE UNIQUE INDEX "PersonalAccount_providusAccountRef_key" ON "PersonalAccount"("providusAccountRef");

-- CreateIndex
CREATE UNIQUE INDEX "CooperativeAccount_cooperativeId_key" ON "CooperativeAccount"("cooperativeId");

-- CreateIndex
CREATE UNIQUE INDEX "CooperativeAccount_providusAccountNumber_key" ON "CooperativeAccount"("providusAccountNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_reference_key" ON "Transaction"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "LoanVote_loanId_voterId_key" ON "LoanVote"("loanId", "voterId");

-- CreateIndex
CREATE UNIQUE INDEX "CardRequest_feeTransactionId_key" ON "CardRequest"("feeTransactionId");

-- CreateIndex
CREATE UNIQUE INDEX "CardRequest_xpressWalletCardId_key" ON "CardRequest"("xpressWalletCardId");

-- CreateIndex
CREATE UNIQUE INDEX "Card_cardRequestId_key" ON "Card"("cardRequestId");

-- CreateIndex
CREATE UNIQUE INDEX "Card_xpressWalletCardId_key" ON "Card"("xpressWalletCardId");

-- AddForeignKey
ALTER TABLE "Member" ADD CONSTRAINT "Member_cooperativeId_fkey" FOREIGN KEY ("cooperativeId") REFERENCES "Cooperative"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonalAccount" ADD CONSTRAINT "PersonalAccount_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CooperativeAccount" ADD CONSTRAINT "CooperativeAccount_cooperativeId_fkey" FOREIGN KEY ("cooperativeId") REFERENCES "Cooperative"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_personalAccountId_fkey" FOREIGN KEY ("personalAccountId") REFERENCES "PersonalAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_cooperativeAccountId_fkey" FOREIGN KEY ("cooperativeAccountId") REFERENCES "CooperativeAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_loanId_fkey" FOREIGN KEY ("loanId") REFERENCES "Loan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_cardRequestId_fkey" FOREIGN KEY ("cardRequestId") REFERENCES "CardRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Loan" ADD CONSTRAINT "Loan_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoanVote" ADD CONSTRAINT "LoanVote_loanId_fkey" FOREIGN KEY ("loanId") REFERENCES "Loan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoanVote" ADD CONSTRAINT "LoanVote_voterId_fkey" FOREIGN KEY ("voterId") REFERENCES "Member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoanRepayment" ADD CONSTRAINT "LoanRepayment_loanId_fkey" FOREIGN KEY ("loanId") REFERENCES "Loan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CardRequest" ADD CONSTRAINT "CardRequest_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CardRequest" ADD CONSTRAINT "CardRequest_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Card" ADD CONSTRAINT "Card_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Card" ADD CONSTRAINT "Card_cardRequestId_fkey" FOREIGN KEY ("cardRequestId") REFERENCES "CardRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryItem" ADD CONSTRAINT "InventoryItem_cooperativeId_fkey" FOREIGN KEY ("cooperativeId") REFERENCES "Cooperative"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryItem" ADD CONSTRAINT "InventoryItem_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketplaceDemand" ADD CONSTRAINT "MarketplaceDemand_offtakerId_fkey" FOREIGN KEY ("offtakerId") REFERENCES "Offtaker"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketplaceDemand" ADD CONSTRAINT "MarketplaceDemand_cooperativeId_fkey" FOREIGN KEY ("cooperativeId") REFERENCES "Cooperative"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketplaceOffer" ADD CONSTRAINT "MarketplaceOffer_demandId_fkey" FOREIGN KEY ("demandId") REFERENCES "MarketplaceDemand"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketplaceOffer" ADD CONSTRAINT "MarketplaceOffer_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketplaceOffer" ADD CONSTRAINT "MarketplaceOffer_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "InventoryItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
