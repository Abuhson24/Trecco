import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

// One aggregation query per area (member count, loan stats, inventory,
// marketplace), run in parallel via Promise.all since they're all reads —
// no transaction needed, just speed. Every number here is real data pulled
// straight from Postgres, nothing mocked.
@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary(memberId: string, panicMode = false) {
    const member = await this.prisma.member.findUniqueOrThrow({
      where: { id: memberId },
      include: {
        personalAccount: true,
        cooperative: { include: { cooperativeAccount: true } },
      },
    });

    if (!member.cooperativeId || !member.cooperative) {
      throw new BadRequestException('Join or create a cooperative before viewing the dashboard');
    }
    const cooperativeId = member.cooperativeId;

    const [activeMemberCount, loanGroups, inventoryAgg, openDemandCount, myPendingOfferCount] =
      await Promise.all([
        this.prisma.member.count({ where: { cooperativeId } }),

        this.prisma.loan.groupBy({
          by: ['status'],
          where: { member: { cooperativeId } },
          _count: { _all: true },
          _sum: { amountApproved: true, amountRepaid: true },
        }),

        this.prisma.inventoryItem.aggregate({
          where: { cooperativeId },
          _count: { _all: true },
          _sum: { estimatedValue: true },
        }),

        this.prisma.marketplaceDemand.count({
          where: { status: 'OPEN', OR: [{ cooperativeId: null }, { cooperativeId }] },
        }),

        this.prisma.marketplaceOffer.count({ where: { memberId, status: 'PENDING' } }),
      ]);

    const activeStatuses = ['COMMITTEE_VOTING', 'ADMIN_APPROVAL', 'REPAYING'];
    const activeLoanCount = loanGroups
      .filter((g) => activeStatuses.includes(g.status))
      .reduce((sum, g) => sum + g._count._all, 0);

    const totalDisbursed = loanGroups
      .filter((g) => g.status === 'REPAYING' || g.status === 'CLOSED')
      .reduce((sum, g) => sum + Number(g._sum.amountApproved ?? 0), 0);

    const repaying = loanGroups.find((g) => g.status === 'REPAYING');
    const totalOutstanding = repaying
      ? Number(repaying._sum.amountApproved ?? 0) - Number(repaying._sum.amountRepaid ?? 0)
      : 0;

    return {
      wallet: {
        personalBalance: panicMode ? 0 : member.personalAccount?.balance ?? 0,
        cooperativeSavings: panicMode ? 0 : member.cooperative.cooperativeAccount?.balance ?? 0,
      },
      cooperative: {
        id: member.cooperative.id,
        name: member.cooperative.name,
        status: member.cooperative.status,
        activeMemberCount,
      },
      loans: {
        activeCount: activeLoanCount,
        totalDisbursed,
        totalOutstanding,
      },
      inventory: {
        itemCount: inventoryAgg._count._all,
        totalEstimatedValue: inventoryAgg._sum.estimatedValue ?? 0,
      },
      marketplace: {
        openDemandCount,
        myPendingOfferCount,
      },
    };
  }

  // Credit = money landing in the personal wallet: external funding, loan
  // payouts, and the "credit" half of a wallet-to-wallet transfer.
  // Debit = money leaving it: withdrawals, moving to savings, loan
  // repayments, card fees, bill payments, and the "debit" half of a
  // wallet-to-wallet transfer. MOVE_TO_SAVINGS is counted in both the debit
  // total (it leaves the personal wallet) and its own separate savings
  // line, since that's the number members actually want to see trend.
  async getWalletFlow(memberId: string, panicMode = false, weeks = 8) {
    if (panicMode) {
      return { weeks: buildEmptyWeeks(weeks) };
    }

    const member = await this.prisma.member.findUniqueOrThrow({
      where: { id: memberId },
      include: { personalAccount: true },
    });
    if (!member.personalAccount) {
      return { weeks: buildEmptyWeeks(weeks) };
    }

    const since = new Date();
    since.setDate(since.getDate() - weeks * 7);

    const transactions = await this.prisma.transaction.findMany({
      where: {
        personalAccountId: member.personalAccount.id,
        status: 'COMPLETED',
        createdAt: { gte: since },
      },
      select: { type: true, method: true, amount: true, createdAt: true },
    });

    const buckets = buildEmptyWeeks(weeks);
    const CREDIT_TYPES = new Set(['FUNDING', 'LOAN_DISBURSEMENT']);
    const DEBIT_TYPES = new Set([
      'WITHDRAWAL',
      'LOAN_REPAYMENT',
      'CARD_ISSUANCE_FEE',
      'AIRTIME_PURCHASE',
      'DATA_PURCHASE',
    ]);

    const now = new Date();
    for (const tx of transactions) {
      const daysAgo = Math.floor((now.getTime() - tx.createdAt.getTime()) / (1000 * 60 * 60 * 24));
      const weekIndex = weeks - 1 - Math.floor(daysAgo / 7);
      if (weekIndex < 0 || weekIndex >= weeks) continue;

      const amount = Number(tx.amount);
      const bucket = buckets[weekIndex];

      if (tx.type === 'MOVE_TO_SAVINGS') {
        bucket.savings += amount;
        bucket.debit += amount;
      } else if (CREDIT_TYPES.has(tx.type)) {
        bucket.credit += amount;
      } else if (DEBIT_TYPES.has(tx.type)) {
        bucket.debit += amount;
      } else if (tx.type === 'WALLET_TRANSFER') {
        if (tx.method === 'wallet_credit') bucket.credit += amount;
        else bucket.debit += amount;
      }
    }

    return { weeks: buckets };
  }
}

function buildEmptyWeeks(weeks: number) {
  const now = new Date();
  const result: { weekLabel: string; credit: number; debit: number; savings: number }[] = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - i * 7);
    const label = weekStart.toLocaleDateString('en-NG', { month: 'short', day: 'numeric' });
    result.push({ weekLabel: label, credit: 0, debit: 0, savings: 0 });
  }
  return result;
}
