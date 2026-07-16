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

  // Offtaker's own demands across every status (not just OPEN) — the
  // member-facing listOpenDemands only shows OPEN ones, but an offtaker
  // needs to see their MATCHED/closed demands too to manage them.
  async listMyDemands(offtakerId: string) {
    return this.prisma.marketplaceDemand.findMany({
      where: { offtakerId },
      include: { offers: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Admin view — every demand across every offtaker, every status, with
  // offers and offer-submitter details included. This is what the admin
  // marketplace management page lists to accept/decline/fulfill against.
  async listAllDemandsForAdmin() {
    return this.prisma.marketplaceDemand.findMany({
      include: {
        offtaker: { select: { id: true, companyName: true, contactEmail: true, contactPhone: true, verified: true } },
        offers: { include: { member: { select: { id: true, fullName: true, phone: true } } } },
      },
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

  // Member's own offers across every demand they've offered against, with
  // the demand details attached — this is what lets a member check back
  // on what they submitted and its live status, instead of only seeing a
  // one-time "submitted" confirmation that disappears on refresh.
  async listMyOffers(memberId: string) {
    return this.prisma.marketplaceOffer.findMany({
      where: { memberId },
      include: { demand: { include: { offtaker: { select: { companyName: true } } } } },
      orderBy: { submittedAt: 'desc' },
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

  // Offtaker edits their own demand. Ownership is enforced here — the
  // offtakerId comes from the verified token (OfftakerAuthGuard), never
  // trusted from the request body.
  async updateDemandAsOfftaker(offtakerId: string, demandId: string, input: Partial<DemandDetails>) {
    const demand = await this.prisma.marketplaceDemand.findUnique({ where: { id: demandId } });
    if (!demand) throw new NotFoundException('Demand not found');
    if (demand.offtakerId !== offtakerId) throw new ForbiddenException('Not your demand');

    return this.prisma.marketplaceDemand.update({
      where: { id: demandId },
      data: {
        productName: input.productName ?? demand.productName,
        quantity: input.quantity ?? demand.quantity,
        unit: input.unit ?? demand.unit,
        pricePerUnit: input.pricePerUnit ?? demand.pricePerUnit,
        deadline: input.deadline ? new Date(input.deadline) : demand.deadline,
      },
    });
  }

  // Blocked if any offers have been submitted against this demand — an
  // offtaker can't make a member's already-submitted offer vanish by
  // deleting the demand it was submitted against.
  async deleteDemandAsOfftaker(offtakerId: string, demandId: string) {
    const demand = await this.prisma.marketplaceDemand.findUnique({
      where: { id: demandId },
      include: { offers: true },
    });
    if (!demand) throw new NotFoundException('Demand not found');
    if (demand.offtakerId !== offtakerId) throw new ForbiddenException('Not your demand');
    if (demand.offers.length > 0) {
      throw new BadRequestException('Cannot delete a demand that already has offers submitted against it');
    }
    return this.prisma.marketplaceDemand.delete({ where: { id: demandId } });
  }

  async attachDemandImage(offtakerId: string, demandId: string, imageUrl: string) {
    const demand = await this.prisma.marketplaceDemand.findUnique({ where: { id: demandId } });
    if (!demand) throw new NotFoundException('Demand not found');
    if (demand.offtakerId !== offtakerId) throw new ForbiddenException('Not your demand');
    return this.prisma.marketplaceDemand.update({ where: { id: demandId }, data: { imageUrl } });
  }

  // Marks real supply as delivered against an already-accepted offer. This
  // is a separate step from acceptOffer — accepting just means "you're the
  // chosen supplier," fulfilling means the goods actually moved. The offer
  // is never deleted; FULFILLED is a terminal status so the record (and
  // audit trail) survives. If the offer was linked to a real inventory
  // item, that item's quantity is decremented in the same transaction so
  // inventory stays accurate once stock has actually left the farmer.
  async fulfillOffer(offerId: string) {
    const offer = await this.prisma.marketplaceOffer.findUnique({ where: { id: offerId } });
    if (!offer) throw new NotFoundException('Offer not found');
    if (offer.status !== 'ACCEPTED') {
      throw new BadRequestException('Only an accepted offer can be marked as fulfilled');
    }

    const ops: any[] = [
      this.prisma.marketplaceOffer.update({ where: { id: offerId }, data: { status: 'FULFILLED' } }),
    ];

    if (offer.inventoryItemId) {
      const item = await this.prisma.inventoryItem.findUnique({ where: { id: offer.inventoryItemId } });
      if (item) {
        const remaining = Number(item.quantity) - Number(offer.quantityOffered);
        ops.push(
          this.prisma.inventoryItem.update({
            where: { id: offer.inventoryItemId },
            data: {
              quantity: remaining > 0 ? remaining : 0,
              status: remaining <= 0 ? 'OUT_OF_STOCK' : item.status,
            },
          }),
        );
      }
    }

    await this.prisma.$transaction(ops);
    return this.prisma.marketplaceOffer.findUnique({ where: { id: offerId } });
  }
}
