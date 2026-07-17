import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthService, toPublicMember } from '../auth/auth.service';

// Starting interest rate for a newly created cooperative, expressed as a
// percentage (9 = 9%). This is just the cooperative-level default shown to
// members; individual loan approvals can set their own rate, which
// overrides this per-loan.
const DEFAULT_COOPERATIVE_LOAN_RATE_POLICY = 9;

interface CreateCooperativeInput {
  cooperativeName: string;
  country: string;
  focusArea: string;
  isExistingCooperative: boolean;
}

@Injectable()
export class CooperativeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auth: AuthService,
  ) {}

  // Admin-facing member directory — used by the loans admin page to let an
  // admin see everyone in their cooperative and toggle who's on the loan
  // committee (there's no separate committee table, just a flag on Member).
  async listMembers(cooperativeId: string) {
    return this.prisma.member.findMany({
      where: { cooperativeId },
      select: { id: true, fullName: true, email: true, role: true, isCommitteeMember: true, joinedAt: true },
      orderBy: { fullName: 'asc' },
    });
  }

  async getCooperative(cooperativeId: string) {
    const cooperative = await this.prisma.cooperative.findUnique({ where: { id: cooperativeId } });
    if (!cooperative) throw new NotFoundException('Cooperative not found');
    return cooperative;
  }

  // Authenticated — a member with no cooperative yet supplies an admin-issued
  // token to attach themselves to that cooperative as a regular MEMBER.
  // Reissues the JWT since cooperativeId/role changed.
  async joinByToken(memberId: string, token: string) {
    if (!token) throw new BadRequestException('A cooperative token is required');

    const cooperative = await this.prisma.cooperative.findUnique({ where: { joinToken: token } });
    if (!cooperative) throw new NotFoundException('Invalid cooperative token');

    const existingMember = await this.prisma.member.findUniqueOrThrow({ where: { id: memberId } });
    if (existingMember.cooperativeId) {
      throw new BadRequestException('You already belong to a cooperative');
    }

    const member = await this.prisma.member.update({
      where: { id: memberId },
      data: { cooperativeId: cooperative.id },
    });

    return {
      ...(await this.auth.issueTokensFor(member)),
      member: toPublicMember(member),
    };
  }

  // Authenticated — an existing member with no cooperative creates a brand
  // new one and becomes its founding COOP_ADMIN. Reissues the JWT since
  // cooperativeId/role changed.
  async createForMember(memberId: string, input: CreateCooperativeInput) {
    if (!input.cooperativeName || !input.country || !input.focusArea || typeof input.isExistingCooperative !== 'boolean') {
      throw new BadRequestException('cooperativeName, country, focusArea, and isExistingCooperative are all required');
    }

    const existingMember = await this.prisma.member.findUniqueOrThrow({ where: { id: memberId } });
    if (existingMember.cooperativeId) {
      throw new ConflictException('You already belong to a cooperative');
    }

    const member = await this.prisma.$transaction(async (tx) => {
      const cooperative = await tx.cooperative.create({
        data: {
          name: input.cooperativeName,
          country: input.country,
          focusArea: input.focusArea,
          loanRatePolicy: DEFAULT_COOPERATIVE_LOAN_RATE_POLICY,
          status: input.isExistingCooperative ? 'ESTABLISHED' : 'RECRUITING',
        },
      });

      return tx.member.update({
        where: { id: memberId },
        data: { cooperativeId: cooperative.id, role: 'COOP_ADMIN' },
      });
    });

    return {
      ...(await this.auth.issueTokensFor(member)),
      member: toPublicMember(member),
    };
  }

  // Admin-only — lets an admin view (and share) their cooperative's join
  // token. Always-visible rather than one-time, since these get shared over
  // WhatsApp/SMS and a one-time reveal is too easy to lose.
  async getMyJoinToken(cooperativeId: string) {
    const cooperative = await this.prisma.cooperative.findUniqueOrThrow({ where: { id: cooperativeId } });
    return { joinToken: cooperative.joinToken };
  }
}
