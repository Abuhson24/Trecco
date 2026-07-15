import { Module } from '@nestjs/common';
import { CardsController } from './cards.controller';
import { CardsService } from './cards.service';
import { XpressWalletClient } from './xpress-wallet.client';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [CardsController],
  providers: [CardsService, XpressWalletClient],
  exports: [CardsService],
})
export class CardsModule {}
