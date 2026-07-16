import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

interface LoanRequestInput {
  amountRequested: number;
  purpose: string;
  repaymentMonths: number;
}

@Injectable()
export class LoansService {
  constructor(private readonly prisma: PrismaService) {}

  async requestLoan(memberId: string, input: LoanRequestInput) {
    if (input.amountRequested <= 0) throw new BadRequestException('Amount requested must be positive');
    if (input.repaymentMonths <= 0) throw new BadRequestException('Repayment months must be positive');

    const member = await this.prisma.member.findUniqueOrThrow({
      where: { id: memberId },
      include: { cooperative: true },
    });

    return this.prisma.loan.create({
      data: {
        memberId,
        amountRequested: input.amountRequested,
        purpose: input.purpose,
        repaymentMonths: input.repaymentMonths,
        interestRate: member.cooperative.loanRatePolicy,
        status: 'COMMITTEE_VOTING',
      },
    });
  }

  async myLoans(memberId: string) {
    return this.prisma.loan.findMany({
      where: { memberId },
      include: { votes: true, repayments: true },
      orderBy: { submittedAt: 'desc' },
    });
  }

  async repayAutomated(memberId: string, loanId: string, amount: number) {
    if (amount <= 0) throw new BadRequestException('Amount must be positive');
    const loan = await this.getOwnedRepayableLoan(memberId, loanId);

    const personalAccount = await this.prisma.personalAccount.findUnique({ where: { memberId } });
    if (!personalAccount) throw new NotFoundException('No personal account for this member');
    if (Number(personalAccount.balance) < amount) throw new BadRequestException('Insufficient personal account balance');

    const member = await this.prisma.member.findUniqueOrThrow({ where: { id: memberId }, select: { cooperativeId: true } });
    const cooperativeAccount = await this.prisma.cooperativeAccount.findUnique({ where: { cooperativeId: member.cooperativeId } });
    if (!cooperativeAccount) throw new NotFoundException('No cooperative account provisioned for this cooperative');

    return this.prisma.$transaction(async (tx) => {
      await tx.personalAccount.update({ where: { id: personalAccount.id }, data: { balance: { decrement: amount } } });
      await tx.cooperativeAccount.update({ where: { id: cooperativeAccount.id }, data: { balance: { increment: amount } } });

      const txn = await tx.transaction.create({
        data: {
          type: 'LOAN_REPAYMENT',
          status: 'COMPLETED',
          amount,
          reference: `loan-repay-auto-${loanId}-${Date.now()}`,
          method: 'internal',
          personalAccountId: personalAccount.id,
          cooperativeAccountId: cooperativeAccount.id,
          loanId,
        },
      });

      await tx.loanRepayment.create({
        data: {
          loanId,
          method: 'AUTOMATED',
          amount,
          status: 'CONFIRMED',
          confirmedAt: new Date(),
        },
      });

      const updatedLoan = await tx.loan.update({
        where: { id: loanId },
        data: { amountRepaid: { increment: amount } },
      });

      await this.closeIfFullyRepaid(tx, updatedLoan);

      return txn;
    });
  }

  async submitManualRepayment(memberId: string, loanId: string, amount: number, reference: string | undefined, receiptUrl: string) {
    if (amount <= 0) throw new BadRequestException('Amount must be positive');
    await this.getOwnedRepayableLoan(memberId, loanId);

    return this.prisma.loanRepayment.create({
      data: {
        loanId,
        method: 'MANUAL',
        amount,
        reference: reference ?? null,
        receiptUrl,
        status: 'PENDING',
      },
    });
  }

  async pendingForCommittee(memberId: string) {
    const member = await this.requireCommitteeMember(memberId);
    return this.prisma.loan.findMany({
      where: {
        status: 'COMMITTEE_VOTING',
        member: { cooperativeId: member.cooperativeId },
        votes: { none: { voterId: memberId } },
      },
      include: {
        member: { select: { id: true, fullName: true, email: true, phone: true } },
        votes: true,
      },
      orderBy: { submittedAt: 'asc' },
    });
  }

  async vote(voterId: string, loanId: string, approve: boolean) {
    const voter = await this.requireCommitteeMember(voterId);

    const loan = await this.prisma.loan.findUnique({
      where: { id: loanId },
      include: { member: { include: { cooperative: true } }, votes: true },
    });
    if (!loan) throw new NotFoundException('Loan not found');
    if (loan.status !== 'COMMITTEE_VOTING') throw new BadRequestException(`Loan is ${loan.status}, not COMMITTEE_VOTING`);
    if (loan.member.cooperativeId !== voter.cooperativeId) throw new ForbiddenException('Not a member of this cooperative');
    if (loan.votes.some((v) => v.voterId === voterId)) throw new BadRequestException('You have already voted on this loan');

    await this.prisma.loanVote.create({ data: { loanId, voterId, approve } });

    const committeeSize = loan.member.cooperative.committeeSize;
    const threshold = Math.ceil(committeeSize / 2);
    const allVotes = await this.prisma.loanVote.findMany({ where: { loanId } });
    const approveCount = allVotes.filter((v) => v.approve).length;
    const rejectCount = allVotes.filter((v) => !v.approve).length;

    if (approveCount >= threshold) {
      return this.prisma.loan.update({ where: { id: loanId }, data: { status: 'ADMIN_APPROVAL' } });
    }
    if (rejectCount > committeeSize - threshold) {
      return this.prisma.loan.update({ where: { id: loanId }, data: { status: 'REJECTED' } });
    }
    return this.prisma.loan.findUniqueOrThrow({ where: { id: loanId } });
  }

  async pendingApprovalForAdmin() {
    return this.prisma.loan.findMany({
      where: { status: 'ADMIN_APPROVAL' },
      include: {
        member: { select: { id: true, fullName: true, email: true, phone: true } },
        votes: true,
      },
      orderBy: { submittedAt: 'asc' },
    });
  }

  async approveAndDisburse(loanId: string, amountApproved?: number) {
    const loan = await this.prisma.loan.findUnique({
      where: { id: loanId },
      include: { member: { include: { personalAccount: true, cooperative: { include: { cooperativeAccount: true } } } } },
    });
    if (!loan) throw new NotFoundException('Loan not found');
    if (loan.status !== 'ADMIN_APPROVAL') throw new BadRequestException(`Loan is ${loan.status}, not ADMIN_APPROVAL`);

    const personalAccount = loan.member.personalAccount;
    const cooperativeAccount = loan.member.cooperative.cooperativeAccount;
    if (!personalAccount || !cooperativeAccount) {
      throw new BadRequestException('Member or cooperative is missing a provisioned account');
    }

    const amount = amountApproved ?? Number(loan.amountRequested);
    if (amount <= 0) throw new BadRequestException('Approved amount must be positive');

    return this.prisma.$transaction(async (tx) => {
      const freshCoop = await tx.cooperativeAccount.findUniqueOrThrow({ where: { id: cooperativeAccount.id } });
      if (Number(freshCoop.balance) < amount) {
        throw new BadRequestException('Cooperative account does not have sufficient balance to disburse this loan');
      }

      await tx.cooperativeAccount.update({ where: { id: cooperativeAccount.id }, data: { balance: { decrement: amount } } });
      await tx.personalAccount.update({ where: { id: personalAccount.id }, data: { balance: { increment: amount } } });

      await tx.transaction.create({
        data: {
          type: 'LOAN_DISBURSEMENT',
          status: 'COMPLETED',
          amount,
          reference: `loan-disburse-${loanId}`,
          method: 'internal',
          personalAccountId: personalAccount.id,
          cooperativeAccountId: cooperativeAccount.id,
          loanId,
        },
      });

      return tx.loan.update({
        where: { id: loanId },
        data: {
          amountApproved: amount,
          status: 'REPAYING',
          disbursedAt: new Date(),
        },
      });
    });
  }

  async rejectByAdmin(loanId: string) {
    const loan = await this.prisma.loan.findUnique({ where: { id: loanId } });
    if (!loan) throw new NotFoundException('Loan not found');
    if (loan.status !== 'ADMIN_APPROVAL') throw new BadRequestException(`Loan is ${loan.status}, not ADMIN_APPROVAL`);
    return this.prisma.loan.update({ where: { id: loanId }, data: { status: 'REJECTED' } });
  }

  async pendingRepaymentsForAdmin() {
    return this.prisma.loanRepayment.findMany({
      where: { status: 'PENDING', method: 'MANUAL' },
      include: { loan: { include: { member: { select: { id: true, fullName: true, email: true } } } } },
      orderBy: { submittedAt: 'asc' },
    });
  }

  async confirmManualRepayment(adminId: string, repaymentId: string) {
    const repayment = await this.prisma.loanRepayment.findUnique({
      where: { id: repaymentId },
      include: { loan: { include: { member: { include: { cooperative: { include: { cooperativeAccount: true } } } } } } },
    });
    if (!repayment) throw new NotFoundException('Repayment not found');
    if (repayment.status !== 'PENDING' || repayment.method !== 'MANUAL') {
      throw new BadRequestException('Only a pending manual repayment can be confirmed');
    }

    const cooperativeAccount = repayment.loan.member.cooperative.cooperativeAccount;
    if (!cooperativeAccount) throw new NotFoundException('No cooperative account provisioned');

    return this.prisma.$transaction(async (tx) => {
      await tx.cooperativeAccount.update({ where: { id: cooperativeAccount.id }, data: { balance: { increment: Number(repayment.amount) } } });

      await tx.transaction.create({
        data: {
          type: 'LOAN_REPAYMENT',
          status: 'COMPLETED',
          amount: repayment.amount,
          reference: `loan-repay-manual-${repaymentId}`,
          method: 'manual',
          cooperativeAccountId: cooperativeAccount.id,
          loanId: repayment.loanId,
        },
      });

      const confirmed = await tx.loanRepayment.update({
        where: { id: repaymentId },
        data: { status: 'CONFIRMED', confirmedAt: new Date(), confirmedBy: adminId },
      });

      const updatedLoan = await tx.loan.update({
        where: { id: repayment.loanId },
        data: { amountRepaid: { increment: repayment.amount } },
      });

      await this.closeIfFullyRepaid(tx, updatedLoan);

      return confirmed;
    });
  }

  async rejectManualRepayment(adminId: string, repaymentId: string, reason: string) {
    const repayment = await this.prisma.loanRepayment.findUnique({ where: { id: repaymentId } });
    if (!repayment) throw new NotFoundException('Repayment not found');
    if (repayment.status !== 'PENDING' || repayment.method !== 'MANUAL') {
      throw new BadRequestException('Only a pending manual repayment can be rejected');
    }
    return this.prisma.loanRepayment.update({
      where: { id: repaymentId },
      data: { status: 'REJECTED', rejectionReason: reason, confirmedBy: adminId },
    });
  }

  async setCommitteeMember(memberId: string, isCommitteeMember: boolean) {
    return this.prisma.member.update({ where: { id: memberId }, data: { isCommitteeMember } });
  }

  private async getOwnedRepayableLoan(memberId: string, loanId: string) {
    const loan = await this.prisma.loan.findUnique({ where: { id: loanId } });
    if (!loan || loan.memberId !== memberId) throw new NotFoundException('Loan not found');
    if (loan.status !== 'REPAYING') throw new BadRequestException(`Loan is ${loan.status}, not currently accepting repayments`);
    return loan;
  }

  private async requireCommitteeMember(memberId: string) {
    const member = await this.prisma.member.findUniqueOrThrow({ where: { id: memberId } });
    if (!member.isCommitteeMember) throw new ForbiddenException('You are not on the loan committee');
    return member;
  }

  private async closeIfFullyRepaid(tx: any, loan: { id: string; amountRepaid: any; amountApproved: any }) {
    if (loan.amountApproved != null && Number(loan.amountRepaid) >= Number(loan.amountApproved)) {
      await tx.loan.update({ where: { id: loan.id }, data: { status: 'CLOSED' } });
    }
  }
}
