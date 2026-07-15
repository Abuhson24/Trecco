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
exports.MarketplaceService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
let MarketplaceService = class MarketplaceService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async createDemandAsOfftaker(offtakerId, input) {
        const offtaker = await this.prisma.offtaker.findUniqueOrThrow({ where: { id: offtakerId } });
        if (!offtaker.verified) {
            throw new common_1.ForbiddenException('Your account is pending verification by a Trecco admin before you can post demands');
        }
        return this.createDemand(offtakerId, input);
    }
    async createDemandAsAdmin(input) {
        if (!input.offtakerId && !input.offtaker) {
            throw new common_1.BadRequestException('Provide either offtakerId or offtaker company details');
        }
        const offtakerId = input.offtakerId
            ?? (await this.prisma.offtaker.create({ data: { ...input.offtaker, verified: true } })).id;
        return this.createDemand(offtakerId, input);
    }
    async createDemand(offtakerId, input) {
        return this.prisma.marketplaceDemand.create({
            data: {
                offtakerId,
                cooperativeId: input.cooperativeId ?? null,
                productName: input.productName,
                quantity: input.quantity,
                unit: input.unit,
                pricePerUnit: input.pricePerUnit,
                deadline: input.deadline ? new Date(input.deadline) : null,
            },
            include: { offtaker: { select: { id: true, companyName: true, contactEmail: true, contactPhone: true, verified: true } } },
        });
    }
    async listOpenDemands(cooperativeId) {
        return this.prisma.marketplaceDemand.findMany({
            where: { status: 'OPEN', OR: [{ cooperativeId: null }, { cooperativeId }] },
            include: { offtaker: { select: { id: true, companyName: true, contactEmail: true, contactPhone: true, verified: true } }, offers: true },
            orderBy: { createdAt: 'desc' },
        });
    }
    async submitOffer(memberId, demandId, input) {
        const demand = await this.prisma.marketplaceDemand.findUnique({ where: { id: demandId } });
        if (!demand)
            throw new common_1.NotFoundException('Demand not found');
        if (demand.status !== 'OPEN')
            throw new common_1.BadRequestException('This demand is no longer open');
        if (input.inventoryItemId) {
            const item = await this.prisma.inventoryItem.findUnique({ where: { id: input.inventoryItemId } });
            if (!item)
                throw new common_1.NotFoundException('Inventory item not found');
            if (item.memberId !== memberId) {
                throw new common_1.ForbiddenException('You can only link offers to your own inventory items');
            }
        }
        return this.prisma.marketplaceOffer.create({
            data: { demandId, memberId, inventoryItemId: input.inventoryItemId ?? null, quantityOffered: input.quantityOffered },
        });
    }
    async listOffers(demandId) {
        return this.prisma.marketplaceOffer.findMany({
            where: { demandId },
            include: { member: { select: { id: true, fullName: true, phone: true } }, inventoryItem: true },
            orderBy: { submittedAt: 'asc' },
        });
    }
    async acceptOffer(offerId) {
        const offer = await this.prisma.marketplaceOffer.findUnique({ where: { id: offerId } });
        if (!offer)
            throw new common_1.NotFoundException('Offer not found');
        if (offer.status !== 'PENDING')
            throw new common_1.BadRequestException('This offer has already been decided');
        await this.prisma.$transaction([
            this.prisma.marketplaceOffer.update({ where: { id: offerId }, data: { status: 'ACCEPTED' } }),
            this.prisma.marketplaceOffer.updateMany({
                where: { demandId: offer.demandId, id: { not: offerId }, status: 'PENDING' },
                data: { status: 'DECLINED' },
            }),
            this.prisma.marketplaceDemand.update({ where: { id: offer.demandId }, data: { status: 'MATCHED' } }),
        ]);
        return this.prisma.marketplaceOffer.findUnique({ where: { id: offerId } });
    }
    async declineOffer(offerId) {
        const offer = await this.prisma.marketplaceOffer.findUnique({ where: { id: offerId } });
        if (!offer)
            throw new common_1.NotFoundException('Offer not found');
        if (offer.status !== 'PENDING')
            throw new common_1.BadRequestException('This offer has already been decided');
        return this.prisma.marketplaceOffer.update({ where: { id: offerId }, data: { status: 'DECLINED' } });
    }
};
exports.MarketplaceService = MarketplaceService;
exports.MarketplaceService = MarketplaceService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], MarketplaceService);
//# sourceMappingURL=marketplace.service.js.map