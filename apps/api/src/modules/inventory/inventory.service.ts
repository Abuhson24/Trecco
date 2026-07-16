import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MarketplaceService } from '../marketplace/marketplace.service';

@Injectable()
export class InventoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly marketplace: MarketplaceService,
  ) {}

  async createItem(memberId: string, body: any) {
    const member = await this.prisma.member.findUniqueOrThrow({ where: { id: memberId } });
    return this.prisma.inventoryItem.create({
      data: {
        cooperativeId: member.cooperativeId,
        memberId,
        name: body.name,
        category: body.category,
        quantity: body.quantity,
        unit: body.unit,
        estimatedValue: body.estimatedValue ?? null,
        status: body.status ?? 'IN_STOCK',
        variety: body.variety ?? null,
        growingMethod: body.growingMethod ?? null,
        plantingDate: body.plantingDate ? new Date(body.plantingDate) : null,
        harvestDate: body.harvestDate ? new Date(body.harvestDate) : null,
        askingPriceCurrency: body.askingPriceCurrency ?? 'NGN',
        askingPriceAmount: body.askingPriceAmount ?? null,
        negotiable: body.negotiable ?? false,
        bulkDiscountAvailable: body.bulkDiscountAvailable ?? false,
        minSellingPriceCurrency: body.minSellingPriceCurrency ?? 'NGN',
        minSellingPriceAmount: body.minSellingPriceAmount ?? null,
      },
    });
  }

  async listMine(memberId: string) {
    return this.prisma.inventoryItem.findMany({
      where: { memberId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateItem(memberId: string, itemId: string, body: any) {
    const item = await this.prisma.inventoryItem.findUnique({ where: { id: itemId } });
    if (!item) throw new NotFoundException('Inventory item not found');
    if (item.memberId !== memberId) throw new ForbiddenException('Not your item');

    return this.prisma.inventoryItem.update({
      where: { id: itemId },
      data: {
        name: body.name ?? item.name,
        category: body.category ?? item.category,
        quantity: body.quantity ?? item.quantity,
        unit: body.unit ?? item.unit,
        estimatedValue: body.estimatedValue ?? item.estimatedValue,
        status: body.status ?? item.status,
        variety: body.variety ?? item.variety,
        growingMethod: body.growingMethod ?? item.growingMethod,
        plantingDate: body.plantingDate ? new Date(body.plantingDate) : item.plantingDate,
        harvestDate: body.harvestDate ? new Date(body.harvestDate) : item.harvestDate,
        askingPriceCurrency: body.askingPriceCurrency ?? item.askingPriceCurrency,
        askingPriceAmount: body.askingPriceAmount ?? item.askingPriceAmount,
        negotiable: body.negotiable ?? item.negotiable,
        bulkDiscountAvailable: body.bulkDiscountAvailable ?? item.bulkDiscountAvailable,
        minSellingPriceCurrency: body.minSellingPriceCurrency ?? item.minSellingPriceCurrency,
        minSellingPriceAmount: body.minSellingPriceAmount ?? item.minSellingPriceAmount,
      },
    });
  }

  async deleteItem(memberId: string, itemId: string) {
    const item = await this.prisma.inventoryItem.findUnique({ where: { id: itemId } });
    if (!item) throw new NotFoundException('Inventory item not found');
    if (item.memberId !== memberId) throw new ForbiddenException('Not your item');

    // Guard against deleting an item that a marketplace offer already
    // references — that offer would be left pointing at nothing, and an
    // admin reviewing offer history would lose the "which item was this"
    // context. Block the delete instead of silently orphaning the offer.
    const linkedOffers = await this.prisma.marketplaceOffer.count({ where: { inventoryItemId: itemId } });
    if (linkedOffers > 0) {
      throw new ForbiddenException('Cannot delete an item that has been offered on the marketplace');
    }

    await this.prisma.inventoryItem.delete({ where: { id: itemId } });
    return { deleted: true };
  }

  async attachImage(memberId: string, itemId: string, imageUrl: string) {
    const item = await this.prisma.inventoryItem.findUnique({ where: { id: itemId } });
    if (!item) throw new NotFoundException('Inventory item not found');
    if (item.memberId !== memberId) throw new ForbiddenException('Not your item');
    return this.prisma.inventoryItem.update({ where: { id: itemId }, data: { imageUrl } });
  }
  async listAlertsForAdmin(cooperativeId: string) {
    return this.prisma.inventoryItem.findMany({
      where: { cooperativeId },
      orderBy: { createdAt: 'desc' },
      include: { member: { select: { id: true, fullName: true } } },
      take: 50,
    });
  }

  async listToMarketplace(memberId: string, itemId: string, demandId: string, quantityOffered: number) {
    const item = await this.prisma.inventoryItem.findUnique({ where: { id: itemId } });
    if (!item) throw new NotFoundException('Inventory item not found');
    if (item.memberId !== memberId) throw new ForbiddenException('Not your item');
    if (Number(item.quantity) < quantityOffered) {
      throw new ForbiddenException('Offer quantity exceeds item quantity on hand');
    }
    return this.marketplace.submitOffer(memberId, demandId, { quantityOffered });
  }
}
