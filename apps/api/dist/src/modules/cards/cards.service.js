"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CardsService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../../prisma/prisma.service");
const xpress_wallet_client_1 = require("./xpress-wallet.client");
const FEE_VIRTUAL = Number(process.env.CARD_FEE_VIRTUAL ?? 500);
const FEE_PHYSICAL = Number(process.env.CARD_FEE_PHYSICAL ?? 2000);
let CardsService = class CardsService {
    constructor(prisma, xpressWallet) {
        this.prisma = prisma;
        this.xpressWallet = xpressWallet;
    }
    async requestCard(memberId, cardType, deliveryAddress) {
        if (cardType === 'PHYSICAL' && !deliveryAddress) {
            throw new common_1.BadRequestException('deliveryAddress is required for a physical card request');
        }
        return this.prisma.cardRequest.create({
            data: {
                memberId,
                cardType,
                status: client_1.CardRequestStatus.PENDING_APPROVAL,
                ...(deliveryAddress
                    ? {
                        deliveryFullName: deliveryAddress.fullName,
                        deliveryPhone: deliveryAddress.phone,
                        addressLine1: deliveryAddress.addressLine1,
                        addressLine2: deliveryAddress.addressLine2,
                        city: deliveryAddress.city,
                        state: deliveryAddress.state,
                        country: deliveryAddress.country,
                    }
                    : {}),
            },
        });
    }
    async myRequests(memberId) {
        return this.prisma.cardRequest.findMany({
            where: { memberId },
            include: { card: true },
            orderBy: { submittedAt: 'desc' },
        });
    }
    async myCards(memberId) {
        return this.prisma.card.findMany({ where: { memberId } });
    }
    async cancel(memberId, cardRequestId) {
        const request = await this.getOwnedRequest(memberId, cardRequestId);
        if (request.status !== client_1.CardRequestStatus.PENDING_APPROVAL) {
            throw new common_1.BadRequestException('Only a request still pending approval can be cancelled');
        }
        return this.prisma.cardRequest.update({
            where: { id: cardRequestId },
            data: { status: client_1.CardRequestStatus.CANCELLED },
        });
    }
    async pendingForAdmin() {
        return this.prisma.cardRequest.findMany({
            where: { status: client_1.CardRequestStatus.PENDING_APPROVAL },
            include: { member: { select: { id: true, fullName: true, email: true, phone: true } } },
            orderBy: { submittedAt: 'asc' },
        });
    }
    async awaitingDispatchForAdmin() {
        return this.prisma.cardRequest.findMany({
            where: { status: client_1.CardRequestStatus.ISSUED, cardType: client_1.CardType.PHYSICAL },
            include: { member: { select: { id: true, fullName: true, email: true, phone: true } } },
            orderBy: { updatedAt: 'asc' },
        });
    }
    async approve(adminId, cardRequestId) {
        const request = await this.prisma.cardRequest.findUnique({
            where: { id: cardRequestId },
            include: { member: { include: { personalAccount: true, cooperative: { include: { cooperativeAccount: true } } } } },
        });
        if (!request)
            throw new common_1.NotFoundException('Card request not found');
        if (request.status !== client_1.CardRequestStatus.PENDING_APPROVAL) {
            throw new common_1.BadRequestException(`Request is ${request.status}, not PENDING_APPROVAL`);
        }
        const personalAccount = request.member.personalAccount;
        const cooperativeAccount = request.member.cooperative.cooperativeAccount;
        if (!personalAccount || !cooperativeAccount) {
            throw new common_1.BadRequestException('Member or cooperative is missing a provisioned account');
        }
        const fee = request.cardType === 'VIRTUAL' ? FEE_VIRTUAL : FEE_PHYSICAL;
        await this.prisma.$transaction(async (tx) => {
            const fresh = await tx.personalAccount.findUniqueOrThrow({ where: { id: personalAccount.id } });
            if (Number(fresh.balance) < fee) {
                throw new common_1.BadRequestException('Member does not have sufficient balance to cover the card fee');
            }
            await tx.personalAccount.update({ where: { id: personalAccount.id }, data: { balance: { decrement: fee } } });
            await tx.cooperativeAccount.update({ where: { id: cooperativeAccount.id }, data: { balance: { increment: fee } } });
            const txn = await tx.transaction.create({
                data: {
                    type: 'CARD_ISSUANCE_FEE',
                    status: 'COMPLETED',
                    amount: fee,
                    reference: `card-fee-${cardRequestId}`,
                    method: 'internal',
                    personalAccountId: personalAccount.id,
                    cooperativeAccountId: cooperativeAccount.id,
                    cardRequestId,
                },
            });
            await tx.cardRequest.update({
                where: { id: cardRequestId },
                data: {
                    status: client_1.CardRequestStatus.FEE_DEDUCTED,
                    feeAmount: fee,
                    feeTransactionId: txn.id,
                    reviewedById: adminId,
                    reviewedAt: new Date(),
                },
            });
        });
        return this.issue(cardRequestId);
    }
    async reject(adminId, cardRequestId, reason) {
        const request = await this.prisma.cardRequest.findUnique({ where: { id: cardRequestId } });
        if (!request)
            throw new common_1.NotFoundException('Card request not found');
        if (request.status !== client_1.CardRequestStatus.PENDING_APPROVAL) {
            throw new common_1.BadRequestException(`Request is ${request.status}, not PENDING_APPROVAL`);
        }
        return this.prisma.cardRequest.update({
            where: { id: cardRequestId },
            data: {
                status: client_1.CardRequestStatus.REJECTED,
                rejectionReason: reason,
                reviewedById: adminId,
                reviewedAt: new Date(),
            },
        });
    }
    async issue(cardRequestId) {
        const request = await this.prisma.cardRequest.findUniqueOrThrow({
            where: { id: cardRequestId },
            include: { member: true },
        });
        if (request.status !== client_1.CardRequestStatus.FEE_DEDUCTED && request.status !== client_1.CardRequestStatus.FAILED) {
            throw new common_1.BadRequestException(`Request is ${request.status}, expected FEE_DEDUCTED or FAILED`);
        }
        await this.prisma.cardRequest.update({ where: { id: cardRequestId }, data: { status: client_1.CardRequestStatus.ISSUING } });
        try {
            const result = request.cardType === 'VIRTUAL'
                ? await this.xpressWallet.issueVirtualCard({
                    memberId: request.memberId,
                    customerEmail: request.member.email,
                    customerPhone: request.member.phone,
                })
                : await this.xpressWallet.issuePhysicalCard({
                    memberId: request.memberId,
                    customerEmail: request.member.email,
                    customerPhone: request.member.phone,
                    deliveryAddress: {
                        fullName: request.deliveryFullName,
                        phone: request.deliveryPhone,
                        addressLine1: request.addressLine1,
                        addressLine2: request.addressLine2 ?? undefined,
                        city: request.city,
                        state: request.state,
                        country: request.country,
                    },
                });
            return this.prisma.$transaction(async (tx) => {
                await tx.card.create({
                    data: {
                        memberId: request.memberId,
                        cardRequestId,
                        cardType: request.cardType,
                        xpressWalletCardId: result.cardId,
                        maskedPan: result.maskedPan,
                        expiryMonth: result.expiryMonth,
                        expiryYear: result.expiryYear,
                    },
                });
                return tx.cardRequest.update({
                    where: { id: cardRequestId },
                    data: { status: client_1.CardRequestStatus.ISSUED, xpressWalletCardId: result.cardId },
                });
            });
        }
        catch (err) {
            await this.prisma.cardRequest.update({ where: { id: cardRequestId }, data: { status: client_1.CardRequestStatus.FAILED } });
            throw err;
        }
    }
    async dispatch(adminId, cardRequestId, courier, trackingReference) {
        const request = await this.requirePhysical(cardRequestId, client_1.CardRequestStatus.ISSUED);
        return this.prisma.cardRequest.update({
            where: { id: cardRequestId },
            data: { status: client_1.CardRequestStatus.DISPATCHED, courier, trackingReference, dispatchedAt: new Date() },
        });
    }
    async markDelivered(cardRequestId) {
        const request = await this.requirePhysical(cardRequestId, client_1.CardRequestStatus.DISPATCHED);
        return this.prisma.cardRequest.update({
            where: { id: cardRequestId },
            data: { status: client_1.CardRequestStatus.DELIVERED, deliveredAt: new Date() },
        });
    }
    async getOwnedRequest(memberId, cardRequestId) {
        const request = await this.prisma.cardRequest.findUnique({ where: { id: cardRequestId } });
        if (!request || request.memberId !== memberId)
            throw new common_1.NotFoundException('Card request not found');
        return request;
    }
    async requirePhysical(cardRequestId, expected) {
        const request = await this.prisma.cardRequest.findUniqueOrThrow({ where: { id: cardRequestId } });
        if (request.cardType !== 'PHYSICAL')
            throw new common_1.BadRequestException('Not a physical card request');
        if (request.status !== expected)
            throw new common_1.BadRequestException(`Request is ${request.status}, expected ${expected}`);
        return request;
    }
};
exports.CardsService = CardsService;
exports.CardsService = CardsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        xpress_wallet_client_1.XpressWalletClient])
], CardsService);
//# sourceMappingURL=cards.service.js.map