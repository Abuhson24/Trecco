import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

interface DemandDetails {
  cooperativeId?: string | null;
  productName: string;
  quantity: number;
  unit: string;
  pricePerUnit: number;
  deadline?: string;
}

@Injectable()
export class MarketplaceService {
  constructor(private readonly prisma: PrismaService) {}

  // Offtaker posting for themselves. offtakerId comes from their verified
  // token (OfftakerAuthGuard), never from the request body — so an offtaker
  // can never post a demand under a different company's name.
  async createDemandAsOfftaker(offtakerId: string, input: DemandDetails) {
    const offtaker = await this.prisma.offtaker.findUniqueOrThrow({ where: { id: offtakerId } });
    if (!offtaker.verified) {
      throw new ForbiddenException('Your account is pending verification by a Trecco admin before you can post demands');
    }
    return this.createDemand(offtakerId, input);
  }

  // Admin posting on behalf of an offtaker (e.g. a buyer who called in
  // rather than signed up). Bypasses the verified check — the admin is
  // vouching for this buyer directly.
  async createDemandAsAdmin(
    input: DemandDetails & { offtakerId?: string; offtaker?: { companyName: string; contactEmail: string; contactPhone: string; passwordHash: string } },
  ) {
    if (!input.offtakerId && !input.offtaker) {
      throw new BadRequestException('Provide either offtakerId or offtaker company details');
    }
    const offtakerId = input.offtakerId
      ?? (await this.prisma.offtaker.create({ data: { ...input.offtaker!, verified: true } })).id;
    return this.createDemand(offtakerId, input);
  }

  private async createDemand(offtakerId: string, input: DemandDetails) {
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

  // Open to any authenticated member — the demand board.
  async listOpenDemands(cooperativeId: string) {
    return this.prisma.marketplaceDemand.findMany({
      where: { status: 'OPEN', OR: [{ cooperativeId: null }, { cooperativeId }] },
      include: { offtaker: { select: { id: true, companyName: true, contactEmail: true, contactPhone: true, verified: true } }, offers: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  // A member offering to supply a demand, optionally linked to real
  // inventory they've already listed.
  async submitOffer(memberId: string, demandId: string, input: { quantityOffered: number; inventoryItemId?: string }) {
    const demand = await this.prisma.marketplaceDemand.findUnique({ where: { id: demandId } });
    if (!demand) throw new NotFoundException('Demand not found');
    if (demand.status !== 'OPEN') throw new BadRequestException('This demand is no longer open');

    if (input.inventoryItemId) {
      const item = await this.prisma.inventoryItem.findUnique({ where: { id: input.inventoryItemId } });
      if (!item) throw new NotFoundException('Inventory item not found');
      if (item.memberId !== memberId) {
        throw new ForbiddenException('You can only link offers to your own inventory items');
      }
    }

    return this.prisma.marketplaceOffer.create({
      data: { demandId, memberId, inventoryItemId: input.inventoryItemId ?? null, quantityOffered: input.quantityOffered },
    });
  }

  // Admin view — every offer submitted against a specific demand.
  async listOffers(demandId: string) {
    return this.prisma.marketplaceOffer.findMany({
      where: { demandId },
      include: { member: { select: { id: true, fullName: true, phone: true } }, inventoryItem: true },
      orderBy: { submittedAt: 'asc' },
    });
  }

  // Accepting one offer declines every other pending offer on the same
  // demand and marks the demand MATCHED — a demand can only be fulfilled once.
  async acceptOffer(offerId: string) {
    const offer = await this.prisma.marketplaceOffer.findUnique({ where: { id: offerId } });
    if (!offer) throw new NotFoundException('Offer not found');
    if (offer.status !== 'PENDING') throw new BadRequestException('This offer has already been decided');

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

  async declineOffer(offerId: string) {
    const offer = await this.prisma.marketplaceOffer.findUnique({ where: { id: offerId } });
    if (!offer) throw new NotFoundException('Offer not found');
    if (offer.status !== 'PENDING') throw new BadRequestException('This offer has already been decided');
    return this.prisma.marketplaceOffer.update({ where: { id: offerId }, data: { status: 'DECLINED' } });
  }
}
