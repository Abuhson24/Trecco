import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { WalletModule } from './modules/wallet/wallet.module';
import { CooperativeModule } from './modules/cooperative/cooperative.module';
import { LoansModule } from './modules/loans/loans.module';
import { MarketplaceModule } from './modules/marketplace/marketplace.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { CardsModule } from './modules/cards/cards.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    WalletModule,
    CooperativeModule,
    LoansModule,
    MarketplaceModule,
    InventoryModule,
    NotificationsModule,
    CardsModule,
    DashboardModule,
  ],
})
export class AppModule {}
