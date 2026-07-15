import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

// The scaffold didn't wire up a shared Prisma client anywhere yet — every
// module was a stub. This is the one place `new PrismaClient()` should ever
// appear; every service (wallet, loans, cards, ...) injects this instead of
// creating its own client, so they all share one connection pool and one
// `$transaction` boundary when a flow needs atomicity (see CardsService.approve
// for an example: fee debit + credit + status change in a single transaction).
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
