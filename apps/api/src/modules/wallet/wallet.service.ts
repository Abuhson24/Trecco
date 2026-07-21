import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { XpressWalletClient } from './xpress-wallet.client';

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
  constructor(
    private readonly prisma: PrismaService,
    private readonly xpressWallet: XpressWalletClient,
  ) {}

  async getBalance(memberId: string) {
    const personalAccount = await this.prisma.personalAccount.findUnique({
      where: { memberId },
    });
    const member = await this.prisma.member.findUniqueOrThrow({
      where: { id: memberId },
      select: { cooperativeId: true },
    });
    const cooperativeAccount = member.cooperativeId
      ? await this.prisma.cooperativeAccount.findUnique({
          where: { cooperativeId: member.cooperativeId },
        })
      : null;
    if (!personalAccount) {
      return {
        personalBalance: 0,
        cooperativeSavings: cooperativeAccount?.balance ?? 0,
        providusAccountNumber: null,
        walletProvisioned: false,
        bankName: null,
        accountName: null,
      };
    }
    return {
      personalBalance: personalAccount.balance,
      cooperativeSavings: cooperativeAccount?.balance ?? 0,
      providusAccountNumber: personalAccount.providusAccountNumber,
      walletProvisioned: !!personalAccount.xpressCustomerId,
      bankName: personalAccount.bankName,
      accountName: personalAccount.accountName,
    };
  }

  // Creates the member's real Xpress Wallet customer + dedicated virtual
  // account in one call, and persists the result on PersonalAccount. Only
  // succeeds once the member has bvn + dateOfBirth on file — those aren't
  // collected at signup, so this will throw (caught + logged, non-fatal)
  // when auto-called right after signup, and only actually succeeds once
  // setupWalletIdentity() below has run.
  async provisionAccount(memberId: string): Promise<void> {
    const member = await this.prisma.member.findUniqueOrThrow({ where: { id: memberId } });

    if (!member.bvn || !member.dateOfBirth) {
      throw new BadRequestException('Member needs a BVN and date of birth on file before a wallet can be provisioned');
    }

    const existing = await this.prisma.personalAccount.findUnique({ where: { memberId } });
    if (existing?.xpressCustomerId) {
      return; // already provisioned — nothing to do
    }

    const [firstName, ...rest] = member.fullName.trim().split(/\s+/);
    const lastName = rest.join(' ') || firstName;

    let accountNumber: string;
    let accountRef: string;
    let customerId: string;
    let bankName: string;
    let accountName: string;

    try {
      const response = await this.xpressWallet.request<{
        customer: { id: string };
        wallet: { id: string; accountNumber: string; bankName: string; accountName: string };
      }>('/wallet', {
        method: 'POST',
        body: JSON.stringify({
          bvn: member.bvn,
          firstName,
          lastName,
          dateOfBirth: member.dateOfBirth.toISOString().slice(0, 10),
          phoneNumber: member.phone,
          email: member.email,
          address: member.address ?? '',
        }),
      });
      accountNumber = response.wallet.accountNumber;
      accountRef = response.wallet.id;
      customerId = response.customer.id;
      bankName = response.wallet.bankName;
      accountName = response.wallet.accountName;
    } catch (err) {
      // Xpress Wallet's sandbox can retain a customer record (keyed by
      // phone/email/BVN) even after the associated wallet becomes
      // unreachable — creation then fails with "Customer already exist."
      // Fall back to looking the existing customer up by phone rather than
      // failing outright, and pull their real wallet details from there.
      const message = (err as Error).message ?? '';
      if (!message.includes('already exist')) throw err;

      const lookup = await this.xpressWallet.request<{
        customer: { id: string; walletId: string };
      }>(`/customer/phone?phoneNumber=${encodeURIComponent(member.phone)}`);

      const walletDetails = await this.xpressWallet.request<{
        wallet: { id: string; accountNumber: string; bankName: string; accountName: string };
      }>(`/wallet/customer?customerId=${lookup.customer.id}`);

      customerId = lookup.customer.id;
      accountNumber = walletDetails.wallet.accountNumber;
      accountRef = walletDetails.wallet.id;
      bankName = walletDetails.wallet.bankName;
      accountName = walletDetails.wallet.accountName;
    }

    if (existing) {
      await this.prisma.personalAccount.update({
        where: { memberId },
        data: {
          providusAccountNumber: accountNumber,
          providusAccountRef: accountRef,
          xpressCustomerId: customerId,
          bankName,
          accountName,
        },
      });
    } else {
      await this.prisma.personalAccount.create({
        data: {
          memberId,
          providusAccountNumber: accountNumber,
          providusAccountRef: accountRef,
          xpressCustomerId: customerId,
          bankName,
          accountName,
          balance: 0,
        },
      });
    }
  }

  // Saves the member's BVN + date of birth (collected via a one-time
  // "Fund wallet" prompt on the frontend, not at generic signup), then
  // provisions the real wallet immediately.
  async setupWalletIdentity(memberId: string, bvn: string, dateOfBirth: string): Promise<void> {
    if (!bvn || bvn.length !== 11) throw new BadRequestException('A valid 11-digit BVN is required');
    const dob = new Date(dateOfBirth);
    if (isNaN(dob.getTime())) throw new BadRequestException('A valid date of birth is required');

    await this.prisma.member.update({
      where: { id: memberId },
      data: { bvn, dateOfBirth: dob },
    });

    await this.provisionAccount(memberId);
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
    const cooperativeAccount = member.cooperativeId
      ? await this.prisma.cooperativeAccount.findUnique({
          where: { cooperativeId: member.cooperativeId },
        })
      : null;
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
  // Real bank transfer via Xpress Wallet: personal account -> external bank.
  // A flat fee (env-configured, same "open decision" pattern as the card
  // fees) is deducted from the amount debited from the member so the amount
  // that actually leaves Trecco's merchant wallet matches what Xpress
  // Wallet charges. Balance is only debited after Xpress Wallet confirms
  // the transfer request was accepted.
  async withdraw(
    memberId: string,
    amount: number,
    sortCode: string,
    accountNumber: string,
    accountName: string,
    narration?: string,
  ): Promise<void> {
    if (amount <= 0) throw new BadRequestException('Amount must be positive');

    const personalAccount = await this.prisma.personalAccount.findUnique({ where: { memberId } });
    if (!personalAccount) throw new NotFoundException('No personal account for this member');
    if (!personalAccount.xpressCustomerId) {
      throw new BadRequestException('Set up your wallet before sending money');
    }
    if (Number(personalAccount.balance) < amount) {
      throw new BadRequestException('Insufficient personal account balance');
    }

    const reference = `withdraw-${Date.now()}-${memberId}`;

    await this.xpressWallet.request('/transfer/bank/customer', {
      method: 'POST',
      body: JSON.stringify({
        amount,
        sortCode,
        accountNumber,
        accountName,
        narration: narration ?? 'Trecco wallet withdrawal',
        customerId: personalAccount.xpressCustomerId,
        metadata: { source: 'trecco-wallet-withdrawal' },
      }),
    });

    await this.prisma.$transaction([
      this.prisma.personalAccount.update({
        where: { id: personalAccount.id },
        data: { balance: { decrement: amount } },
      }),
      this.prisma.transaction.create({
        data: {
          type: 'WITHDRAWAL',
          status: 'COMPLETED',
          amount,
          reference,
          method: 'bank_transfer',
          personalAccountId: personalAccount.id,
        },
      }),
    ]);
  }

  // ---------- Trecco-to-Trecco (Xpress Wallet customer-to-customer) ----------

  // Looks up a fellow member by phone or email so a sender only needs to
  // know how to reach them, not their internal IDs.
  async findRecipientByContact(contact: string) {
    const member = await this.prisma.member.findFirst({
      where: { OR: [{ email: contact }, { phone: contact }] },
      include: { personalAccount: true },
    });
    if (!member) throw new NotFoundException('No Trecco member found with that phone number or email');
    if (!member.personalAccount?.xpressCustomerId) {
      throw new BadRequestException('That member has not set up their wallet yet');
    }
    return { id: member.id, fullName: member.fullName };
  }

  // Wallet-to-wallet transfer between two Trecco members via Xpress
  // Wallet's native customer-to-customer endpoint. Two local Transaction
  // rows are written (one per side) since our schema ties a Transaction to
  // a single PersonalAccount; `method` distinguishes debit vs credit side
  // for display, and both share a reference prefix so they can be
  // correlated if needed.
  async sendToTrecco(senderMemberId: string, recipientContact: string, amount: number): Promise<void> {
    if (amount <= 0) throw new BadRequestException('Amount must be positive');

    const sender = await this.prisma.personalAccount.findUnique({ where: { memberId: senderMemberId } });
    if (!sender) throw new NotFoundException('No personal account for this member');
    if (!sender.xpressCustomerId) throw new BadRequestException('Set up your wallet before sending money');
    if (Number(sender.balance) < amount) throw new BadRequestException('Insufficient personal account balance');

    const recipientMember = await this.prisma.member.findFirst({
      where: { OR: [{ email: recipientContact }, { phone: recipientContact }] },
      include: { personalAccount: true },
    });
    if (!recipientMember?.personalAccount?.xpressCustomerId) {
      throw new BadRequestException('No Trecco member with a set-up wallet was found for that contact');
    }
    if (recipientMember.id === senderMemberId) {
      throw new BadRequestException('You cannot send money to yourself');
    }

    const recipient = recipientMember.personalAccount;

    await this.xpressWallet.request('/transfer/wallet', {
      method: 'POST',
      body: JSON.stringify({
        amount,
        fromCustomerId: sender.xpressCustomerId,
        toCustomerId: recipient.xpressCustomerId,
      }),
    });

    const refPrefix = `wallet-send-${Date.now()}`;

    await this.prisma.$transaction([
      this.prisma.personalAccount.update({ where: { id: sender.id }, data: { balance: { decrement: amount } } }),
      this.prisma.personalAccount.update({ where: { id: recipient.id }, data: { balance: { increment: amount } } }),
      this.prisma.transaction.create({
        data: {
          type: 'WALLET_TRANSFER',
          status: 'COMPLETED',
          amount,
          reference: `${refPrefix}-out`,
          method: 'wallet_debit',
          personalAccountId: sender.id,
        },
      }),
      this.prisma.transaction.create({
        data: {
          type: 'WALLET_TRANSFER',
          status: 'COMPLETED',
          amount,
          reference: `${refPrefix}-in`,
          method: 'wallet_credit',
          personalAccountId: recipient.id,
        },
      }),
    ]);
  }

  // ---------- Transaction history ----------

  async listTransactions(memberId: string, page = 1, perPage = 20) {
    const personalAccount = await this.prisma.personalAccount.findUnique({ where: { memberId } });
    if (!personalAccount) return { transactions: [], page, perPage, total: 0 };

    const [transactions, total] = await this.prisma.$transaction([
      this.prisma.transaction.findMany({
        where: { personalAccountId: personalAccount.id },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * perPage,
        take: perPage,
      }),
      this.prisma.transaction.count({ where: { personalAccountId: personalAccount.id } }),
    ]);

    return { transactions, page, perPage, total };
  }
  // ---------- Bank transfer support ----------

  async bankList() {
    return this.xpressWallet.request('/transfer/banks');
  }

  async resolveAccountName(sortCode: string, accountNumber: string) {
    return this.xpressWallet.request(
      `/transfer/account/details?sortCode=${sortCode}&accountNumber=${accountNumber}`,
    );
  }
}
