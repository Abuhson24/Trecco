import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

// One aggregation query per area (member count, loan stats, inventory,
// marketplace), run in parallel via Promise.all since they're all reads —
// no transaction needed, just speed. Every number here is real data pulled
// straight from Postgres, nothing mocked.
@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary(memberId: string) {
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
        personalBalance: member.personalAccount?.balance ?? 0,
        cooperativeSavings: member.cooperative.cooperativeAccount?.balance ?? 0,
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
}
