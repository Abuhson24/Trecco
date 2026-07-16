import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CooperativeService {
  constructor(private readonly prisma: PrismaService) {}

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
}
