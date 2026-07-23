import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  calculateCreditScore,
  CreditScoreBreakdown,
  CreditScoreInputs,
} from './credit-score.util';

const SIX_MONTHS_MS = 1000 * 60 * 60 * 24 * 30 * 6;

@Injectable()
export class CreditScoreService {
  constructor(private prisma: PrismaService) {}

  async getCreditScore(memberId: string): Promise<CreditScoreBreakdown> {
    const inputs = await this.gatherInputs(memberId);
    return calculateCreditScore(inputs);
  }

  private async gatherInputs(memberId: string): Promise<CreditScoreInputs> {
    const since = new Date(Date.now() - SIX_MONTHS_MS);

    const member = await this.prisma.member.findUnique({
      where: { id: memberId },
      include: { personalAccount: true, cooperative: true },
    });
    if (!member || !member.personalAccount) {
      throw new NotFoundException('Wallet not yet set up — complete BVN/identity verification first');
    }

    const savingsTarget = member.cooperative
      ? Number(member.cooperative.recommendedSavingsTarget)
      : 200000;

    const savingsTx = await this.prisma.transaction.findMany({
      where: {
        personalAccountId: member.personalAccount.id,
        type: 'MOVE_TO_SAVINGS',
        status: 'COMPLETED',
      },
      select: { amount: true, createdAt: true },
    });
    const currentSavings = savingsTx.reduce((sum, t) => sum + Number(t.amount), 0);

    const walletTx = await this.prisma.transaction.findMany({
      where: {
        personalAccountId: member.personalAccount.id,
        status: 'COMPLETED',
        createdAt: { gte: since },
        type: {
          in: [
            'FUNDING',
            'WITHDRAWAL',
            'WALLET_TRANSFER',
            'AIRTIME_PURCHASE',
            'DATA_PURCHASE',
            'MOVE_TO_SAVINGS',
          ],
        },
      },
      select: { createdAt: true },
    });
    const monthlyTransactionCounts = bucketByMonth(walletTx.map((t) => t.createdAt), 6);

    const inventoryItems = await this.prisma.inventoryItem.findMany({
      where: { memberId, status: { not: 'OUT_OF_STOCK' } },
      select: { estimatedValue: true },
    });
    const inventoryValue = inventoryItems.reduce(
      (sum, i) => sum + Number(i.estimatedValue ?? 0),
      0,
    );

    const offers = await this.prisma.marketplaceOffer.findMany({
      where: { memberId, submittedAt: { gte: since } },
      select: { status: true, demand: { select: { offtakerId: true } } },
    });
    const offersAvailable = offers.length;
    const offersCompleted = offers.filter((o) => o.status === 'FULFILLED').length;
    const offtakerCounts = new Map<string, number>();
    for (const o of offers.filter((o) => o.status === 'FULFILLED')) {
      offtakerCounts.set(
        o.demand.offtakerId,
        (offtakerCounts.get(o.demand.offtakerId) ?? 0) + 1,
      );
    }
    const hasRepeatBuyer = [...offtakerCounts.values()].some((c) => c > 1);

    const monthsWithSavings = monthsWithActivity(
      savingsTx.map((t) => t.createdAt),
      6,
    );

    return {
      currentSavings,
      savingsTarget,
      monthlyTransactionCounts,
      inventoryValue,
      offersAvailable,
      offersCompleted,
      hasRepeatBuyer,
      monthsWithSavings,
    };
  }
}

function bucketByMonth(dates: Date[], months: number): number[] {
  const buckets = new Array(months).fill(0);
  const now = new Date();
  for (const d of dates) {
    const monthsAgo =
      (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth());
    const index = months - 1 - monthsAgo;
    if (index >= 0 && index < months) buckets[index]++;
  }
  return buckets;
}

function monthsWithActivity(dates: Date[], months: number): boolean[] {
  const flags = new Array(months).fill(false);
  const now = new Date();
  for (const d of dates) {
    const monthsAgo =
      (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth());
    const index = months - 1 - monthsAgo;
    if (index >= 0 && index < months) flags[index] = true;
  }
  return flags;
}
