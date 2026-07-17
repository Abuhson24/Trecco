import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CardRequestStatus, CardType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { XpressWalletClient } from './xpress-wallet.client';

interface DeliveryAddressInput {
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  country: string;
}

// Card fees are a flat env-configured amount for now — same "open decision"
// status as the withdrawal fee in wallet.service.ts. Once the business
// decides fees should vary per cooperative, move these onto Cooperative and
// read cardRequest.member.cooperative.cardFeeVirtual/Physical instead.
const FEE_VIRTUAL = Number(process.env.CARD_FEE_VIRTUAL ?? 500);
const FEE_PHYSICAL = Number(process.env.CARD_FEE_PHYSICAL ?? 2000); // covers production + delivery

/**
 * Request -> admin approval -> fee deduction -> issuance -> (physical: dispatch -> delivered)
 *
 * Every status change is one row's worth of writes done inside a single
 * prisma.$transaction, same rule the wallet ledger follows: never let a
 * balance and its Transaction row get out of sync because two requests
 * interleaved.
 */
@Injectable()
export class CardsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly xpressWallet: XpressWalletClient,
  ) {}

  // ---------- Member-facing ----------

  async requestCard(memberId: string, cardType: CardType, deliveryAddress?: DeliveryAddressInput) {
    if (cardType === 'PHYSICAL' && !deliveryAddress) {
      throw new BadRequestException('deliveryAddress is required for a physical card request');
    }

    return this.prisma.cardRequest.create({
      data: {
        memberId,
        cardType,
        status: CardRequestStatus.PENDING_APPROVAL,
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

  async myRequests(memberId: string) {
    return this.prisma.cardRequest.findMany({
      where: { memberId },
      include: { card: true },
      orderBy: { submittedAt: 'desc' },
    });
  }

  async myCards(memberId: string) {
    return this.prisma.card.findMany({ where: { memberId } });
  }

  async cancel(memberId: string, cardRequestId: string) {
    const request = await this.getOwnedRequest(memberId, cardRequestId);
    if (request.status !== CardRequestStatus.PENDING_APPROVAL) {
      throw new BadRequestException('Only a request still pending approval can be cancelled');
    }
    return this.prisma.cardRequest.update({
      where: { id: cardRequestId },
      data: { status: CardRequestStatus.CANCELLED },
    });
  }

  // ---------- Admin-facing ----------

  async pendingForAdmin() {
    return this.prisma.cardRequest.findMany({
      where: { status: CardRequestStatus.PENDING_APPROVAL },
      include: { member: { select: { id: true, fullName: true, email: true, phone: true } } },
      orderBy: { submittedAt: 'asc' },
    });
  }

  // Physical cards that have been produced (ISSUED) but not yet handed to a
  // courier — the admin's "ready to dispatch" queue.
  async awaitingDispatchForAdmin() {
    return this.prisma.cardRequest.findMany({
      where: { status: CardRequestStatus.ISSUED, cardType: CardType.PHYSICAL },
      include: { member: { select: { id: true, fullName: true, email: true, phone: true } } },
      orderBy: { updatedAt: 'asc' },
    });
  }

  /**
   * The core money-moving step: debit the member's PersonalAccount, credit
   * the CooperativeAccount, write one CARD_ISSUANCE_FEE Transaction, and flip
   * the request to FEE_DEDUCTED — all inside one DB transaction so a
   * concurrent withdrawal or funding webhook can never race this. Balance
   * check happens inside the same transaction (not before it) so two
   * approvals firing at once can't both pass a stale balance check.
   *
   * After the fee clears, we call out to Xpress Wallet to actually mint the
   * card. That call is best-effort here: if it throws, the request is left
   * in FAILED with the fee already deducted, flagged for admin reconciliation
   * — we do not attempt an automatic refund, since "did the card actually get
   * created on Xpress Wallet's side despite the error" needs a human to check
   * before refunding twice.
   */
  async approve(adminId: string, cardRequestId: string) {
    const request = await this.prisma.cardRequest.findUnique({
      where: { id: cardRequestId },
      include: { member: { include: { personalAccount: true, cooperative: { include: { cooperativeAccount: true } } } } },
    });
    if (!request) throw new NotFoundException('Card request not found');
    if (request.status !== CardRequestStatus.PENDING_APPROVAL) {
      throw new BadRequestException(`Request is ${request.status}, not PENDING_APPROVAL`);
    }

    const personalAccount = request.member.personalAccount;
    // Cards work standalone — a member with no cooperative (or a cooperative
    // with no funded account yet) still gets charged the fee, it just has no
    // cooperative-side credit leg. Only PersonalAccount is required here.
    const cooperativeAccount = request.member.cooperative?.cooperativeAccount ?? null;
    if (!personalAccount) {
      throw new BadRequestException('Member is missing a provisioned personal account');
    }

    const fee = request.cardType === 'VIRTUAL' ? FEE_VIRTUAL : FEE_PHYSICAL;

    await this.prisma.$transaction(async (tx) => {
      const fresh = await tx.personalAccount.findUniqueOrThrow({ where: { id: personalAccount.id } });
      if (Number(fresh.balance) < fee) {
        throw new BadRequestException('Member does not have sufficient balance to cover the card fee');
      }

      await tx.personalAccount.update({ where: { id: personalAccount.id }, data: { balance: { decrement: fee } } });
      if (cooperativeAccount) {
        await tx.cooperativeAccount.update({ where: { id: cooperativeAccount.id }, data: { balance: { increment: fee } } });
      }

      const txn = await tx.transaction.create({
        data: {
          type: 'CARD_ISSUANCE_FEE',
          status: 'COMPLETED',
          amount: fee,
          reference: `card-fee-${cardRequestId}`,
          method: 'internal',
          personalAccountId: personalAccount.id,
          cooperativeAccountId: cooperativeAccount?.id ?? null,
          cardRequestId,
        },
      });

      await tx.cardRequest.update({
        where: { id: cardRequestId },
        data: {
          status: CardRequestStatus.FEE_DEDUCTED,
          feeAmount: fee,
          feeTransactionId: txn.id,
          reviewedById: adminId,
          reviewedAt: new Date(),
        },
      });
    });

    return this.issue(cardRequestId);
  }

  async reject(adminId: string, cardRequestId: string, reason: string) {
    const request = await this.prisma.cardRequest.findUnique({ where: { id: cardRequestId } });
    if (!request) throw new NotFoundException('Card request not found');
    if (request.status !== CardRequestStatus.PENDING_APPROVAL) {
      throw new BadRequestException(`Request is ${request.status}, not PENDING_APPROVAL`);
    }
    return this.prisma.cardRequest.update({
      where: { id: cardRequestId },
      data: {
        status: CardRequestStatus.REJECTED,
        rejectionReason: reason,
        reviewedById: adminId,
        reviewedAt: new Date(),
      },
    });
  }

  // Called automatically right after approve(); also exposed so an admin can
  // retry issuance manually from a FAILED state once they've confirmed with
  // Xpress Wallet whether the original call actually went through.
  async issue(cardRequestId: string) {
    const request = await this.prisma.cardRequest.findUniqueOrThrow({
      where: { id: cardRequestId },
      include: { member: true },
    });
    if (request.status !== CardRequestStatus.FEE_DEDUCTED && request.status !== CardRequestStatus.FAILED) {
      throw new BadRequestException(`Request is ${request.status}, expected FEE_DEDUCTED or FAILED`);
    }

    await this.prisma.cardRequest.update({ where: { id: cardRequestId }, data: { status: CardRequestStatus.ISSUING } });

    try {
      const result =
        request.cardType === 'VIRTUAL'
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
                fullName: request.deliveryFullName!,
                phone: request.deliveryPhone!,
                addressLine1: request.addressLine1!,
                addressLine2: request.addressLine2 ?? undefined,
                city: request.city!,
                state: request.state!,
                country: request.country!,
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
          data: { status: CardRequestStatus.ISSUED, xpressWalletCardId: result.cardId },
        });
      });
    } catch (err) {
      // Fee already left the member's account — leave a clear paper trail
      // for admin reconciliation rather than silently retrying or refunding.
      await this.prisma.cardRequest.update({ where: { id: cardRequestId }, data: { status: CardRequestStatus.FAILED } });
      throw err;
    }
  }

  // ---------- Delivery tracking (physical only) ----------

  async dispatch(adminId: string, cardRequestId: string, courier: string, trackingReference: string) {
    const request = await this.requirePhysical(cardRequestId, CardRequestStatus.ISSUED);
    return this.prisma.cardRequest.update({
      where: { id: cardRequestId },
      data: { status: CardRequestStatus.DISPATCHED, courier, trackingReference, dispatchedAt: new Date() },
    });
  }

  async markDelivered(cardRequestId: string) {
    const request = await this.requirePhysical(cardRequestId, CardRequestStatus.DISPATCHED);
    return this.prisma.cardRequest.update({
      where: { id: cardRequestId },
      data: { status: CardRequestStatus.DELIVERED, deliveredAt: new Date() },
    });
  }

  // ---------- helpers ----------

  private async getOwnedRequest(memberId: string, cardRequestId: string) {
    const request = await this.prisma.cardRequest.findUnique({ where: { id: cardRequestId } });
    if (!request || request.memberId !== memberId) throw new NotFoundException('Card request not found');
    return request;
  }

  private async requirePhysical(cardRequestId: string, expected: CardRequestStatus) {
    const request = await this.prisma.cardRequest.findUniqueOrThrow({ where: { id: cardRequestId } });
    if (request.cardType !== 'PHYSICAL') throw new BadRequestException('Not a physical card request');
    if (request.status !== expected) throw new BadRequestException(`Request is ${request.status}, expected ${expected}`);
    return request;
  }
}
