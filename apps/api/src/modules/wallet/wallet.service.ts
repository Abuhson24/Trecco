import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * WalletService owns the single shared ledger described in the root README.
 * FUNDING, MOVE_TO_SAVINGS, WITHDRAWAL, LOAN_DISBURSEMENT, and LOAN_REPAYMENT
 * all pass through here so PersonalAccount.balance is never edited directly
 * from another module — always create a Transaction and update balances
 * inside a single DB transaction to avoid race conditions on concurrent
 * requests (e.g. a funding webhook landing while a member submits a
 * move-to-savings request).
 */
@Injectable()
export class WalletService {
  constructor(private readonly prisma: PrismaService) {}

  async getBalance(memberId: string) {
    const personalAccount = await this.prisma.personalAccount.findUnique({
      where: { memberId },
    });
    if (!personalAccount) {
      throw new NotFoundException(
        'No personal account provisioned for this member yet — signup should have called provisionAccount',
      );
    }

    const member = await this.prisma.member.findUniqueOrThrow({
      where: { id: memberId },
      select: { cooperativeId: true },
    });

    const cooperativeAccount = await this.prisma.cooperativeAccount.findUnique({
      where: { cooperativeId: member.cooperativeId },
    });

    return {
      personalBalance: personalAccount.balance,
      cooperativeSavings: cooperativeAccount?.balance ?? 0,
      providusAccountNumber: personalAccount.providusAccountNumber,
    };
  }

  // TODO(providus): call Providus's account-creation endpoint and persist
  // the returned account number + reference on PersonalAccount.
  async provisionAccount(memberId: string): Promise<void> {
    throw new Error('Not implemented — needs Providus API docs');
  }

  // TODO(providus): verify the webhook signature per Providus's docs before
  // trusting the payload. This endpoint is the source of truth for all
  // FUNDING transactions — get this one right first.
  async handleProvidusWebhook(payload: unknown): Promise<void> {
    throw new Error('Not implemented — needs Providus API docs');
  }

  // Internal transfer: personal account -> cooperative account.
  // No external API call — this is a straight DB transaction, but it still
  // needs to be atomic: debit personal, credit cooperative, write a
  // Transaction row, all together or not at all.
  async moveToSavings(memberId: string, amount: number): Promise<void> {
    if (amount <= 0) throw new Error('Amount must be positive');

    const personalAccount = await this.prisma.personalAccount.findUnique({ where: { memberId } });
    if (!personalAccount) throw new NotFoundException('No personal account for this member');
    if (Number(personalAccount.balance) < amount) throw new Error('Insufficient personal account balance');

    const member = await this.prisma.member.findUniqueOrThrow({
      where: { id: memberId },
      select: { cooperativeId: true },
    });
    const cooperativeAccount = await this.prisma.cooperativeAccount.findUnique({
      where: { cooperativeId: member.cooperativeId },
    });
    if (!cooperativeAccount) throw new NotFoundException('No cooperative account provisioned for this cooperative');

    await this.prisma.$transaction([
      this.prisma.personalAccount.update({
        where: { id: personalAccount.id },
        data: { balance: { decrement: amount } },
      }),
      this.prisma.cooperativeAccount.update({
        where: { id: cooperativeAccount.id },
        data: { balance: { increment: amount } },
      }),
      this.prisma.transaction.create({
        data: {
          type: 'MOVE_TO_SAVINGS',
          status: 'COMPLETED',
          amount,
          reference: `internal-${Date.now()}-${memberId}`,
          method: 'internal',
          personalAccountId: personalAccount.id,
          cooperativeAccountId: cooperativeAccount.id,
        },
      }),
    ]);
  }

  // TODO(providus): call Providus's outbound-transfer endpoint. Apply the
  // withdrawal fee (flat vs. percentage — open decision, see README) before
  // calling out, and only debit PersonalAccount.balance once Providus
  // confirms the transfer was accepted, not just requested.
  async withdraw(memberId: string, amount: number, destinationBankAccount: string): Promise<void> {
    throw new Error('Not implemented — needs Providus API docs + fee decision');
  }
}
